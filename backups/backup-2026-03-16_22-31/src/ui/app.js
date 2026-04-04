/**
 * RPG Life OS — Application Entrypoint (Phase 3)
 * Adds: settings modal (sound/theme/notifications), daily notification scheduler.
 */

import {
    loadState, saveState,
    ensureCurrentWeek, exportState, importState,
    checkAchievements, genId, todayDayKey, DAYS_LABEL
} from '../engine/core.js';

import {
    renderHUD, setActiveNav, switchView, setPageTitle,
    closeModal, openModal, showToast, showAchievementToast,
    incrementAchievementBadge, clearAchievementBadge,
    renderAttributeRadar
} from '../engine/gamification.js';

import {
    sfx, setSoundEnabled, setSoundVolume, playClick
} from '../engine/audio.js';

import { initQuests } from '../modules/quests.js';
import { initBattle } from '../modules/battle.js';
import { initTaverna } from '../modules/taverna.js';
import { initBosses } from '../modules/bosses.js';

// ============================================================
//   VIEW CONFIG
// ============================================================
const VIEWS = {
    quests: { title: '📜 Quests Semanais', init: initQuests },
    battle: { title: '⚔️ Battle Ground', init: initBattle },
    taverna: { title: '🏰 Taverna — Finanças', init: initTaverna },
    bosses: { title: '🐉 Bosses Épicos', init: initBosses },
    achievements: { title: '🏆 Conquistas', init: renderAchievements },
};

// ============================================================
//   BOOT
// ============================================================
function boot() {
    let state = loadState();
    state = ensureCurrentWeek(state);
    saveState(state);

    // Apply saved theme
    applyTheme(state.settings?.theme ?? 'dark');

    // Apply saved sound settings
    setSoundEnabled(state.settings?.sound_enabled ?? true);
    setSoundVolume((state.settings?.sound_volume ?? 18) / 100);

    renderHUD(state);
    navigateTo('quests');
    setupNav();
    setupModal();
    setupLevelUp();
    setupProfileButton();
    setupBellButton();
    setupGearButton();
    checkDailyHP();
    setupDailyNotification(state);
    setupThemeToggleButton(state);

    console.log('[RPG Life OS] Booted v3.0  State:', loadState());
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
//   ACHIEVEMENTS RENDERER
// ============================================================
function renderAchievements() {
    const state = loadState();
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const sorted = [...state.achievements].sort((a, b) => {
        if (a.unlocked === b.unlocked) return 0;
        return a.unlocked ? -1 : 1;
    });

    for (const ach of sorted) {
        const card = document.createElement('div');
        card.className = `achievement-card ${ach.unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}`;
        card.innerHTML = `
      <div class="achievement-icon">${ach.unlocked ? ach.icon : '🔒'}</div>
      <div class="achievement-name">${ach.name}</div>
      <div class="achievement-desc">${ach.description}</div>
      <span class="rarity-badge rarity-badge--${ach.rarity}">${ach.rarity}</span>
      ${ach.unlocked && ach.unlocked_at
                ? `<div class="text-muted font-display" style="font-size:var(--fs-display)">${new Date(ach.unlocked_at).toLocaleDateString('pt-BR')}</div>`
                : ''}
    `;
        grid.appendChild(card);
    }
}

// ============================================================
//   ACHIEVEMENT CHECK WRAPPER
// ============================================================
export function checkAndNotifyAchievements(state) {
    const newlyUnlocked = checkAchievements(state);
    if (newlyUnlocked.length === 0) return state;
    newlyUnlocked.forEach(key => {
        const ach = state.achievements.find(a => a.key === key);
        if (ach) setTimeout(() => showAchievementToast(ach), 800);
    });
    incrementAchievementBadge(newlyUnlocked.length);
    return state;
}

// ============================================================
//   MODAL SETUP
// ============================================================
function setupModal() {
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function setupLevelUp() {
    document.getElementById('btn-level-up-ok')?.addEventListener('click', () => {
        const overlay = document.getElementById('level-up-overlay');
        if (overlay) overlay.hidden = true;
    });
}

// ============================================================
//   PLAYER PROFILE MODAL
// ============================================================
function setupProfileButton() {
    document.querySelector('#sidebar .sidebar__player-card')
        ?.addEventListener('click', openProfileModal);
}

function openProfileModal() {
    const state = loadState();
    const p = state.player;

    openModal({
        title: '👤 Perfil do Herói',
        confirmLabel: '💾 Salvar',
        bodyHTML: `
      <div class="profile-avatar-big">⚔️</div>
      <div class="form-group">
        <label class="form-label">Nome do Personagem</label>
        <input class="form-input" id="profile-name" type="text" value="${p.name}" maxlength="20" />
      </div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-box__value">${p.level}</div><div class="stat-box__label">Nível</div></div>
        <div class="stat-box"><div class="stat-box__value">${p.stats.total_xp_earned ?? p.xp}</div><div class="stat-box__label">XP Total</div></div>
        <div class="stat-box"><div class="stat-box__value">${p.stats.quests_completed}</div><div class="stat-box__label">Quests</div></div>
        <div class="stat-box"><div class="stat-box__value">${p.stats.bosses_defeated}</div><div class="stat-box__label">Bosses</div></div>
        <div class="stat-box"><div class="stat-box__value">${p.stats.workouts_completed}</div><div class="stat-box__label">Treinos</div></div>
        <div class="stat-box"><div class="stat-box__value">${state.achievements.filter(a => a.unlocked).length}/${state.achievements.length}</div><div class="stat-box__label">Conquistas</div></div>
      </div>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-2)">
        <button class="btn-rp btn-rp--ghost" id="btn-export-json" style="font-size:var(--fs-xxs)">📤 Exportar Backup</button>
        <label class="btn-rp btn-rp--ghost" style="font-size:var(--fs-xxs);cursor:pointer">
          📥 Importar Backup
          <input type="file" id="import-file" accept=".json" style="display:none" />
        </label>
      </div>
    `,
        onConfirm: () => {
            const name = document.getElementById('profile-name')?.value?.trim();
            if (name) {
                let st = loadState(); st.player.name = name; saveState(st);
                renderHUD(st); showToast(`✅ Nome atualizado para "${name}"!`, 'info');
            }
        },
    });

    setTimeout(() => {
        document.getElementById('btn-export-json')?.addEventListener('click', () => {
            exportState(loadState());
            showToast('📤 Backup exportado!', 'info');
        });
        document.getElementById('import-file')?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                const imported = importState(ev.target.result);
                if (imported) {
                    saveState(imported); renderHUD(imported);
                    showToast('📥 Backup importado!', 'level');
                    closeModal(); navigateTo('quests');
                } else { showToast('❌ Arquivo inválido!', 'damage', 3000); }
            };
            reader.readAsText(file);
        });
    }, 100);
}

