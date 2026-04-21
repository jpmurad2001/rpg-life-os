/**
 * Shadow Slave Life OS — Inventory Module (v2.0 — Loadout + Bolsa)
 * =================================================================
 * View refatorada de "Memórias" para "Inventário".
 * Seção 1: Loadout (Equipamentos Ativos) — 7 slots com multiplicadores fixos.
 * Seção 2: Bolsa — Tabs: Memórias | Ecos
 *
 * Estado do loadout: gerenciado localmente por variáveis de módulo.
 * Cálculo matemático real será integrado no backend futuramente.
 */

import { getInventory, getLootTable } from '../firebase/db.js';
import { currentUser }                from '../firebase/auth.js';
import { openModal, closeModal, showToast } from '../engine/gamification.js';
import { playSound }                  from '../engine/audio.js';
import { LOADOUT_SLOTS }              from '../config/loadout_slots.js';
import { ECHOES_CATALOG }             from '../config/echoes.js';

// ============================================================
//   ESTADO LOCAL DO LOADOUT
//   { slot_id: { item, type ('memoria'|'eco') } | null }
// ============================================================
let _equippedSlots = {};
LOADOUT_SLOTS.forEach(s => { _equippedSlots[s.id] = null; });

/** Cache: loot_id → item completo */
let _lootCache = {};

/** Aba ativa na Bolsa */
let _activeBagTab = 'memorias';

// ============================================================
//   INIT — chamado pelo app.js ao navegar para a view
// ============================================================
export async function initInventory() {
  const user = currentUser();
  if (!user) return;

  const container = document.getElementById('inventory-grid');
  if (!container) return;

  // Injeta a estrutura dividida em duas seções
  container.innerHTML = `
    <div id="loadout-panel" class="loadout-panel"></div>
    <div id="bag-panel"     class="bag-panel"></div>
  `;

  // Renderiza o loadout imediatamente (dados são locais)
  _renderLoadout();

  // Carrega memórias do Firestore
  container.querySelector('#bag-panel').innerHTML =
    '<div class="inventory-empty">🌑 Carregando Bolsa...</div>';

  try {
    const [inventory, lootTable] = await Promise.all([
      getInventory(user.uid),
      getLootTable(),
    ]);

    _lootCache = {};
    lootTable.forEach(item => { _lootCache[item.id] = item; });

    _renderBag(inventory);
  } catch (e) {
    console.error('[Inventory] Erro ao carregar bolsa:', e);
    container.querySelector('#bag-panel').innerHTML =
      '<div class="inventory-empty">⚠️ Erro ao carregar a Bolsa.</div>';
  }
}

