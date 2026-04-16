/**
 * Shadow Slave Life OS — App Entrypoint (Phase 4)
 * ================================================
 * Auth gate → Firebase → Firestore data → renders modules.
 * Day/Night detection, Rank system, Settings modal, all wiring.
 */

// ---- Firebase ----
import { onAuthChanged, login, register, logout, resetPassword, deleteAccount } from '../firebase/auth.js';
import {
  initInventory as initInventoryDB, getPlayerData as loadPlayerDataFromDB, savePlayer, initNewPlayer, migrateFromLocalStorage, getLootTable, getWeek, saveWeek, deletePlayer, saveBadgeState, saveCosmetics
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
  playSound, playNightfall
} from '../engine/audio.js';

import { loadState, saveState, getWeekId, checkBadgeUnlocks, equipBadge, unlockBadge } from '../engine/core.js';

import { calcRank, RANKS, RANK_THRESHOLDS } from '../engine/drop_engine.js';

// ---- Modules ----
import { initQuests }       from '../modules/quests.js';
import { initBattle }       from '../modules/battle.js';
import { initTaverna }      from '../modules/taverna.js';
import { initCampaignMap }  from '../modules/campaign_map.js';
import { initInventory }    from '../modules/inventory.js';
import { initBoard }        from '../modules/board.js';      // v2.1 Diamond
import { initPomodoro }     from '../modules/pomodoro.js';  // v2.2 Reino dos Sonhos
import { initTalents }      from '../modules/talents.js';   // v2.3 Habilidades de Aspecto
import { initAnalytics }    from '../modules/analytics.js'; // v2.4 Tear do Destino

// ---- Badge System (v2.5) ----
import {
  BADGE_CATALOG, RARITY_META,
  getBadgeById,
  renderBadgeSVG, renderDefaultMedallionSVG,
} from '../config/badges.js';


// ---- Profile System (v3.0 — O Despertar da Identidade) ----
import {
  initProfileWidget, openProfileDrawer, applyThemeV3, initProfileDeps,
} from '../modules/profile.js';

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
  quests:       { title: '📜 Quests Semanais',       init: initQuests      },
  battle:       { title: '⚔️ Battle Ground',          init: initBattle      },
  taverna:      { title: '🏰 Taverna — Finanças',     init: initTaverna     },
  bosses:       { title: '🐉 Modo Campanha',           init: initCampaignMap },
  inventory:    { title: '💎 Memórias',               init: initInventory   },
  achievements: { title: '🏆 Conquistas',             init: renderAchievements },
  board:        { title: '📋 Quadro de Missões',      init: initBoard       },  // v2.1 Diamond
  pomodoro:     { title: '⏳ Reino dos Sonhos',       init: initPomodoro    },  // v2.2
  talents:      { title: '✨ Habilidades de Aspecto', init: initTalents     },  // v2.3
  analytics:    { title: '🔮 Tear do Destino',        init: initAnalytics   },  // v2.4
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
  
  // Talent Sync
  if (pData.talents) {
    local.player.talents = pData.talents;
  }
  if (pData.skill_points !== undefined) {
    local.player.skill_points = pData.skill_points;
  }
  local.player.stats.total_xp_earned = pData.fragmentos_total || 0;
  local.player.stats.quests_completed = stats.quests_completed || 0;
  local.player.stats.bosses_defeated = stats.bosses_defeated || 0;
  local.player.stats.workouts_completed = stats.workouts_completed || 0;
  if (playerFirestore.settings) {
    local.settings = { ...local.settings, ...playerFirestore.settings };
  }

  // 2. Sync Badge State (v2.5)
  if (Array.isArray(playerFirestore.achievements)) {
    local.player.achievements = playerFirestore.achievements;
  }
  if (playerFirestore.activeBadgeId !== undefined) {
    local.player.activeBadgeId = playerFirestore.activeBadgeId ?? null;
  }

  // 3. Sync Cosmetics (v3.0)
  if (playerFirestore.cosmetics && typeof playerFirestore.cosmetics === 'object') {
    local.player.cosmetics = {
      ...local.player.cosmetics,
      ...playerFirestore.cosmetics,
    };
  }

  // 3. Sync Current Week
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

    let player = await loadPlayerDataFromDB(user.uid);

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

    // v3.0 — Inject profile module dependencies
    initProfileDeps({
      getCurrentUser: () => _currentUser,
      getPlayerData:  () => _playerData,
      onNameSaved: (name) => {
        if (_playerData) _playerData.display_name = name;
      },
    });


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
  playSound('ui_click');

  setActiveNav(viewName);
  switchView(viewName);
  setPageTitle(VIEWS[viewName].title);

  if (viewName === 'achievements') clearAchievementBadge();

  const initFn = VIEWS[viewName].init;
  if (initFn) initFn();
}

