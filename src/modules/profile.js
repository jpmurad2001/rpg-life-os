/**
 * RPG Life OS — Profile Module v3.0
 * "O Despertar da Identidade"
 * ================================================
 * Gerencia: Profile Widget (sidebar), Profile Drawer (overlay),
 *           Sistema de Temas Globais, Seletor de Títulos,
 *           Seletor de Molduras por Rank e Preview de Avatar.
 */

import { saveCosmetics, savePlayer } from '../firebase/db.js';
import { loadState, saveState }       from '../engine/core.js';
import { TITLE_CATALOG, RARITY_TITLE_META, getTitleById } from '../config/titles.js';
import { FRAME_CATALOG, getFramesForRank, getFrameSVG, getFrameById } from '../config/frames.js';
import { rankIndex } from '../engine/drop_engine.js';

// ============================================================
//   THEME DEFINITIONS
// ============================================================
export const THEMES = [
  { id: 'abyssal-dark', name: 'Abyssal Dark', desc: 'Obsidiana + Azul Espectral', icon: '🌑' },
  { id: 'blood-mode',   name: 'Blood Mode',   desc: 'Carmesim + Sombra Vampírica', icon: '🩸' },
  { id: 'void-mode',    name: 'Void Mode',    desc: 'Roxo Cósmico + Corrupção',    icon: '🌌' },
];

// ============================================================
//   STATE DEPS (injected from app.js to avoid circular imports)
// ============================================================
let _getCurrentUser = () => null;
let _getPlayerData  = () => null;
let _onNameSaved    = null;

export function initProfileDeps(deps) {
  _getCurrentUser = deps.getCurrentUser ?? (() => null);
  _getPlayerData  = deps.getPlayerData  ?? (() => null);
  _onNameSaved    = deps.onNameSaved    ?? null;
}

// ============================================================
//   APPLY THEME
// ============================================================
export function applyThemeV3(themeName) {
  const valid = THEMES.map(t => t.id);
  const theme = valid.includes(themeName) ? themeName : 'abyssal-dark';

  document.documentElement.setAttribute('data-theme', theme);

  // Persist in local state
  const state = loadState();
  if (state.player.cosmetics) {
    state.player.cosmetics.active_theme = theme;
    saveState(state);
  }

  // Persist to Firestore (fire-and-forget)
  const user = _getCurrentUser();
  if (user && state.player.cosmetics) {
    saveCosmetics(user.uid, state.player.cosmetics).catch(console.error);
  }

  // Sync UI if drawer is open
  _syncThemeSelectorUI(theme);
}

// ============================================================
//   PROFILE WIDGET — Sidebar
// ============================================================
export function initProfileWidget(playerData, localState) {
  const widget = document.getElementById('profile-widget');
  if (!widget) return;

  const cosmetics   = localState?.player?.cosmetics ?? {};
  const prog        = playerData?.progression ?? {};
  const activeBadgeId = localState?.player?.activeBadgeId ?? null;
  const name        = playerData?.display_name ?? localState?.player?.name ?? 'Caçador';

  // Update text elements
  const nameEl  = document.getElementById('profile-widget-name');
  const titleEl = document.getElementById('profile-widget-title');
  const rankEl  = document.getElementById('profile-widget-rank');

  if (nameEl)  nameEl.textContent  = name;
  if (rankEl)  rankEl.textContent  = prog.rank ?? 'Adormecido';

  // Title text from catalog
  const activeTitleId = cosmetics.active_title_id;
  const titleObj = activeTitleId ? getTitleById(activeTitleId) : null;
  if (titleEl) titleEl.textContent = titleObj?.text ?? 'Iniciado';

  // Apply badge class for pulse animation
  if (activeBadgeId) {
    widget.classList.add('profile-widget--badged');
  } else {
    widget.classList.remove('profile-widget--badged');
  }

  // Apply saved theme
  if (cosmetics.active_theme) {
    applyThemeV3(cosmetics.active_theme);
  }

  // Update avatar frame in widget (if applicable)
  _updateWidgetFrame(cosmetics.profile_frame_id, cosmetics.avatar_image);
}

