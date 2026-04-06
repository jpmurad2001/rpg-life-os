/**
 * RPG Life OS v2.2 — O Reino dos Sonhos
 * =======================================
 * Hardcore Pomodoro timer with RPG reward/penalty mechanics.
 *
 * Design decisions (user approved):
 *  - HP penalty is PROPORTIONAL: more progress = less HP lost on quit.
 *  - Linked Board card: notification only (no auto-tick).
 *  - No gold system (XP + HP only).
 *
 * State lives entirely in-memory (no LocalStorage for the timer itself).
 * Only the CONSEQUENCES (XP, HP change) are persisted via saveState().
 */

import { loadState, saveState, awardXP, modifyHP } from '../engine/core.js';
import {
  renderHUD, showToast, showLevelUp,
  openModal, closeModal,
} from '../engine/gamification.js';
import { playClick, playXpGain, playError } from '../engine/audio.js';

// ============================================================
//   CONSTANTS
// ============================================================
const RING_RADIUS      = 100;
const CIRCUMFERENCE    = 2 * Math.PI * RING_RADIUS; // ≈ 628.318

// ============================================================
//   IN-MEMORY TIMER STATE
// ============================================================
/**
 * _t — The single source of truth for the timer.
 *
 * phase:    'idle' | 'focus' | 'short_break' | 'long_break'
 * timeLeft: seconds remaining in this phase
 * totalTime: total seconds of this phase (for SVG progress calc)
 * isRunning / isPaused: control flags
 * intervalId: handle for the main setInterval
 * pauseSecondsLeft / pauseTotalSeconds / pauseIntervalId: pause limiter
 * cyclesCompleted: how many focus cycles finished this session
 * selectedMission: { type, id, title, boardId?, colId?, weekId? } | null
 * settings: user-configurable parameters
 */
const _t = {
  phase:    'idle',
  timeLeft:  0,
  totalTime: 0,

  isRunning:  false,
  isPaused:   false,
  intervalId: null,

  pauseSecondsLeft:  90,
  pauseTotalSeconds: 90,
  pauseIntervalId:   null,

  cyclesCompleted: 0,
  selectedMission: null,

  settings: {
    focus_minutes:       25,
    short_break_minutes:  5,
    long_break_minutes:  15,
    long_break_after:     4,   // focus cycles before a long break
    pause_limit_seconds: 90,   // max seconds allowed in pause
    xp_reward:           50,   // XP awarded on successful cycle
    hp_penalty:          10,   // MAX HP lost on abandonment (full penalty at 0% progress)
  },
};

// ============================================================
//   HELPERS
// ============================================================
function _fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function _el(id) { return document.getElementById(id); }

function _phaseLabel() {
  switch (_t.phase) {
    case 'focus':       return '🔥 FOCO';
    case 'short_break': return '☕ PAUSA CURTA';
    case 'long_break':  return '🌙 PAUSA LONGA';
    default:            return '⏳ REINO DOS SONHOS';
  }
}

function _phaseColor() {
  switch (_t.phase) {
    case 'focus':       return '#ff6b35';  // fire orange
    case 'short_break': return '#4fc3f7';  // sky cyan
    case 'long_break':  return '#a78bfa';  // violet
    default:            return '#555580';  // muted
  }
}

/** Returns 0.0–1.0: fraction of ELAPSED time (0 = just started, 1 = complete) */
function _progressElapsed() {
  if (_t.totalTime === 0) return 0;
  return (_t.totalTime - _t.timeLeft) / _t.totalTime;
}

