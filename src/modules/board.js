/**
 * RPG Life OS v2.1 Diamond — Quadro de Missões (Kanban Board)
 * =============================================================
 * State management, drag-and-drop (HTML5 native) and rendering
 * for the Mission Board feature. Follows the existing module
 * pattern (loadState / saveState, openModal, showToast, genId).
 */

import { loadState, saveState, genId } from '../engine/core.js';
import { openModal, closeModal, showToast } from '../engine/gamification.js';
import { playSound, playClick, playDrop, playWoosh } from '../engine/audio.js';

// ============================================================
//   PRIORITY CONFIG (RPG Rarity)
// ============================================================
export const PRIORITY_META = {
  normal:    { label: 'Normal',    icon: '⬜', color: '#78c97e', class: 'priority--normal'    },
  epic:      { label: 'Épico',     icon: '🟣', color: '#9c4dfa', class: 'priority--epic'      },
  legendary: { label: 'Lendário', icon: '🟡', color: '#ffd700', class: 'priority--legendary' },
};

// ============================================================
//   DRAG & DROP STATE
// ============================================================
let _draggingCardId = null;
let _draggingFromColId = null;
let _draggingBoardId = null;
let _activeBoardId = null;   // currently displayed board

// ============================================================
//   STATE SELECTORS
// ============================================================
function getBoards() {
  return loadState().boards ?? [];
}

function getBoardById(boardId) {
  return getBoards().find(b => b.id === boardId) ?? null;
}

function getColumnById(board, colId) {
  return board?.columns?.find(c => c.id === colId) ?? null;
}

function getCardById(col, cardId) {
  return col?.cards?.find(c => c.id === cardId) ?? null;
}

// ============================================================
//   STATE MUTATIONS
// ============================================================

/** Creates a new Board with default columns */
export function createBoard(title) {
  const state = loadState();
  const now = new Date().toISOString();
  const board = {
    id: genId('board'),
    title: title.trim(),
    created_at: now,
    columns: [
      { id: genId('col'), title: '📋 Backlog',      cards: [] },
      { id: genId('col'), title: '⚔️ Em Progresso', cards: [] },
      { id: genId('col'), title: '✅ Concluído',    cards: [] },
    ],
  };
  state.boards.push(board);
  saveState(state);
  return board;
}

/** Removes a Board by ID */
export function deleteBoard(boardId) {
  const state = loadState();
  state.boards = state.boards.filter(b => b.id !== boardId);
  saveState(state);
}

/** Renames a Board */
export function renameBoard(boardId, newTitle) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (board) { board.title = newTitle.trim(); saveState(state); }
}

/** Adds a column to a board */
export function addColumn(boardId, title) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;
  board.columns.push({ id: genId('col'), title: title.trim(), cards: [] });
  saveState(state);
}

/** Deletes a column (and all its cards) */
export function deleteColumn(boardId, colId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;
  board.columns = board.columns.filter(c => c.id !== colId);
  saveState(state);
}

/** Renames a column */
export function renameColumn(boardId, colId, newTitle) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (col) { col.title = newTitle.trim(); saveState(state); }
}

/** Creates a new Card inside a column */
export function addCard(boardId, colId, { title, description = '', priority = 'normal', subtasks = [] }) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (!col) return null;

  const card = {
    id:          genId('card'),
    title:       title.trim(),
    description,
    priority,    // 'normal' | 'epic' | 'legendary'
    subtasks:    subtasks.map(s => ({
      id:   genId('sub'),
      text: typeof s === 'string' ? s : s.text,
      done: false,
    })),
    created_at:  new Date().toISOString(),
  };
  col.cards.push(card);
  saveState(state);
  return card;
}

/** Moves a card from one column to another within the same board */
export function moveCard(boardId, cardId, fromColId, toColId) {
  if (fromColId === toColId) return;
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;

  const fromCol = board.columns.find(c => c.id === fromColId);
  const toCol   = board.columns.find(c => c.id === toColId);
  if (!fromCol || !toCol) return;

  const idx  = fromCol.cards.findIndex(c => c.id === cardId);
  if (idx < 0) return;

  const [card] = fromCol.cards.splice(idx, 1);
  toCol.cards.push(card);
  saveState(state);
}

