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
//   FIRESTORE PERSISTENCE HELPER
//   Writes to localStorage (fast cache) AND to Firestore (durable).
// ============================================================
function _persistBoard(state, board) {
  saveState(state);
  if (board && typeof window._saveBoardToFirestore === 'function') {
    window._saveBoardToFirestore(board);
  }
}

function _persistBoardDelete(boardId) {
  if (typeof window._deleteBoardFirestore === 'function') {
    window._deleteBoardFirestore(boardId);
  }
}

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
let _draggingCardId    = null;
let _draggingFromColId = null;
let _draggingBoardId   = null;
let _activeBoardId     = null;

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
  _persistBoard(state, board);
  return board;
}

/** Removes a Board by ID */
export function deleteBoard(boardId) {
  const state = loadState();
  state.boards = state.boards.filter(b => b.id !== boardId);
  saveState(state);
  _persistBoardDelete(boardId);
}

/** Renames a Board */
export function renameBoard(boardId, newTitle) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (board) { board.title = newTitle.trim(); _persistBoard(state, board); }
}

/** Adds a column to a board */
export function addColumn(boardId, title) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;
  board.columns.push({ id: genId('col'), title: title.trim(), cards: [] });
  _persistBoard(state, board);
}

/** Deletes a column (and all its cards) */
export function deleteColumn(boardId, colId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;
  board.columns = board.columns.filter(c => c.id !== colId);
  _persistBoard(state, board);
}

/** Renames a column */
export function renameColumn(boardId, colId, newTitle) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (col) { col.title = newTitle.trim(); _persistBoard(state, board); }
}

/** Creates a new Card inside a column */
export function addCard(boardId, colId, { title, description = '', priority = 'normal', subtasks = [], recurrence = 'none', timeSlots = [], linkedWorkouts = [], linkedQuests = [], replicaOf = null }) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (!col) return null;

  const card = {
    id:             genId('card'),
    title:          title.trim(),
    description,
    priority,
    recurrence,
    timeSlots,
    linkedWorkouts,
    linkedQuests,
    replicaOf,      // null | sourceCardId (visual indicator only)
    subtasks:       subtasks.map(s => ({
      id:   genId('sub'),
      text: typeof s === 'string' ? s : s.text,
      done: false,
    })),
    created_at:     new Date().toISOString(),
  };
  col.cards.push(card);
  _persistBoard(state, board);
  return card;
}

/** Replicates a card to one or more target columns as independent copies */
export function replicateCard(boardId, sourceCardId, targetColIds) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;

  // Find source card across all columns
  let sourceCard = null;
  for (const col of board.columns) {
    const found = col.cards.find(c => c.id === sourceCardId);
    if (found) { sourceCard = found; break; }
  }
  if (!sourceCard) return;

  targetColIds.forEach(colId => {
    const col = board.columns.find(c => c.id === colId);
    if (!col) return;
    const clone = {
      ...JSON.parse(JSON.stringify(sourceCard)),
      id:         genId('card'),
      replicaOf:  sourceCard.id,
      created_at: new Date().toISOString(),
      subtasks:   (sourceCard.subtasks ?? []).map(s => ({ ...s, id: genId('sub'), done: false })),
      timeSlots:  (sourceCard.timeSlots ?? []).map(t => ({ ...t, id: genId('ts'), done: false })),
    };
    col.cards.push(clone);
  });

  _persistBoard(state, board);
}

/** Moves a card from one column to another within the same board */
export function moveCard(boardId, cardId, fromColId, toColId, insertBeforeCardId = null) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  if (!board) return;

  const fromCol = board.columns.find(c => c.id === fromColId);
  const toCol   = board.columns.find(c => c.id === toColId);
  if (!fromCol || !toCol) return;

  const idx = fromCol.cards.findIndex(c => c.id === cardId);
  if (idx < 0) return;

  const [card] = fromCol.cards.splice(idx, 1);

  if (insertBeforeCardId) {
    const targetIdx = toCol.cards.findIndex(c => c.id === insertBeforeCardId);
    if (targetIdx >= 0) {
      toCol.cards.splice(targetIdx, 0, card);
    } else {
      toCol.cards.push(card);
    }
  } else {
    toCol.cards.push(card);
  }
  _persistBoard(state, board);
}

