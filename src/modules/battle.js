/**
 * RPG Life OS — Battle Ground Module (Phase 2)
 * Exercise inline editor, rest timer, edit/delete templates, weight tracking, workout chart.
 */

import {
  loadState, saveState,
  awardXP, awardAttributeXP, modifyHP,
  checkAchievements, genId
} from '../engine/core.js';

import {
  renderHUD, showToast, showLevelUp, openModal
} from '../engine/gamification.js';

// ============================================================
//   TIMER STATE
// ============================================================
let restTimerInterval = null;

// ============================================================
//   RENDER
// ============================================================
export function renderBattle() {
  const state = loadState();
  renderTemplateList(state);
  renderSessionHistory(state);
  renderWorkoutChart(state);
}

function renderTemplateList(state) {
  const list = document.getElementById('template-list');
  if (!list) return;
  list.innerHTML = '';

  if (state.battle_ground.templates.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum template ainda.<br>Crie o seu primeiro!</p>';
    return;
  }

  for (const tmpl of state.battle_ground.templates) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.dataset.id = tmpl.id;

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)">
        <div class="template-card__name">${tmpl.name}</div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" data-tmpl-edit="${tmpl.id}" title="Editar" style="font-size:0.7rem">✏️</button>
          <button class="btn-icon" data-tmpl-del="${tmpl.id}" title="Deletar" style="font-size:0.7rem;color:var(--color-danger)">✕</button>
        </div>
      </div>
      <div class="template-card__meta">${tmpl.exercises.length} exercícios · +${tmpl.hp_impact} HP · ${tmpl.xp_reward_per_set} XP/série</div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('[data-tmpl-edit]') || e.target.closest('[data-tmpl-del]')) return;
      openSession(tmpl.id);
    });

    card.querySelector(`[data-tmpl-edit="${tmpl.id}"]`)?.addEventListener('click', e => {
      e.stopPropagation();
      openEditTemplateModal(tmpl.id);
    });

    card.querySelector(`[data-tmpl-del="${tmpl.id}"]`)?.addEventListener('click', e => {
      e.stopPropagation();
      deleteTemplate(tmpl.id);
    });

    list.appendChild(card);
  }
}

function renderSessionHistory(state) {
  const hist = document.getElementById('session-history');
  if (!hist) return;

  const sessions = [...state.battle_ground.sessions].reverse().slice(0, 10);
  if (sessions.length === 0) {
    hist.innerHTML = '<p class="empty-state">Nenhuma sessão ainda. Vá à batalha!</p>';
    return;
  }

  hist.innerHTML = sessions.map(s => `
    <div class="entry-item">
      <span class="entry-item__description">⚔️ ${s.template_name}</span>
      <span class="text-muted font-display">${s.date}</span>
      <span class="task-attr-badge AVE" style="color:var(--color-ave);border-color:var(--color-ave)">+${s.xp_earned} XP</span>
      <span class="status-badge status-badge--paid">+${s.hp_gained} HP</span>
      <span class="status-badge ${s.completed ? 'status-badge--paid' : 'status-badge--pending'}">${s.completed ? '✅' : '⏳'}</span>
    </div>
  `).join('');
}