function _updateWidgetFrame(frameId, avatarUrl) {
  const medalEl = document.getElementById('profile-widget-medallion');
  if (!medalEl) return;
  // The medallion shows badge or D20 — frame is only shown in the drawer avatar section
  // But if there's an avatar URL with no badge, we could show the avatar here
  // For now, keep badge/D20 logic (handled by renderSidebarMedallion in app.js)
}

// ============================================================
//   PROFILE DRAWER
// ============================================================
let _drawerOpen = false;

export function openProfileDrawer() {
  const backdrop = document.getElementById('profile-drawer-backdrop');
  const drawer   = document.getElementById('profile-drawer');
  if (!backdrop || !drawer) return;

  _populateDrawer();

  backdrop.classList.add('profile-drawer-backdrop--open');
  drawer.classList.add('profile-drawer--open');
  _drawerOpen = true;

  backdrop.addEventListener('click', closeProfileDrawer, { once: true });
  document.addEventListener('keydown', _handleDrawerKey);
}

export function closeProfileDrawer() {
  const backdrop = document.getElementById('profile-drawer-backdrop');
  const drawer   = document.getElementById('profile-drawer');
  if (!backdrop || !drawer) return;

  backdrop.classList.remove('profile-drawer-backdrop--open');
  drawer.classList.remove('profile-drawer--open');
  _drawerOpen = false;

  document.removeEventListener('keydown', _handleDrawerKey);
}

function _handleDrawerKey(e) {
  if (e.key === 'Escape') closeProfileDrawer();
}

// ============================================================
//   POPULATE DRAWER
// ============================================================
function _populateDrawer() {
  const playerData   = _getPlayerData();
  const localState   = loadState();
  const cosmetics    = localState?.player?.cosmetics ?? {};
  const prog         = playerData?.progression ?? {};
  const stats        = playerData?.stats ?? {};
  const name         = playerData?.display_name ?? localState?.player?.name ?? 'Caçador';
  const currentRank  = prog.rank ?? 'Adormecido';
  const currentRankIdx = rankIndex(currentRank);

  // Name display
  const nameDisp = document.getElementById('drawer-player-name-display');
  if (nameDisp) nameDisp.textContent = name;

  // Name input
  const nameInput = document.getElementById('drawer-name-input');
  if (nameInput) nameInput.value = name;

  // Rank
  const rankEl = document.getElementById('drawer-player-rank');
  if (rankEl) rankEl.textContent = currentRank;

  // Stats
  _el('drawer-stat-quests',   stats.quests_completed   ?? 0);
  _el('drawer-stat-bosses',   stats.bosses_defeated    ?? 0);
  _el('drawer-stat-workouts', stats.workouts_completed ?? 0);

  // Avatar + active frame
  _updateDrawerAvatar(cosmetics);

  // Active title badge display
  const activeTitleId = cosmetics.active_title_id ?? 'title_default';
  const titleObj = getTitleById(activeTitleId);
  const titleBadge = document.getElementById('drawer-player-title');
  if (titleBadge) titleBadge.textContent = titleObj?.text ?? 'Iniciado';

  // Render Title Grid
  const unlockedTitles = cosmetics.unlocked_titles ?? ['title_default'];
  _renderTitleGrid(unlockedTitles, activeTitleId);

  // Render Frame Selector
  const activeFrameId = cosmetics.profile_frame_id ?? '';
  _renderFrameSelector(currentRankIdx, activeFrameId);

  // Avatar URL input
  const avatarInput = document.getElementById('drawer-avatar-url');
  if (avatarInput) avatarInput.value = cosmetics.avatar_image || '';

  // Theme selector
  _syncThemeSelectorUI(cosmetics.active_theme || 'abyssal-dark');

  // Wire all buttons (idempotent)
  _wireDrawerButtons();
}