/** Patches card fields (title, description, priority) */
export function updateCard(boardId, colId, cardId, patch) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  Object.assign(card, patch);
  saveState(state);
}

/** Adds a subtask to a card */
export function addSubtask(boardId, colId, cardId, text) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  card.subtasks.push({ id: genId('sub'), text: text.trim(), done: false });
  saveState(state);
}

/** Toggles a subtask done/undone */
export function toggleSubtask(boardId, colId, cardId, subId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  const sub   = card?.subtasks.find(s => s.id === subId);
  if (!sub) return;
  sub.done = !sub.done;
  saveState(state);
}

/** Deletes a subtask from a card */
export function deleteSubtask(boardId, colId, cardId, subId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  card.subtasks = card.subtasks.filter(s => s.id !== subId);
  saveState(state);
}

/** Removes a card from its column */
export function deleteCard(boardId, colId, cardId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (!col) return;
  col.cards = col.cards.filter(c => c.id !== cardId);
  saveState(state);
}

// ============================================================
//   HELPERS
// ============================================================
function calcProgress(card) {
  if (!card.subtasks || card.subtasks.length === 0) return -1; // no bar
  const done = card.subtasks.filter(s => s.done).length;
  return Math.round((done / card.subtasks.length) * 100);
}

// ============================================================
//   CARD DETAIL MODAL
// ============================================================
function openCardModal(boardId, colId, cardId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;

  const prioOptions = Object.entries(PRIORITY_META).map(([key, meta]) =>
    `<option value="${key}" ${card.priority === key ? 'selected' : ''}>${meta.icon} ${meta.label}</option>`
  ).join('');

  const subtasksHTML = card.subtasks.map(sub => `
    <div class="board-subtask-row" data-sub-id="${sub.id}">
      <button class="board-subtask-check ${sub.done ? 'board-subtask-check--done' : ''}"
              data-board="${boardId}" data-col="${colId}" data-card="${cardId}" data-sub="${sub.id}"
              aria-label="${sub.done ? 'Desmarcar' : 'Marcar'} subtarefa">
        ${sub.done ? '✓' : ''}
      </button>
      <span class="board-subtask-text ${sub.done ? 'board-subtask-text--done' : ''}">${sub.text}</span>
      <button class="board-subtask-del" data-board="${boardId}" data-col="${colId}"
              data-card="${cardId}" data-sub="${sub.id}" aria-label="Remover subtarefa">✕</button>
    </div>
  `).join('');

  const progress = calcProgress(card);

  openModal({
    title: `${PRIORITY_META[card.priority]?.icon ?? '📌'} Detalhes da Missão`,
    confirmLabel: '💾 Salvar',
    bodyHTML: `
      <div class="board-modal-body">

        <div class="form-group">
          <label class="form-label">Título da Missão</label>
          <input class="form-input" id="bm-title" type="text"
                 value="${card.title.replace(/"/g, '&quot;')}" maxlength="80" />
        </div>

        <div class="form-group">
          <label class="form-label">Prioridade</label>
          <select class="form-select" id="bm-priority">${prioOptions}</select>
        </div>

        <div class="form-group">
          <label class="form-label">Descrição / Detalhes do Lore</label>
          <textarea class="form-input form-textarea" id="bm-desc"
                    rows="4" placeholder="Descreva os objetivos desta missão..."
          >${card.description}</textarea>
        </div>

        ${progress >= 0 ? `
        <div class="bm-progress-wrap">
          <div class="bm-progress-label">
            <span>⚙️ Checklist</span>
            <span id="bm-progress-pct">${progress}%</span>
          </div>
          <div class="bm-progress-bar">
            <div class="bm-progress-fill" id="bm-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">📋 Subtarefas (Checklist)</label>
          <div class="board-subtasks-list" id="bm-subtasks">${subtasksHTML}</div>
          <div class="board-add-subtask-row">
            <input class="form-input" id="bm-new-sub" type="text"
                   placeholder="Nova subtarefa..." maxlength="120" />
            <button class="btn-rp btn-rp--ghost" id="bm-add-sub" style="font-size:var(--fs-xxs);">+ Add</button>
          </div>
        </div>

        <div style="margin-top:var(--space-3); text-align:right;">
          <button class="btn-rp btn-rp--danger" id="bm-delete-card"
                  data-board="${boardId}" data-col="${colId}" data-card="${cardId}"
                  style="font-size:var(--fs-xxs);">🗑️ Deletar Missão</button>
        </div>
      </div>
    `,
    onConfirm: () => {
      const newTitle = document.getElementById('bm-title')?.value?.trim();
      const newPrio  = document.getElementById('bm-priority')?.value;
      const newDesc  = document.getElementById('bm-desc')?.value ?? '';
      if (!newTitle) { showToast('⚠️ A missão precisa de um título!', 'info', 2000); return false; }
      updateCard(boardId, colId, cardId, { title: newTitle, priority: newPrio, description: newDesc });
      showToast('✅ Missão atualizada!', 'info', 1500);
      renderBoard();
    },
  });

  // Wire subtask toggle / delete after modal renders
  setTimeout(() => {
    // Toggle subtask done
    document.querySelectorAll('.board-subtask-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const { board: bId, col: cId, card: cdId, sub: sId } = btn.dataset;
        toggleSubtask(bId, cId, cdId, sId);
        _refreshSubtaskUI(bId, cId, cdId);
        playClick();
      });
    });

    // Delete subtask
    document.querySelectorAll('.board-subtask-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const { board: bId, col: cId, card: cdId, sub: sId } = btn.dataset;
        deleteSubtask(bId, cId, cdId, sId);
        btn.closest('.board-subtask-row')?.remove();
        _refreshSubtaskUI(bId, cId, cdId);
      });
    });

    // Add new subtask
    document.getElementById('bm-add-sub')?.addEventListener('click', () => {
      const input = document.getElementById('bm-new-sub');
      const text  = input?.value?.trim();
      if (!text) return;
      addSubtask(boardId, colId, cardId, text);
      input.value = '';
      _refreshSubtaskUI(boardId, colId, cardId);
      playClick();
    });

    document.getElementById('bm-new-sub')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('bm-add-sub')?.click();
    });

    // Delete card
    document.getElementById('bm-delete-card')?.addEventListener('click', () => {
      const { board: bId, col: cId, card: cdId } = document.getElementById('bm-delete-card').dataset;
      closeModal();
      openModal({
        title: '🗑️ Deletar Missão',
        bodyHTML: `<p class="font-display" style="font-size:var(--fs-display);color:var(--text-primary)">
          Tem certeza que quer remover esta missão do Quadro? A ação é irreversível.
        </p>`,
        confirmLabel: '✕ Deletar',
        onConfirm: () => {
          deleteCard(bId, cId, cdId);
          showToast('🗑️ Missão removida.', 'info', 1500);
          renderBoard();
        },
      });
    });
  }, 80);
}

/** Refreshes the subtask list inside the open modal without closing it */
function _refreshSubtaskUI(boardId, colId, cardId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;

  const listEl = document.getElementById('bm-subtasks');
  if (listEl) {
    listEl.innerHTML = card.subtasks.map(sub => `
      <div class="board-subtask-row" data-sub-id="${sub.id}">
        <button class="board-subtask-check ${sub.done ? 'board-subtask-check--done' : ''}"
                data-board="${boardId}" data-col="${colId}" data-card="${cardId}" data-sub="${sub.id}">
          ${sub.done ? '✓' : ''}
        </button>
        <span class="board-subtask-text ${sub.done ? 'board-subtask-text--done' : ''}">${sub.text}</span>
        <button class="board-subtask-del" data-board="${boardId}" data-col="${colId}"
                data-card="${cardId}" data-sub="${sub.id}">✕</button>
      </div>
    `).join('');

    // Re-wire events
    listEl.querySelectorAll('.board-subtask-check').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleSubtask(btn.dataset.board, btn.dataset.col, btn.dataset.card, btn.dataset.sub);
        _refreshSubtaskUI(boardId, colId, cardId);
        playClick();
      });
    });
    listEl.querySelectorAll('.board-subtask-del').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteSubtask(btn.dataset.board, btn.dataset.col, btn.dataset.card, btn.dataset.sub);
        btn.closest('.board-subtask-row')?.remove();
        _refreshSubtaskUI(boardId, colId, cardId);
      });
    });
  }

  // Update progress
  const progress = calcProgress(card);
  const pctEl    = document.getElementById('bm-progress-pct');
  const fillEl   = document.getElementById('bm-progress-fill');
  if (pctEl)  pctEl.textContent  = `${progress}%`;
  if (fillEl) fillEl.style.width = `${progress}%`;
}

// ============================================================
//   BUILD DOM — CARD
// ============================================================
function buildCard(card, boardId, colId) {
  const meta     = PRIORITY_META[card.priority] ?? PRIORITY_META.normal;
  const progress = calcProgress(card);
  const hasProgress = progress >= 0;

  const el = document.createElement('div');
  el.className = 'board-card';
  el.dataset.cardId  = card.id;
  el.dataset.colId   = colId;
  el.dataset.boardId = boardId;
  el.setAttribute('draggable', 'true');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Missão: ${card.title}. Prioridade: ${meta.label}`);

  el.innerHTML = `
    <div class="board-card__header">
      <span class="board-priority-badge ${meta.class}">${meta.icon} ${meta.label}</span>
    </div>
    <div class="board-card__title">${card.title}</div>
    ${card.description ? `<div class="board-card__desc">${card.description}</div>` : ''}
    ${hasProgress ? `
    <div class="board-card__progress-wrap">
      <div class="board-card__progress-bar">
        <div class="board-card__progress-fill ${progress === 100 ? 'board-card__progress-fill--done' : ''}"
             style="width:${progress}%"></div>
      </div>
      <span class="board-card__progress-label">${card.subtasks.filter(s=>s.done).length}/${card.subtasks.length}</span>
    </div>` : ''}
  `;

  // Drag events
  el.addEventListener('dragstart', e => {
    _draggingCardId    = card.id;
    _draggingFromColId = colId;
    _draggingBoardId   = boardId;
    el.classList.add('board-card--dragging');
    e.dataTransfer.effectAllowed = 'move';
    playWoosh();
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('board-card--dragging');
    _draggingCardId    = null;
    _draggingFromColId = null;
    _draggingBoardId   = null;
  });

  // Click → open modal
  el.addEventListener('click', () => openCardModal(boardId, colId, card.id));
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openCardModal(boardId, colId, card.id);
  });

  return el;
}