// ============================================================
//   WORKOUT FREQUENCY CHART (Canvas)
// ============================================================
function renderWorkoutChart(state) {
  const canvas = document.getElementById('workout-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = 80;
  canvas.width = W;
  canvas.height = H;

  // Count sessions per day of week for the last 7 days
  const counts = { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 };
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

  const now = new Date();
  const sessions7 = state.battle_ground.sessions.filter(s => {
    const diff = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const rawCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  sessions7.forEach(s => {
    const d = new Date(s.date + 'T12:00:00');
    const dow = (d.getDay() + 6) % 7; // 0=Mon...6=Sun
    rawCounts[dow]++;
  });

  const max = Math.max(...rawCounts, 1);
  const barW = Math.floor(W / 7);
  const padding = 16;
  const barH = H - padding * 2;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = '#222244';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padding + barH - (barH * i / 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Bars
  rawCounts.forEach((count, i) => {
    const x = i * barW + 4;
    const h = count > 0 ? Math.max(4, (count / max) * barH) : 2;
    const y = padding + barH - h;
    const isToday = i === (new Date().getDay() + 6) % 7;

    // Bar gradient fill
    const grad = ctx.createLinearGradient(x, y, x, padding + barH);
    grad.addColorStop(0, isToday ? '#00e676' : '#5c6bc0');
    grad.addColorStop(1, isToday ? '#2e7d32' : '#3949ab');

    ctx.fillStyle = count > 0 ? grad : '#1a1a35';
    ctx.fillRect(x, y, barW - 8, h);

    // Label
    ctx.fillStyle = isToday ? '#00e676' : '#555580';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + (barW - 8) / 2, H - 3);
  });
}

// ============================================================
//   SESSION
// ============================================================
function openSession(templateId) {
  const state = loadState();
  const tmpl = state.battle_ground.templates.find(t => t.id === templateId);
  if (!tmpl) return;

  document.querySelectorAll('.template-card').forEach(c => {
    c.classList.toggle('template-card--active', c.dataset.id === templateId);
  });

  const content = document.getElementById('active-session-content');
  if (!content) return;

  // Track sets done per exercise
  const setsDoneMap = {};
  tmpl.exercises.forEach(ex => { setsDoneMap[ex.id] = 0; });

  function buildSessionHTML() {
    return `
      <div class="panel-title" style="margin-bottom:var(--space-3)">⚔️ ${tmpl.name}</div>
      <div id="session-exercises">
        ${tmpl.exercises.map(ex => `
          <div class="exercise-row" data-ex-id="${ex.id}">
            <span class="exercise-name">${ex.name}</span>
            <div class="set-counter" id="set-counter-${ex.id}">
              ${buildSetBtns(ex, setsDoneMap[ex.id])}
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" class="weight-input" id="weight-${ex.id}"
                value="${ex.weight_kg ?? 0}" min="0" step="2.5"
                aria-label="Peso kg" />
              <span class="text-muted font-display" style="font-size:var(--fs-display)">kg</span>
            </div>
            <span class="exercise-sets text-ave">${ex.sets}×${ex.reps}</span>
          </div>
        `).join('')}
      </div>
      <div id="rest-timer-slot"></div>
      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);flex-wrap:wrap;">
        <button class="btn-rp btn-rp--success" id="btn-finish-session" data-tmpl-id="${tmpl.id}">✅ Finalizar Treino</button>
        <button class="btn-rp btn-rp--ghost" id="btn-cancel-session">Cancelar</button>
      </div>
    `;
  }

  function buildSetBtns(ex, done) {
    let html = '';
    for (let i = 0; i < ex.sets; i++) {
      html += `<button class="set-btn${i < done ? ' set-btn--done' : ''}"
        data-ex="${ex.id}" data-set="${i}"
        aria-label="Série ${i + 1}">${i < done ? '✓' : i + 1}</button>`;
    }
    return html;
  }

  content.innerHTML = buildSessionHTML();

  // Wire up set buttons
  content.querySelectorAll('.set-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const exId = btn.dataset.ex;
      const setIdx = parseInt(btn.dataset.set);
      if (btn.classList.contains('set-btn--done')) return;

      btn.classList.add('set-btn--done');
      btn.textContent = '✓';
      setsDoneMap[exId] = (setsDoneMap[exId] || 0) + 1;

      // Save weight
      const weightEl = document.getElementById(`weight-${exId}`);
      if (weightEl) {
        let st = loadState();
        const ex = st.battle_ground.templates.find(t => t.id === templateId)?.exercises.find(e => e.id === exId);
        if (ex) { ex.weight_kg = parseFloat(weightEl.value) || 0; saveState(st); }
      }

      // Start rest timer
      const restSec = tmpl.exercises.find(e => e.id === exId)?.rest_seconds ?? 60;
      startRestTimer(restSec);
    });
  });

  document.getElementById('btn-finish-session')?.addEventListener('click', () => {
    stopRestTimer();
    const setsDone = Object.values(setsDoneMap).reduce((s, v) => s + v, 0);
    finishSession(tmpl.id, setsDone);
  });

  document.getElementById('btn-cancel-session')?.addEventListener('click', () => {
    stopRestTimer();
    content.innerHTML = '<p class="empty-state">Selecione um template para começar a batalha!</p>';
    document.querySelectorAll('.template-card').forEach(c => c.classList.remove('template-card--active'));
  });
}

