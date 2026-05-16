/**
 * RPG Life OS — Taverna (Finances) Module v3.0 — Firestore Edition
 * =================================================================
 * Persistência 100% Firestore. Dados isolados por UID.
 * Cada mês é um documento em: users/{uid}/taverna/{monthKey}
 * Schema: { month_key, receipts: [], expenses: [], summary_cache: null }
 */

import {
  loadState, saveState,
  calcMonthSummary, getMonthId, formatBRL, genId
} from '../engine/core.js';

import { showToast, openModal } from '../engine/gamification.js';
import { getTaverna, saveTaverna } from '../firebase/db.js';
import { auth } from '../firebase/firebase.js';

// ============================================================
//   CONSTANTS
// ============================================================
const CATEGORIES = {
  moradia:     { label: '🏠 Moradia',     css: 'cat-moradia' },
  alimentacao: { label: '🍔 Alimentação', css: 'cat-alimentacao' },
  saude:       { label: '❤️ Saúde',       css: 'cat-saude' },
  lazer:       { label: '🎮 Lazer',       css: 'cat-lazer' },
  trabalho:    { label: '💼 Trabalho',    css: 'cat-trabalho' },
  transporte:  { label: '🚗 Transporte',  css: 'cat-transporte' },
  outros:      { label: '⭐ Outros',       css: 'cat-outros' },
};

// ============================================================
//   IN-MEMORY CACHE (per session)
// ============================================================
/** @type {{ [monthKey: string]: { month_key: string, receipts: any[], expenses: any[] } }} */
let _cache = {};
let currentMonthId = getMonthId();

// ============================================================
//   FIRESTORE HELPERS
// ============================================================
function _uid() {
  return auth?.currentUser?.uid ?? null;
}

/** Returns cached month or fetches from Firestore. Always resolves. */
async function _getMonth(monthKey) {
  if (_cache[monthKey]) return _cache[monthKey];
  const uid = _uid();
  if (!uid) {
    // Fallback to localStorage if not logged in
    const state = loadState();
    return state.taverna?.months?.[monthKey] ?? _emptyMonth(monthKey);
  }
  const data = await getTaverna(uid, monthKey);
  _cache[monthKey] = data;
  return data;
}

/** Persists a month to Firestore AND syncs to localStorage for offline reads. */
async function _saveMonth(monthKey, data) {
  _cache[monthKey] = data;

  // Optimistic local sync (keeps HUD/analytics consistent)
  const state = loadState();
  if (!state.taverna) state.taverna = { months: {} };
  if (!state.taverna.months) state.taverna.months = {};
  state.taverna.months[monthKey] = data;
  saveState(state);

  const uid = _uid();
  if (!uid) return; // offline — localStorage only
  try {
    await saveTaverna(uid, monthKey, data);
  } catch (e) {
    console.warn('[Taverna] Firestore write error:', e);
    showToast('⚠️ Salvo localmente (sem conexão)', 'info', 2000);
  }
}

function _emptyMonth(monthKey) {
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return {
    month_key: monthKey,
    label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    receipts: [],
    expenses: [],
    summary_cache: null,
  };
}