// ============================================================
//   SETTINGS MODAL (⚙️)
// ============================================================
function setupGearButton() {
    document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);
}

function openSettingsModal() {
    const state = loadState();
    const settings = state.settings ?? {};
    const theme = settings.theme ?? 'dark';
    const sound = settings.sound_enabled ?? true;
    const notif = settings.notifications_enabled ?? false;
    const volume = settings.sound_volume ?? 18;

    openModal({
        title: '⚙️ Configurações',
        confirmLabel: '💾 Salvar',
        bodyHTML: `
      <div class="settings-section">

        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔊 Sons 8-bit</span>
            <span class="settings-row__desc">Ativar efeitos de som na interface</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-sound" ${sound ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔉 Volume</span>
            <span class="settings-row__desc">Intensidade dos sons</span>
          </div>
          <input type="range" class="volume-slider" id="setting-volume"
            min="0" max="100" value="${volume}" />
        </div>

        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">☀️ Tema Claro</span>
            <span class="settings-row__desc">Alternar entre Dark e Light mode</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-theme" ${theme === 'light' ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-row__label">
            <span class="settings-row__title">🔔 Notificações</span>
            <span class="settings-row__desc">Lembrete diário às 9h com quests do dia</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="setting-notif" ${notif ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

      </div>
    `,
        onConfirm: () => {
            const soundOn = document.getElementById('setting-sound')?.checked ?? true;
            const volume_v = parseInt(document.getElementById('setting-volume')?.value ?? '18', 10);
            const themeLight = document.getElementById('setting-theme')?.checked ?? false;
            const notifOn = document.getElementById('setting-notif')?.checked ?? false;

            let st = loadState();
            if (!st.settings) st.settings = {};
            st.settings.sound_enabled = soundOn;
            st.settings.sound_volume = volume_v;
            st.settings.theme = themeLight ? 'light' : 'dark';
            st.settings.notifications_enabled = notifOn;
            saveState(st);

            // Apply immediately
            setSoundEnabled(soundOn);
            setSoundVolume(volume_v / 100);
            applyTheme(st.settings.theme);

            if (notifOn) requestNotificationPermission();

            showToast('⚙️ Configurações salvas!', 'info', 2000);
        },
    });
}

// ============================================================
//   THEME
// ============================================================
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    // Update toggle button text if present
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
}