// ============================================================
//   BUILD DOM — COLUMN
// ============================================================
function buildColumn(col, boardId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'board-column';
  wrapper.dataset.colId = col.id;

  wrapper.innerHTML = `
    <div class="board-column__header">
      <span class="board-column__title">${col.title}</span>
      <span class="board-column__count">${col.cards.length}</span>
    </div>
    <div class="board-column__cards" data-col-id="${col.id}">
    </div>
    <button class="board-add-card-btn" data-col="${col.id}" data-board="${boardId}"
            aria-label="Adicionar missão à coluna ${col.title}">
      ⚔️ + Nova Missão
    </button>
  `;

  // Populate cards
  const cardsEl = wrapper.querySelector('.board-column__cards');
  col.cards.forEach(card => cardsEl.appendChild(buildCard(card, boardId, col.id)));

  // Drag-over / drop on column
  cardsEl.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    wrapper.classList.add('board-column--drop-target');
  });
  cardsEl.addEventListener('dragleave', e => {
    if (!wrapper.contains(e.relatedTarget)) {
      wrapper.classList.remove('board-column--drop-target');
    }
  });
  cardsEl.addEventListener('drop', e => {
    e.preventDefault();
    wrapper.classList.remove('board-column--drop-target');
    if (_draggingCardId && _draggingFromColId && _draggingBoardId === boardId) {
      moveCard(boardId, _draggingCardId, _draggingFromColId, col.id);
      playDrop();
      showToast(`📌 Missão movida para "${col.title}"`, 'info', 1500);
      renderBoard();
    }
  });

  // Add card button
  wrapper.querySelector('.board-add-card-btn').addEventListener('click', () => {
    openAddCardModal(boardId, col.id);
  });

  return wrapper;
}