// ============================================================
//   DOM RENDER
// ============================================================
function _renderDOM() {
  const timeEl     = _el('pomo-time-display');
  const phaseEl    = _el('pomo-phase-label');
  const cycleEl    = _el('pomo-cycle-count');
  const ringEl     = _el('pomo-progress-ring');
  const wrapEl     = _el('pomo-ring-wrap');
  const startBtn   = _el('pomo-btn-start');
  const pauseBtn   = _el('pomo-btn-pause');
  const abandonBtn = _el('pomo-btn-abandon');

  // ── Time & color ──
  const color = _phaseColor();
  if (timeEl) {
    timeEl.textContent = _fmt(_t.timeLeft);
    timeEl.style.color = color;
  }
  if (phaseEl) phaseEl.textContent = _phaseLabel();

  // ── Cycle count ──
  if (cycleEl) {
    if (_t.phase === 'idle' && _t.cyclesCompleted === 0) {
      cycleEl.textContent = '— Iniciar para começar —';
    } else {
      const inProgress = _t.phase === 'focus' ? ` · Ciclo ${_t.cyclesCompleted + 1} em andamento` : '';
      cycleEl.textContent = _t.cyclesCompleted > 0
        ? `${_t.cyclesCompleted} ciclo${_t.cyclesCompleted > 1 ? 's' : ''} concluído${_t.cyclesCompleted > 1 ? 's' : ''}${inProgress}`
        : inProgress.trim();
    }
  }

  // ── SVG Ring ──
  if (ringEl) {
    // timeLeft / totalTime = fraction REMAINING → ring fills to match
    const progress = _t.totalTime > 0 ? _t.timeLeft / _t.totalTime : 1;
    const offset   = CIRCUMFERENCE * (1 - progress);
    ringEl.style.strokeDashoffset = offset;
    ringEl.style.stroke           = color;
  }

  // ── Glow class ──
  if (wrapEl) {
    wrapEl.className = 'pomo-ring-wrap';
    if (_t.isRunning) {
      wrapEl.classList.add(
        _t.phase === 'focus' ? 'pomo-ring-wrap--focus' : 'pomo-ring-wrap--break'
      );
    }
    if (_t.isPaused) wrapEl.classList.add('pomo-ring-wrap--paused');
  }

  // ── Buttons ──
  if (startBtn && pauseBtn && abandonBtn) {
    if (_t.phase === 'idle') {
      startBtn.style.display   = '';
      startBtn.textContent     = '▶ Iniciar Foco';
      pauseBtn.style.display   = 'none';
      abandonBtn.style.display = 'none';
    } else if (_t.phase === 'focus') {
      startBtn.style.display   = 'none';
      pauseBtn.style.display   = '';
      pauseBtn.textContent     = _t.isPaused ? '▶ Retomar' : '⏸ Pausar';
      abandonBtn.style.display = '';
      abandonBtn.textContent   = '✕ Desistir';
    } else {
      // Break phase
      startBtn.style.display   = 'none';
      pauseBtn.style.display   = 'none';
      abandonBtn.style.display = '';
      abandonBtn.textContent   = '⏭ Pular Pausa';
    }
  }

  _renderPauseBar();
}

function _renderPauseBar() {
  const wrap  = _el('pomo-pause-bar-wrap');
  const fill  = _el('pomo-pause-bar-fill');
  const secEl = _el('pomo-pause-seconds');

  if (!wrap) return;

  const show   = _t.isPaused && _t.phase === 'focus';
  wrap.style.display = show ? '' : 'none';

  if (show) {
    const pct = Math.max(0, (_t.pauseSecondsLeft / _t.pauseTotalSeconds) * 100);
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.classList.toggle('pomo-pause-bar-fill--critical', pct <= 25);
    }
    if (secEl) secEl.textContent = `${_t.pauseSecondsLeft}s`;
  }
}

// ============================================================
//   TICK FUNCTIONS
// ============================================================
function _tick() {
  if (_t.timeLeft <= 0) {
    _onPhaseComplete();
    return;
  }
  _t.timeLeft--;
  _renderDOM();
}

function _pauseTick() {
  _t.pauseSecondsLeft--;
  _renderPauseBar();
  if (_t.pauseSecondsLeft <= 0) {
    _clearPauseInterval();
    showToast('⚠️ Pausa esgotada! Retomando o foco...', 'damage', 3000);
    resumeTimer();
  }
}

// ============================================================
//   PHASE TRANSITIONS
// ============================================================
function _onPhaseComplete() {
  _clearMainInterval();

  if (_t.phase === 'focus') {
    _onFocusComplete();
    const isLong = _t.cyclesCompleted > 0 && (_t.cyclesCompleted % _t.settings.long_break_after === 0);
    setTimeout(() => _startBreak(isLong), 1400);
  } else {
    // Break finished → next focus
    _showSuccessFlash('☀️ Pausa concluída!');
    setTimeout(() => startFocus(), 1600);
  }
}

