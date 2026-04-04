/**
 * Shadow Slave Life OS — App Entrypoint (Phase 4)
 * ================================================
 * Auth gate → Firebase → Firestore data → renders modules.
 * Day/Night detection, Rank system, Settings modal, all wiring.
 */

// ---- Firebase ----
import { onAuthChanged, login, register, logout, resetPassword, deleteAccount } from '../firebase/auth.js';
import {
  getPlayer, savePlayer, initNewPlayer, migrateFromLocalStorage, getLootTable, getWeek, saveWeek, deletePlayer
} from '../firebase/db.js';

// ---- Engine ----
import {
  renderHUD, renderRankBar, setActiveNav, switchView, setPageTitle,
  openModal, closeModal, showToast, showAchievementToast,
  incrementAchievementBadge, clearAchievementBadge,
  showRankUpOverlay, renderAttributeRadar,
} from '../engine/gamification.js';

import {
  sfx, setSoundEnabled, setSoundVolume,
  playClick, playNightfall, playRankUp,
} from '../engine/audio.js';

import { loadState, saveState, getWeekId } from '../engine/core.js';

import { calcRank, RANKS, RANK_THRESHOLDS } from '../engine/drop_engine.js';

// ---- Modules ----
import { initQuests }       from '../modules/quests.js';
import { initBattle }       from '../modules/battle.js';
import { initTaverna }      from '../modules/taverna.js';
import { initCampaignMap }  from '../modules/campaign_map.js';
import { initInventory }    from '../modules/inventory.js';

// ---- Audio Player (BGM + Spotify) ----
import { initAudioPlayer } from './audio_player_ui.js';

// ============================================================
//   GLOBAL STATE (in-memory, synced to Firestore)
// ============================================================
let _currentUser  = null;
let _playerData   = null;

export function getCurrentUser()  { return _currentUser; }
export function getPlayerData()   { return _playerData; }

// ============================================================
//   VIEW CONFIG
// ============================================================
const VIEWS = {
  quests:       { title: '📜 Quests Semanais',   init: initQuests    },
  battle:       { title: '⚔️ Battle Ground',      init: initBattle    },
  taverna:      { title: '🏰 Taverna — Finanças', init: initTaverna   },
  bosses:       { title: '🐉 Modo Campanha',       init: initCampaignMap },
  inventory:    { title: '💎 Memórias',           init: initInventory },
  achievements: { title: '🏆 Conquistas',         init: renderAchievements },
};

// ============================================================
//   AUTH GATE
// ============================================================
function setupAuthGate() {
  onAuthChanged(async user => {
    if (user) {
      _currentUser = user;
      await _onUserLogin(user);
    } else {
      _currentUser = null;
      _playerData  = null;
      showAuthScreen();
    }
  });
}

function showAuthScreen() {
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.add('hidden');
}

function showAppShell() {
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
}

async function syncFirestoreToLocalState(uid, playerFirestore) {
  const local = loadState();
  
  // 1. Sync Player
  const pData = playerFirestore.progression || {};
  const stats = playerFirestore.stats || {};
  local.player.name = playerFirestore.display_name || 'Caçador';
  local.player.xp = pData.fragmentos || 0;
  local.player.hp = pData.hp || 100;
  local.player.hp_max = pData.hp_max || 100;
  if (pData.attributes) {
    local.player.attributes.INT = pData.attributes.INT || local.player.attributes.INT;
    local.player.attributes.ART = pData.attributes.ART || local.player.attributes.ART;
    local.player.attributes.AVE = pData.attributes.AVE || local.player.attributes.AVE;
  }
  local.player.stats.total_xp_earned = pData.fragmentos_total || 0;
  local.player.stats.quests_completed = stats.quests_completed || 0;
  local.player.stats.bosses_defeated = stats.bosses_defeated || 0;
  local.player.stats.workouts_completed = stats.workouts_completed || 0;
  if (playerFirestore.settings) {
    local.settings = { ...local.settings, ...playerFirestore.settings };
  }

  // 2. Sync Current Week
  const weekId = getWeekId();
  const weekFirestore = await getWeek(uid, weekId);
  if (weekFirestore) {
    local.quests.weeks[weekId] = weekFirestore;
    local.quests.current_week_id = weekId;
  }

  // Save silently (bypass the outward sync hook to prevent loops)
  const oldHook = window._syncStateToFirestore;
  window._syncStateToFirestore = null;
  saveState(local);
  window._syncStateToFirestore = oldHook;
}