function setupThemeToggleButton(state) {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;

    // Set initial label
    const currentTheme = state.settings?.theme ?? 'dark';
    btn.textContent = currentTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';

    btn.addEventListener('click', () => {
        let st = loadState();
        if (!st.settings) st.settings = {};
        const next = (st.settings.theme ?? 'dark') === 'dark' ? 'light' : 'dark';
        st.settings.theme = next;
        saveState(st);
        applyTheme(next);
        playClick();
    });
}

// ============================================================
//   BELL BUTTON (notification quick-toggle)
// ============================================================
function setupBellButton() {
    const bellBtn = document.getElementById('btn-bell');
    if (!bellBtn) return;

    const state = loadState();
    _updateBellIcon(state.settings?.notifications_enabled ?? false);

    bellBtn.addEventListener('click', () => {
        let st = loadState();
        if (!st.settings) st.settings = {};
        const newVal = !(st.settings.notifications_enabled ?? false);
        st.settings.notifications_enabled = newVal;
        saveState(st);
        _updateBellIcon(newVal);

        if (newVal) {
            requestNotificationPermission();
            bellBtn.classList.add('bell-active');
            setTimeout(() => bellBtn.classList.remove('bell-active'), 700);
            showToast('🔔 Notificações ativadas!', 'info', 2000);
            setupDailyNotification(st);
        } else {
            showToast('🔕 Notificações desativadas.', 'info', 2000);
        }
    });
}

function _updateBellIcon(enabled) {
    const btn = document.getElementById('btn-bell');
    if (btn) { btn.textContent = enabled ? '🔔' : '🔕'; btn.title = enabled ? 'Desativar notificações' : 'Ativar notificações'; }
}

// ============================================================
//   NOTIFICATIONS API
// ============================================================
async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            showToast('⚠️ Permissão de notificação negada.', 'info', 3000);
        }
    } catch (e) {
        console.warn('[Notifications] Permission request failed:', e);
    }
}

function setupDailyNotification(state) {
    if (!state.settings?.notifications_enabled) return;
    if (Notification.permission !== 'granted') return;

    // Calculate ms until tomorrow at 9:00 AM
    const now = new Date();
    const target = new Date(now);
    target.setHours(9, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1); // if past 9am today, schedule tomorrow

    const delayMs = target.getTime() - now.getTime();

    setTimeout(() => {
        sendDailyQuestReminder();
        // Re-schedule for 24h later
        setInterval(sendDailyQuestReminder, 24 * 60 * 60 * 1000);
    }, delayMs);

    console.log(`[Notifications] Daily reminder scheduled in ${Math.round(delayMs / 60000)} minutes`);
}

function sendDailyQuestReminder() {
    if (Notification.permission !== 'granted') return;

    const state = loadState();
    const weekId = state.quests.current_week_id;
    const today = todayDayKey();
    const todayTasks = state.quests.weeks[weekId]?.tasks.filter(
        t => t.day === today && t.status === 'pending'
    ) ?? [];

    const body = todayTasks.length > 0
        ? `${todayTasks.length} quests hoje: ${todayTasks.slice(0, 3).map(t => t.title).join(', ')}${todayTasks.length > 3 ? '...' : ''}`
        : 'Nenhuma quest para hoje. Aproveite para adicionar novos objetivos!';

    const title = `⚔️ RPG Life OS — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}`;

    try {
        const notif = new Notification(title, {
            body,
            icon: './assets/sprites/icon-192.png',
            badge: './assets/sprites/icon-192.png',
            tag: 'daily-reminder',
        });
        notif.onclick = () => window.focus();
    } catch (e) {
        console.warn('[Notifications] Failed to send:', e);
    }
}

// ============================================================
//   DAILY HP DECAY CHECK
// ============================================================
function checkDailyHP() {
    const state = loadState();
    const today = new Date().toISOString().slice(0, 10);
    const lastDay = state.player.stats.last_active_date;

    if (lastDay && lastDay !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const hadWorkout = state.battle_ground.sessions.some(s => s.date === yesterday);

        if (!hadWorkout && state.player.hp > 0) {
            const decay = state.settings?.hp_decay_per_missed_day ?? 5;
            state.player.hp = Math.max(0, state.player.hp - decay);
            setTimeout(() => showToast(`💔 Você não treinou ontem! -${decay} HP`, 'damage', 4000), 1000);
        }
    }

    state.player.stats.last_active_date = today;
    saveState(state);
    renderHUD(loadState());
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
//   STARTUP
// ============================================================
document.addEventListener('DOMContentLoaded', boot);