/** Duplicates a card inside the same column */
export function duplicateCard(boardId, colId, cardId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return null;

  const clone = {
    ...JSON.parse(JSON.stringify(card)),
    id:         genId('card'),
    title:      `${card.title} (cópia)`,
    created_at: new Date().toISOString(),
    subtasks:   (card.subtasks ?? []).map(s => ({ ...s, id: genId('sub'), done: false })),
  };

  const srcIdx = col.cards.findIndex(c => c.id === cardId);
  col.cards.splice(srcIdx + 1, 0, clone);
  _persistBoard(state, board);
  return clone;
}

/** Patches card fields */
export function updateCard(boardId, colId, cardId, patch) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  Object.assign(card, patch);
  _persistBoard(state, board);
}

/** Adds/removes a time slot on a card */
export function upsertTimeSlot(boardId, colId, cardId, slot) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  if (!card.timeSlots) card.timeSlots = [];
  const idx = card.timeSlots.findIndex(t => t.id === slot.id);
  if (idx >= 0) card.timeSlots[idx] = slot;
  else card.timeSlots.push(slot);
  _persistBoard(state, board);
}

export function deleteTimeSlot(boardId, colId, cardId, slotId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  card.timeSlots = (card.timeSlots ?? []).filter(t => t.id !== slotId);
  _persistBoard(state, board);
}

/** Adds a subtask to a card */
export function addSubtask(boardId, colId, cardId, text) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  card.subtasks.push({ id: genId('sub'), text: text.trim(), done: false });
  _persistBoard(state, board);
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
  _persistBoard(state, board);
}

/** Deletes a subtask from a card */
export function deleteSubtask(boardId, colId, cardId, subId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  const card  = col?.cards.find(c => c.id === cardId);
  if (!card) return;
  card.subtasks = card.subtasks.filter(s => s.id !== subId);
  _persistBoard(state, board);
}

