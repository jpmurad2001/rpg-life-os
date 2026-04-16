/**
 * Shadow Slave Life OS — Forge Module v3.1
 * =========================================
 * "A Forja de Memórias"
 *
 * Gerencia:
 *  - Painel de Forja (UI overlay)
 *  - Sistema de 7 Slots de Memória com drag-and-drop
 *  - Interface de Inventário de Memórias Forjadas
 *  - Exibição de bônus ativos dos Slots
 */

import {
  FORGE_RECIPES,
  MEMORY_SLOTS,
  MEMORY_SLOT_BY_KEY,
  calcSlotBonuses,
  getForgeRecipeById,
  canAfford,
} from '../engine/economy_engine.js';

import {
  craftMemoryTx,
  equipMemorySlotTx,
  getForgeInventory,
} from '../firebase/db.js';

import { loadState, saveState } from '../engine/core.js';

// ============================================================
//   STATE DEPS (injetadas de app.js)
// ============================================================
let _getCurrentUser = () => null;
let _getPlayerData  = () => null;
let _showToast      = (msg, type) => console.log(`[Toast] ${type}: ${msg}`);
let _onSlotsChanged = null;

export function initForgeDeps(deps) {
  _getCurrentUser  = deps.getCurrentUser  ?? (() => null);
  _getPlayerData   = deps.getPlayerData   ?? (() => null);
  _showToast       = deps.showToast       ?? ((m) => console.log(m));
  _onSlotsChanged  = deps.onSlotsChanged  ?? null;
}

// ============================================================
//   RARITY CONFIG
// ============================================================
const RARITY_META = {
  common:    { label: 'Comum',     color: '#aaaaaa', glow: 'rgba(170,170,170,0.3)' },
  uncommon:  { label: 'Incomum',   color: '#4caf50', glow: 'rgba(76,175,80,0.3)'  },
  rare:      { label: 'Raro',      color: '#2196f3', glow: 'rgba(33,150,243,0.3)' },
  epic:      { label: 'Épico',     color: '#9c27b0', glow: 'rgba(156,39,176,0.3)' },
  legendary: { label: 'Lendário',  color: '#ff9800', glow: 'rgba(255,152,0,0.3)'  },
  mythic:    { label: 'Mítico',    color: '#e91e63', glow: 'rgba(233,30,99,0.3)'  },
  divine:    { label: 'Divino',    color: '#ffd700', glow: 'rgba(255,215,0,0.5)'  },
};

// ============================================================
//   OPEN / CLOSE — PAINEL DA FORJA
// ============================================================
let _forgePanelOpen = false;
let _inventoryCache = null;   // Array de memórias forjadas
let _dragSource     = null;   // { inventoryId, lootId } em drag