function setupNav() {
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');

  document.querySelectorAll('.nav-btn[data-view]').forEach(btn =>
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.view);
      // Close sidebar on mobile after navigation
      sidebar?.classList.remove('sidebar--open');
    })
  );
  
  document.querySelectorAll('.bottom-nav__btn[data-view]').forEach(btn =>
    btn.addEventListener('click', () => navigateTo(btn.dataset.view))
  );
  

  // Mobile Menu Toggle
  mobileMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar?.classList.toggle('sidebar--open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar?.classList.contains('sidebar--open') && !sidebar.contains(e.target) && e.target !== mobileMenuBtn) {
      sidebar.classList.remove('sidebar--open');
    }
  });
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
          talents:          p.talents ?? {},
          skill_points:     p.skill_points ?? 5,
        },
        stats: p.stats,
        settings: state.settings,
      });

      // 2. Sync Current Week Quests
      const currentWeekId = state.quests.current_week_id;
      if (currentWeekId && state.quests.weeks[currentWeekId]) {
        await saveWeek(_currentUser.uid, currentWeekId, state.quests.weeks[currentWeekId]);
      }

      // 3. Sync Badge State (v2.5)
      await saveBadgeState(_currentUser.uid, {
        achievements:  p.achievements  ?? [],
        activeBadgeId: p.activeBadgeId ?? null,
      });

      // 4. Sync Cosmetics (v3.0)
      if (p.cosmetics) {
        await saveCosmetics(_currentUser.uid, p.cosmetics);
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

  // 1. Core HUD (Gamification context)
  renderHUD({ player: _playerFirestore2HUDCompat(player) });

  // 2. Rank bar
  const rankInfo = calcRank(player.progression?.fragmentos_total ?? 0);
  renderRankBar(rankInfo);
  renderAttributeRadar({ player: _playerFirestore2HUDCompat(player) });

  // 3. Dynamic Sidebar Medallion (v2.5)
  const state = loadState();
  renderSidebarMedallion(state.player.activeBadgeId);

  // 4. Profile Widget hydration (v3.0)
  initProfileWidget(player, state);

  // 5. HP/XP Bars (Direct DOM manipulation fallback)
  const hpFill = document.getElementById('hp-fill');
  const hpText = document.getElementById('hp-text');
  const xpFill = document.getElementById('xp-fill');
  
  const prog = player.progression ?? {};
  const hp = prog.hp ?? 100;
  const maxHP = prog.hp_max ?? 100;
  const hpPct = (hp / maxHP) * 100;

  if (hpFill) hpFill.style.width = `${Math.min(100, Math.max(0, hpPct))}%`;
  if (hpText) hpText.textContent = `${Math.floor(hp)} / ${Math.floor(maxHP)}`;

  if (xpFill) {
    const xpMax  = rankInfo.fragmentos_next;
    const xpPct  = (prog.fragmentos_to_rank ?? 0) / (xpMax || 1) * 100;
    xpFill.style.width = `${Math.min(100, Math.max(0, xpPct))}%`;
  }
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
    attributes: {
      INT: { value: 1 }, ART: { value: 1 }, AVE: { value: 1 },
      FOR: { value: 1 }, CAR: { value: 1 },
      ...(p.attributes || {})
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
  const loginForm = document.getElementById('form-login');
  // Already wired from first load — avoid double binding
  if (!loginForm || loginForm.dataset.wired) return;

  console.log('[Auth] Wiring event listeners...');

  // Tab switching
  document.getElementById('tab-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });
  document.getElementById('tab-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('register');
  });

  // Login
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    const pass  = document.getElementById('login-password')?.value;
    console.log('[Auth] Submit Login:', email);
    if (!email || !pass) return;
    setAuthLoading(true);
    try {
      await login(email, pass);
    } catch (err) {
      console.error('[Auth] Login error:', err);
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
    console.log('[Auth] Submit Register:', email);
    if (!name || !email || !pass) return;
    setAuthLoading(true);
    try {
      await register(email, pass, name);
    } catch (err) {
      console.error('[Auth] Register error:', err);
      setAuthMessage(_authErrorMsg(err.code), 'error');
      setAuthLoading(false);
    }
  });

  // Forgot password
  document.getElementById('btn-forgot-pwd')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    if (!email) { setAuthMessage('⚠️ Digite seu email primeiro.', 'error'); return; }
    try {
      await resetPassword(email);
      setAuthMessage('📧 Email de redefinição enviado!', 'success');
    } catch (err) {
      setAuthMessage(_authErrorMsg(err.code), 'error');
    }
  });

  loginForm.dataset.wired = '1';
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  const tabL = document.getElementById('tab-login');
  const tabR = document.getElementById('tab-register');
  const formL = document.getElementById('form-login');
  const formR = document.getElementById('form-register');

  tabL?.classList.toggle('auth-tab--active', isLogin);
  tabR?.classList.toggle('auth-tab--active', !isLogin);
  formL?.classList.toggle('hidden', !isLogin);
  formR?.classList.toggle('hidden', isLogin);
  
  // Set accessibility/aria
  tabL?.setAttribute('aria-selected', isLogin);
  tabR?.setAttribute('aria-selected', !isLogin);

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
  // v3.0: apply cosmetic theme first; fallback to legacy dark/light
  const state = loadState();
  const cosTheme = state?.player?.cosmetics?.active_theme;
  if (cosTheme) {
    applyThemeV3(cosTheme);
  } else {
    applyTheme(settings.theme ?? 'dark');
  }
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
    playSound('ui_click');
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
          
          // 1. Apaga todos os dados do Firestore (quests, inventário, treinos, boss maps…)
          await deletePlayer(uid);
          
          // 2. Apaga localStorage ANTES de deletar a conta Firebase Auth.
          //    deleteAccount() dispara onAuthStateChanged imediatamente, que pode
          //    relançar leituras do localStorage antes do clear (race condition).
          //    Treinos e templates vivem APENAS no localStorage, então devem ser 
          //    zerados aqui para garantir que não persistam.
          localStorage.clear();

          // 3. Deleta a conta Firebase Auth (dispara auth observer → showAuthScreen)
          await deleteAccount();

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
//   PROFILE BUTTON → v3.0 Profile Drawer
// ============================================================
function setupProfileButton() {
  const widget = document.getElementById('profile-widget');
  if (!widget) return;

  widget.addEventListener('click', openProfileDrawer);
  widget.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProfileDrawer();
    }
  });
}

