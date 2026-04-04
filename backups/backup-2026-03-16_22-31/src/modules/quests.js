/**
 * RPG Life OS — Quests Module (Phase 2)
 * Full: drag-and-drop, edit, delete, filter by attribute, weekly progress.
 */

import {
    loadState, saveState,
    ensureCurrentWeek, completeTask,
    DAYS_OF_WEEK, DAYS_LABEL, ATTR_META,
    getWeekId, getMondayOfWeek,
    todayDayKey, genId
} from '../engine/core.js';

import {
    renderHUD, showToast, showLevelUp, openModal, closeModal
} from '../engine/gamification.js';

import {
    playClick, playXpGain, playWoosh, playDrop, playError
} from '../engine/audio.js';

// ============================================================
//   STATE
// ============================================================
let activeFilter = 'ALL';
let draggedTask = null;
let dragOriginDay = null;

// ============================================================
//   RENDER
// ============================================================
export function renderQuests() {
    let state = loadState();
    state = ensureCurrentWeek(state);
    saveState(state);
    state = loadState();

    const weekId = state.quests.current_week_id;
    const week = state.quests.weeks[weekId];
    const today = todayDayKey();

    // Week label
    const weekEl = document.getElementById('week-label');
    if (weekEl && week) {
        weekEl.textContent = `Semana ${weekId.split('W')[1]} · ${weekId.split('-')[0]}`;
    }

    // Weekly progress
    const allTasks = week?.tasks ?? [];
    const done = allTasks.filter(t => t.status === 'completed').length;
    const total = allTasks.length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    const progText = document.getElementById('week-progress-text');
    const progFill = document.getElementById('week-progress-fill');
    if (progText) progText.textContent = `${done} / ${total} quests`;
    if (progFill) progFill.style.width = `${pct.toFixed(0)}%`;

    // Render day cards
    const grid = document.getElementById('days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const day of DAYS_OF_WEEK) {
        const tasks = (week?.tasks ?? []).filter(t => {
            if (t.day !== day) return false;
            if (activeFilter === 'ALL') return true;
            return t.attribute === activeFilter;
        });
        const card = buildDayCard(day, tasks, weekId, today === day, state);
        grid.appendChild(card);
    }
}

function buildDayCard(day, tasks, weekId, isToday, state) {
    const card = document.createElement('div');
    card.className = `day-card${isToday ? ' day-card--today' : ''}`;
    card.dataset.day = day;

    // Drag-over target
    card.addEventListener('dragover', e => {
        e.preventDefault();
        card.classList.add('drag-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-target'));
    card.addEventListener('drop', e => {
        e.preventDefault();
        card.classList.remove('drag-target');
        if (draggedTask && dragOriginDay && dragOriginDay !== day) {
            moveTaskToDay(weekId, draggedTask, dragOriginDay, day);
            playDrop();
        }
        draggedTask = null;
        dragOriginDay = null;
    });

    // Day header
    const header = document.createElement('div');
    header.className = 'day-card__header';
    const allDayTasks = loadState().quests.weeks[weekId]?.tasks.filter(t => t.day === day) ?? [];
    const doneDayCount = allDayTasks.filter(t => t.status === 'completed').length;
    header.innerHTML = `
    <span>${DAYS_LABEL[day]}${isToday ? ' ◀' : ''}</span>
    <span class="text-muted" style="font-size:var(--fs-xxs)">${doneDayCount}/${allDayTasks.length}</span>
  `;
    card.appendChild(header);

    const tasksEl = document.createElement('div');
    tasksEl.className = 'day-card__tasks';

    if (tasks.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.style.cssText = 'padding:var(--space-3);font-size:var(--fs-display)';
        empty.textContent = activeFilter === 'ALL' ? '— livre —' : `Nenhuma quest ${activeFilter}`;
        tasksEl.appendChild(empty);
    } else {
        for (const task of tasks) {
            tasksEl.appendChild(buildTaskItem(task, weekId, day, state));
        }
    }
    card.appendChild(tasksEl);

    // Add task mini-button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-rp btn-rp--ghost';
    addBtn.style.cssText = 'font-size:var(--fs-xxs);margin:var(--space-2);';
    addBtn.textContent = '+ Quest';
    addBtn.addEventListener('click', () => openAddTaskModal(weekId, day));
    card.appendChild(addBtn);

    return card;
}

function buildTaskItem(task, weekId, day, state) {
    const item = document.createElement('div');
    item.className = `task-item${task.status === 'completed' ? ' task-item--done' : ''}`;
    item.dataset.taskId = task.id;

    if (task.status !== 'completed') {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', () => {
            draggedTask = task.id;
            dragOriginDay = day;
            item.style.opacity = '0.5';
            playWoosh();
        });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; });
    }

    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox';
    checkbox.textContent = task.status === 'completed' ? '✓' : '';

    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;

    const badge = document.createElement('span');
    badge.className = `task-attr-badge ${task.attribute}`;
    badge.textContent = task.attribute;

    // Actions (edit/delete)
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    if (task.status !== 'completed') {
        const editBtn = document.createElement('button');
        editBtn.className = 'task-action-btn';
        editBtn.title = 'Editar';
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', e => { e.stopPropagation(); openEditTaskModal(weekId, task.id); });

        const delBtn = document.createElement('button');
        delBtn.className = 'task-action-btn task-action-btn--delete';
        delBtn.title = 'Deletar';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', e => { e.stopPropagation(); deleteTask(weekId, task.id); });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
    }

    item.appendChild(checkbox);
    item.appendChild(title);
    item.appendChild(badge);
    item.appendChild(actions);

    if (task.status !== 'completed') {
        // Click on checkbox area to complete
        checkbox.addEventListener('click', e => {
            e.stopPropagation();
            handleCompleteTask(weekId, task.id);
        });
        item.addEventListener('click', () => handleCompleteTask(weekId, task.id));
    }

    return item;
}