// ============================================================
//   RENDER (async)
// ============================================================
export async function renderTaverna() {
  const monthData = await _getMonth(currentMonthId);

  // Compute summary
  const receipts = monthData.receipts ?? [];
  const expenses = monthData.expenses ?? [];
  const totalReceipts = receipts.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalPaid     = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalPending  = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount ?? 0), 0);
  const freeBalance   = totalReceipts - totalPaid - totalPending;

  // Month label
  const [year, month] = currentMonthId.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  _setText('month-label', monthName.charAt(0).toUpperCase() + monthName.slice(1));

  const monthPicker = document.getElementById('month-picker');
  if (monthPicker) monthPicker.value = currentMonthId;

  // Summary cards
  _setText('total-receipts', formatBRL(totalReceipts));
  _setText('total-paid',     formatBRL(totalPaid));
  _setText('total-pending',  formatBRL(totalPending));

  const balEl = document.getElementById('free-balance');
  if (balEl) {
    balEl.textContent = formatBRL(freeBalance);
    balEl.style.color = freeBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  }

  // Budget progress bar
  const totalCommitted = totalPaid + totalPending;
  const pct = totalReceipts > 0 ? Math.min((totalCommitted / totalReceipts) * 100, 100) : 0;
  const bar = document.getElementById('budget-bar-fill');
  const barPct = document.getElementById('budget-bar-pct');
  if (bar) {
    bar.style.width = `${pct.toFixed(1)}%`;
    bar.className = `budget-bar__fill ${pct > 90 ? 'budget-danger' : pct > 70 ? 'budget-warn' : 'budget-ok'}`;
  }
  if (barPct) barPct.textContent = `${pct.toFixed(0)}%`;

  // Lists
  renderReceipts(receipts);
  renderExpenses(expenses);
}

// ============================================================
//   LIST RENDERERS
// ============================================================
function catTag(category) {
  const cat = CATEGORIES[category] ?? CATEGORIES.outros;
  return `<span class="category-tag ${cat.css}">${cat.label}</span>`;
}

function renderReceipts(receipts) {
  const list = document.getElementById('receipts-list');
  if (!list) return;
  if (receipts.length === 0) { list.innerHTML = '<p class="empty-state">Nenhuma receita.</p>'; return; }

  list.innerHTML = '';
  receipts.forEach(r => {
    const item = document.createElement('div');
    item.className = 'entry-item entry-item--receipt';
    item.innerHTML = `
      <span class="entry-item__description">${r.description}</span>
      ${catTag(r.category)}
      <span class="text-muted font-display">${r.date}</span>
      <span class="entry-item__amount text-success">${formatBRL(r.amount)}</span>
      <button class="btn-icon" title="Editar" style="font-size:0.7rem" data-edit-rec="${r.id}">✏️</button>
      <button class="btn-icon" title="Remover" style="font-size:0.7rem;color:var(--color-danger)" data-del-rec="${r.id}">🗑️</button>
    `;
    item.querySelector(`[data-edit-rec]`)?.addEventListener('click', () => openEditReceiptModal(r.id));
    item.querySelector(`[data-del-rec]`)?.addEventListener('click', () => deleteEntry('receipt', r.id));
    list.appendChild(item);
  });
}

function renderExpenses(expenses) {
  const list = document.getElementById('expenses-list');
  if (!list) return;
  if (expenses.length === 0) { list.innerHTML = '<p class="empty-state">Nenhuma despesa.</p>'; return; }

  list.innerHTML = '';
  expenses.forEach(e => {
    const item = document.createElement('div');
    item.className = `entry-item entry-item--expense-${e.status}`;
    item.innerHTML = `
      <span class="entry-item__description">${e.description}${e.recurring ? ' 🔄' : ''}</span>
      ${catTag(e.category)}
      <span class="text-muted font-display">${e.date}</span>
      <span class="entry-item__amount" style="color:${e.status === 'paid' ? 'var(--color-danger)' : 'var(--color-warning)'}">-${formatBRL(e.amount)}</span>
      <span class="status-badge status-badge--${e.status}">${e.status === 'paid' ? 'Pago' : 'Previsto'}</span>
      ${e.status === 'pending' ? `<button class="btn-icon" title="Marcar pago" style="font-size:0.7rem" data-pay="${e.id}">✅</button>` : ''}
      <button class="btn-icon" title="Editar" style="font-size:0.7rem" data-edit-exp="${e.id}">✏️</button>
      <button class="btn-icon" title="Remover" style="font-size:0.7rem;color:var(--color-danger)" data-del-exp="${e.id}">🗑️</button>
    `;
    if (e.status === 'pending') {
      item.querySelector(`[data-pay]`)?.addEventListener('click', () => markPaid(e.id));
    }
    item.querySelector(`[data-edit-exp]`)?.addEventListener('click', () => openEditExpenseModal(e.id));
    item.querySelector(`[data-del-exp]`)?.addEventListener('click', () => deleteEntry('expense', e.id));
    list.appendChild(item);
  });
}