export async function openForgePanel() {
  const panel    = document.getElementById('forge-panel');
  const backdrop = document.getElementById('forge-panel-backdrop');
  if (!panel) return;

  _initForgeSkeleton(); // Garantir estrutura interna

  _forgePanelOpen = true;
  panel.classList.add('side-panel--open');
  if (backdrop) backdrop.classList.add('forge-backdrop--open');

  // Carregar inventário ao abrir
  await _loadForgeInventory();

  _renderForge();

  // Fechar com Escape, clique fora ou botão X
  document.addEventListener('keydown', _handleForgeKey);
  if (backdrop) backdrop.addEventListener('click', closeForgePanel, { once: true });
  
  const closeBtn = document.getElementById('forge-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeForgePanel, { once: true });
}

export function closeForgePanel() {
  const panel    = document.getElementById('forge-panel');
  const backdrop = document.getElementById('forge-panel-backdrop');
  if (panel)    panel.classList.remove('side-panel--open');
  if (backdrop) backdrop.classList.remove('forge-backdrop--open');
  _forgePanelOpen = false;
  document.removeEventListener('keydown', _handleForgeKey);
}

function _handleForgeKey(e) {
  if (e.key === 'Escape') closeForgePanel();
}

// ============================================================
//   LOAD INVENTORY
// ============================================================
async function _loadForgeInventory() {
  const user = _getCurrentUser();
  if (!user) { _inventoryCache = []; return; }

  try {
    _inventoryCache = await getForgeInventory(user.uid);
  } catch (e) {
    console.error('[Forge] Erro ao carregar inventário:', e);
    _inventoryCache = [];
  }
}

// ============================================================
//   RENDER — PAINEL COMPLETO
// ============================================================
function _renderForge() {
  _renderPlayerWallet();
  _renderRecipes();
  _renderInventoryGrid();
  _renderMemorySlots();
}

// ============================================================
//   WALLET HUD DENTRO DO PAINEL
// ============================================================
function _renderPlayerWallet() {
  const state      = loadState();
  const playerData = _getPlayerData();
  const gold       = playerData?.progression?.gold_coins
                  ?? state.player?.progression?.gold_coins
                  ?? state.player?.stats?.gold
                  ?? 0;
  const frags      = playerData?.progression?.shadow_fragments
                  ?? state.player?.progression?.shadow_fragments
                  ?? 0;

  _setHTML('forge-wallet-gold',  `🪙 ${gold.toLocaleString('pt-BR')}`);
  _setHTML('forge-wallet-frags', `💎 ${frags.toLocaleString('pt-BR')}`);
}

// ============================================================
//   RECEITAS DE FORJA
// ============================================================
function _renderRecipes() {
  const container = document.getElementById('forge-recipes-list');
  if (!container) return;

  const playerData = _getPlayerData();
  const state      = loadState();
  const frags = playerData?.progression?.shadow_fragments
             ?? state.player?.progression?.shadow_fragments
             ?? 0;

  container.innerHTML = FORGE_RECIPES.map(recipe => {
    const meta       = RARITY_META[recipe.rarity] ?? RARITY_META.common;
    const canCraft   = frags >= recipe.fragment_cost;
    const pct        = Math.min(100, (frags / recipe.fragment_cost) * 100);

    return `
      <article class="forge-recipe${canCraft ? ' forge-recipe--craftable' : ''}"
               data-recipe-id="${recipe.id}"
               style="--recipe-glow: ${meta.glow}; --recipe-color: ${meta.color}">
        <header class="forge-recipe__header">
          <span class="forge-recipe__rank">${recipe.rank}</span>
          <span class="forge-recipe__rarity" style="color: ${meta.color}">${meta.label}</span>
        </header>
        <h3 class="forge-recipe__name">${recipe.name}</h3>
        <p class="forge-recipe__effect">${recipe.effect}</p>
        <p class="forge-recipe__lore">"${recipe.lore}"</p>

        <footer class="forge-recipe__footer">
          <div class="forge-recipe__cost">
            <span class="forge-cost-icon">💎</span>
            <span class="forge-cost-amount${canCraft ? ' forge-cost--ok' : ' forge-cost--lack'}">
              ${recipe.fragment_cost.toLocaleString('pt-BR')} fragmentos
            </span>
          </div>
          <div class="forge-recipe__progress-wrap" title="${Math.floor(pct)}% dos fragmentos necessários">
            <div class="forge-recipe__progress-bar"
                 style="width: ${pct}%; background: ${meta.color}"></div>
          </div>
          <button class="forge-btn${canCraft ? '' : ' forge-btn--disabled'}"
                  data-recipe-id="${recipe.id}"
                  ${canCraft ? '' : 'disabled aria-disabled="true"'}>
            ${canCraft ? '⚒ FORJAR' : '🔒 FORJAR'}
          </button>
        </footer>
      </article>
    `.trim();
  }).join('');

  // Wire craft buttons
  container.querySelectorAll('.forge-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => _handleCraft(btn.dataset.recipeId));
  });
}