// renderHUDFromPlayer was merged into the export above to avoid duplicate declaration errors.

function openProfileModal() {
  const p    = _playerData;
  if (!p) return;
  const prog = p.progression ?? {};
  const stats = p.stats ?? {};
  const rankInfo = calcRank(prog.fragmentos_total ?? 0);
  
  // Achievement stats
  const totalBadges = BADGE_CATALOG.length;
  const unlockedCount = (p.achievements ?? []).length;
  const activeBadgeId = p.activeBadgeId ?? null;
  const activeBadge = activeBadgeId ? getBadgeById(activeBadgeId) : null;

  openModal({
    title: '👤 Perfil do Caçador',
    confirmLabel: '💾 Salvar',
    bodyHTML: `
      <div class="profile-badge-header">
        <div class="profile-badge-display">
          ${activeBadge 
            ? renderBadgeSVG(activeBadge, { size: 200, glow: true }) 
            : renderDefaultMedallionSVG(200)}
        </div>
        ${activeBadge ? `<div class="profile-badge-name">${activeBadge.name}</div>` : ''}
      </div>
      
      <div class="form-group" style="margin-top:20px">
        <label class="form-label">Nome do Caçador</label>
        <input class="form-input" id="profile-name" type="text" value="${p.display_name ?? ''}" maxlength="24" />
      </div>
      <div style="display:flex;justify-content:center;margin:8px 0">
        <span class="rank-badge rank-badge--${(prog.rank ?? 'adormecido').toLowerCase()}">${prog.rank ?? 'Adormecido'}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-box__value">${stats.quests_completed ?? 0}</div><div class="stat-box__label">Quests</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.bosses_defeated ?? 0}</div><div class="stat-box__label">Bosses</div></div>
        <div class="stat-box"><div class="stat-box__value">${stats.workouts_completed ?? 0}</div><div class="stat-box__label">Treinos</div></div>
        <div class="stat-box"><div class="stat-box__value">${unlockedCount}/${totalBadges}</div><div class="stat-box__label">Conquistas</div></div>
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
//   ACHIEVEMENTS — v2.5 Marcos do Despertar
// ============================================================

/**
 * Renders the sidebar medallion: shows active badge SVG or the default D20 SVG.
 * @param {string|null} activeBadgeId
 */
export function renderSidebarMedallion(activeBadgeId) {
  const wrap = document.getElementById('sidebar-medallion');
  if (!wrap) return;

  if (activeBadgeId) {
    const badge = getBadgeById(activeBadgeId);
    if (badge) {
      wrap.innerHTML = renderBadgeSVG(badge, { size: 60, glow: true, locked: false });
      wrap.classList.add('badge-medallion-wrap--active');
      wrap.title = `${badge.icon} ${badge.name} (equipado)`;
      return;
    }
  }
  // Default: D20 medallion
  wrap.innerHTML = renderDefaultMedallionSVG(60);
  wrap.classList.remove('badge-medallion-wrap--active');
  wrap.title = 'Medalhão — sem badge equipada';
}

/**
 * Full Arsenal de Conquistas renderer.
 * Replaces the old placeholder in the achievements view.
 */
function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;

  const state = loadState();
  const unlockedIds   = state.player.achievements  ?? [];
  const activeBadgeId = state.player.activeBadgeId ?? null;
  
  // Robust count: only count IDs that actually exist in our current catalog
  const unlockedIDsValid = unlockedIds.filter(id => getBadgeById(id));
  const unlockedSet      = new Set(unlockedIDsValid);
  const total            = BADGE_CATALOG.length;
  const unlockedCount    = unlockedIDsValid.length;

  // --- First call: check for new unlocks based on current state ---
  const { newBadgeIds, newTitleIds } = checkBadgeUnlocks(state);
  if (newBadgeIds.length > 0 || newTitleIds.length > 0) {
    saveState(state);
    // Persist to Firestore asynchronously
    if (_currentUser) {
      saveBadgeState(_currentUser.uid, {
        achievements:  state.player.achievements,
        activeBadgeId: state.player.activeBadgeId,
      }).catch(console.error);
      // Also sync cosmetics (unlocked_titles may have changed)
      if (state.player.cosmetics) {
        saveCosmetics(_currentUser.uid, state.player.cosmetics).catch(console.error);
      }
    }
    // Show toast for each newly unlocked badge
    newBadgeIds.forEach(id => {
      const b = getBadgeById(id);
      if (b) showBadgeUnlockedToast(b);
    });
  }

  // --- Build UI ---
  grid.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'arsenal-wrap';
  header.innerHTML = `
    <div class="arsenal-header">
      <div class="arsenal-header__title">⚔️ Arsenal de Conquistas</div>
      <div class="arsenal-header__sub">Marcas do Despertar — Badges equipáveis</div>
      <div class="arsenal-stats-bar">
        <div class="arsenal-stat">
          <div class="arsenal-stat__value">${unlockedCount}</div>
          <div class="arsenal-stat__label">Desbloqueadas</div>
        </div>
        <div class="arsenal-stat">
          <div class="arsenal-stat__value">${total - unlockedCount}</div>
          <div class="arsenal-stat__label">Bloqueadas</div>
        </div>
        <div class="arsenal-stat">
          <div class="arsenal-stat__value">${total}</div>
          <div class="arsenal-stat__label">Total</div>
        </div>
        ${activeBadgeId ? `
        <div class="arsenal-stat arsenal-stat--equipped" style="margin-left:auto">
          <div class="arsenal-stat__label">Equipada</div>
          <div class="arsenal-equipped-header">
            ${renderBadgeSVG(getBadgeById(activeBadgeId), { size: 52, glow: true })}
            <div class="arsenal-equipped-name">${getBadgeById(activeBadgeId)?.name ?? ''}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="arsenal-filters" id="arsenal-filters" role="tablist">
      <button class="arsenal-filter-btn arsenal-filter-btn--active" data-filter="all"
              role="tab" aria-selected="true">Todas</button>
      <button class="arsenal-filter-btn" data-filter="combat"
              role="tab" aria-selected="false">⚔️ Combate</button>
      <button class="arsenal-filter-btn" data-filter="discipline"
              role="tab" aria-selected="false">🔥 Disciplina</button>
      <button class="arsenal-filter-btn" data-filter="knowledge"
              role="tab" aria-selected="false">📚 Conhecimento</button>
      <button class="arsenal-filter-btn" data-filter="art"
              role="tab" aria-selected="false">🎨 Arte</button>
      <button class="arsenal-filter-btn" data-filter="mystery"
              role="tab" aria-selected="false">🌑 Mistério</button>
    </div>

    <div class="arsenal-grid" id="arsenal-grid" role="list"></div>
  `;
  grid.appendChild(header);

  const arsenalGrid = grid.querySelector('#arsenal-grid');
  _renderArsenalGrid(arsenalGrid, BADGE_CATALOG, unlockedSet, activeBadgeId);

  // Category filter wiring
  const filtersEl = grid.querySelector('#arsenal-filters');
  filtersEl?.querySelectorAll('.arsenal-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersEl.querySelectorAll('.arsenal-filter-btn').forEach(b => {
        b.classList.remove('arsenal-filter-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('arsenal-filter-btn--active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      const filtered = filter === 'all'
        ? BADGE_CATALOG
        : BADGE_CATALOG.filter(b => b.category === filter);
      _renderArsenalGrid(arsenalGrid, filtered, unlockedSet, activeBadgeId);
    });
  });

  // Medallion click → achievements view
  const medallion = document.getElementById('sidebar-medallion');
  if (medallion && !medallion.dataset.wiredBadge) {
    medallion.dataset.wiredBadge = '1';
    medallion.style.cursor = 'pointer';
    medallion.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateTo('achievements');
    });
  }
}