// ============================================================
//   LOADOUT — Equipamentos Ativos
// ============================================================
function _renderLoadout() {
  const panel = document.getElementById('loadout-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="loadout-panel__header">
      <div>
        <div class="loadout-panel__title">⚔️ Equipamentos Ativos</div>
        <div class="loadout-panel__subtitle">Os bônus pertencem aos slots — equipe qualquer item para ativá-los</div>
      </div>
    </div>
    <div class="slot-grid" id="slot-grid">
      ${LOADOUT_SLOTS.map(slot => _buildSlotHTML(slot)).join('')}
    </div>
  `;

  // Listeners nos slots (clique = desequipar ou abrir hint)
  panel.querySelectorAll('.slot-item').forEach(el => {
    el.addEventListener('click', () => {
      const slotId = el.dataset.slotId;
      if (_equippedSlots[slotId]) {
        _unequipSlot(slotId);
      } else {
        showToast('Selecione um item na Bolsa e clique nele para equipar.', 'info');
      }
    });
  });
}

function _buildSlotHTML(slot) {
  const equipped = _equippedSlots[slot.id];
  const isActive = Boolean(equipped);

  let contentHTML;
  if (equipped) {
    const imgSrc   = equipped.type === 'eco'
      ? equipped.item.sprite
      : equipped.item.image_url;
    const itemName = equipped.item.name ?? '?';

    if (imgSrc) {
      contentHTML = `
        <img class="slot-item__equipped-img"
             src="${imgSrc}" alt="${itemName}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="slot-item__equipped-emoji" style="display:none">${_typeEmoji(equipped.item.type)}</div>
      `;
    } else {
      contentHTML = `<div class="slot-item__equipped-emoji">${_typeEmoji(equipped.item.type)}</div>`;
    }
    contentHTML += `<div class="slot-item__equipped-name">${itemName}</div>`;
  } else {
    contentHTML = `<div class="slot-item__empty-hint">+</div>`;
  }

  return `
    <div class="slot-item ${isActive ? 'slot-item--active' : ''}"
         data-slot-id="${slot.id}"
         style="--slot-active-color: ${slot.bonus_color}"
         title="${isActive ? 'Clique para desequipar' : slot.bonus_label}">
      <div class="slot-item__header">
        <div class="slot-item__icon">${slot.icon}</div>
        <div class="slot-item__type-label">${slot.label}</div>
      </div>
      <div class="slot-item__content">
        ${contentHTML}
      </div>
      <div class="slot-item__bonus">${slot.bonus_label}</div>
      <div class="slot-item__active-badge">ATIVO</div>
    </div>
  `;
}

// ============================================================
//   BOLSA — Tabs: Memórias | Ecos
// ============================================================
function _renderBag(inventory) {
  const panel = document.getElementById('bag-panel');
  if (!panel) return;

  const memoriaCount = inventory.length;
  const ecoCount     = ECHOES_CATALOG.length;

  panel.innerHTML = `
    <div class="bag-tabs">
      <button class="bag-tab ${_activeBagTab === 'memorias' ? 'bag-tab--active' : ''}"
              data-tab="memorias" id="bag-tab-memorias">
        💎 Memórias <span class="bag-tab__count">${memoriaCount}</span>
      </button>
      <button class="bag-tab ${_activeBagTab === 'ecos' ? 'bag-tab--active' : ''}"
              data-tab="ecos" id="bag-tab-ecos">
        👻 Ecos <span class="bag-tab__count">${ecoCount}</span>
      </button>
    </div>
    <div class="bag-content">
      <div class="bag-section ${_activeBagTab === 'memorias' ? 'bag-section--active' : ''}"
           id="bag-section-memorias">
        ${_buildMemoriasHTML(inventory)}
      </div>
      <div class="bag-section ${_activeBagTab === 'ecos' ? 'bag-section--active' : ''}"
           id="bag-section-ecos">
        ${_buildEcosHTML()}
      </div>
    </div>
  `;

  // Tab listeners
  panel.querySelectorAll('.bag-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeBagTab = btn.dataset.tab;
      panel.querySelectorAll('.bag-tab').forEach(b => b.classList.remove('bag-tab--active'));
      panel.querySelectorAll('.bag-section').forEach(s => s.classList.remove('bag-section--active'));
      btn.classList.add('bag-tab--active');
      panel.querySelector(`#bag-section-${_activeBagTab}`)?.classList.add('bag-section--active');
    });
  });

  // Memory card click → modal de detalhe ou equipar
  panel.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', () => {
      playSound('ui_click');
      const lootId = card.dataset.lootId;
      const item = _lootCache[lootId];
      if (!item) return;
      _showItemActionModal(item, 'memoria', card.dataset.obtainedAt);
    });
  });

  // Echo card click → modal de equipar
  panel.querySelectorAll('.echo-card').forEach(card => {
    card.addEventListener('click', () => {
      playSound('ui_click');
      const ecoId = card.dataset.ecoId;
      const eco = ECHOES_CATALOG.find(e => e.id === ecoId);
      if (!eco) return;
      _showEquipModal(eco, 'eco');
    });
  });
}