// ============================================================
//   TITLE GRID
// ============================================================
function _renderTitleGrid(unlockedIds, activeTitleId) {
  const container = document.getElementById('drawer-title-grid');
  if (!container) return;

  const unlockedSet = new Set(unlockedIds);
  const unlockedTitles = TITLE_CATALOG.filter(t => unlockedSet.has(t.id));

  if (unlockedTitles.length === 0) {
    container.innerHTML = `<div class="title-grid__empty">Nenhum título desbloqueado ainda.</div>`;
    return;
  }

  const rarityOrder = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
  unlockedTitles.sort((a, b) => (rarityOrder[a.rarity] ?? 3) - (rarityOrder[b.rarity] ?? 3));

  container.innerHTML = unlockedTitles.map(title => {
    const isActive = title.id === activeTitleId;
    const meta = RARITY_TITLE_META[title.rarity] ?? RARITY_TITLE_META.common;
    const titleColor = isActive ? title.color : 'var(--id-text-primary, #c8d8ff)';
    return `
      <button class="title-option${isActive ? ' title-option--active' : ''}"
              data-title-id="${title.id}"
              aria-pressed="${isActive}"
              title="${title.lore}">
        <span class="title-option__text" style="color: ${titleColor}">${title.text}</span>
        <span class="title-option__rarity" style="color:${title.color}">${meta.label}</span>
        <span class="title-option__check" aria-hidden="true" style="color:${title.color}">✔</span>
      </button>
    `.trim();
  }).join('');

  // Wire title click
  container.querySelectorAll('.title-option').forEach(btn => {
    btn.addEventListener('click', () => _selectTitle(btn.dataset.titleId));
  });
}

function _selectTitle(titleId) {
  const state = loadState();
  if (!state.player.cosmetics) return;

  state.player.cosmetics.active_title_id = titleId;
  saveState(state);

  // Update UI
  const titleObj = getTitleById(titleId);
  _el('drawer-player-title', titleObj?.text ?? 'Iniciado');
  _el('profile-widget-title', titleObj?.text ?? 'Iniciado');

  // Re-render grid to update active state
  const unlockedTitles = state.player.cosmetics.unlocked_titles ?? ['title_default'];
  _renderTitleGrid(unlockedTitles, titleId);

  // Persist to Firestore
  const user = _getCurrentUser();
  if (user) {
    saveCosmetics(user.uid, state.player.cosmetics).catch(console.error);
  }
}

// ============================================================
//   FRAME SELECTOR
// ============================================================
function _renderFrameSelector(playerRankIdx, activeFrameId) {
  const container = document.getElementById('drawer-frame-selector');
  if (!container) return;

  const localState = loadState();
  const unlockedFrames = localState?.player?.cosmetics?.unlocked_frames ?? [];

  container.innerHTML = FRAME_CATALOG.map(frame => {
    // Rank frames use rankIndex; Market frames use 'purchasable'
    const isRankFrame = frame.rankIndex !== undefined;
    const isMarketFrame = frame.purchasable === true;

    let isLocked = false;
    let lockReason = '';

    if (isRankFrame) {
      isLocked = frame.rankIndex > playerRankIdx;
      lockReason = `Requer rank: ${frame.rankRequired}`;
    } else if (isMarketFrame) {
      // Market frames are locked (and hidden or shown as locked?)
      // We only show them if unlocked, or show them as locked?
      // For now, let's only show them if unlocked to keep it clean,
      // OR show them with a specific "Market" lock if we want to encourage purchase.
      // But the user said "Aparências não tem nada", so showing them in Marketplace is enough.
      // Let's hide them here unless owned.
      if (!unlockedFrames.includes(frame.id)) return '';
    }

    const isActive  = frame.id === activeFrameId;
    const classes   = [
      'frame-option',
      isLocked  ? 'frame-option--locked'  : '',
      isActive  ? 'frame-option--active'  : '',
      isMarketFrame ? 'frame-option--premium' : '',
    ].filter(Boolean).join(' ');

    return `
      <button class="${classes}"
              data-frame-id="${frame.id}"
              ${isLocked ? 'disabled aria-disabled="true"' : ''}
              aria-pressed="${isActive}"
              title="${isLocked ? lockReason : frame.name}">
        <div class="frame-option__preview" style="position:relative;">
          ${frame.svg}
          ${isLocked ? `<span class="frame-option__lock-badge">🔒</span>` : ''}
        </div>
        <span class="frame-option__name" style="color:${isLocked ? '#444' : frame.color}">
          ${isRankFrame ? frame.rankRequired : 'Premium'}
        </span>
      </button>
    `.trim();
  }).join('');

  // Wire frame click
  container.querySelectorAll('.frame-option:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => _selectFrame(btn.dataset.frameId));
  });
}