/** Renders all badge cards into the grid element */
function _renderArsenalGrid(gridEl, badges, unlockedSet, activeBadgeId) {
  gridEl.innerHTML = '';
  if (badges.length === 0) {
    gridEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:var(--space-6)">Nenhuma badge nesta categoria.</div>';
    return;
  }

  // Sort: unlocked first, then alphabetical
  const sorted = [...badges].sort((a, b) => {
    const au = unlockedSet.has(a.id) ? 0 : 1;
    const bu = unlockedSet.has(b.id) ? 0 : 1;
    if (au !== bu) return au - bu;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach(badge => {
    const isUnlocked = unlockedSet.has(badge.id);
    const isEquipped = badge.id === activeBadgeId;
    const rarityMeta = RARITY_META[badge.rarity] ?? RARITY_META.common;

    const card = document.createElement('div');
    card.className = [
      'badge-card',
      `badge-card--${badge.rarity}`,
      isUnlocked ? 'badge-card--unlocked' : 'badge-card--locked',
      isEquipped  ? 'badge-card--equipped'  : '',
    ].filter(Boolean).join(' ');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${badge.name} — ${isUnlocked ? 'Desbloqueada' : 'Bloqueada'}`);
    card.dataset.badgeId = badge.id;

    card.innerHTML = `
      <div class="badge-card__svg-wrap">
        ${renderBadgeSVG(badge, { size: 160, glow: isUnlocked, locked: !isUnlocked })}
        ${!isUnlocked ? '<span class="badge-lock-icon" aria-hidden="true">🔒</span>' : ''}
      </div>
      <div class="badge-card__name">${badge.name}</div>
      <div class="badge-card__rarity" style="color:${rarityMeta.color}">
        ${rarityMeta.label}
      </div>
      <div class="badge-card__hover-tooltip">
        <div class="badge-hover-req">Critério de Desbloqueio</div>
        <div class="badge-hover-desc">${badge.requirement ?? '???'}</div>
        ${isUnlocked 
          ? '<div class="badge-hover-status unlocked">✅ Adquirida</div>'
          : '<div class="badge-hover-status">🔒 Bloqueada</div>'}
      </div>
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => showBadgeTooltip(badge, isEquipped));
    }

    gridEl.appendChild(card);
  });
}

