/**
 * Shadow Slave Life OS — Market Module v3.1
 * ==========================================
 * "O Mercado"
 *
 * Gerencia:
 *  - Vitrine de cosméticos (Temas Globais)
 *  - Recompensas IRL cadastradas pelo usuário (com limite semanal)
 *  - Countdown de reset semanal (toda segunda-feira à meia-noite)
 *  - Lógica de compra com deduções atômicas via Firestore
 */

import {
  MARKET_COSMETICS,
  calcWeeklyReset,
  currentIRLWeekKey,
  canAfford,
  formatGold,
} from '../engine/economy_engine.js';

import {
  purchaseMarketItemTx,
  purchaseIRLRewardTx,
  getMarketItems,
  saveMarketItem,
  deleteMarketItem,
} from '../firebase/db.js';

import { loadState, saveState } from '../engine/core.js';
import { applyThemeV3 } from './profile.js';

// ============================================================
//   STATE DEPS
// ============================================================
let _getCurrentUser = () => null;
let _getPlayerData  = () => null;
let _showToast      = (msg, type) => console.log(`[Toast] ${type}: ${msg}`);

export function initMarketDeps(deps) {
  _getCurrentUser = deps.getCurrentUser ?? (() => null);
  _getPlayerData  = deps.getPlayerData  ?? (() => null);
  _showToast      = deps.showToast      ?? ((m) => console.log(m));
}

// ============================================================
//   STATE INTERNO
// ============================================================
let _irlRewards   = [];   // Array de recompensas IRL do Firestore
let _resetTimer   = null; // setInterval do countdown
let _marketOpen   = false;

// ============================================================
//   OPEN / CLOSE
// ============================================================
export async function openMarketPanel() {
  const panel    = document.getElementById('market-panel');
  const backdrop = document.getElementById('market-panel-backdrop');
  if (!panel) return;

  _initMarketSkeleton(); // Garantir estrutura interna

  _marketOpen = true;
  panel.classList.add('side-panel--open');
  if (backdrop) backdrop.classList.add('market-backdrop--open');

  // Carregar recompensas IRL do Firestore
  await _loadIRLRewards();
  _renderMarket();
  _startResetCountdown();

  // Escuta global de tecla ESC
  document.addEventListener('keydown', _handleMarketKey);
  
  // GARANTIA: Escuta global para o botão de fechar (evita falha de listener por re-render)
  const closeBtn = document.getElementById('market-close-btn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMarketPanel();
    };
  }
}

export function closeMarketPanel() {
  const panel    = document.getElementById('market-panel');
  const backdrop = document.getElementById('market-panel-backdrop');
  if (panel)    panel.classList.remove('side-panel--open');
  if (backdrop) backdrop.classList.remove('market-backdrop--open');
  
  _marketOpen = false;
  _stopResetCountdown();
  document.removeEventListener('keydown', _handleMarketKey);
}

function _handleMarketKey(e) {
  if (e.key === 'Escape') closeMarketPanel();
}

// ============================================================
//   LOAD IRL REWARDS
// ============================================================
async function _loadIRLRewards() {
  const user = _getCurrentUser();
  if (!user) { _irlRewards = []; return; }

  try {
    _irlRewards = await getMarketItems(user.uid);
  } catch (e) {
    console.error('[Market] Erro ao carregar recompensas IRL:', e);
    _irlRewards = [];
  }
}

// ============================================================
//   RENDER COMPLETO
// ============================================================
function _renderMarket() {
  console.log('[Market] Iniciando renderização completa...');
  _renderWallet();
  _renderResetTimer();
  _renderCosmeticSection();
  _renderIRLSection();
  _wireAddIRLForm();
  
  // RE-WIRE CLOSE BUTTON SEMPRE
  const closeBtn = document.getElementById('market-close-btn');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMarketPanel();
    };
  }
}