// ============================================================
//   DRAG-AND-DROP
// ============================================================
function moveTaskToDay(weekId, taskId, fromDay, toDay) {
    let state = loadState();
    const week = state.quests.weeks[weekId];
    if (!week) return;
    const task = week.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.day = toDay;
    saveState(state);
    showToast(`📋 Quest movida para ${DAYS_LABEL[toDay]}`, 'info', 1500);
    renderQuests();
}

// ============================================================
//   ACTIONS
// ============================================================
function handleCompleteTask(weekId, taskId) {
    let state = loadState();
    const result = completeTask(state, weekId, taskId);
    saveState(result.state);

    // Spawn floating XP above the task item
    spawnFloatingText(`+${result.xpGained} XP`, document.querySelector(`[data-task-id="${taskId}"]`), false);
    playXpGain();
    showToast(`⚔️ +${result.xpGained} XP  🎯 +${result.attrGained} Attr XP`, 'xp');

    if (result.leveledUp) {
        setTimeout(() => showLevelUp(result.newLevel), 400);
    }

    renderHUD(result.state);
    renderQuests();
}

function deleteTask(weekId, taskId) {
    openModal({
        title: 'Deletar Quest',
        bodyHTML: `<p class="font-display" style="font-size:var(--fs-display);color:var(--text-primary)">Tem certeza que quer abandonar esta quest? Sem XP, sem glória.</p>`,
        confirmLabel: '✕ Deletar',
        onConfirm: () => {
            let state = loadState();
            const week = state.quests.weeks[weekId];
            if (week) {
                week.tasks = week.tasks.filter(t => t.id !== taskId);
                saveState(state);
                renderQuests();
            }
        },
    });
}

// ============================================================
//   MODALS
// ============================================================
function buildTaskModalBody(task = {}) {
    const daysOptions = DAYS_OF_WEEK.map(d =>
        `<option value="${d}"${d === task.day ? ' selected' : ''}>${DAYS_LABEL[d]}</option>`
    ).join('');
    const attrOptions = ['INT', 'ART', 'AVE'].map(a =>
        `<option value="${a}"${a === task.attribute ? ' selected' : ''}>${ATTR_META[a].icon} ${a}</option>`
    ).join('');

    return `
    <div class="form-group">
      <label class="form-label">Título da Quest</label>
      <input class="form-input" id="task-title" type="text" value="${task.title ?? ''}" placeholder="Ex: Estudar SQL" maxlength="60" />
    </div>
    <div class="form-group">
      <label class="form-label">Dia</label>
      <select class="form-select" id="task-day">${daysOptions}</select>
    </div>
    <div class="form-group">
      <label class="form-label">Atributo</label>
      <select class="form-select" id="task-attr">${attrOptions}</select>
    </div>
    <div class="form-group">
      <label class="form-label">XP de Recompensa</label>
      <input class="form-input" id="task-xp" type="number" value="${task.xp_reward ?? 20}" min="5" max="200" />
    </div>
  `;
}