// ============================================================
//   CRAFT
// ============================================================
async function _handleCraft(recipeId) {
  const recipe = getForgeRecipeById(recipeId);
  if (!recipe) return;

  const user = _getCurrentUser();
  if (!user) {
    _showToast('⚠️ Faça login para usar a Forja.', 'warning');
    return;
  }

  const playerData = _getPlayerData();
  const state      = loadState();
  const frags      = playerData?.progression?.shadow_fragments
                  ?? state.player?.progression?.shadow_fragments
                  ?? 0;

  // Validação client-side (servidor valida novamente na transação)
  const { canAfford: ok, reason } = canAfford(
    { gold_coins: 0, shadow_fragments: frags },
    { fragments: recipe.fragment_cost }
  );

  if (!ok) {
    _showToast(`❌ ${reason}`, 'error');
    return;
  }

  // Feedback visual — botão em loading
  const btn = document.querySelector(`[data-recipe-id="${recipeId}"].forge-btn`);
  if (btn) { btn.disabled = true; btn.textContent = '⚒ FORJANDO...'; }

  try {
    const result = await craftMemoryTx(user.uid, recipeId, recipe.fragment_cost);
    _showToast(`✅ ${recipe.name} forjada! +1 ao inventário.`, 'success');

    // Atualizar inventário em cache
    _inventoryCache = result.newInventory;

    // Re-renderizar
    _renderForge();
  } catch (e) {
    console.error('[Forge] craftMemoryTx falhou:', e);
    if (e.message?.includes('Fragmentos insuficientes')) {
      _showToast('❌ Fragmentos insuficientes (verificação do servidor).', 'error');
    } else {
      _showToast('⚠️ Erro na Forja. Tente novamente.', 'error');
    }
    // Restaurar botão
    if (btn) { btn.disabled = false; btn.textContent = '⚒ FORJAR'; }
  }
}