// ============================================================
//   WALLET
// ============================================================
function _renderWallet() {
  const state      = loadState();
  const playerData = _getPlayerData();
  const gold  = playerData?.progression?.gold_coins
             ?? state.player?.progression?.gold_coins
             ?? state.player?.stats?.gold
             ?? 0;
  const frags = playerData?.progression?.shadow_fragments
             ?? state.player?.progression?.shadow_fragments
             ?? 0;

  _setEl('market-wallet-gold',  `🪙 ${formatGold(gold)} ouro`);
  _setEl('market-wallet-frags', `💎 ${frags.toLocaleString('pt-BR')} fragmentos`);
}

// ============================================================
//   RESET COUNTDOWN
// ============================================================
function _startResetCountdown() {
  _updateTimer();
  _resetTimer = setInterval(_updateTimer, 1000);
}

function _stopResetCountdown() {
  if (_resetTimer) { clearInterval(_resetTimer); _resetTimer = null; }
}

function _updateTimer() {
  const el = document.getElementById('market-reset-timer');
  if (!el) return;

  const { msUntilReset } = calcWeeklyReset();
  if (msUntilReset <= 0) {
    el.textContent = '⚡ RESET AGORA!';
    return;
  }

  const totalSec  = Math.floor(msUntilReset / 1000);
  const days      = Math.floor(totalSec / 86400);
  const hours     = Math.floor((totalSec % 86400) / 3600);
  const minutes   = Math.floor((totalSec % 3600) / 60);
  const secs      = totalSec % 60;

  el.textContent = `🔄 Reset em: ${days}d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

// ============================================================
//   COSMÉTICOS
// ============================================================
function _renderCosmeticSection() {
  const container = document.getElementById('market-cosmetics-list');
  if (!container) return;

  const state      = loadState();
  const playerData = _getPlayerData();
  const gold  = playerData?.progression?.gold_coins
             ?? state.player?.stats?.gold
             ?? 0;
  const unlockedThemes = state.player?.cosmetics?.unlocked_themes ?? [];

  container.innerHTML = MARKET_COSMETICS.map(item => {
    // Verificamos se o item é do tipo frame ou theme
    const isFrame = item.type === 'frame';
    
    // Lista de itens já desbloqueados (usamos fallback para array vazio)
  // Debug do estado para entender por que as molduras somem
  console.log('[Market] Renderizando cosméticos. unlocked_frames:', state.player?.cosmetics?.unlocked_frames);

  container.innerHTML = MARKET_COSMETICS.map(item => {
    const isFrame = item.type === 'frame';
    
    // CORREÇÃO: O sistema usa unlocked_market_items como lista canônica de compras
    const unlockedList = state.player?.cosmetics?.unlocked_market_items ?? [];
    
    const alreadyOwned = unlockedList.includes(item.id)
                      || (item.theme_id && state.player?.cosmetics?.active_theme === item.theme_id);
    
    const canBuy = gold >= item.cost_gold && !alreadyOwned;

    return `
      <article class="market-item market-item--cosmetic ${isFrame ? 'market-item--frame' : ''}${alreadyOwned ? ' market-item--owned' : ''}">
        <div class="market-item__icon">${item.icon}</div>
        <div class="market-item__info">
          <h3 class="market-item__name">${item.name}</h3>
          <p class="market-item__desc">${item.description}</p>
        </div>
        <div class="market-item__action">
          ${alreadyOwned
            ? `<span class="market-badge market-badge--owned">✅ Possuído</span>`
            : `<div class="market-item__cost">🪙 ${formatGold(item.cost_gold)}</div>
               <button class="market-btn${canBuy ? '' : ' market-btn--disabled'}"
                       data-item-id="${item.id}"
                       data-is-frame="${isFrame}"
                       ${canBuy ? '' : 'disabled aria-disabled="true"'}>
                 ${canBuy ? 'COMPRAR' : gold < item.cost_gold ? '🔒 SEM OURO' : '🔒 BLOQUEADO'}
               </button>`
          }
        </div>
      </article>
    `.trim();
  }).join('');

  container.querySelectorAll('.market-btn:not([disabled])').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isFrame = btn.dataset.isFrame === 'true';
      _handleBuyCosmetic(btn.dataset.itemId, isFrame);
    };
  });
}


async function _handleBuyCosmetic(itemId, isFrame = false) {
  const item = MARKET_COSMETICS.find(c => c.id === itemId);
  if (!item) return;

  const user = _getCurrentUser();
  if (!user) { _showToast('⚠️ Login necessário.', 'warning'); return; }

  const state = loadState();
  const gold  = state.player?.progression?.gold_coins 
               ?? state.player?.stats?.gold_coins 
               ?? state.player?.stats?.gold 
               ?? 0;

  const { canAfford: ok, reason } = canAfford(
    { gold_coins: gold, shadow_fragments: 0 },
    { gold: item.cost_gold }
  );
  if (!ok) { _showToast(`❌ ${reason}`, 'error'); return; }

  try {
    await purchaseMarketItemTx(user.uid, itemId, item.cost_gold);
    _showToast(`✅ ${item.name} desbloqueado!`, 'success');

    const updateKey = isFrame ? 'unlocked_frames' : 'unlocked_themes';
    if (!state.player.cosmetics[updateKey]) {
      state.player.cosmetics[updateKey] = [];
    }
    if (!state.player.cosmetics[updateKey].includes(itemId)) {
      state.player.cosmetics[updateKey].push(itemId);
    }

    // Deduzir ouro localmente (o Firestore já deduziu atomicamente)
    if (state.player.progression) {
      state.player.progression.gold_coins = Math.max(0, (state.player.progression.gold_coins ?? 0) - item.cost_gold);
    } else {
      state.player.stats.gold_coins = Math.max(0, (state.player.stats.gold_coins ?? 0) - item.cost_gold);
      state.player.stats.gold = Math.max(0, (state.player.stats.gold ?? 0) - item.cost_gold);
    }
    saveState(state);

    // Aplicar imediatamente se for tema
    if (!isFrame && item.theme_id) applyThemeV3(item.theme_id);

    _renderMarket();
  } catch (e) {
    console.error('[Market] purchaseMarketItemTx falhou:', e);
    _showToast(`❌ ${e.message ?? 'Erro na compra.'}`, 'error');
  }
}

// ============================================================
//   RECOMPENSAS IRL
// ============================================================
function _renderIRLSection() {
  const container = document.getElementById('market-irl-list');
  if (!container) return;

  const weekKey   = currentIRLWeekKey();
  const state     = loadState();
  const gold      = state.player?.progression?.gold_coins
                 ?? state.player?.stats?.gold_coins
                 ?? state.player?.stats?.gold
                 ?? 0;

  if (_irlRewards.length === 0) {
    container.innerHTML = `
      <div class="market-irl__empty">
        <p>Nenhuma recompensa IRL cadastrada.</p>
        <p class="market-irl__hint">Adicione abaixo e defina um custo em ouro e limite semanal.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = _irlRewards.map(reward => {
    const purchasedThisWeek  = reward.purchases_by_week?.[weekKey] ?? 0;
    const weekLimit          = reward.week_limit ?? 1;
    const remaining          = Math.max(0, weekLimit - purchasedThisWeek);
    const canBuy             = gold >= reward.cost_gold && remaining > 0;

    return `
      <article class="market-item market-item--irl${remaining === 0 ? ' market-item--exhausted' : ''}">
        <div class="market-item__icon">${reward.icon ?? '🎁'}</div>
        <div class="market-item__info">
          <h3 class="market-item__name">${reward.name}</h3>
          <p class="market-item__desc">${reward.description ?? ''}</p>
          <div class="market-irl__meta">
            <span class="market-irl__limit">Limite: ${purchasedThisWeek}/${weekLimit} esta semana</span>
          </div>
        </div>
        <div class="market-item__action">
          <div class="market-item__cost">🪙 ${formatGold(reward.cost_gold)}</div>
          <button class="market-btn${canBuy ? '' : ' market-btn--disabled'}"
                  data-reward-id="${reward.id}"
                  ${canBuy ? '' : 'disabled aria-disabled="true"'}>
            ${remaining === 0 ? '🔒 LIMITE DA SEMANA' : canBuy ? '🎁 RESGATAR' : '🔒 SEM OURO'}
          </button>
          <button class="market-btn-delete" data-reward-id="${reward.id}" title="Excluir recompensa">🗑</button>
        </div>
      </article>
    `.trim();
  }).join('');

  container.querySelectorAll('.market-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => _handleBuyIRL(btn.dataset.rewardId));
  });

  container.querySelectorAll('.market-btn-delete').forEach(btn => {
    btn.addEventListener('click', () => _handleDeleteIRL(btn.dataset.rewardId));
  });
}