function _selectFrame(frameId) {
  const state = loadState();
  if (!state.player.cosmetics) return;

  // Toggle off if already selected
  if (state.player.cosmetics.profile_frame_id === frameId) {
    state.player.cosmetics.profile_frame_id = '';
    saveState(state);
    _updateDrawerAvatar(state.player.cosmetics);
    const playerData = _getPlayerData();
    const prog = playerData?.progression ?? {};
    _renderFrameSelector(rankIndex(prog.rank ?? 'Adormecido'), '');
    const user = _getCurrentUser();
    if (user) saveCosmetics(user.uid, state.player.cosmetics).catch(console.error);
    return;
  }

  state.player.cosmetics.profile_frame_id = frameId;
  saveState(state);

  // Update avatar preview with new frame
  _updateDrawerAvatar(state.player.cosmetics);

  // Re-render selector
  const playerData = _getPlayerData();
  const prog = playerData?.progression ?? {};
  _renderFrameSelector(rankIndex(prog.rank ?? 'Adormecido'), frameId);

  // Persist
  const user = _getCurrentUser();
  if (user) {
    saveCosmetics(user.uid, state.player.cosmetics).catch(console.error);
  }
}

// ============================================================
//   AVATAR
// ============================================================
function _updateDrawerAvatar(cosmetics) {
  const wrap = document.getElementById('drawer-avatar-wrap');
  if (!wrap) return;

  const img     = cosmetics.avatar_image   || '';
  const frameId = cosmetics.profile_frame_id || '';
  const frameSVG = frameId ? getFrameSVG(frameId) : '';

  let avatarHTML;
  if (img) {
    avatarHTML = `
      <img class="profile-drawer__avatar-img" id="drawer-avatar-img"
           src="${img}" alt="Avatar"
           onerror="this.style.display='none';document.getElementById('drawer-avatar-placeholder').style.display='flex'" />
      <div class="profile-drawer__avatar-placeholder" id="drawer-avatar-placeholder" style="display:none">🌑</div>
    `;
  } else {
    avatarHTML = `<div class="profile-drawer__avatar-placeholder" id="drawer-avatar-placeholder">🌑</div>`;
  }

  const frameHTML = frameSVG
    ? `<div class="profile-drawer__avatar-frame">${frameSVG}</div>`
    : '';

  wrap.innerHTML = avatarHTML + frameHTML;
}

// ============================================================
//   AVATAR LIVE PREVIEW
// ============================================================
let _avatarDebounce = null;

function _setupAvatarPreview() {
  const input      = document.getElementById('drawer-avatar-url');
  const statusEl   = document.getElementById('drawer-avatar-preview-status');
  const pasteBtn   = document.getElementById('drawer-paste-avatar');

  if (input && !input.dataset.previewWired) {
    input.dataset.previewWired = '1';

    input.addEventListener('input', () => {
      clearTimeout(_avatarDebounce);
      if (statusEl) {
        statusEl.textContent = 'carregando…';
        statusEl.className = 'avatar-preview-status avatar-preview-status--loading';
      }
      _avatarDebounce = setTimeout(() => {
        const url = input.value.trim();
        if (!url) {
          // Clear preview
          const state = loadState();
          if (state.player.cosmetics) state.player.cosmetics.avatar_image = '';
          _updateDrawerAvatar(state.player.cosmetics ?? {});
          if (statusEl) { statusEl.textContent = ''; statusEl.className = 'avatar-preview-status'; }
          return;
        }
        _testAndApplyAvatarURL(url, statusEl);
      }, 400);
    });
  }

  if (pasteBtn && !pasteBtn.dataset.wired) {
    pasteBtn.dataset.wired = '1';
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (input) {
          input.value = text.trim();
          input.dispatchEvent(new Event('input'));
        }
      } catch (e) {
        if (statusEl) {
          statusEl.textContent = '⚠️ Permissão de clipboard negada';
          statusEl.className = 'avatar-preview-status avatar-preview-status--error';
        }
      }
    });
  }
}