// ============================================================
//   ADD CARD MODAL
// ============================================================
function openAddCardModal(boardId, colId) {
  const board = getBoardById(boardId);
  const col = board?.columns.find(c => c.id === colId);
  if (!col) return;

  const prioOptions = Object.entries(PRIORITY_META).map(([key, meta]) =>
    `<option value="${key}">${meta.icon} ${meta.label}</option>`
  ).join('');

  openModal({
    title: '⚔️ Nova Missão',
    confirmLabel: '⚔️ Criar Missão',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Título da Missão</label>
        <input class="form-input" id="nc-title" type="text"
               placeholder="Ex: Implementar sistema de autenticação..." maxlength="80" autofocus />
      </div>
      <div class="form-group">
        <label class="form-label">Prioridade (Raridade)</label>
        <select class="form-select" id="nc-priority">${prioOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Descrição (opcional)</label>
        <textarea class="form-input form-textarea" id="nc-desc" rows="3"
                  placeholder="Descreva o objetivo desta missão..."></textarea>
      </div>
    `,
    onConfirm: () => {
      const title = document.getElementById('nc-title')?.value?.trim();
      const prio  = document.getElementById('nc-priority')?.value ?? 'normal';
      const desc  = document.getElementById('nc-desc')?.value ?? '';
      if (!title) { showToast('⚠️ A missão precisa de um título!', 'info', 2000); return false; }
      addCard(boardId, colId, { title, priority: prio, description: desc });
      showToast('⚔️ Missão adicionada ao quadro!', 'info', 1500);
      renderBoard();
    },
  });

  setTimeout(() => document.getElementById('nc-title')?.focus(), 80);
}

// ============================================================
//   BOARD SELECTOR (tabs)
// ============================================================
function renderBoardSelector(boards) {
  const selector = document.getElementById('board-selector');
  if (!selector) return;

  selector.innerHTML = boards.map(b => `
    <button class="board-tab ${b.id === _activeBoardId ? 'board-tab--active' : ''}"
            data-board-id="${b.id}" aria-label="Selecionar quadro ${b.title}">
      🗡️ ${b.title}
    </button>
  `).join('');

  selector.querySelectorAll('.board-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeBoardId = btn.dataset.boardId;
      playClick();
      renderBoard();
    });
  });
}

// ============================================================
//   MAIN RENDER — BOARD
// ============================================================
export function renderBoard() {
  const boards      = getBoards();
  const container   = document.getElementById('board-columns-container');
  const emptyState  = document.getElementById('board-empty-state');
  const boardArea   = document.getElementById('board-area');

  if (!container) return;

  renderBoardSelector(boards);

  if (boards.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (boardArea)  boardArea.style.display  = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (boardArea)  boardArea.style.display  = 'flex';

  // Fallback: select first board if active is not in list
  if (!_activeBoardId || !boards.find(b => b.id === _activeBoardId)) {
    _activeBoardId = boards[0].id;
  }
  renderBoardSelector(boards); // re-render selector with correct active

  const board = boards.find(b => b.id === _activeBoardId);
  if (!board) return;

  // Update board title
  const titleEl = document.getElementById('board-active-title');
  if (titleEl) titleEl.textContent = `🗡️ ${board.title}`;

  // Render columns
  container.innerHTML = '';
  board.columns.forEach(col => container.appendChild(buildColumn(col, board.id)));

  // Add column button
  const addColBtn = document.createElement('button');
  addColBtn.className = 'board-add-column-btn';
  addColBtn.innerHTML = '＋ Nova Coluna';
  addColBtn.setAttribute('aria-label', 'Adicionar nova coluna');
  addColBtn.addEventListener('click', () => openAddColumnModal(board.id));
  container.appendChild(addColBtn);
}

// ============================================================
//   ADD COLUMN MODAL
// ============================================================
function openAddColumnModal(boardId) {
  openModal({
    title: '📋 Nova Coluna',
    confirmLabel: '✚ Criar',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Nome da Coluna</label>
        <input class="form-input" id="nc-col-title" type="text"
               placeholder="Ex: Em Revisão..." maxlength="40" autofocus />
      </div>
    `,
    onConfirm: () => {
      const title = document.getElementById('nc-col-title')?.value?.trim();
      if (!title) { showToast('⚠️ Dê um nome à coluna!', 'info', 2000); return false; }
      addColumn(boardId, title);
      showToast(`📋 Coluna "${title}" criada!`, 'info', 1500);
      renderBoard();
    },
  });
  setTimeout(() => document.getElementById('nc-col-title')?.focus(), 80);
}

// ============================================================
//   CREATE BOARD MODAL
// ============================================================
function openCreateBoardModal() {
  openModal({
    title: '🗡️ Novo Projeto (Board)',
    confirmLabel: '⚔️ Criar Projeto',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Nome do Projeto</label>
        <input class="form-input" id="nb-title" type="text"
               placeholder="Ex: Desenvolvimento do App..." maxlength="60" autofocus />
      </div>
      <p style="font-size:var(--fs-xxs);color:var(--text-muted);margin-top:var(--space-2)">
        Colunas padrão — Backlog, Em Progresso, Concluído — serão criadas automaticamente.
      </p>
    `,
    onConfirm: () => {
      const title = document.getElementById('nb-title')?.value?.trim();
      if (!title) { showToast('⚠️ O projeto precisa de um nome!', 'info', 2000); return false; }
      const board = createBoard(title);
      _activeBoardId = board.id;
      showToast(`🗡️ Projeto "${title}" criado!`, 'info', 2000);
      renderBoard();
    },
  });
  setTimeout(() => document.getElementById('nb-title')?.focus(), 80);
}

// ============================================================
//   DELETE BOARD
// ============================================================
function openDeleteBoardModal(boardId) {
  const board = getBoardById(boardId);
  if (!board) return;
  openModal({
    title: '🗑️ Deletar Projeto',
    bodyHTML: `<p class="font-display" style="font-size:var(--fs-display);color:var(--text-primary)">
      Tem certeza que quer remover o projeto <strong>${board.title}</strong>?
      Todas as colunas e missões serão perdidas permanentemente.
    </p>`,
    confirmLabel: '🗑️ Deletar Projeto',
    onConfirm: () => {
      deleteBoard(boardId);
      _activeBoardId = null;
      showToast('🗑️ Projeto removido.', 'info', 2000);
      renderBoard();
    },
  });
}

// ============================================================
//   INIT
// ============================================================
export function initBoard() {
  renderBoard();

  // "Novo Projeto" button (topbar)
  const btnNew = document.getElementById('btn-new-board');
  if (btnNew && !btnNew.dataset.wired) {
    btnNew.dataset.wired = '1';
    btnNew.addEventListener('click', () => {
      playSound('ui_click');
      openCreateBoardModal();
    });
  }

  // "Criar Primeiro Projeto" button (empty state)
  const btnNewEmpty = document.getElementById('btn-new-board-empty');
  if (btnNewEmpty && !btnNewEmpty.dataset.wired) {
    btnNewEmpty.dataset.wired = '1';
    btnNewEmpty.addEventListener('click', () => {
      playSound('ui_click');
      openCreateBoardModal();
    });
  }

  // "Deletar Projeto" button
  const btnDel = document.getElementById('btn-delete-board');
  if (btnDel && !btnDel.dataset.wired) {
    btnDel.dataset.wired = '1';
    btnDel.addEventListener('click', () => {
      if (_activeBoardId) openDeleteBoardModal(_activeBoardId);
    });
  }
}