// ============================================================
//   REWARD — SUCCESS (proportional xp based on full completion)
// ============================================================
function _onFocusComplete() {
  _t.cyclesCompleted++;

  let state    = loadState();
  const xp     = _t.settings.xp_reward;

  // 1. Award XP
  const { state: s1, leveledUp, newLevel } = awardXP(state, xp);

  // 2. Update pomodoro stat
  if (s1.player?.stats) s1.player.stats.pomodoro_sessions_completed++;

  // 3. Linked mission: notification only (user choice B)
  if (_t.selectedMission) {
    showToast(`📜 Ciclo concluído para "${_t.selectedMission.title}" — marque o progresso!`, 'info', 4000);
  }

  // 4. Persist
  saveState(s1);
  renderHUD(s1);

  // 5. FX
  playXpGain();
  showToast(`✨ +${xp} XP — Ciclo ${_t.cyclesCompleted} concluído!`, 'xp', 4000);
  _showSuccessFlash(`✨ +${xp} XP`);

  if (leveledUp) setTimeout(() => showLevelUp(newLevel), 900);
}

// ============================================================
//   PENALTY — PROPORTIONAL HP LOSS (user choice B)
// ============================================================
/**
 * HP lost = hp_penalty × (1 - fractionElapsed)
 * Example: quit at 80% done → loses only 20% of max penalty.
 *          quit at 5% done  → loses 95% of max penalty.
 *          quit immediately → loses full hp_penalty.
 */
function _onFocusAbandoned() {
  _clearMainInterval();
  _clearPauseInterval();

  const elapsed = _progressElapsed();                         // 0.0 → 1.0
  const penalty = Math.max(1, Math.round(_t.settings.hp_penalty * (1 - elapsed)));

  let state = loadState();
  modifyHP(state, -penalty);
  saveState(state);
  renderHUD(state);

  playError();
  _showFailureOverlay(penalty, elapsed);
  _resetToIdle();
}

// ============================================================
//   TIMER CONTROLS (exported for external use)
// ============================================================
export function startFocus() {
  if (_t.isRunning) return;
  _clearMainInterval();
  _clearPauseInterval();

  _t.phase              = 'focus';
  _t.timeLeft           = _t.settings.focus_minutes * 60;
  _t.totalTime          = _t.timeLeft;
  _t.isRunning          = true;
  _t.isPaused           = false;
  _t.pauseSecondsLeft   = _t.settings.pause_limit_seconds;
  _t.pauseTotalSeconds  = _t.settings.pause_limit_seconds;
  _t.intervalId         = setInterval(_tick, 1000);

  _renderDOM();
  showToast('🔥 Sessão iniciada! Mantenha o foco, Caçador.', 'info', 3000);
}

function _startBreak(isLong = false) {
  _clearMainInterval();
  _clearPauseInterval();

  _t.phase     = isLong ? 'long_break' : 'short_break';
  _t.timeLeft  = (isLong ? _t.settings.long_break_minutes : _t.settings.short_break_minutes) * 60;
  _t.totalTime = _t.timeLeft;
  _t.isRunning = true;
  _t.isPaused  = false;
  _t.intervalId = setInterval(_tick, 1000);

  _renderDOM();
  const label = isLong ? '🌙 Pausa Longa' : '☕ Pausa Curta';
  showToast(`${label} — Respire. Você merece.`, 'info', 3000);
}

export function pauseTimer() {
  if (!_t.isRunning || _t.isPaused || _t.phase !== 'focus') return;

  _clearMainInterval();
  _t.isPaused   = true;
  _t.isRunning  = false;
  _t.pauseIntervalId = setInterval(_pauseTick, 1000);

  _renderDOM();
  showToast(`⏸ Pausado — ${_t.pauseSecondsLeft}s disponíveis.`, 'info', 2000);
}

export function resumeTimer() {
  if (!_t.isPaused) return;

  _clearPauseInterval();
  _t.isPaused  = false;
  _t.isRunning = true;
  _t.intervalId = setInterval(_tick, 1000);

  _renderDOM();
}