/**
 * Shows the RPG-style badge detail tooltip.
 * @param {Object} badge - Badge from catalog
 * @param {boolean} isEquipped - Whether this badge is currently equipped
 */
function showBadgeTooltip(badge, isEquipped) {
  // Remove any existing tooltip
  document.getElementById('badge-tooltip-overlay')?.remove();

  const rarityMeta = RARITY_META[badge.rarity] ?? RARITY_META.common;

  const overlay = document.createElement('div');
  overlay.className = 'badge-tooltip-overlay';
  overlay.id = 'badge-tooltip-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Detalhes: ${badge.name}`);

  overlay.innerHTML = `
    <div class="badge-tooltip pixel-panel" role="document">
      <button class="badge-tooltip__close" id="badge-tooltip-close"
              aria-label="Fechar detalhes da badge">✕</button>

      <div class="badge-tooltip__badge-display">
        ${renderBadgeSVG(badge, { size: 90, glow: true, locked: false })}
      </div>

      <div class="badge-tooltip__name">${badge.icon} ${badge.name}</div>

      <div class="badge-tooltip__rarity-tag" style="color:${rarityMeta.color};border-color:${rarityMeta.color}">
        ${rarityMeta.label}
      </div>

      <div class="badge-tooltip__divider"></div>

      <div class="badge-tooltip__category">
        ${{ combat:'⚔️ Combate', discipline:'🔥 Disciplina', knowledge:'📚 Conhecimento', art:'🎨 Arte', mystery:'🌑 Mistério' }[badge.category] ?? badge.category}
      </div>

      <div class="badge-tooltip__lore">"${badge.lore}"</div>

      <div class="badge-tooltip__divider"></div>

      <div class="badge-tooltip__actions">
        ${isEquipped
          ? `<button class="btn-rp btn-rp--ghost badge-unequip-btn" id="badge-action-btn">
               🗡️ Desequipar
             </button>`
          : `<button class="btn-rp btn-rp--gold" id="badge-action-btn">
               ⚔️ Equipar Badge
             </button>`
        }
        <button class="btn-rp btn-rp--ghost" id="badge-tooltip-cancel">Fechar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  const closeTooltip = () => overlay.remove();
  overlay.getElementById = (id) => overlay.querySelector(`#${id}`);
  overlay.querySelector('#badge-tooltip-close')?.addEventListener('click', closeTooltip);
  overlay.querySelector('#badge-tooltip-cancel')?.addEventListener('click', closeTooltip);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeTooltip(); });

  // Equip / Unequip action
  overlay.querySelector('#badge-action-btn')?.addEventListener('click', async () => {
    closeTooltip();
    await handleEquipBadge(isEquipped ? null : badge.id);
  });
}