function _buildMemoriasHTML(inventory) {
  if (inventory.length === 0) {
    return `
      <div class="inventory-empty">
        🌑 Nenhuma Memória coletada ainda.<br/>
        <span style="font-size:0.85rem;color:var(--text-muted)">
          Complete quests e derrote Bosses para obter Memórias.
        </span>
      </div>`;
  }

  const RANK_ORDER = ['Soberano','Santo','Mestre','Ascendido','Desperto','Adormecido'];
  const sorted = [...inventory].sort((a, b) => {
    const itemA = _lootCache[a.loot_id];
    const itemB = _lootCache[b.loot_id];
    if (!itemA || !itemB) return 0;
    const rA = RANK_ORDER.indexOf(itemA.rank);
    const rB = RANK_ORDER.indexOf(itemB.rank);
    return rA !== rB ? rA - rB : (itemA.name ?? '').localeCompare(itemB.name ?? '');
  });

  const header = `
    <div class="inventory-section-header">
      Memórias
      <span class="inventory-section-header__count">${inventory.length} coletada${inventory.length !== 1 ? 's' : ''}</span>
    </div>`;

  const cards = sorted.map(entry => {
    let item = _lootCache[entry.loot_id] ?? {
      id: entry.loot_id, name: 'Memória Desconhecida',
      rank: 'Adormecido', type: 'Fragmento',
      description: 'Os detalhes desta memória se perderam no Vazio.',
      image_url: null,
    };

    const imgHtml = item.image_url
      ? `<img class="memory-card__img" src="${item.image_url}" alt="${item.name}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
         <div class="memory-card__emoji" style="display:none">${_typeEmoji(item.type)}</div>`
      : `<div class="memory-card__emoji">${_typeEmoji(item.type)}</div>`;

    const obtainedAt = entry.obtained_at
      ? (entry.obtained_at?.seconds
          ? new Date(entry.obtained_at.seconds * 1000).toISOString()
          : new Date(entry.obtained_at).toISOString())
      : '';

    return `
      <div class="memory-card" data-loot-id="${item.id}" data-obtained-at="${obtainedAt}">
        ${imgHtml}
        <div class="memory-card__name">${item.name}</div>
        <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
        <div class="memory-card__type">${item.type}</div>
      </div>`;
  }).join('');

  return `${header}<div class="inventory-grid">${cards}</div>`;
}

function _buildEcosHTML() {
  const header = `
    <div class="inventory-section-header">
      Ecos do Vazio
      <span class="inventory-section-header__count">${ECHOES_CATALOG.length} descobertos</span>
    </div>`;

  const cards = ECHOES_CATALOG.map(eco => `
    <div class="echo-card" data-eco-id="${eco.id}" title="${eco.lore}">
      <img class="echo-card__sprite"
           src="${eco.sprite}" alt="${eco.name}" loading="lazy"
           onerror="this.style.display='none'">
      <div class="echo-card__name">${eco.name}</div>
      <span class="rank-badge rank-badge--${eco.rank.toLowerCase()}">${eco.rank}</span>
    </div>
  `).join('');

  return `${header}<div class="echo-grid">${cards}</div>`;
}