export function abandonTimer() {
  if (_t.phase === 'idle') return;

  if (_t.phase === 'focus') {
    const elapsed  = _progressElapsed();
    const penalty  = Math.max(1, Math.round(_t.settings.hp_penalty * (1 - elapsed)));
    const pctDone  = Math.round(elapsed * 100);

    openModal({
      title: '⚠️ Quebrar o Foco?',
      bodyHTML: `
        <div class="pomo-abandon-confirm">
          <div class="pomo-abandon-glyph">💀</div>
          <p class="pomo-abandon-msg">
            Você completou <strong style="color:var(--color-warning)">${pctDone}%</strong> do ciclo.
          </p>
          <p class="pomo-abandon-penalty">
            Punição: <strong style="color:var(--color-danger)">−${penalty} HP</strong>
          </p>
          <p class="pomo-abandon-lore">
            "A fraqueza da mente é o maior dos venenos."
          </p>
        </div>
      `,
      confirmLabel: `💀 Desistir (−${penalty} HP)`,
      cancelLabel:  '▶ Continuar Foco',
      onConfirm:    () => _onFocusAbandoned(),
    });
  } else {
    // Skip break — no penalty
    _clearMainInterval();
    _resetToIdle();
    showToast('⏭ Pausa pulada.', 'info', 1500);
  }
}

// ============================================================
//   INTERVAL CLEANUP
// ============================================================
function _clearMainInterval() {
  if (_t.intervalId) { clearInterval(_t.intervalId); _t.intervalId = null; }
  _t.isRunning = false;
}

function _clearPauseInterval() {
  if (_t.pauseIntervalId) { clearInterval(_t.pauseIntervalId); _t.pauseIntervalId = null; }
}

function _resetToIdle() {
  _t.phase            = 'idle';
  _t.timeLeft         = _t.settings.focus_minutes * 60;
  _t.totalTime        = _t.timeLeft;
  _t.isPaused         = false;
  _t.pauseSecondsLeft = _t.settings.pause_limit_seconds;
  _renderDOM();
}

// ============================================================
//   VISUAL OVERLAYS
// ============================================================
function _showSuccessFlash(message) {
  const view = document.getElementById('view-pomodoro');
  if (!view) return;
  const flash = document.createElement('div');
  flash.className   = 'pomo-success-flash';
  flash.textContent = message;
  view.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
}

function _showFailureOverlay(penalty, elapsed) {
  const overlay  = _el('pomo-failure-overlay');
  const subtitle = _el('pomo-failure-subtitle');
  const detail   = _el('pomo-failure-detail');
  if (!overlay) return;

  const pctDone = Math.round(elapsed * 100);
  if (subtitle) subtitle.textContent = `−${penalty} HP perdido`;
  if (detail)   detail.textContent   = `Progresso na sessão: ${pctDone}% concluído.`;

  overlay.style.display = 'flex';
  const okBtn = _el('pomo-failure-ok');
  if (okBtn) {
    const clone = okBtn.cloneNode(true);
    okBtn.replaceWith(clone);
    clone.addEventListener('click', () => { overlay.style.display = 'none'; }, { once: true });
  }
}