function _testAndApplyAvatarURL(url, statusEl) {
  const testImg = new Image();
  testImg.onload = () => {
    const state = loadState();
    if (state.player.cosmetics) {
      state.player.cosmetics.avatar_image = url;
      saveState(state);
      _updateDrawerAvatar(state.player.cosmetics);
    }
    if (statusEl) {
      statusEl.textContent = '✅ Avatar aplicado!';
      statusEl.className = 'avatar-preview-status avatar-preview-status--ok';
      setTimeout(() => {
        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'avatar-preview-status'; }
      }, 3000);
    }
    // Update widget avatar if shown
    _el('profile-widget-name', _getPlayerData()?.display_name ?? 'Caçador'); // trigger refresh
  };
  testImg.onerror = () => {
    if (statusEl) {
      statusEl.textContent = '❌ URL inválida ou imagem inacessível';
      statusEl.className = 'avatar-preview-status avatar-preview-status--error';
    }
  };
  testImg.src = url;
}

// ============================================================
//   WIRE ALL DRAWER BUTTONS
// ============================================================
function _wireDrawerButtons() {
  // Close button
  const closeBtn = document.getElementById('drawer-close-btn');
  if (closeBtn && !closeBtn.dataset.wired) {
    closeBtn.dataset.wired = '1';
    closeBtn.addEventListener('click', closeProfileDrawer);
  }

  // Theme options
  document.querySelectorAll('.theme-option').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => applyThemeV3(btn.dataset.themeId));
  });

  // Save button
  const saveBtn = document.getElementById('drawer-save-btn');
  if (saveBtn && !saveBtn.dataset.wired) {
    saveBtn.dataset.wired = '1';
    saveBtn.addEventListener('click', _handleSaveCosmetics);
  }

  // Avatar preview + paste
  _setupAvatarPreview();
}

// ============================================================
//   SAVE COSMETICS
// ============================================================
async function _handleSaveCosmetics() {
  const localState = loadState();
  if (!localState.player.cosmetics) return;

  const cos = localState.player.cosmetics;
  const nameInput  = document.getElementById('drawer-name-input');
  const avatarInput = document.getElementById('drawer-avatar-url');

  // Apply avatar from input if it changed
  if (avatarInput) {
    const urlVal = avatarInput.value.trim();
    if (urlVal && urlVal !== cos.avatar_image) {
      cos.avatar_image = urlVal;
      _updateDrawerAvatar(cos);
    }
  }

  saveState(localState);

  // Save player name if changed
  const newName = nameInput?.value?.trim();
  const user = _getCurrentUser();
  if (newName && user) {
    try {
      await savePlayer(user.uid, { display_name: newName });
      const nameEl = document.getElementById('profile-widget-name');
      if (nameEl) nameEl.textContent = newName;
      const nameDisp = document.getElementById('drawer-player-name-display');
      if (nameDisp) nameDisp.textContent = newName;
      if (_onNameSaved) _onNameSaved(newName);
    } catch (e) {
      console.error('[Profile] Erro ao salvar nome:', e);
    }
  }

  // Persist cosmetics to Firestore
  if (user) {
    try {
      await saveCosmetics(user.uid, cos);
      _showDrawerToast('✅ Perfil salvo!');
    } catch (e) {
      console.error('[Profile] Erro ao salvar cosméticos:', e);
      _showDrawerToast('⚠️ Salvo localmente apenas.');
    }
  } else {
    _showDrawerToast('✅ Salvo localmente!');
  }
}

// ============================================================
//   HELPERS
// ============================================================
function _el(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _syncThemeSelectorUI(activeTheme) {
  document.querySelectorAll('.theme-option').forEach(btn => {
    const isActive = btn.dataset.themeId === activeTheme;
    btn.classList.toggle('theme-option--active', isActive);
    const check = btn.querySelector('.theme-option__check');
    if (check) check.style.opacity = isActive ? '1' : '0';
  });
}

function _showDrawerToast(msg) {
  const toast = document.getElementById('drawer-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}