// ============================================================
//   REST TIMER
// ============================================================
function startRestTimer(seconds) {
  stopRestTimer();
  const slot = document.getElementById('rest-timer-slot');
  if (!slot) return;

  let remaining = seconds;
  const total = seconds;

  slot.innerHTML = `
    <div class="rest-timer" id="active-rest-timer">
      <div class="font-pixel" style="font-size:var(--fs-xxs);color:var(--text-muted);letter-spacing:2px">DESCANSO</div>
      <div class="rest-timer__countdown" id="rest-countdown">${remaining}s</div>
      <div class="rest-timer__bar-wrap">
        <div class="rest-timer__bar-fill" id="rest-bar-fill" style="width:100%"></div>
      </div>
      <button class="btn-rp btn-rp--ghost" id="btn-skip-rest" style="font-size:var(--fs-xxs)">Pular</button>
    </div>
  `;

  document.getElementById('btn-skip-rest')?.addEventListener('click', stopRestTimer);

  restTimerInterval = setInterval(() => {
    remaining--;
    const pct = (remaining / total) * 100;
    const countdown = document.getElementById('rest-countdown');
    const bar = document.getElementById('rest-bar-fill');

    if (countdown) countdown.textContent = `${remaining}s`;
    if (bar) bar.style.width = `${pct}%`;

    if (remaining <= 5 && countdown) countdown.classList.add('finishing');

    if (remaining <= 0) {
      stopRestTimer();
      // Visual ding
      const timer = document.getElementById('active-rest-timer');
      if (timer) { timer.classList.add('rest-timer__ding'); showToast('⏰ Descansou! Próxima série!', 'xp', 2000); }
      slot.innerHTML = '';
    }
  }, 1000);
}

function stopRestTimer() {
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
  }
  const slot = document.getElementById('rest-timer-slot');
  if (slot) slot.innerHTML = '';
}

// ============================================================
//   FINISH SESSION
// ============================================================
function finishSession(templateId, setsDone) {
  let state = loadState();
  const tmpl = state.battle_ground.templates.find(t => t.id === templateId);
  if (!tmpl) return;

  const xpEarned = setsDone * (tmpl.xp_reward_per_set ?? 5);

  const { state: s1, leveledUp, newLevel } = awardXP(state, xpEarned);
  const { state: s2 } = awardAttributeXP(s1, 'AVE', Math.floor(xpEarned / 2));
  modifyHP(s2, tmpl.hp_impact ?? 10);

  s2.battle_ground.sessions.push({
    id: genId('session'), template_id: tmpl.id, template_name: tmpl.name,
    date: new Date().toISOString().slice(0, 10),
    duration_minutes: 0, completed: true, sets_done: setsDone,
    xp_earned: xpEarned, hp_gained: tmpl.hp_impact ?? 10, notes: '',
  });

  s2.player.stats.workouts_completed += 1;
  checkAchievements(s2);
  saveState(s2);

  showToast(`💪 Treino concluído! +${xpEarned} XP  +${tmpl.hp_impact} HP`, 'xp');
  if (leveledUp) setTimeout(() => showLevelUp(newLevel), 400);

  renderHUD(s2);
  renderBattle();

  const content = document.getElementById('active-session-content');
  if (content) content.innerHTML = '<p class="empty-state">Treino finalizado! Descanse e volte mais forte. 💪</p>';
}

// ============================================================
//   TEMPLATE CRUD
// ============================================================
function openNewTemplateModal() {
  openModal({
    title: '+ Novo Template',
    bodyHTML: buildTemplateForm(),
    confirmLabel: 'Criar Template',
    onConfirm: () => saveTemplate(null),
  });
}

function openEditTemplateModal(templateId) {
  const state = loadState();
  const tmpl = state.battle_ground.templates.find(t => t.id === templateId);
  if (!tmpl) return;

  openModal({
    title: 'Editar Template',
    bodyHTML: buildTemplateForm(tmpl),
    confirmLabel: '💾 Salvar',
    onConfirm: () => saveTemplate(templateId),
  });
}