/**
 * Handles equipping or unequipping a badge.
 * Updates local state, Firestore, sidebar medallion, and achievement grid.
 * @param {string|null} badgeId - ID to equip, or null to unequip
 */
async function handleEquipBadge(badgeId) {
  const state = loadState();
  equipBadge(state, badgeId);
  saveState(state);

  // Persist badge state to Firestore
  if (_currentUser) {
    try {
      await saveBadgeState(_currentUser.uid, {
        achievements:  state.player.achievements,
        activeBadgeId: state.player.activeBadgeId,
      });
    } catch (err) {
      console.error('[App] Falha ao salvar badge state:', err);
    }
  }

  // Update sidebar medallion immediately
  renderSidebarMedallion(state.player.activeBadgeId);

  // Re-render achievements grid to reflect new equipped state
  renderAchievements();

  // Toast
  if (badgeId) {
    const badge = getBadgeById(badgeId);
    if (badge) {
      showToast(`${badge.icon} ${badge.name} equipada no medalhão!`, 'info', 3500);
    }
  } else {
    showToast('Medalhão padrão restaurado.', 'info', 2500);
  }
}

/**
 * Shows the badge-unlocked celebration toast.
 * Creates the toast inline with innerHTML (bypasses showToast textContent limitation).
 * @param {Object} badge
 */
