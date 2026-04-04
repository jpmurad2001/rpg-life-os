/**
 * Shadow Slave Life OS — Inventory Module (Memórias)
 * ====================================================
 * Renderiza a view de inventário com o grid de Memórias coletadas.
 * Cada card mostra a arte (image_url), nome, rank e tipo.
 * Ao clicar: modal completo com lore, encantamentos e rank badge.
 */

import { getInventory, getLootTable } from '../firebase/db.js';
import { currentUser }                from '../firebase/auth.js';
import { openModal, closeModal, showToast } from '../engine/gamification.js';
import { playClick }                  from '../engine/audio.js';

/** Cache: loot_id → item completo */
let _lootCache = {};

// ============================================================
//   INIT
// ============================================================
export async function initInventory() {
  const user = currentUser();
  if (!user) return;

  const container = document.getElementById('inventory-grid');
  if (!container) return;

  container.innerHTML = '<div class="inventory-empty">🌑 Carregando Memórias...</div>';

  try {
    const [inventory, lootTable] = await Promise.all([
      getInventory(user.uid),
      getLootTable(),
    ]);

    // Build lookup map
    _lootCache = {};
    lootTable.forEach(item => { _lootCache[item.id] = item; });

    renderInventoryGrid(container, inventory);
  } catch (e) {
    console.error('[Inventory] Erro ao carregar:', e);
    container.innerHTML = '<div class="inventory-empty">⚠️ Erro ao carregar Memórias.</div>';
  }
}

// ============================================================
//   RENDER GRID
// ============================================================
function renderInventoryGrid(container, inventory) {
  container.innerHTML = '';

  if (inventory.length === 0) {
    container.innerHTML = `
      <div class="inventory-empty">
        🌑 Nenhuma Memória coletada ainda.<br/>
        <span style="font-size:0.85rem;color:#374151">Complete quests e derrote Bosses para obter Memórias.</span>
      </div>`;
    return;
  }

  // Sort by rank (higher first) then by name
  const RANK_ORDER = ['Soberano','Santo','Mestre','Ascendido','Desperto','Adormecido'];
  const sorted = [...inventory].sort((a, b) => {
    const itemA = _lootCache[a.loot_id];
    const itemB = _lootCache[b.loot_id];
    if (!itemA || !itemB) return 0;
    const rA = RANK_ORDER.indexOf(itemA.rank);
    const rB = RANK_ORDER.indexOf(itemB.rank);
    if (rA !== rB) return rA - rB;
    return itemA.name.localeCompare(itemB.name);
  });

  sorted.forEach(entry => {
    const item = _lootCache[entry.loot_id];
    if (!item) return;

    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.lootId = item.id;

    const imgHtml = item.image_url
      ? `<img class="memory-card__img" src="${item.image_url}" alt="${item.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
        + `<div class="memory-card__emoji" style="display:none">${_typeEmoji(item.type)}</div>`
      : `<div class="memory-card__emoji">${_typeEmoji(item.type)}</div>`;

    card.innerHTML = `
      ${imgHtml}
      <div class="memory-card__name">${item.name}</div>
      <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
      <div class="memory-card__type">${item.type}</div>
    `;

    card.addEventListener('click', () => {
      playClick();
      showMemoriaDetailModal(item, entry.obtained_at);
    });

    container.appendChild(card);
  });

  // Total counter header
  const header = document.createElement('div');
  header.className = 'inventory-count';
  header.style.cssText = 'grid-column:1/-1;font-family:var(--font-display);font-size:var(--fs-display);color:var(--text-muted);text-align:right;padding-bottom:var(--space-2)';
  header.textContent = `${inventory.length} Memória${inventory.length !== 1 ? 's' : ''} coletada${inventory.length !== 1 ? 's' : ''}`;
  container.prepend(header);
}

// ============================================================
//   DETAIL MODAL
// ============================================================
function showMemoriaDetailModal(item, obtainedAt) {
  const obtainedStr = obtainedAt?.seconds
    ? new Date(obtainedAt.seconds * 1000).toLocaleDateString('pt-BR')
    : obtainedAt ? new Date(obtainedAt).toLocaleDateString('pt-BR') : '—';

  const imgSection = item.image_url
    ? `<img
        src="${item.image_url}"
        alt="${item.name}"
        style="width:100px;height:100px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 0 16px rgba(109,40,217,0.6));margin:0 auto;display:block"
        onerror="this.style.display='none'"
      />`
    : `<div style="font-size:4rem;text-align:center">${_typeEmoji(item.type)}</div>`;

  const enchantsHtml = (item.enchantments ?? []).length > 0
    ? `<ul class="memoria-enchantments" style="margin-top:8px">${
        item.enchantments.map(e => `<li>${e}</li>`).join('')
      }</ul>`
    : '';

  openModal({
    title: `${item.name}`,
    confirmLabel: '✕ Fechar',
    cancelLabel: '',
    bodyHTML: `
      ${imgSection}
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0">
        <span class="rank-badge rank-badge--${item.rank.toLowerCase()}">${item.rank}</span>
        <span style="font-family:var(--font-display);color:var(--text-muted);font-size:var(--fs-display)">${item.type}</span>
      </div>
      <div style="font-family:var(--font-display);font-size:1rem;color:var(--text-secondary);text-align:center;font-style:italic;line-height:1.5;border-top:1px solid var(--color-border);padding-top:12px">
        "${item.description}"
      </div>
      ${item.lore_origin ? `<div style="font-family:var(--font-display);font-size:0.85rem;color:var(--text-muted);text-align:center;margin-top:6px">${item.lore_origin}</div>` : ''}
      ${enchantsHtml}
      <div style="font-family:var(--font-display);font-size:0.75rem;color:var(--text-muted);margin-top:12px;text-align:right">
        Obtida em ${obtainedStr}
      </div>
    `,
    onConfirm: closeModal,
  });

  // Hide the cancel button since this is a read-only view
  setTimeout(() => {
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }, 50);
}

// ============================================================
//   OVERLAY "MEMÓRIA OBTIDA" — chamada após drop
// ============================================================

/**
 * Mostra o overlay dramático ao obter uma nova Memória.
 * @param {Object} item - Documento da loot_table
 * @param {Function} onCollect - Callback quando o jogador reivindica a memória
 */
export function showMemoriaObtidaOverlay(item, onCollect) {
  const overlay = document.getElementById('memoria-overlay');
  if (!overlay) return;

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