// ============================================================
//   HELPERS
// ============================================================
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function navigateMonth(delta) {
  const [year, month] = currentMonthId.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  currentMonthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  // When navigating forward, seed recurring from previous month
  if (delta > 0) {
    const prev = await _getMonth(_prevMonthId(currentMonthId));
    const cur  = await _getMonth(currentMonthId);
    let changed = false;

    // Copy recurring receipts
    (prev.receipts ?? []).filter(r => r.recurring).forEach(r => {
      const remaining = r.recurring_months != null ? r.recurring_months - 1 : null;
      if (remaining !== null && remaining < 0) return;
      if (!(cur.receipts ?? []).find(cr => cr.description === r.description)) {
        cur.receipts = cur.receipts ?? [];
        cur.receipts.push({ ...r, id: genId('rec'), date: currentMonthId + '-01', recurring_months: remaining });
        changed = true;
      }
    });
    // Copy recurring expenses
    (prev.expenses ?? []).filter(e => e.recurring).forEach(e => {
      const remaining = e.recurring_months != null ? e.recurring_months - 1 : null;
      if (remaining !== null && remaining < 0) return;
      if (!(cur.expenses ?? []).find(ce => ce.description === e.description)) {
        cur.expenses = cur.expenses ?? [];
        cur.expenses.push({ ...e, id: genId('exp'), status: 'pending', date: currentMonthId + '-10', recurring_months: remaining });
        changed = true;
      }
    });

    if (changed) await _saveMonth(currentMonthId, cur);
  }

  await renderTaverna();
}