// ============================================================
//   MISSION SELECTOR
// ============================================================
function _buildMissionSelector() {
  const sel = _el('pomo-mission-select');
  if (!sel) return;

  const state  = loadState();
  sel.innerHTML = '<option value="">— Nenhuma (foco livre) —</option>';

  // Quest tasks (current week, pending)
  const weekId = state.quests?.current_week_id;
  const tasks  = weekId
    ? (state.quests.weeks[weekId]?.tasks ?? []).filter(t => t.status !== 'completed')
    : [];

  if (tasks.length > 0) {
    const grp   = document.createElement('optgroup');
    grp.label   = '📜 Quests da Semana';
    tasks.forEach(t => {
      const opt = new Option(t.title, JSON.stringify({ type: 'quest', id: t.id, weekId, title: t.title }));
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }

  // Board cards
  (state.boards ?? []).forEach(board => {
    board.columns?.forEach(col => {
      if (!col.cards?.length) return;
      const grp = document.createElement('optgroup');
      grp.label = `🗡️ ${board.title} › ${col.title}`;
      col.cards.forEach(card => {
        const opt = new Option(
          card.title,
          JSON.stringify({ type: 'board', id: card.id, boardId: board.id, colId: col.id, title: card.title })
        );
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    });
  });

  // Restore current selection if still valid
  if (_t.selectedMission) {
    const val = JSON.stringify(_t.selectedMission);
    for (const opt of sel.options) {
      if (opt.value === val) { sel.value = val; break; }
    }
  }
}

// ============================================================
//   SETTINGS MODAL
// ============================================================
function _openSettingsModal() {
  const s = _t.settings;
  openModal({
    title: '⚙️ Configurações — Reino dos Sonhos',
    confirmLabel: '💾 Salvar',
    bodyHTML: `
      <div class="pomo-settings-grid">
        <div class="form-group">
          <label class="form-label">🔥 Duração do Foco (min)</label>
          <input class="form-input" id="ps-focus" type="number" min="1" max="120" value="${s.focus_minutes}" />
        </div>
        <div class="form-group">
          <label class="form-label">☕ Pausa Curta (min)</label>
          <input class="form-input" id="ps-short" type="number" min="1" max="30" value="${s.short_break_minutes}" />
        </div>
        <div class="form-group">
          <label class="form-label">🌙 Pausa Longa (min)</label>
          <input class="form-input" id="ps-long" type="number" min="5" max="60" value="${s.long_break_minutes}" />
        </div>
        <div class="form-group">
          <label class="form-label">🔁 Ciclos até Pausa Longa</label>
          <input class="form-input" id="ps-lba" type="number" min="1" max="10" value="${s.long_break_after}" />
        </div>
        <div class="form-group">
          <label class="form-label">⏸ Limite de Pausa (seg)</label>
          <input class="form-input" id="ps-pause" type="number" min="10" max="300" value="${s.pause_limit_seconds}" />
        </div>
        <div class="form-group">
          <label class="form-label">✨ XP por Ciclo</label>
          <input class="form-input" id="ps-xp" type="number" min="5" max="500" value="${s.xp_reward}" />
        </div>
        <div class="form-group">
          <label class="form-label">💀 HP Máximo a Perder (Proporcional)</label>
          <input class="form-input" id="ps-hp" type="number" min="0" max="50" value="${s.hp_penalty}" />
          <span style="font-family:var(--font-display);font-size:var(--fs-display);color:var(--text-muted);">
            Desistir cedo = perder mais. O valor acima é o máximo possível.
          </span>
        </div>
      </div>
    `,
    onConfirm: () => {
      const get = (id, def) => parseInt(_el(id)?.value ?? String(def), 10) || def;
      _t.settings.focus_minutes       = get('ps-focus',  25);
      _t.settings.short_break_minutes = get('ps-short',   5);
      _t.settings.long_break_minutes  = get('ps-long',   15);
      _t.settings.long_break_after    = get('ps-lba',     4);
      _t.settings.pause_limit_seconds = get('ps-pause',  90);
      _t.settings.xp_reward           = get('ps-xp',     50);
      _t.settings.hp_penalty          = get('ps-hp',     10);

      if (_t.phase === 'idle') {
        _t.timeLeft          = _t.settings.focus_minutes * 60;
        _t.totalTime         = _t.timeLeft;
        _t.pauseSecondsLeft  = _t.settings.pause_limit_seconds;
        _t.pauseTotalSeconds = _t.settings.pause_limit_seconds;
        _renderDOM();
      }
      showToast('⚙️ Configurações salvas!', 'info', 2000);
    },
  });
}

// ============================================================
//   INIT
// ============================================================
export function initPomodoro() {
  // Set idle display
  _t.timeLeft  = _t.settings.focus_minutes * 60;
  _t.totalTime = _t.timeLeft;

  // Initialize SVG dasharray (must be done once)
  const ringEl = _el('pomo-progress-ring');
  if (ringEl) {
    ringEl.style.strokeDasharray  = CIRCUMFERENCE;
    ringEl.style.strokeDashoffset = 0; // full at start
  }

  _renderDOM();
  _buildMissionSelector();

  // Wire mission selector (idempotent via data-wired)
  const sel = _el('pomo-mission-select');
  if (sel && !sel.dataset.wired) {
    sel.dataset.wired = '1';
    sel.addEventListener('change', () => {
      _t.selectedMission = sel.value ? JSON.parse(sel.value) : null;
    });
  }

  // Wire buttons
  const wire = (id, fn) => {
    const btn = _el(id);
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => { playClick(); fn(); });
    }
  };

  wire('pomo-btn-start',    startFocus);
  wire('pomo-btn-pause',    () => (_t.isPaused ? resumeTimer() : pauseTimer()));
  wire('pomo-btn-abandon',  abandonTimer);
  wire('pomo-btn-settings', _openSettingsModal);
}