function buildTemplateForm(tmpl = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nome do Template</label>
      <input class="form-input" id="tmpl-name" type="text" value="${tmpl.name ?? ''}" placeholder="Ex: Treino A - Peito" maxlength="50" />
    </div>
    <div class="form-group">
      <label class="form-label">Ganho de HP ao Concluir</label>
      <input class="form-input" id="tmpl-hp" type="number" value="${tmpl.hp_impact ?? 10}" min="0" max="50" />
    </div>
    <div class="form-group">
      <label class="form-label">XP por Série</label>
      <input class="form-input" id="tmpl-xp-per-set" type="number" value="${tmpl.xp_reward_per_set ?? 5}" min="1" max="30" />
    </div>

    <div style="border-top:var(--pixel-border-dark);padding-top:var(--space-3);margin-top:var(--space-2)">
      <p class="form-label" style="margin-bottom:var(--space-3)">Exercícios</p>
      <div id="exercises-list-editor">
        ${(tmpl.exercises ?? []).map(ex => buildExerciseRow(ex)).join('')}
      </div>
      <button type="button" class="btn-rp btn-rp--ghost" id="btn-add-exercise" style="font-size:var(--fs-xxs);margin-top:var(--space-2)">+ Exercício</button>
    </div>
  `;
}

function secsToMmss(secs) {
  const m = Math.floor((secs ?? 60) / 60).toString().padStart(2, '0');
  const s = ((secs ?? 60) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function buildExerciseRow(ex = {}) {
  const id = ex.id ?? genId('ex_tmp');
  return `
    <div class="exercise-editor__grid" data-ex-row="${id}">
      <input class="form-input ex-name"  type="text"   placeholder="Nome"  value="${ex.name ?? ''}" />
      <input class="form-input ex-sets"  type="number" placeholder="Séries" value="${ex.sets ?? 3}" min="1" max="20" style="width:60px" />
      <input class="form-input ex-reps"  type="text"   placeholder="Reps"   value="${ex.reps ?? '10'}" style="width:60px" />
      <input class="form-input ex-rest"  type="text"   placeholder="MM:SS" value="${secsToMmss(ex.rest_seconds)}" maxlength="5" style="width:65px" title="Formato MM:SS (ex: 01:30)" />
      <button type="button" class="btn-rp btn-rp--ghost btn-remove-ex" style="padding:var(--space-1);min-height:0">✕</button>
    </div>
  `;
}

function saveTemplate(templateId) {
  const name = document.getElementById('tmpl-name')?.value?.trim();
  const hp = parseInt(document.getElementById('tmpl-hp')?.value ?? '10', 10);
  const xpPerSet = parseInt(document.getElementById('tmpl-xp-per-set')?.value ?? '5', 10);

  if (!name) { showToast('⚠️ Dê um nome ao template!', 'info', 2000); return; }

  // Parse exercises from form
  const exercises = [];
  document.querySelectorAll('[data-ex-row]').forEach(row => {
    const exName = row.querySelector('.ex-name')?.value?.trim();
    if (!exName) return;
    const mmss  = row.querySelector('.ex-rest')?.value?.trim() ?? '01:00';
    const [mm, ss] = mmss.split(':').map(Number);
    const restSec = ((isNaN(mm) ? 1 : mm) * 60) + (isNaN(ss) ? 0 : ss);
    exercises.push({
      id: genId('ex'),
      name: exName,
      sets: parseInt(row.querySelector('.ex-sets')?.value ?? '3', 10),
      reps: row.querySelector('.ex-reps')?.value?.trim() ?? '10',
      weight_kg: 0,
      rest_seconds: restSec,
      notes: '',
    });
  });

  let state = loadState();

  if (templateId) {
    // Edit existing
    const tmpl = state.battle_ground.templates.find(t => t.id === templateId);
    if (tmpl) {
      tmpl.name = name; tmpl.hp_impact = hp; tmpl.xp_reward_per_set = xpPerSet;
      tmpl.exercises = exercises;
    }
  } else {
    // New
    state.battle_ground.templates.push({
      id: genId('tmpl'), name, attribute: 'AVE',
      xp_reward_per_set: xpPerSet, hp_impact: hp, exercises,
    });
  }

  saveState(state);
  showToast(templateId ? '💾 Template atualizado!' : '⚔️ Template criado!', 'info');
  renderBattle();
}

function deleteTemplate(templateId) {
  openModal({
    title: 'Deletar Template',
    bodyHTML: `<p class="font-display" style="font-size:var(--fs-display)">Tem certeza? O template e todos os dados serão removidos.</p>`,
    confirmLabel: '✕ Deletar',
    onConfirm: () => {
      let state = loadState();
      state.battle_ground.templates = state.battle_ground.templates.filter(t => t.id !== templateId);
      saveState(state);
      renderBattle();
    },
  });
}

// ============================================================
//   EXERCISE EDITOR — inline add/remove in modal
// ============================================================
function setupExerciseEditor() {
  document.addEventListener('click', e => {
    if (e.target.id === 'btn-add-exercise') {
      const list = document.getElementById('exercises-list-editor');
      if (list) list.insertAdjacentHTML('beforeend', buildExerciseRow());
    }
    if (e.target.classList.contains('btn-remove-ex')) {
      e.target.closest('[data-ex-row]')?.remove();
    }
  });
}

// ============================================================
//   INIT
// ============================================================
export function initBattle() {
  renderBattle();
  setupExerciseEditor();
  document.getElementById('btn-new-template')?.addEventListener('click', openNewTemplateModal);
}