// ============================================================
//   INVENTÁRIO DE MEMÓRIAS FORJADAS
// ============================================================
function _renderInventoryGrid() {
  const container = document.getElementById('forge-inventory-grid');
  if (!container) return;

  const items = _inventoryCache ?? [];

  if (items.length === 0) {
    container.innerHTML = `
      <div class="forge-inventory__empty">
        <span>⚒</span>
        <p>Nenhuma Memória forjada ainda.</p>
        <p class="forge-inventory__empty-hint">Use a Forja acima para criar a sua primeira.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const meta = RARITY_META[item.rarity] ?? RARITY_META.common;
    return `
      <div class="forge-memory-card"
           data-inventory-id="${item.inventory_id}"
           data-loot-id="${item.loot_id ?? item.recipe_id}"
           data-rarity="${item.rarity}"
           draggable="true"
           role="button"
           tabindex="0"
           title="${item.name} — Arraste para equipar em um Slot"
           style="--card-color: ${meta.color}; --card-glow: ${meta.glow}">
        <span class="forge-memory-card__icon">💎</span>
        <span class="forge-memory-card__name">${item.name}</span>
        <span class="forge-memory-card__rank" style="color:${meta.color}">${item.rank}</span>
        ${item.equippedIn ? `<span class="forge-memory-card__badge">Equipada: ${item.equippedIn}</span>` : ''}
      </div>
    `.trim();
  }).join('');

  // Wire drag events
  container.querySelectorAll('.forge-memory-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragSource = {
        inventoryId: card.dataset.inventoryId,
        lootId:      card.dataset.lootId,
        name:        card.querySelector('.forge-memory-card__name')?.textContent ?? '',
      };
      card.classList.add('forge-memory-card--dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('forge-memory-card--dragging');
    });
    // Também permite clicar para selecionar (mobile)
    card.addEventListener('click', () => _selectCard(card));
  });
}

let _selectedCard = null;

function _selectCard(card) {
  // Toggle selection
  if (_selectedCard === card) {
    card.classList.remove('forge-memory-card--selected');
    _selectedCard = null;
    _deselectAllSlots();
    return;
  }
  document.querySelectorAll('.forge-memory-card--selected').forEach(c =>
    c.classList.remove('forge-memory-card--selected')
  );
  card.classList.add('forge-memory-card--selected');
  _selectedCard = card;
  _activateDropSlots();
}

function _activateDropSlots() {
  document.querySelectorAll('.memory-slot').forEach(slot => {
    slot.classList.add('memory-slot--selectable');
  });
}

function _deselectAllSlots() {
  document.querySelectorAll('.memory-slot--selectable').forEach(s =>
    s.classList.remove('memory-slot--selectable')
  );
}

// ============================================================
//   7 SLOTS DE MEMÓRIA
// ============================================================
function _renderMemorySlots() {
  const container = document.getElementById('memory-slots-grid');
  if (!container) return;

  const state      = loadState();
  const equippedSlots = state.player?.memory_slots ?? {};
  const bonuses    = calcSlotBonuses(equippedSlots);

  container.innerHTML = MEMORY_SLOTS.map(slot => {
    const equipped = equippedSlots[slot.key];
    const isEmpty  = !equipped;

    // Encontrar item equipado no inventário
    let equippedName = '';
    if (!isEmpty && _inventoryCache) {
      const item = _inventoryCache.find(i => i.inventory_id === equipped.inventory_id);
      equippedName = item?.name ?? 'Memória Desconhecida';
    }

    return `
      <div class="memory-slot${isEmpty ? ' memory-slot--empty' : ' memory-slot--filled'}"
           data-slot-key="${slot.key}"
           role="button"
           tabindex="0"
           title="${slot.bonus_label}">
        <div class="memory-slot__icon" style="color: ${slot.color}">${slot.icon}</div>
        <div class="memory-slot__label">${slot.label}</div>
        <div class="memory-slot__bonus" style="color: ${slot.color}">${slot.bonus_label}</div>
        <div class="memory-slot__status">
          ${isEmpty
            ? `<span class="memory-slot__empty-label">— vazio —</span>`
            : `<span class="memory-slot__equipped-name">${equippedName}</span>
               <button class="memory-slot__unequip" data-slot-key="${slot.key}" title="Desequipar">✕</button>`
          }
        </div>
        <!-- Drop zone indicator -->
        <div class="memory-slot__drop-zone" aria-hidden="true">⊕ Equipar</div>
      </div>
    `.trim();
  }).join('');

  // Render active bonuses summary
  _renderBonusSummary(bonuses);

  // Wire slot events
  _wireSlotEvents();
}

function _renderBonusSummary(bonuses) {
  const el = document.getElementById('memory-slot-bonuses');
  if (!el) return;

  const lines = [];
  if (bonuses.xp_multiplier > 1.0) {
    lines.push(`✨ XP Global: ×${bonuses.xp_multiplier.toFixed(2)}`);
  }
  Object.entries(bonuses.attr_multipliers).forEach(([attr, mult]) => {
    if (mult > 1.0) lines.push(`${attr}: ×${mult.toFixed(2)}`);
  });
  if (bonuses.drop_rate_bonus > 0) {
    lines.push(`💎 Drop Rate: +${(bonuses.drop_rate_bonus * 100).toFixed(0)}%`);
  }

  el.innerHTML = lines.length > 0
    ? lines.map(l => `<span class="slot-bonus-tag">${l}</span>`).join('')
    : `<span class="slot-bonus-tag slot-bonus-tag--empty">Equipe Memórias para ativar bônus</span>`;
}

function _wireSlotEvents() {
  document.querySelectorAll('.memory-slot').forEach(slot => {
    const key = slot.dataset.slotKey;

    // Drag over
    slot.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('memory-slot--drag-over');
    });
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('memory-slot--drag-over');
    });

    // Drop
    slot.addEventListener('drop', async e => {
      e.preventDefault();
      slot.classList.remove('memory-slot--drag-over');
      if (!_dragSource) return;
      await _handleEquipSlot(key, _dragSource.inventoryId, _dragSource.lootId);
      _dragSource = null;
    });

    // Click (para mobile / seleção)
    slot.addEventListener('click', async (e) => {
      if (e.target.classList.contains('memory-slot__unequip')) return; // handled below
      if (_selectedCard) {
        const invId  = _selectedCard.dataset.inventoryId;
        const lootId = _selectedCard.dataset.lootId;
        await _handleEquipSlot(key, invId, lootId);
        _selectedCard.classList.remove('forge-memory-card--selected');
        _selectedCard = null;
        _deselectAllSlots();
      }
    });
  });

  // Unequip buttons
  document.querySelectorAll('.memory-slot__unequip').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await _handleUnequipSlot(btn.dataset.slotKey);
    });
  });
}

// ============================================================
//   EQUIP / UNEQUIP SLOT
// ============================================================
async function _handleEquipSlot(slotKey, inventoryId, lootId) {
  if (!slotKey || !inventoryId) return;

  const user = _getCurrentUser();
  if (!user) {
    _showToast('⚠️ Login necessário para equipar Memórias.', 'warning');
    return;
  }

  try {
    await equipMemorySlotTx(user.uid, slotKey, inventoryId, lootId);

    // Atualizar estado local
    const state = loadState();
    if (!state.player.memory_slots) state.player.memory_slots = {};
    state.player.memory_slots[slotKey] = {
      inventory_id: inventoryId,
      loot_id:      lootId,
      equipped_at:  new Date().toISOString(),
    };
    saveState(state);

    _showToast(`✅ Memória equipada em ${MEMORY_SLOT_BY_KEY[slotKey]?.label ?? slotKey}!`, 'success');
    _renderMemorySlots();
    if (_onSlotsChanged) _onSlotsChanged(state.player.memory_slots);
  } catch (e) {
    console.error('[Forge] equipMemorySlotTx falhou:', e);
    _showToast('⚠️ Erro ao equipar. Tente novamente.', 'error');
  }
}

async function _handleUnequipSlot(slotKey) {
  const user = _getCurrentUser();
  if (!user) return;

  try {
    await equipMemorySlotTx(user.uid, slotKey, null, null);

    // Atualizar estado local
    const state = loadState();
    if (state.player.memory_slots) {
      state.player.memory_slots[slotKey] = null;
    }
    saveState(state);

    _showToast(`Slot ${MEMORY_SLOT_BY_KEY[slotKey]?.label ?? slotKey} desequipado.`, 'info');
    _renderMemorySlots();
    if (_onSlotsChanged) _onSlotsChanged(state.player.memory_slots);
  } catch (e) {
    console.error('[Forge] unequip falhou:', e);
  }
}

// ============================================================
//   SKELETON INJECTION
// ============================================================
function _initForgeSkeleton() {
  const container = document.getElementById('forge-content-container');
  if (!container || container.children.length > 0) return;

  container.innerHTML = `
    <!-- Top HUD: Wallet -->
    <div class="forge-wallet-hud">
      <div class="forge-wallet-item" id="forge-wallet-gold" title="Ouro">🪙 0</div>
      <div class="forge-wallet-item" id="forge-wallet-frags" title="Fragmentos de Sombra">💎 0</div>
    </div>

    <!-- Section: 7 Slots -->
    <section class="forge-section">
      <h3 class="forge-section-title">✨ Slots de Atributos (Equipados)</h3>
      <div class="forge-slots-summary" id="memory-slot-bonuses"></div>
      <div class="memory-slots-grid" id="memory-slots-grid"></div>
    </section>

    <!-- Section: Forja (Recipes) -->
    <section class="forge-section">
      <h3 class="forge-section-title">⚒ Forjar Novas Memórias</h3>
      <div class="forge-recipes-list" id="forge-recipes-list"></div>
    </section>

    <!-- Section: Inventário (Memórias Forjadas) -->
    <section class="forge-section">
      <h3 class="forge-section-title">💎 Seu Inventário de Memórias</h3>
      <div class="forge-inventory-grid" id="forge-inventory-grid"></div>
    </section>
  `.trim();
}

// ============================================================
//   HELPER
// ============================================================
function _setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ============================================================
//   PUBLIC: RENDER MEMORY SLOTS (chamado de fora — ex: perfil)
// ============================================================
export function renderMemorySlotsExternal() {
  _renderMemorySlots();
}

export { RARITY_META };