async function _handleBuyIRL(rewardId) {
  const reward = _irlRewards.find(r => r.id === rewardId);
  if (!reward) return;

  const user = _getCurrentUser();
  if (!user) { _showToast('⚠️ Login necessário.', 'warning'); return; }

  const state   = loadState();
  const gold    = state.player?.stats?.gold ?? 0;
  const weekKey = currentIRLWeekKey();

  const purchasedThisWeek = reward.purchases_by_week?.[weekKey] ?? 0;
  const weekLimit         = reward.week_limit ?? 1;

  if (purchasedThisWeek >= weekLimit) {
    _showToast('🔒 Limite semanal atingido. Aguarde o reset de segunda-feira.', 'warning');
    return;
  }

  const { canAfford: ok, reason } = canAfford(
    { gold_coins: gold, shadow_fragments: 0 },
    { gold: reward.cost_gold }
  );
  if (!ok) { _showToast(`❌ ${reason}`, 'error'); return; }

  try {
    await purchaseIRLRewardTx(user.uid, rewardId, reward.cost_gold, weekKey);
    _showToast(`🎁 Recompensa "${reward.name}" resgatada! Aproveite!`, 'success');

    // Atualizar saldo local
    state.player.stats.gold = Math.max(0, gold - reward.cost_gold);
    saveState(state);

    // Atualizar cache da recompensa
    const idx = _irlRewards.findIndex(r => r.id === rewardId);
    if (idx !== -1) {
      if (!_irlRewards[idx].purchases_by_week) _irlRewards[idx].purchases_by_week = {};
      _irlRewards[idx].purchases_by_week[weekKey] = purchasedThisWeek + 1;
    }

    _renderMarket();
  } catch (e) {
    console.error('[Market] purchaseIRLRewardTx falhou:', e);
    _showToast(`❌ ${e.message ?? 'Erro na compra.'}`, 'error');
  }
}