async function _onUserLogin(user) {
  try {
    setAuthMessage('🌑 Entrando no Vazio...', 'loading');

    let player = await getPlayer(user.uid);

    if (!player) {
      // First-time login: init profile
      player = await initNewPlayer(user.uid, user.displayName ?? 'Caçador');
      // Try migrating localStorage data
      const migrated = await migrateFromLocalStorage(user.uid);
      if (migrated) showToast('📦 Dados anteriores migrados!', 'info', 4000);
    }
    
    await syncFirestoreToLocalState(user.uid, player);

    _playerData = player;

    showAppShell();
    initAudioPlayer(); // música persiste entre navegações
    applySettings(player.settings);
    checkTimeOfDay();
    await renderHUDFromPlayer(player);
    setupNav();
    setupModal();
    setupAuthForms();
    setupLevelUpClose();
    setupProfileButton();
    setupBellButton(player);
    setupGearButton();
    setupThemeToggleButton(player.settings?.theme);
    checkDailyHP(user.uid, player);
    setupSyncHook();
    navigateTo('quests');

    console.log('[App] Booted v4.0 — Caçador:', user.displayName, '| Rank:', player.progression?.rank);
  } catch (e) {
    console.error('[App] Erro ao carregar perfil:', e);
    setAuthMessage('❌ Erro ao carregar perfil. Tente novamente.', 'error');
    showAuthScreen();
  }
}

// ============================================================
//   NAVIGATION
// ============================================================
function navigateTo(viewName) {
  if (!VIEWS[viewName]) return;
  playClick();

  setActiveNav(viewName);
  switchView(viewName);
  setPageTitle(VIEWS[viewName].title);

  if (viewName === 'achievements') clearAchievementBadge();

  const initFn = VIEWS[viewName].init;
  if (initFn) initFn();
}

function setupNav() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view))
  );
  document.querySelectorAll('.bottom-nav__btn[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view))
  );
}

// ============================================================
//   FIRESTORE BACKGROUND SYNC
// ============================================================
function setupSyncHook() {
  window._syncStateToFirestore = async (state) => {
    if (!_currentUser) return;
    try {
      // 1. Sync Player Profile (Progression, Stats, Settings)
      const p = state.player;
      await savePlayer(_currentUser.uid, {
        display_name: p.name,
        progression: {
          fragmentos:       p.xp,
          fragmentos_total: p.stats.total_xp_earned ?? p.xp,
          rank:             calcRank(p.stats.total_xp_earned ?? p.xp).rank,
          hp:               p.hp,
          hp_max:           p.hp_max,
          attributes:       p.attributes,
        },
        stats: p.stats,
        settings: state.settings,
      });

      // 2. Sync Current Week Quests
      const currentWeekId = state.quests.current_week_id;
      if (currentWeekId && state.quests.weeks[currentWeekId]) {
        await saveWeek(_currentUser.uid, currentWeekId, state.quests.weeks[currentWeekId]);
      }
      
      console.log('☁️ [Sync] Estado salvo no Firestore em background.');
    } catch (err) {
      console.error('🔴 [Sync Error] Falha ao sincronizar com Firestore:', err);
    }
  };
}

// ============================================================
//   HUD & RANK RENDER
// ============================================================
export async function renderHUDFromPlayer(player) {
  if (!player) return;
  _playerData = player;

  // Core HUD
  renderHUD({ player: _playerFirestore2HUDCompat(player) });

  // Rank bar
  const rankInfo = calcRank(player.progression?.fragmentos_total ?? 0);
  renderRankBar(rankInfo);
  renderAttributeRadar({ player: _playerFirestore2HUDCompat(player) });
}

/** Adapts Firestore player shape to the HUD renderer's expected shape */
function _playerFirestore2HUDCompat(player) {
  const p = player.progression ?? {};
  return {
    name:       player.display_name ?? 'Caçador',
    level:      (RANKS.indexOf(p.rank ?? 'Adormecido') + 1),
    rank:       p.rank ?? 'Adormecido',
    xp:         p.fragmentos     ?? 0,
    xp_next:    _nextRankFragmentos(p.fragmentos_total ?? 0),
    hp:         p.hp     ?? 100,
    hp_max:     p.hp_max ?? 100,
    attributes: p.attributes ?? {
      INT: { value: 1 }, ART: { value: 1 }, AVE: { value: 1 },
    },
    stats:      player.stats ?? {},
  };
}