/** Removes a card from its column */
export function deleteCard(boardId, colId, cardId) {
  const state = loadState();
  const board = state.boards.find(b => b.id === boardId);
  const col   = board?.columns.find(c => c.id === colId);
  if (!col) return;
  col.cards = col.cards.filter(c => c.id !== cardId);
  _persistBoard(state, board);
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
//   RICH DESCRIPTION RENDERER
// ============================================================
function renderDesc(text) {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Detect image URLs (.png .jpg .jpeg .gif .webp .svg)
  const imgRe = /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg)(\?[^\s]*)?/gi;
  const imgMatches = [...escaped.matchAll(imgRe)];
  let html = escaped;

  // Replace image URLs with thumbnails
  imgMatches.forEach(m => {
    html = html.replace(m[0],
      `<a href="${m[0]}" target="_blank" rel="noopener" class="board-desc__imglink">
        <img class="board-desc__img" src="${m[0]}" alt="imagem" loading="lazy"
          onerror="this.style.display='none'" />
      </a>`);
  });

  // Replace remaining plain URLs with clickable links
  const urlRe = /https?:\/\/[^\s<>"]+/g;
  html = html.replace(urlRe, u => {
    if (u.includes('board-desc__img')) return u; // already replaced
    return `<a href="${u}" target="_blank" rel="noopener" class="board-desc__link">${u}</a>`;
  });

  return html;
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

  const recurOptions = [
    ['none', '— Sem recorrência'],
    ['daily', '🌅 Diária'],
    ['weekly', '📅 Semanal'],
    ['custom', '⚙️ Personalizada'],
  ].map(([v, l]) => `<option value="${v}" ${(card.recurrence ?? 'none') === v ? 'selected' : ''}>${l}</option>`).join('');

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

  // Build replication checkboxes (all columns except the card's own)
  const otherCols = board.columns.filter(c => c.id !== colId);
  const replicaColsHTML = otherCols.length ? `
    <div class="form-group" style="margin-top:var(--space-2)">
      <label class="form-label">🔁 Replicar para colunas (cópias independentes)</label>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-top:4px">
        ${otherCols.map(c => `<label style="display:flex;align-items:center;gap:6px;font-size:var(--fs-xxs);cursor:pointer">
          <input type="checkbox" class="bm-replicate-col" data-col-id="${c.id}" />
          ${c.title}
        </label>`).join('')}
      </div>
    </div>` : '';

  // Build time slots UI — use type=text with HH:MM pattern to avoid browser minute truncation
  const fmtTime = v => (v ?? '').replace(/^(\d)(:\d{2})$/, '0$1$2'); // normalize single-digit hours
  const existingSlots = (card.timeSlots ?? []).map(t => `
    <div class="bm-slot-row" data-slot-id="${t.id}">
      <input class="form-input bm-slot-start" type="text" inputmode="numeric"
             placeholder="09:00" pattern="[0-2]\d:[0-5]\d" maxlength="5"
             value="${fmtTime(t.startTime)}" style="width:70px;text-align:center" />
      <span style="color:var(--text-muted)">&#8211;</span>
      <input class="form-input bm-slot-end" type="text" inputmode="numeric"
             placeholder="10:00" pattern="[0-2]\d:[0-5]\d" maxlength="5"
             value="${fmtTime(t.endTime)}" style="width:70px;text-align:center" />
      <input class="form-input bm-slot-label" type="text" value="${t.label ?? ''}" placeholder="Atividade" style="flex:1;min-width:80px" />
      <button class="btn-rp btn-rp--ghost bm-slot-del" data-slot-id="${t.id}" style="padding:2px 6px;min-height:0;font-size:var(--fs-xxs)">✕</button>
    </div>`).join('');

  // Build quest and workout pickers from current state
  const liveState   = loadState();
  const curWeekId   = liveState?.quests?.current_week_id;
  const weekTasks   = curWeekId ? (liveState.quests.weeks?.[curWeekId]?.tasks ?? []) : [];
  const pendingQuests = weekTasks.filter(t => t.status !== 'completed');
  const allTemplates  = liveState?.battle_ground?.templates ?? [];
  const linkedQ = card.linkedQuests ?? [];
  const linkedW = card.linkedWorkouts ?? [];

  const questPickerHTML = `
    <div class="form-group" style="margin-top:var(--space-2)">
      <label class="form-label">📜 Vincular Quests da semana atual</label>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:140px;overflow-y:auto;margin-top:var(--space-2);padding-right:4px">
        ${pendingQuests.length === 0
          ? '<span style="font-size:var(--fs-sm);color:var(--text-muted)">Nenhuma quest pendente esta semana.</span>'
          : pendingQuests.map(q => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" class="bm-link-quest" data-quest-id="${q.id}" data-week-id="${curWeekId}" ${linkedQ.includes(q.id) ? 'checked' : ''} style="width:14px;height:14px;flex-shrink:0" />
              <span class="task-attr-badge ${q.attribute}" style="padding:2px 6px">${q.attribute}</span>
              <span>${q.title}</span>
            </label>`).join('')
        }
      </div>
    </div>`;

  const workoutPickerHTML = `
    <div class="form-group" style="margin-top:var(--space-2)">
      <label class="form-label">⚡ Vincular Templates de Treino</label>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto;margin-top:var(--space-2)">
        ${allTemplates.length === 0
          ? '<span style="font-size:var(--fs-sm);color:var(--text-muted)">Nenhum template criado.</span>'
          : allTemplates.map(t => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" class="bm-link-workout" data-tmpl-id="${t.id}" ${linkedW.includes(t.id) ? 'checked' : ''} style="width:14px;height:14px;flex-shrink:0" />
              <span>💪 ${t.name}</span>
            </label>`).join('')
        }
      </div>
    </div>`;


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
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          <div class="form-group" style="flex:1;min-width:120px">
            <label class="form-label">Prioridade</label>
            <select class="form-select" id="bm-priority">${prioOptions}</select>
          </div>
          <div class="form-group" style="flex:1;min-width:120px">
            <label class="form-label">Recorrência</label>
            <select class="form-select" id="bm-recurrence">${recurOptions}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Descrição / Detalhes (suporta links e imagens)</label>
          <textarea class="form-input form-textarea" id="bm-desc"
                    rows="3" placeholder="Cole URLs de links ou imagens...">${card.description}</textarea>
        </div>
        ${replicaColsHTML}
        <details class="bm-planning-section" style="margin-top:var(--space-3)">
          <summary>⏰ Cronograma (Time Slots)</summary>
          <div id="bm-slots-list" style="margin-top:var(--space-2);display:flex;flex-direction:column;gap:var(--space-2)">${existingSlots}</div>
          <button class="btn-rp btn-rp--ghost" id="bm-add-slot">+ Adicionar Horário</button>
        </details>
        <details class="bm-planning-section" style="margin-top:var(--space-2)">
          <summary>🔗 Vínculos (Quests &amp; Treinos)</summary>
          ${questPickerHTML}
          ${workoutPickerHTML}
        </details>
        ${progress >= 0 ? `
        <div class="bm-progress-wrap">
          <div class="bm-progress-label"><span>⚙️ Checklist</span><span id="bm-progress-pct">${progress}%</span></div>
          <div class="bm-progress-bar"><div class="bm-progress-fill" id="bm-progress-fill" style="width:${progress}%"></div></div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">📋 Subtarefas (Checklist)</label>
          <div class="board-subtasks-list" id="bm-subtasks">${subtasksHTML}</div>
          <div class="board-add-subtask-row">
            <input class="form-input" id="bm-new-sub" type="text" placeholder="Nova subtarefa..." maxlength="120" />
            <button class="btn-rp btn-rp--ghost" id="bm-add-sub" style="font-size:var(--fs-xxs);">+ Add</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:var(--space-3);flex-wrap:wrap;gap:var(--space-2)">
          <button class="btn-rp btn-rp--ghost" id="bm-duplicate-card"
                  data-board="${boardId}" data-col="${colId}" data-card="${cardId}"
                  style="font-size:var(--fs-xxs);">📋 Duplicar</button>
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
      const newRecur = document.getElementById('bm-recurrence')?.value ?? 'none';
      if (!newTitle) { showToast('⚠️ A missão precisa de um título!', 'info', 2000); return false; }

      // Collect updated time slots — normalize HH:MM format
      const _norm = v => {
        if (!v) return '';
        const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return v.trim();
        return `${m[1].padStart(2,'0')}:${m[2]}`;
      };
      const newSlots = [...document.querySelectorAll('#bm-slots-list .bm-slot-row')].map(row => ({
        id:        row.dataset.slotId,
        startTime: _norm(row.querySelector('.bm-slot-start')?.value),
        endTime:   _norm(row.querySelector('.bm-slot-end')?.value),
        label:     row.querySelector('.bm-slot-label')?.value ?? '',
        done:      false,
      })).filter(s => s.startTime || s.label);

      // Collect linked quests and workouts
      const newLinkedQuests   = [...document.querySelectorAll('.bm-link-quest:checked')].map(cb => cb.dataset.questId);
      const newLinkedWorkouts = [...document.querySelectorAll('.bm-link-workout:checked')].map(cb => cb.dataset.tmplId);

      updateCard(boardId, colId, cardId, {
        title: newTitle, priority: newPrio, description: newDesc,
        recurrence: newRecur, timeSlots: newSlots,
        linkedQuests: newLinkedQuests, linkedWorkouts: newLinkedWorkouts,
      });

      // Replicate to selected columns
      const selectedCols = [...document.querySelectorAll('.bm-replicate-col:checked')].map(cb => cb.dataset.colId);
      if (selectedCols.length) replicateCard(boardId, cardId, selectedCols);

      showToast('✅ Missão atualizada!', 'info', 1500);
      renderBoard();
    },
  });

  setTimeout(() => {
    document.querySelectorAll('.board-subtask-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const { board: bId, col: cId, card: cdId, sub: sId } = btn.dataset;
        toggleSubtask(bId, cId, cdId, sId);
        _refreshSubtaskUI(bId, cId, cdId);
        playClick();
      });
    });
    document.querySelectorAll('.board-subtask-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const { board: bId, col: cId, card: cdId, sub: sId } = btn.dataset;
        deleteSubtask(bId, cId, cdId, sId);
        btn.closest('.board-subtask-row')?.remove();
        _refreshSubtaskUI(bId, cId, cdId);
      });
    });
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
    // Time slot add/delete handlers
    document.getElementById('bm-add-slot')?.addEventListener('click', () => {
      const list = document.getElementById('bm-slots-list');
      if (!list) return;
      const slotId = `ts_${Date.now()}`;
      const row = document.createElement('div');
      row.className = 'bm-slot-row';
      row.dataset.slotId = slotId;
      row.innerHTML = `
        <input class="form-input bm-slot-start" type="text" inputmode="numeric"
               placeholder="09:00" pattern="[0-2]\\d:[0-5]\\d" maxlength="5"
               style="width:70px;text-align:center" />
        <span style="color:var(--text-muted)">&#8211;</span>
        <input class="form-input bm-slot-end" type="text" inputmode="numeric"
               placeholder="10:00" pattern="[0-2]\\d:[0-5]\\d" maxlength="5"
               style="width:70px;text-align:center" />
        <input class="form-input bm-slot-label" type="text" placeholder="Atividade" style="flex:1;min-width:80px" />
        <button class="btn-rp btn-rp--ghost bm-slot-del" data-slot-id="${slotId}" style="padding:2px 6px;min-height:0;font-size:var(--fs-xxs)">✕</button>
      `;
      list.appendChild(row);
      row.querySelector('.bm-slot-start')?.focus();
    });
    document.getElementById('bm-slots-list')?.addEventListener('click', e => {
      const btn = e.target.closest('.bm-slot-del');
      if (btn) btn.closest('.bm-slot-row')?.remove();
    });

    document.getElementById('bm-duplicate-card')?.addEventListener('click', () => {
      const { board: bId, col: cId, card: cdId } = document.getElementById('bm-duplicate-card').dataset;
      duplicateCard(bId, cId, cdId);
      showToast('📋 Missão duplicada!', 'info', 1500);
      closeModal();
      renderBoard();
    });
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
  const meta      = PRIORITY_META[card.priority] ?? PRIORITY_META.normal;
  const progress  = calcProgress(card);
  const hasProgress = progress >= 0;

  const el = document.createElement('div');
  el.className = `board-card${card.replicaOf ? ' board-card--replica' : ''}`;
  el.dataset.cardId  = card.id;
  el.dataset.colId   = colId;
  el.dataset.boardId = boardId;
  el.setAttribute('draggable', 'true');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `Missão: ${card.title}. Prioridade: ${meta.label}`);

  const descRendered = renderDesc(card.description);
  const recurBadge = card.recurrence && card.recurrence !== 'none'
    ? `<span class="board-recur-badge">${card.recurrence === 'daily' ? '🌅 Diária' : card.recurrence === 'weekly' ? '📅 Semanal' : '⚙️'}</span>`
    : '';

  // Time slots badge — show HH:MM format correctly
  const slots = card.timeSlots ?? [];
  const firstSlot = slots.find(s => s.startTime);
  const slotBadge = firstSlot
    ? `<span class="board-slot-badge">⏰ ${firstSlot.startTime}${slots.length > 1 ? ` +${slots.length - 1}` : ''}</span>`
    : '';

  // Linked badges — resolve live status from state
  const _liveState  = loadState();
  const _weekId     = _liveState?.quests?.current_week_id;
  const _weekTasks  = _weekId ? (_liveState.quests.weeks?.[_weekId]?.tasks ?? []) : [];
  const _sessions   = _liveState?.battle_ground?.sessions ?? [];
  const _today      = new Date().toISOString().slice(0, 10);

  const qLinks = card.linkedQuests ?? [];
  const wLinks = card.linkedWorkouts ?? [];
  const qDone  = qLinks.filter(id => _weekTasks.find(t => t.id === id && t.status === 'completed')).length;
  const wDone  = wLinks.filter(id => _sessions.find(s => s.template_id === id && s.date === _today)).length;
  const qPend  = qLinks.length - qDone;
  const wPend  = wLinks.length - wDone;

  const linkBadge = (qLinks.length || wLinks.length) ? [
    qLinks.length ? `<span class="board-link-badge board-link-badge--quest${qPend === 0 ? ' board-link-badge--done' : ''}" title="${qDone}/${qLinks.length} quests">📜 ${qDone}/${qLinks.length}</span>` : '',
    wLinks.length ? `<span class="board-link-badge board-link-badge--workout${wPend === 0 ? ' board-link-badge--done' : ''}" title="${wDone}/${wLinks.length} treinos">⚡ ${wDone}/${wLinks.length}</span>` : '',
  ].join('') : '';

  const replicaBadge = card.replicaOf ? `<span class="board-replica-badge" title="Réplica">🔁</span>` : '';

  el.innerHTML = `
    <div class="board-card__header">
      <span class="board-priority-badge ${meta.class}">${meta.icon} ${meta.label}</span>
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
        ${replicaBadge}${recurBadge}${slotBadge}${linkBadge}
      </div>
    </div>
    <div class="board-card__title">${card.title}</div>
    ${descRendered ? `<div class="board-card__desc board-card__desc--rich">${descRendered}</div>` : ''}
    ${hasProgress ? `
    <div class="board-card__progress-wrap">
      <div class="board-card__progress-bar">
        <div class="board-card__progress-fill ${progress === 100 ? 'board-card__progress-fill--done' : ''}"
             style="width:${progress}%"></div>
      </div>
      <span class="board-card__progress-label">${card.subtasks.filter(s=>s.done).length}/${card.subtasks.length}</span>
    </div>` : ''}
  `;

  // Drag events — track position for intra-column reorder
  el.addEventListener('dragstart', e => {
    _draggingCardId    = card.id;
    _draggingFromColId = colId;
    _draggingBoardId   = boardId;
    el.classList.add('board-card--dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('ghost-col', ''); // '' = real card (not a ghost reorder)
    playWoosh();
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('board-card--dragging');
    document.querySelectorAll('.board-card--drag-over').forEach(c => c.classList.remove('board-card--drag-over'));
    _draggingCardId    = null;
    _draggingFromColId = null;
    _draggingBoardId   = null;
  });

  // Hover indicator for insert position
  el.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.board-card--drag-over').forEach(c => c.classList.remove('board-card--drag-over'));
    if (_draggingCardId && _draggingCardId !== card.id) el.classList.add('board-card--drag-over');
  });
  el.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove('board-card--drag-over');
    if (!_draggingCardId || _draggingBoardId !== boardId || _draggingCardId === card.id) return;
    moveCard(boardId, _draggingCardId, _draggingFromColId, colId, card.id);
    playDrop();
    renderBoard();
  });

  // Click → open modal
  el.addEventListener('click', e => {
    if (e.target.closest('[data-nodrag]')) return;
    openCardModal(boardId, colId, card.id);
  });
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
      <span class="board-column__title" data-editable="true" title="Clique para renomear">${col.title}</span>
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

  // ---- INLINE COLUMN RENAME ----
  const titleEl = wrapper.querySelector('.board-column__title');
  if (titleEl) {
    titleEl.addEventListener('click', () => {
      if (wrapper.querySelector('.board-column__title-input')) return;
      const currentTitle = col.title;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'board-column__title-input';
      input.value = currentTitle;
      input.maxLength = 40;
      input.setAttribute('aria-label', 'Renomear coluna');
      titleEl.replaceWith(input);
      input.focus();
      input.select();
      const saveRename = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
          renameColumn(boardId, col.id, newTitle);
          showToast(`📋 Coluna renomeada: "${newTitle}"`, 'info', 1500);
          playClick();
          renderBoard();
        } else {
          const span = document.createElement('span');
          span.className = 'board-column__title';
          span.dataset.editable = 'true';
          span.title = 'Clique para renomear';
          span.textContent = currentTitle;
          input.replaceWith(span);
        }
      };
      input.addEventListener('blur', saveRename, { once: true });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = currentTitle; input.blur(); }
      });
    });
  }

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

  const recurOptions = [
    ['none', '— Sem recorrência'],
    ['daily', '🌅 Diária'],
    ['weekly', '📅 Semanal'],
    ['custom', '⚙️ Personalizada'],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  openModal({
    title: '⚔️ Nova Missão',
    confirmLabel: '⚔️ Criar Missão',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Título da Missão</label>
        <input class="form-input" id="nc-title" type="text"
               placeholder="Ex: Implementar sistema de autenticação..." maxlength="80" autofocus />
      </div>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px">
          <label class="form-label">Prioridade (Raridade)</label>
          <select class="form-select" id="nc-priority">${prioOptions}</select>
        </div>
        <div class="form-group" style="flex:1;min-width:120px">
          <label class="form-label">Recorrência</label>
          <select class="form-select" id="nc-recurrence">${recurOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descrição (opcional — suporta links e imagens)</label>
        <textarea class="form-input form-textarea" id="nc-desc" rows="3"
                  placeholder="Cole uma URL ou descreva o objetivo..."></textarea>
      </div>
    `,
    onConfirm: () => {
      const title = document.getElementById('nc-title')?.value?.trim();
      const prio  = document.getElementById('nc-priority')?.value ?? 'normal';
      const desc  = document.getElementById('nc-desc')?.value ?? '';
      const recur = document.getElementById('nc-recurrence')?.value ?? 'none';
      if (!title) { showToast('⚠️ A missão precisa de um título!', 'info', 2000); return false; }
      addCard(boardId, colId, { title, priority: prio, description: desc, recurrence: recur });
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

  // Recurrence reset — daily cards reset subtasks each new day
  const today = new Date().toISOString().slice(0, 10);
  let needsSave = false;
  board.columns.forEach(col => {
    col.cards.forEach(card => {
      if (card.recurrence === 'daily' && card.lastReset !== today) {
        card.lastReset = today;
        card.subtasks?.forEach(s => { s.done = false; });
        card.timeSlots?.forEach(t => { t.done = false; });
        needsSave = true;
      }
    });
  });
  if (needsSave) {
    const state = loadState();
    const boardRef = state.boards.find(b => b.id === board.id);
    if (boardRef) _persistBoard(state, boardRef);
  }

  // Render columns
  container.innerHTML = '';
  board.columns.forEach(col => {
    const colEl = buildColumn(col, board.id);
    container.appendChild(colEl);
  });

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

  // Cross-module sync: re-render board badges when quest or workout is completed
  if (!window._boardSyncWired) {
    window._boardSyncWired = true;
    window.addEventListener('rpg:questComplete',   () => renderBoard());
    window.addEventListener('rpg:workoutComplete', () => renderBoard());
  }
}