async function _handleDeleteIRL(rewardId) {
  if (!confirm('Excluir esta recompensa IRL?')) return;

  const user = _getCurrentUser();
  if (!user) return;

  try {
    await deleteMarketItem(user.uid, rewardId);
    _irlRewards = _irlRewards.filter(r => r.id !== rewardId);
    _renderIRLSection();
    _showToast('Recompensa removida.', 'info');
  } catch (e) {
    console.error('[Market] deleteMarketItem falhou:', e);
    _showToast('⚠️ Erro ao remover.', 'error');
  }
}

// ============================================================
//   FORMULÁRIO — ADICIONAR RECOMPENSA IRL
// ============================================================
function _wireAddIRLForm() {
  const form = document.getElementById('market-add-irl-form');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  form.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();
    
    const name      = form.querySelector('#irl-name')?.value.trim();
    const desc      = form.querySelector('#irl-desc')?.value.trim();
    const cost      = parseInt(form.querySelector('#irl-cost')?.value ?? '0', 10);
    const weekLimit = parseInt(form.querySelector('#irl-limit')?.value ?? '1', 10);
    const icon      = form.querySelector('#irl-icon')?.value.trim() || '🎁';

    if (!name || cost <= 0 || weekLimit < 1) {
      _showToast('⚠️ Preencha os campos corretamente.', 'warning');
      return;
    }

    const user = _getCurrentUser();
    if (!user) { _showToast('⚠️ Login necessário.', 'warning'); return; }

    const submitBtn = form.querySelector('.market-form-submit');
    const originalText = submitBtn?.textContent || '⚔️ SELAR CONTRATO';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '📜 SELANDO...';
      }

      console.log('[Market] Tentando selar contrato:', name);
      
      const newItem = await saveMarketItem(user.uid, {
        name,
        description:           desc ?? '',
        icon:                  icon,
        cost_gold:             cost,
        week_limit:            weekLimit,
        type:                  'irl_reward',
        purchases_by_week:     {},
      });

      console.log('[Market] Contrato selado com sucesso:', newItem.id);
      
      _irlRewards.push(newItem);
      form.reset();
      _renderIRLSection();
      _showToast(`✅ Recompensa "${name}" cadastrada!`, 'success');
      
    } catch (err) {
      console.error('[Market] Erro crítico ao selar contrato:', err);
      _showToast(`❌ Erro: ${err.message || 'Falha na conexão.'}`, 'error');
      // Importante: NÃO deixamos o erro propagar de forma que quebre o loop principal
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

// ============================================================
//   SKELETON INJECTION
// ============================================================
function _initMarketSkeleton() {
  const container = document.getElementById('market-content-container');
  if (!container) return;
  // Limpar sempre para garantir que o novo design e IDs sejam aplicados
  container.innerHTML = ''; 

  container.innerHTML = `
    <!-- Top HUD: Wallet -->
    <div class="panel-wallet market-wallet-hud">
      <div class="panel-wallet__item" id="market-wallet-gold" title="Ouro">🪙 0 ouro</div>
      <div class="panel-wallet__item" id="market-wallet-frags" title="Fragmentos de Sombra">💎 0 fragmentos</div>
    </div>

    <!-- Section: Reset Timer -->
    <div class="market-reset-bar" id="market-reset-timer">
      🔄 Calculando reset...
    </div>

    <div class="side-panel__body">
      <!-- Section: Cosméticos (Temas Globais) -->
      <section class="market-section">
        <h3 class="side-panel__section-title">✨ Aparências Sobrenaturais</h3>
        <p class="market-section-desc">Desbloqueie novos temas para todo o seu Life OS.</p>
        <div class="market-items-list" id="market-cosmetics-list"></div>
      </section>

      <!-- Section: Recompensas IRL (Personalizadas) -->
      <section class="market-section">
        <h3 class="side-panel__section-title">🎁 Recompensas do Mundo Real</h3>
        <p class="market-section-desc">Troque seu ouro por prazeres mundanos.</p>
        <div class="market-items-list" id="market-irl-list"></div>

        <!-- Form: Add IRL Reward (Pixel Panel style) -->
        <div class="market-add-irl-box pixel-panel">
          <h4 class="market-add-title">📜 Escrivão de Desejos</h4>
          <p class="market-add-subtitle">Cadastre uma nova recompensa IRL</p>
          
          <form id="market-add-irl-form" class="market-add-form">
            <div class="market-form-field">
              <label class="market-form-label">Nome da Recompensa</label>
              <input type="text" id="irl-name" class="market-form-input" placeholder="Ex: Noite de Pizza" required maxlength="30" />
            </div>

            <div class="market-form-field">
              <label class="market-form-label">Descrição (Opcional)</label>
              <input type="text" id="irl-desc" class="market-form-input" placeholder="Detalhes do prazer..." maxlength="60" />
            </div>

            <div class="market-form-grid">
              <div class="market-form-field">
                <label class="market-form-label">Custo (🪙)</label>
                <input type="number" id="irl-cost" class="market-form-input" placeholder="100" required min="1" step="1" />
              </div>
              <div class="market-form-field">
                <label class="market-form-label">Lim./Sem.</label>
                <input type="number" id="irl-limit" class="market-form-input" placeholder="1" required min="1" max="99" value="1" />
              </div>
            </div>

            <div class="market-form-field">
              <label class="market-form-label">Ícone (Emoji)</label>
              <input type="text" id="irl-icon" class="market-form-input" placeholder="🎁" maxlength="2" />
            </div>

            <button type="submit" class="market-form-submit">
              ⚔️ SELAR CONTRATO
            </button>
          </form>
        </div>
      </section>
    </div>
  `.trim();
}

// ============================================================
//   HELPER
// ============================================================
function _setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