function _nextRankFragmentos(total) {
  const currentRank = Object.entries(RANK_THRESHOLDS).reduce(
    (acc, [rank, val]) => total >= val ? rank : acc, 'Adormecido'
  );
  const currentIdx  = RANKS.indexOf(currentRank);
  const nextRank    = RANKS[currentIdx + 1];
  return nextRank ? RANK_THRESHOLDS[nextRank] : RANK_THRESHOLDS.Divino;
}

// ============================================================
//   AUTH FORMS SETUP
// ============================================================
function setupAuthForms() {
  // Already wired from first load — avoid double binding
  if (document.getElementById('form-login')?.dataset.wired) return;

  // Tab switching
  document.getElementById('tab-login')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchAuthTab('register'));

  // Login
  document.getElementById('form-login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    const pass  = document.getElementById('login-password')?.value;
    if (!email || !pass) return;
    setAuthLoading(true);
    try {
      await login(email, pass);
    } catch (err) {
      setAuthMessage(_authErrorMsg(err.code), 'error');
      setAuthLoading(false);
    }
  });

  // Register
  document.getElementById('form-register')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = document.getElementById('reg-name')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const pass  = document.getElementById('reg-password')?.value;
    if (!name || !email || !pass) return;
    setAuthLoading(true);
    try {
      await register(email, pass, name);
    } catch (err) {
      setAuthMessage(_authErrorMsg(err.code), 'error');
      setAuthLoading(false);
    }
  });

  // Forgot password
  document.getElementById('btn-forgot-pwd')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value?.trim();
    if (!email) { setAuthMessage('⚠️ Digite seu email primeiro.', 'error'); return; }
    try {
      await resetPassword(email);
      setAuthMessage('📧 Email de redefinição enviado!', 'success');
    } catch (err) {
      setAuthMessage(_authErrorMsg(err.code), 'error');
    }
  });

  document.getElementById('form-login').dataset.wired = '1';
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login')?.classList.toggle('auth-tab--active', isLogin);
  document.getElementById('tab-register')?.classList.toggle('auth-tab--active', !isLogin);
  document.getElementById('form-login')?.classList.toggle('hidden', !isLogin);
  document.getElementById('form-register')?.classList.toggle('hidden', isLogin);
  clearAuthMessage();
}

function setAuthLoading(on) {
  document.getElementById('auth-loading')?.classList.toggle('visible', on);
  document.querySelectorAll('.auth-btn[type=submit]').forEach(b => { b.disabled = on; });
}

function setAuthMessage(msg, type = '') {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent  = msg;
  el.className    = `auth-message${type ? ' auth-message--' + type : ''}`;
}

function clearAuthMessage() { setAuthMessage(''); }

function _authErrorMsg(code) {
  const map = {
    'auth/user-not-found':    '❌ Usuário não encontrado.',
    'auth/wrong-password':    '❌ Senha incorreta.',
    'auth/email-already-in-use': '❌ Email já cadastrado.',
    'auth/weak-password':     '❌ Senha muito fraca (mín 6 caracteres).',
    'auth/invalid-email':     '❌ Email inválido.',
    'auth/too-many-requests': '⚠️ Muitas tentativas. Aguarde.',
  };
  return map[code] ?? `❌ Erro: ${code}`;
}

// ============================================================
//   DAY / NIGHT DETECTION
// ============================================================
let _wasNight = null;

function checkTimeOfDay() {
  const hour    = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;

  document.documentElement.setAttribute('data-time', isNight ? 'night' : 'day');

  if (isNight && _wasNight === false) {
    // Just became night
    showToast('🌙 Modo Noturno ativado — as sombras se aprofundam.', 'info', 4000);
    playNightfall();
  }

  _wasNight = isNight;
}

// ============================================================
//   SETTINGS
// ============================================================
function applySettings(settings = {}) {
  setSoundEnabled(settings.sound_enabled ?? true);
  setSoundVolume((settings.sound_volume ?? 18) / 100);
  applyTheme(settings.theme ?? 'dark');
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
}

function setupThemeToggleButton(currentTheme = 'dark') {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;
  btn.textContent = currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
  btn.addEventListener('click', async () => {
    const curr = document.documentElement.getAttribute('data-theme') ?? 'dark';
    const next = curr === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    playClick();
    if (_currentUser) {
      await savePlayer(_currentUser.uid, { 'settings.theme': next });
    }
  });
}