function _prevMonthId(monthId) {
  const [y, m] = monthId.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function markPaid(id) {
  const data = await _getMonth(currentMonthId);
  const exp = data.expenses?.find(e => e.id === id);
  if (!exp) return;
  exp.status = 'paid';
  await _saveMonth(currentMonthId, data);
  showToast('✅ Despesa marcada como paga!', 'info');
  renderTaverna();
}

async function deleteEntry(type, id) {
  const data = await _getMonth(currentMonthId);
  if (type === 'receipt') {
    data.receipts = (data.receipts ?? []).filter(r => r.id !== id);
  } else {
    data.expenses = (data.expenses ?? []).filter(e => e.id !== id);
  }
  await _saveMonth(currentMonthId, data);
  showToast('🗑️ Entrada removida.', 'info', 1500);
  renderTaverna();
}

// ============================================================
//   FORM BUILDERS
// ============================================================
function buildReceiptForm(r = {}) {
  const catSel = Object.entries(CATEGORIES).map(([key, val]) =>
    `<option value="${key}"${key === (r.category ?? 'trabalho') ? ' selected' : ''}>${val.label}</option>`
  ).join('');
  return `
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input class="form-input" id="rec-desc" type="text" value="${r.description ?? ''}" placeholder="Ex: Salário" />
    </div>
    <div class="form-group">
      <label class="form-label">Valor (R$)</label>
      <input class="form-input" id="rec-amount" type="number" min="0" step="0.01" value="${r.amount ?? ''}" placeholder="0,00" />
    </div>
    <div class="form-group">
      <label class="form-label">Data</label>
      <input class="form-input" id="rec-date" type="date" value="${r.date ?? new Date().toISOString().slice(0, 10)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select class="form-select" id="rec-cat">${catSel}</select>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:var(--space-3)" id="rec-recurring-wrap">
      <input type="checkbox" id="rec-recurring" ${r.recurring ? 'checked' : ''} onchange="document.getElementById('rec-months-wrap').style.display=this.checked?'flex':'none'" />
      <label class="form-label" for="rec-recurring" style="margin:0">Recorrente (copiar próximos meses)</label>
    </div>
    <div class="form-group" id="rec-months-wrap" style="display:${r.recurring ? 'flex' : 'none'};align-items:center;gap:var(--space-3);">
      <label class="form-label" style="flex-shrink:0;">Duração (meses):</label>
      <input class="form-input" id="rec-months" type="number" min="1" max="60" value="${r.recurring_months ?? 12}" style="width:80px;" />
    </div>
  `;
}

function buildExpenseForm(e = {}) {
  const catSel = Object.entries(CATEGORIES).map(([key, val]) =>
    `<option value="${key}"${key === (e.category ?? 'outros') ? ' selected' : ''}>${val.label}</option>`
  ).join('');
  return `
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <input class="form-input" id="exp-desc" type="text" value="${e.description ?? ''}" placeholder="Ex: Aluguel" />
    </div>
    <div class="form-group">
      <label class="form-label">Valor (R$)</label>
      <input class="form-input" id="exp-amount" type="number" min="0" step="0.01" value="${e.amount ?? ''}" placeholder="0,00" />
    </div>
    <div class="form-group">
      <label class="form-label">Data de Vencimento</label>
      <input class="form-input" id="exp-date" type="date" value="${e.date ?? new Date().toISOString().slice(0, 10)}" />
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select class="form-select" id="exp-cat">${catSel}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" id="exp-status">
        <option value="pending"${e.status !== 'paid' ? ' selected' : ''}>⏳ Previsto</option>
        <option value="paid"${e.status === 'paid' ? ' selected' : ''}>✅ Pago</option>
      </select>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:var(--space-3)">
      <input type="checkbox" id="exp-recurring" ${e.recurring ? 'checked' : ''} onchange="document.getElementById('exp-months-wrap').style.display=this.checked?'flex':'none'" />
      <label class="form-label" for="exp-recurring" style="margin:0">Recorrente</label>
    </div>
    <div class="form-group" id="exp-months-wrap" style="display:${e.recurring ? 'flex' : 'none'};align-items:center;gap:var(--space-3);">
      <label class="form-label" style="flex-shrink:0;">Duração (meses):</label>
      <input class="form-input" id="exp-months" type="number" min="1" max="60" value="${e.recurring_months ?? 12}" style="width:80px;" />
    </div>
  `;
}

function getReceiptValues() {
  const recurring = document.getElementById('rec-recurring')?.checked ?? false;
  return {
    description:     document.getElementById('rec-desc')?.value?.trim(),
    amount:          parseFloat(document.getElementById('rec-amount')?.value ?? '0'),
    date:            document.getElementById('rec-date')?.value,
    category:        document.getElementById('rec-cat')?.value ?? 'outros',
    recurring,
    recurring_months: recurring ? parseInt(document.getElementById('rec-months')?.value ?? '12', 10) : null,
  };
}

function getExpenseValues() {
  const recurring = document.getElementById('exp-recurring')?.checked ?? false;
  return {
    description:     document.getElementById('exp-desc')?.value?.trim(),
    amount:          parseFloat(document.getElementById('exp-amount')?.value ?? '0'),
    date:            document.getElementById('exp-date')?.value,
    category:        document.getElementById('exp-cat')?.value ?? 'outros',
    status:          document.getElementById('exp-status')?.value ?? 'pending',
    recurring,
    recurring_months: recurring ? parseInt(document.getElementById('exp-months')?.value ?? '12', 10) : null,
  };
}

// ============================================================
//   MODALS
// ============================================================
function openAddReceiptModal() {
  openModal({
    title: '+ Nova Receita',
    bodyHTML: buildReceiptForm(),
    confirmLabel: 'Salvar Receita',
    onConfirm: async () => {
      const vals = getReceiptValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) {
        showToast('⚠️ Preencha todos os campos!', 'info', 2000); return;
      }
      const data = await _getMonth(currentMonthId);
      data.receipts = data.receipts ?? [];
      data.receipts.push({ id: genId('rec'), ...vals });
      await _saveMonth(currentMonthId, data);
      showToast('💰 Receita adicionada!', 'info');
      renderTaverna();
    },
  });
}