function openAddTaskModal(weekId, defaultDay) {
    openModal({
        title: 'Nova Quest',
        bodyHTML: buildTaskModalBody({ day: defaultDay, attribute: 'INT', xp_reward: 20 }),
        confirmLabel: 'Criar Quest',
        onConfirm: () => {
            const title = document.getElementById('task-title')?.value?.trim();
            const day = document.getElementById('task-day')?.value;
            const attr = document.getElementById('task-attr')?.value;
            const xp = parseInt(document.getElementById('task-xp')?.value ?? '20', 10);

            if (!title) { showToast('⚠️ Dê um título à quest!', 'info', 2000); return; }

            let state = loadState();
            state = ensureCurrentWeek(state);
            const week = state.quests.weeks[weekId];
            if (!week) return;

            week.tasks.push({
                id: genId('task'), title, description: '', day, attribute: attr,
                xp_reward: xp, hp_reward: 0, status: 'pending', boss_id: null,
                completed_at: null, tags: [],
            });

            saveState(state);
            showToast('📜 Nova quest adicionada!', 'info');
            renderQuests();
        },
    });
}

function openEditTaskModal(weekId, taskId) {
    const state = loadState();
    const task = state.quests.weeks[weekId]?.tasks.find(t => t.id === taskId);
    if (!task) return;

    openModal({
        title: 'Editar Quest',
        bodyHTML: buildTaskModalBody(task),
        confirmLabel: '💾 Salvar',
        onConfirm: () => {
            const title = document.getElementById('task-title')?.value?.trim();
            const day = document.getElementById('task-day')?.value;
            const attr = document.getElementById('task-attr')?.value;
            const xp = parseInt(document.getElementById('task-xp')?.value ?? '20', 10);

            if (!title) { showToast('⚠️ Dê um título à quest!', 'info', 2000); return; }

            let st = loadState();
            const t = st.quests.weeks[weekId]?.tasks.find(t => t.id === taskId);
            if (t) {
                t.title = title; t.day = day; t.attribute = attr; t.xp_reward = xp;
                saveState(st);
                renderQuests();
            }
        },
    });
}

// ============================================================
//   FILTERS
// ============================================================
function setupFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeFilter = btn.dataset.filter;

            // Toggle active class
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('filter-btn--active');
            });
            btn.classList.add('filter-btn--active');

            renderQuests();
        });
    });
}

// ============================================================
//   WEEKLY RESET
// ============================================================
export function weeklyReset() {
    openModal({
        title: '🔄 Reset Semanal',
        bodyHTML: `<p class="font-display" style="font-size:var(--fs-display);color:var(--text-primary)">
      Tem certeza? As tarefas pendentes desta semana serão perdidas.<br><br>
      Um novo ciclo semanal será criado.
    </p>`,
        confirmLabel: 'Sim, Resetar',
        onConfirm: () => {
            let state = loadState();
            const weekId = state.quests.current_week_id;
            if (state.quests.weeks[weekId]) {
                state.quests.weeks[weekId].reset_done = true;
            }
            state.quests.current_week_id = '';
            state.quests.current_week_start = '';
            saveState(state);
            showToast('🔄 Semana resetada! Novo ciclo iniciado.', 'level');
            renderQuests();
        },
    });
}

// ============================================================
//   FLOATING TEXT HELPER (reusable)
// ============================================================
export function spawnFloatingText(text, anchorEl, isDamage = true) {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `damage-float${isDamage ? '' : ' damage-float--xp'}`;
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + window.scrollY}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

// ============================================================
//   INIT
// ============================================================
export function initQuests() {
    renderQuests();
    setupFilters();

    document.getElementById('btn-add-task')?.addEventListener('click', () => {
        const weekId = loadState().quests.current_week_id;
        openAddTaskModal(weekId, todayDayKey());
    });

    document.getElementById('btn-weekly-reset')?.addEventListener('click', weeklyReset);
}