function setupGearButton() {
  document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);
}

function openSettingsModal() {
  const s = _playerData?.settings ?? {};
  openModal({
    title: '⚙️ Configurações',
    confirmLabel: '💾 Salvar',
    bodyHTML: `
      <div class="settings-section">
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔊 Sons 8-bit</span>
            <span class="settings-row__desc">Efeitos de som sombrios</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-sound" ${s.sound_enabled !== false ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔉 Volume</span>
            <span class="settings-row__desc">Intensidade dos sons</span>
          </div>
          <input type="range" class="volume-slider" id="setting-volume" min="0" max="100" value="${s.sound_volume ?? 18}" />
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">☀️ Tema Claro</span>
            <span class="settings-row__desc">Alternar Dark ↔ Light</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-theme" ${s.theme === 'light' ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔔 Notificações</span>
            <span class="settings-row__desc">Lembrete diário às 9h</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-notif" ${s.notifications_enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row" style="border-color:var(--color-danger)">
          <div class="settings-row__label">
            <span class="settings-row__title" style="color:var(--color-danger)">🚪 Sair da Conta</span>
            <span class="settings-row__desc">Encerrar sessão</span>
          </div>
          <button class="btn-rp btn-rp--danger" id="btn-logout" style="font-size:var(--fs-xxs)">Sair</button>
        </div>
        <div class="settings-row" style="border-color:var(--color-danger); margin-top:20px;">
          <div class="settings-row__label">
            <span class="settings-row__title" style="color:var(--color-danger)">🔥 Zona de Perigo</span>
            <span class="settings-row__desc">Apagar conta e dados</span>
          </div>
          <button class="btn-rp btn-rp--danger" id="btn-delete-account" style="font-size:var(--fs-xxs)">Excluir Conta</button>
        </div>
      </div>
    `,
    onConfirm: async () => {
      const soundOn  = document.getElementById('setting-sound')?.checked ?? true;
      const vol      = parseInt(document.getElementById('setting-volume')?.value ?? '18', 10);
      const light    = document.getElementById('setting-theme')?.checked ?? false;
      const notif    = document.getElementById('setting-notif')?.checked ?? false;

      const settings = { sound_enabled: soundOn, sound_volume: vol, theme: light ? 'light' : 'dark', notifications_enabled: notif };
      setSoundEnabled(soundOn);
      setSoundVolume(vol / 100);
      applyTheme(settings.theme);

      if (_currentUser) await savePlayer(_currentUser.uid, { settings });
      showToast('⚙️ Configurações salvas!', 'info', 2000);
    },
  });

  setTimeout(() => {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      closeModal();
      await logout();
    });

    document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
      const confirmWord = window.prompt("⚠️ ZONA DE PERIGO ⚠️\nIsso apagará seu save para sempre.\nPara confirmar, digite DELETAR abaixo:");
      if (confirmWord?.trim().toUpperCase() === "DELETAR") {
        try {
          const uid = _currentUser?.uid;
          if (!uid) return;
          closeModal();
          
          await deletePlayer(uid);
          await deleteAccount();
          
          // Nuke localStorage so no offline data remains
          import('../engine/core.js').then(module => module.resetState());
          localStorage.clear();

          showToast('Conta excluída definitivamente.', 'danger', 4000);
          setTimeout(() => window.location.reload(), 2000);
        } catch (e) {
          console.error(e);
          if (e.code === 'auth/requires-recent-login') {
            alert('Operação bloqueada por segurança. Saia da conta, faça login novamente e repita o processo.');
          } else {
            alert('Erro ao excluir conta: ' + e.message);
          }
        }
      } else if (confirmWord !== null) {
        alert("Palavra incorreta. A conta NÃO foi excluída.");
      }
    });

  }, 100);
}

// ============================================================
//   BELL (Notifications quick toggle)
// ============================================================
function setupBellButton(player) {
  const btn     = document.getElementById('btn-bell');
  const enabled = player?.settings?.notifications_enabled ?? false;
  if (btn) btn.textContent = enabled ? '🔔' : '🔕';

  btn?.addEventListener('click', async () => {
    const curr = _playerData?.settings?.notifications_enabled ?? false;
    const next = !curr;
    if (_playerData) { if (!_playerData.settings) _playerData.settings = {}; _playerData.settings.notifications_enabled = next; }
    if (btn) btn.textContent = next ? '🔔' : '🔕';
    if (_currentUser) await savePlayer(_currentUser.uid, { 'settings.notifications_enabled': next });
    showToast(next ? '🔔 Notificações ativadas!' : '🔕 Notificações desativadas.', 'info', 2000);
  });
}

