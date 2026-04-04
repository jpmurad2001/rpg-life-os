/**
 * RPG Life OS — Taverna (Finances) Module (Phase 2)
 * Edit/delete entries, colored categories, budget bar, recurring expenses.
 */

import {
  loadState, saveState,
  calcMonthSummary, getMonthId, formatBRL, genId
} from '../engine/core.js';

import { showToast, openModal } from '../engine/gamification.js';

// ============================================================
//   CONSTANTS
// ============================================================
const CATEGORIES = {
  moradia: { label: '🏠 Moradia', css: 'cat-moradia' },
  alimentacao: { label: '🍔 Alimentação', css: 'cat-alimentacao' },
  saude: { label: '❤️ Saúde', css: 'cat-saude' },
  lazer: { label: '🎮 Lazer', css: 'cat-lazer' },
  trabalho: { label: '💼 Trabalho', css: 'cat-trabalho' },
  transporte: { label: '🚗 Transporte', css: 'cat-transporte' },
  outros: { label: '⭐ Outros', css: 'cat-outros' },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([key, val]) =>
  `<option value="${key}">${val.label}</option>`
).join('');

// ============================================================
//   STATE
// ============================================================
let currentMonthId = getMonthId();

// ============================================================
//   RENDER
// ============================================================
export function renderTaverna() {
  let state = loadState();
  ensureMonth(state, currentMonthId);
  saveState(state);
  state = loadState();

  const summary = calcMonthSummary(state, currentMonthId);
  saveState(state);

  // Month label
  const [year, month] = currentMonthId.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  _setText('month-label', monthName.charAt(0).toUpperCase() + monthName.slice(1));

  // Summary cards
  if (summary) {
    _setText('total-receipts', formatBRL(summary.total_receipts));
    _setText('total-paid', formatBRL(summary.total_paid));
    _setText('total-pending', formatBRL(summary.total_pending));

    const balEl = document.getElementById('free-balance');
    if (balEl) {
      balEl.textContent = formatBRL(summary.free_balance);
      balEl.style.color = summary.free_balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    }

    // Budget progress bar
    const totalCommitted = summary.total_paid + summary.total_pending;
    const pct = summary.total_receipts > 0
      ? Math.min((totalCommitted / summary.total_receipts) * 100, 100)
      : 0;

    const bar = document.getElementById('budget-bar-fill');
    const barPct = document.getElementById('budget-bar-pct');
    if (bar) {
      bar.style.width = `${pct.toFixed(1)}%`;
      bar.className = `budget-bar__fill ${pct > 90 ? 'budget-danger' : pct > 70 ? 'budget-warn' : 'budget-ok'}`;
    }
    if (barPct) barPct.textContent = `${pct.toFixed(0)}%`;
  }

  // Lists
  const monthData = state.taverna.months[currentMonthId];
  renderReceipts(monthData?.receipts ?? []);
  renderExpenses(monthData?.expenses ?? []);
}

function catTag(category) {
  const cat = CATEGORIES[category] ?? CATEGORIES.outros;
  return `<span class="category-tag ${cat.css}">${cat.label}</span>`;
}

function renderReceipts(receipts) {
  const list = document.getElementById('receipts-list');
  if (!list) return;

  if (receipts.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhuma receita.</p>';
    return;
  }

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

  if (expenses.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhuma despesa.</p>';
    return;
  }

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
function ensureMonth(state, monthId) {
  if (!state.taverna.months[monthId]) {
    const [year, month] = monthId.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    state.taverna.months[monthId] = {
      id: monthId,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      receipts: [],
      expenses: [],
      summary_cache: null,
    };
  }
  return state;
}

function copyRecurringFromPrev(state, monthId) {
  const [year, month] = monthId.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevId = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prev = state.taverna.months[prevId];
  if (!prev) return;

  const current = state.taverna.months[monthId];
  // Copy recurring receipts if still within duration
  prev.receipts.filter(r => r.recurring).forEach(r => {
    const remaining = r.recurring_months != null ? r.recurring_months - 1 : null;
    if (remaining !== null && remaining < 0) return; // expired
    if (!current.receipts.find(cr => cr.description === r.description)) {
      current.receipts.push({ ...r, id: genId('rec'), date: monthId + '-01',
        recurring_months: remaining });
    }
  });
  // Copy recurring expenses if still within duration
  prev.expenses.filter(e => e.recurring).forEach(e => {
    const remaining = e.recurring_months != null ? e.recurring_months - 1 : null;
    if (remaining !== null && remaining < 0) return; // expired
    if (!current.expenses.find(ce => ce.description === e.description)) {
      current.expenses.push({ ...e, id: genId('exp'), status: 'pending',
        date: monthId + '-10', recurring_months: remaining });
    }
  });
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function navigateMonth(delta) {
  const [year, month] = currentMonthId.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  currentMonthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  // When navigating forward, copy recurring
  if (delta > 0) {
    let state = loadState();
    ensureMonth(state, currentMonthId);
    copyRecurringFromPrev(state, currentMonthId);
    saveState(state);
  }

  renderTaverna();
}

function markPaid(id) {
  let state = loadState();
  const exp = state.taverna.months[currentMonthId]?.expenses.find(e => e.id === id);
  if (exp) { exp.status = 'paid'; saveState(state); renderTaverna(); showToast('✅ Despesa marcada como paga!', 'info'); }
}

function deleteEntry(type, id) {
  let state = loadState();
  const month = state.taverna.months[currentMonthId];
  if (!month) return;
  if (type === 'receipt') {
    month.receipts = month.receipts.filter(r => r.id !== id);
  } else {
    month.expenses = month.expenses.filter(e => e.id !== id);
  }
  saveState(state);
  renderTaverna();
  showToast('🗑️ Entrada removida.', 'info', 1500);
}

// ============================================================
//   MODALS — ADD
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
        <option value="pending"${e.status !== 'paid' ? 'selected' : ''}>⏳ Previsto</option>
        <option value="paid"${e.status === 'paid' ? 'selected' : ''}>✅ Pago</option>
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
    description: document.getElementById('rec-desc')?.value?.trim(),
    amount: parseFloat(document.getElementById('rec-amount')?.value ?? '0'),
    date: document.getElementById('rec-date')?.value,
    category: document.getElementById('rec-cat')?.value ?? 'outros',
    recurring,
    recurring_months: recurring ? parseInt(document.getElementById('rec-months')?.value ?? '12', 10) : null,
  };
}