async function openEditReceiptModal(id) {
  const data = await _getMonth(currentMonthId);
  const r = data.receipts?.find(r => r.id === id);
  if (!r) return;
  openModal({
    title: 'Editar Receita',
    bodyHTML: buildReceiptForm(r),
    confirmLabel: '💾 Salvar',
    onConfirm: async () => {
      const vals = getReceiptValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      const d2 = await _getMonth(currentMonthId);
      const rec = d2.receipts?.find(r => r.id === id);
      if (rec) {
        Object.assign(rec, vals);
        await _saveMonth(currentMonthId, d2);
        showToast('💾 Receita atualizada!', 'info');
        renderTaverna();
      }
    },
  });
}

function openAddExpenseModal() {
  openModal({
    title: '+ Nova Despesa',
    bodyHTML: buildExpenseForm(),
    confirmLabel: 'Salvar Despesa',
    onConfirm: async () => {
      const vals = getExpenseValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      const data = await _getMonth(currentMonthId);
      data.expenses = data.expenses ?? [];
      data.expenses.push({ id: genId('exp'), ...vals });
      await _saveMonth(currentMonthId, data);
      showToast('📊 Despesa registrada!', 'info');
      renderTaverna();
    },
  });
}

async function openEditExpenseModal(id) {
  const data = await _getMonth(currentMonthId);
  const e = data.expenses?.find(e => e.id === id);
  if (!e) return;
  openModal({
    title: 'Editar Despesa',
    bodyHTML: buildExpenseForm(e),
    confirmLabel: '💾 Salvar',
    onConfirm: async () => {
      const vals = getExpenseValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      const d2 = await _getMonth(currentMonthId);
      const exp = d2.expenses?.find(e => e.id === id);
      if (exp) {
        Object.assign(exp, vals);
        await _saveMonth(currentMonthId, d2);
        showToast('💾 Despesa atualizada!', 'info');
        renderTaverna();
      }
    },
  });
}

// ============================================================
//   INIT — prefetch current month on tab open
// ============================================================
export async function initTaverna() {
  // Prefetch current month from Firestore into cache
  await _getMonth(currentMonthId);

  renderTaverna(); // non-blocking second render with cached data

  document.getElementById('btn-add-receipt')?.addEventListener('click', openAddReceiptModal);
  document.getElementById('btn-add-expense')?.addEventListener('click', openAddExpenseModal);
  document.getElementById('btn-prev-month')?.addEventListener('click', () => navigateMonth(-1));
  document.getElementById('btn-next-month')?.addEventListener('click', () => navigateMonth(+1));

  const monthPicker = document.getElementById('month-picker');
  if (monthPicker && !monthPicker.dataset.wired) {
    monthPicker.dataset.wired = '1';
    monthPicker.addEventListener('change', async (ev) => {
      if (ev.target.value) {
        currentMonthId = ev.target.value;
        await _getMonth(currentMonthId); // prefetch
        renderTaverna();
      }
    });
  }
}

// ============================================================
//   BOOT PREFETCH — call from app.js after login to warm cache
// ============================================================
export async function prefetchTavernaMonth(uid, monthKey) {
  if (!uid || !monthKey) return;
  const data = await getTaverna(uid, monthKey);
  _cache[monthKey] = data;

  // Also seed localStorage so offline reads work
  const state = loadState();
  if (!state.taverna) state.taverna = { months: {} };
  if (!state.taverna.months) state.taverna.months = {};
  state.taverna.months[monthKey] = data;
  saveState(state);
}