// ============================================================
//   PROFILE MODAL
// ============================================================
function setupProfileButton() {
  document.getElementById('player-card')?.addEventListener('click', openProfileModal);
  document.getElementById('player-card')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') openProfileModal();
  });
}

function openProfileModal() {
  const p    = _playerData;
  if (!p) return;
  const prog = p.progression ?? {};
  const stats = p.stats ?? {};
  const rankInfo = calcRank(prog.fragmentos_total ?? 0);

  openModal({
    title: '👤 Perfil do Caçador',
    confirmLabel: '💾 Salvar',
    bodyHTML: `
      <div class="profile-avatar-big">🌑</div>
      <div class="form-group">
        <label class="form-label">Nome do Caçador</label>
        <input class="form-input" id="profile-name" type="text" value="${p.display_name ?? ''}" maxlength="24" />
      </div>
      <div style="display:flex;justify-content:center;margin:8px 0">
        <span class="rank-badge rank-badge--${(prog.rank ?? 'adormecido').toLowerCase()}">${prog.rank ?? 'Adormecido'}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-box__value">${prog.fragmentos_total ?? 0}</div><div class="stat-box__label">Fragmentos</div></div>
        <div class="stat-box"><div class="stat-box__value">${rankInfo.fragmentos_to_next}</div><div class="stat-box__label">Para Ascender</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.quests_completed ?? 0}</div><div class="stat-box__label">Quests</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.bosses_defeated ?? 0}</div><div class="stat-box__label">Bosses</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.workouts_completed ?? 0}</div><div class="stat-box__label">Treinos</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.memories_collected ?? 0}</div><div class="stat-box__label">Memórias</div></div>
      </div>
    `,
    onConfirm: async () => {
      const name = document.getElementById('profile-name')?.value?.trim();
      if (name && _currentUser) {
        if (_playerData) _playerData.display_name = name;
        await savePlayer(_currentUser.uid, { display_name: name });
        document.getElementById('sidebar-player-name').textContent = name;
        showToast(`✅ Nome atualizado: "${name}"`, 'info');
      }
    },
  });
}

// ============================================================
//   ACHIEVEMENTS (placeholder — will use Firestore later)
// ============================================================
function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state" style="text-align:center;padding:var(--space-8)">
    🌑 Sistema de Conquistas em atualização para o Firebase...<br/>
    <span style="font-family:var(--font-display);color:var(--text-muted)">Em breve.</span>
  </div>`;
}

// ============================================================
//   MODAL & LEVEL UP SETUP
// ============================================================
function setupModal() {
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function setupLevelUpClose() {
  document.getElementById('btn-level-up-ok')?.addEventListener('click', () => {
    const el = document.getElementById('level-up-overlay');
    if (el) el.hidden = true;
  });
  document.getElementById('btn-rankup-ok')?.addEventListener('click', () => {
    document.getElementById('rankup-overlay')?.classList.add('hidden');
  });
}

// ============================================================
//   DAILY HP DECAY
// ============================================================
async function checkDailyHP(uid, player) {
  const today   = new Date().toISOString().slice(0, 10);
  const lastDay = player.stats?.last_active_date;

  if (lastDay && lastDay !== today) {
    const decay = player.settings?.hp_decay_per_missed_day ?? 5;
    const newHp = Math.max(0, (player.progression?.hp ?? 100) - decay);
    await savePlayer(uid, { 'progression.hp': newHp, 'stats.last_active_date': today });
    if (_playerData?.progression) _playerData.progression.hp = newHp;
    setTimeout(() => showToast(`💔 -${decay} HP por inatividade ontem.`, 'damage', 4000), 1200);
  } else {
    await savePlayer(uid, { 'stats.last_active_date': today });
  }

  if (_playerData) await renderHUDFromPlayer(_playerData);
}

// ============================================================
//   PWA SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Failed:', err));
  });
}

// ============================================================
//   STARTUP — Only auth gate, everything else triggered by onAuthChanged
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Wire auth forms immediately (before Firebase resolves)
  setupAuthForms();

  // Start time-of-day checker
  checkTimeOfDay();
  setInterval(checkTimeOfDay, 60 * 60 * 1000); // re-check hourly

  // Firebase auth observer
  setupAuthGate();
});