function getExpenseValues() {
  const recurring = document.getElementById('exp-recurring')?.checked ?? false;
  return {
    description: document.getElementById('exp-desc')?.value?.trim(),
    amount: parseFloat(document.getElementById('exp-amount')?.value ?? '0'),
    date: document.getElementById('exp-date')?.value,
    category: document.getElementById('exp-cat')?.value ?? 'outros',
    status: document.getElementById('exp-status')?.value ?? 'pending',
    recurring,
    recurring_months: recurring ? parseInt(document.getElementById('exp-months')?.value ?? '12', 10) : null,
  };
}

function openAddReceiptModal() {
  openModal({
    title: '+ Nova Receita',
    bodyHTML: buildReceiptForm(),
    confirmLabel: 'Salvar Receita',
    onConfirm: () => {
      const vals = getReceiptValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) {
        showToast('⚠️ Preencha todos os campos!', 'info', 2000); return;
      }
      let state = loadState();
      ensureMonth(state, currentMonthId);
      state.taverna.months[currentMonthId].receipts.push({ id: genId('rec'), ...vals });
      saveState(state);
      showToast('💰 Receita adicionada!', 'info');
      renderTaverna();
    },
  });
}

function openEditReceiptModal(id) {
  const state = loadState();
  const r = state.taverna.months[currentMonthId]?.receipts.find(r => r.id === id);
  if (!r) return;
  openModal({
    title: 'Editar Receita',
    bodyHTML: buildReceiptForm(r),
    confirmLabel: '💾 Salvar',
    onConfirm: () => {
      const vals = getReceiptValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      let st = loadState();
      const rec = st.taverna.months[currentMonthId]?.receipts.find(r => r.id === id);
      if (rec) { Object.assign(rec, vals); saveState(st); showToast('💾 Receita atualizada!', 'info'); renderTaverna(); }
    },
  });
}

function openAddExpenseModal() {
  openModal({
    title: '+ Nova Despesa',
    bodyHTML: buildExpenseForm(),
    confirmLabel: 'Salvar Despesa',
    onConfirm: () => {
      const vals = getExpenseValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      let state = loadState();
      ensureMonth(state, currentMonthId);
      state.taverna.months[currentMonthId].expenses.push({ id: genId('exp'), ...vals });
      saveState(state);
      showToast('📊 Despesa registrada!', 'info');
      renderTaverna();
    },
  });
}

function openEditExpenseModal(id) {
  const state = loadState();
  const e = state.taverna.months[currentMonthId]?.expenses.find(e => e.id === id);
  if (!e) return;
  openModal({
    title: 'Editar Despesa',
    bodyHTML: buildExpenseForm(e),
    confirmLabel: '💾 Salvar',
    onConfirm: () => {
      const vals = getExpenseValues();
      if (!vals.description || !vals.amount || vals.amount <= 0) { showToast('⚠️ Preencha todos os campos!', 'info', 2000); return; }
      let st = loadState();
      const exp = st.taverna.months[currentMonthId]?.expenses.find(e => e.id === id);
      if (exp) { Object.assign(exp, vals); saveState(st); showToast('💾 Despesa atualizada!', 'info'); renderTaverna(); }
    },
  });
}

// ============================================================
//   INIT
// ============================================================
export function initTaverna() {
  renderTaverna();
  document.getElementById('btn-add-receipt')?.addEventListener('click', openAddReceiptModal);
  document.getElementById('btn-add-expense')?.addEventListener('click', openAddExpenseModal);
  document.getElementById('btn-prev-month')?.addEventListener('click', () => navigateMonth(-1));
  document.getElementById('btn-next-month')?.addEventListener('click', () => navigateMonth(+1));
}