function showBadgeUnlockedToast(badge) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const rarityMeta = RARITY_META[badge.rarity] ?? RARITY_META.common;

  const toast = document.createElement('div');
  toast.className = 'toast toast--achievement';
  toast.innerHTML = `
    <div class="badge-unlock-toast">
      <div class="badge-unlock-toast__icon">${badge.icon}</div>
      <div class="badge-unlock-toast__text">
        <div class="badge-unlock-toast__headline" style="color:${rarityMeta.color}">
          🏅 Badge Desbloqueada!
        </div>
        <div class="badge-unlock-toast__name">${badge.name}</div>
        <div class="badge-unlock-toast__lore">"${badge.lore}"</div>
      </div>
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 600);
  }, 5500);

  incrementAchievementBadge();
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let updates = { 'stats.last_active_date': today };

    // Se o último dia não foi ontem, a streak quebrou
    if (lastDay !== yesterdayStr) {
       updates['stats.streak_days'] = 0;
       updates['stats.streak_broken_date'] = today;
       updates['stats.tasks_today_after_break'] = 0;
       if (_playerData?.stats) {
         _playerData.stats.streak_days = 0;
         _playerData.stats.streak_broken_date = today;
         _playerData.stats.tasks_today_after_break = 0;
       }
    }

    const decay = player.settings?.hp_decay_per_missed_day ?? 5;
    const newHp = Math.max(0, (player.progression?.hp ?? 100) - decay);
    
    updates['progression.hp'] = newHp;
    await savePlayer(uid, updates);

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
//   STARTUP — Immediate execution for ESM
// ============================================================

// No immediate execution here, moved to boot() for better sequencing

// Full application boot
(function boot() {
  console.log('[Boot] Initializing Shadow Slave Life OS...');
  
  // Wire core UI listeners ASAP
  try {
    setupAuthForms();
    setupModal();
    setupLevelUpClose();
  } catch (e) {
    console.error('[Boot] Critical UI wiring failed:', e);
  }

  window.requestAnimationFrame(() => {
    try {
      // Start time-of-day checker
      checkTimeOfDay();
      setInterval(checkTimeOfDay, 60 * 60 * 1000);
      
      // Firebase auth observer
      setupAuthGate();
      
      // Initialize audio UI
      initAudioPlayer();
      
      console.log('— Shadow Slave Life OS v3.1.3 Awakened —');
    } catch (err) {
      console.error('[Boot] Application initialization failure:', err);
    }
  });
})();