// ============================================================
//   MODAL: Ação do Item (Detalhe + Equipar para Memórias)
// ============================================================
function _showItemActionModal(item, type, obtainedAt) {
  const obtainedStr = obtainedAt
    ? new Date(obtainedAt).toLocaleDateString('pt-BR')
    : '—';

  const imgSection = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}"
            style="width:80px;height:80px;object-fit:contain;image-rendering:pixelated;
                   filter:drop-shadow(0 0 16px rgba(109,40,217,0.6));margin:0 auto;display:block"
            onerror="this.style.display='none'">`
    : `<div style="font-size:3.5rem;text-align:center">${_typeEmoji(item.type)}</div>`;

  openModal({
    title: item.name,
    confirmLabel: '⚔️ Equipar em Slot',
    cancelLabel:  '✕ Fechar',
    bodyHTML: `
      ${imgSection}
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0">
        <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
        <span style="font-family:var(--font-display);color:var(--text-muted);font-size:1.1rem">${item.type}</span>
      </div>
      <div style="font-family:var(--font-display);font-size:1rem;color:var(--text-secondary);
                  text-align:center;font-style:italic;line-height:1.5;
                  border-top:1px solid var(--color-border);padding-top:10px;margin-top:8px">
        "${item.description}"
      </div>
      ${item.lore_origin ? `<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-muted);text-align:center;margin-top:6px">${item.lore_origin}</div>` : ''}
      <div style="font-family:var(--font-display);font-size:0.8rem;color:var(--text-muted);margin-top:10px;text-align:right">
        Obtida em ${obtainedStr}
      </div>
    `,
    onConfirm: () => {
      closeModal();
      _showEquipModal(item, type);
    },
    onCancel: closeModal,
  });
}

// ============================================================
//   MODAL: Escolha de Slot para Equipar
// ============================================================
function _showEquipModal(item, type) {
  const previewImg = (type === 'eco')
    ? item.sprite
    : item.image_url;

  const previewHTML = previewImg
    ? `<img class="equip-item-preview__img" src="${previewImg}" alt="${item.name}"
            onerror="this.style.display='none'">`
    : `<div style="font-size:2rem">${_typeEmoji(item.type)}</div>`;

  const slotListHTML = LOADOUT_SLOTS.map(slot => {
    const occupied = _equippedSlots[slot.id];
    const occupiedLabel = occupied
      ? `<span class="equip-slot-btn__occupied">↩ ${occupied.item.name?.substring(0,12) ?? '?'}</span>`
      : '';
    return `
      <button class="equip-slot-btn" data-slot-id="${slot.id}">
        <span class="equip-slot-btn__icon">${slot.icon}</span>
        <div class="equip-slot-btn__info">
          <span class="equip-slot-btn__label">${slot.label}</span>
          <span class="equip-slot-btn__bonus">${slot.bonus_label}</span>
        </div>
        ${occupiedLabel}
      </button>
    `;
  }).join('');

  openModal({
    title: 'Equipar em qual slot?',
    confirmLabel: '',
    cancelLabel:  '✕ Cancelar',
    bodyHTML: `
      <div class="equip-item-preview">
        ${previewHTML}
        <div class="equip-item-preview__info">
          <div class="equip-item-preview__name">${item.name}</div>
          <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
        </div>
      </div>
      <div class="equip-slot-list" id="equip-slot-list">
        ${slotListHTML}
      </div>
    `,
    onCancel: closeModal,
    onConfirm: null,
  });

  // Listeners nos botões de slot (dentro do modal)
  setTimeout(() => {
    const cancelBtn = document.getElementById('modal-confirm');
    if (cancelBtn) cancelBtn.style.display = 'none';

    document.querySelectorAll('.equip-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.slotId;
        _equipItem(slotId, item, type);
        closeModal();
      });
    });
  }, 50);
}

// ============================================================
//   LÓGICA DE EQUIPAR / DESEQUIPAR
// ============================================================
function _equipItem(slotId, item, type) {
  _equippedSlots[slotId] = { item, type };
  _renderLoadout();

  const slot = LOADOUT_SLOTS.find(s => s.id === slotId);
  showToast(`✨ ${item.name} equipado em ${slot?.label ?? slotId}!`, 'success');

  // Animação de "just equipped"
  setTimeout(() => {
    const slotEl = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (slotEl) {
      slotEl.classList.add('slot-item--just-equipped');
      setTimeout(() => slotEl.classList.remove('slot-item--just-equipped'), 500);
    }
  }, 20);
}

function _unequipSlot(slotId) {
  const equipped = _equippedSlots[slotId];
  if (!equipped) return;

  const itemName = equipped.item.name ?? '?';
  _equippedSlots[slotId] = null;
  _renderLoadout();

  const slot = LOADOUT_SLOTS.find(s => s.id === slotId);
  showToast(`${itemName} removido do slot ${slot?.label ?? slotId}.`, 'info');
}

// ============================================================
//   OVERLAY "MEMÓRIA OBTIDA" — chamada após drop
// ============================================================
export function showMemoriaObtidaOverlay(item, onCollect) {
  const overlay = document.getElementById('memoria-overlay');
  if (!overlay) return;

  playSound('loot_drop');

  const imgHtml = item.image_url
    ? `<img class="memoria-image" src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">`
    : `<div class="memoria-image-fallback">${_typeEmoji(item.type)}</div>`;

  const enchantsHtml = (item.enchantments ?? []).length > 0
    ? `<ul class="memoria-enchantments">
        ${item.enchantments.map(e => `<li>${e}</li>`).join('')}
       </ul>`
    : '';

  overlay.innerHTML = `
    <div class="memoria-card">
      <div class="memoria-header">⟡ Memória Obtida ⟡</div>
      ${imgHtml}
      <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
      <div class="memoria-name">${item.name}</div>
      <div class="memoria-type">${item.type}</div>
      <div class="memoria-desc">"${item.description}"</div>
      ${enchantsHtml}
      <button class="memoria-btn-collect" id="btn-collect-memoria">
        💎 Guardar Memória
      </button>
    </div>
  `;

  overlay.classList.remove('hidden');

  document.getElementById('btn-collect-memoria')?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (onCollect) onCollect();
  }, { once: true });
}

// ============================================================
//   HELPERS
// ============================================================
function _typeEmoji(type) {
  const map = {
    'Arma':     '⚔️',
    'Armadura': '🛡️',
    'Amuleto':  '📿',
    'Fragmento':'💜',
    'Artefato': '🔮',
  };
  return map[type] ?? '💎';
}
