/**
 * RPG Life OS — Gamification Renderer (Phase 3)
 * HUD, toasts, level-up stars, modals, nav, badges + radar chart.
 */

import {
    hpPercent, ATTR_KEYS, ATTR_META
} from './core.js';

import {
    playClick, playLevelUp, playAchievement
} from './audio.js';

// ============================================================
//   HUD RENDER
// ============================================================
export function renderHUD(state) {
    const p = state.player;
    const xpPercent = p.xp_next > 0 ? (p.xp / p.xp_next) * 100 : 0;
    const hpPct = hpPercent(state) * 100;

    _setText('sidebar-player-name', p.name);
    _setText('sidebar-player-level', `Nível ${p.level}`);

    const xpFill = document.getElementById('sidebar-xp-fill');
    if (xpFill) {
        xpFill.style.width = `${Math.min(100, xpPercent).toFixed(1)}%`;
        xpFill.parentElement?.setAttribute('aria-valuenow', Math.round(xpPercent));
        xpFill.classList.add('xp-gained-anim');
        setTimeout(() => xpFill.classList.remove('xp-gained-anim'), 700);
    }
    _setText('sidebar-xp-text', `${p.xp} / ${p.xp_next}`);

    const hpFill = document.getElementById('sidebar-hp-fill');
    if (hpFill) {
        hpFill.style.width = `${Math.min(100, hpPct).toFixed(1)}%`;
        hpFill.className = 'hp-bar__fill ' + _getHPClass(hpPct);
        hpFill.parentElement?.setAttribute('aria-valuenow', Math.round(hpPct));
    }
    _setText('sidebar-hp-text', `${p.hp} / ${p.hp_max}`);

    for (const key of ATTR_KEYS) {
        _setText(`attr-${key.toLowerCase()}`, p.attributes[key].value);
    }

    // Radar chart
    renderAttributeRadar(state);
}

function _getHPClass(pct) {
    if (pct > 60) return 'hp-safe';
    if (pct > 30) return 'hp-warn';
    return 'hp-danger';
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ============================================================
//   RADAR CHART (Canvas 2D, Triangular)
// ============================================================
export function renderAttributeRadar(state) {
    const canvas = document.getElementById('attr-radar');
    if (!canvas) return;

    const W = 160;
    const H = 160;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    const cx = W / 2;
    const cy = H / 2 + 8;
    const radius = 58;

    // The 3 axes at 120° apart: INT=top (270°), ART=right (30°), AVE=left (150°)
    const angles = {
        INT: -Math.PI / 2,              // top
        ART: -Math.PI / 2 + (2 * Math.PI / 3),   // bottom-right
        AVE: -Math.PI / 2 + (4 * Math.PI / 3),   // bottom-left
    };

    const attrs = state.player.attributes;

    // Values normalised: attr.value / (attr.value + 10) gives nice scaling
    const vals = {};
    for (const key of ['INT', 'ART', 'AVE']) {
        const v = attrs[key].value;
        vals[key] = Math.min((v / Math.max(v + 5, 10)), 0.95);
    }

    ctx.clearRect(0, 0, W, H);

    // ---- Background triangle grid ----
    for (let tier = 1; tier <= 4; tier++) {
        const r = (tier / 4) * radius;
        ctx.beginPath();
        for (const key of ['INT', 'ART', 'AVE']) {
            const a = angles[key];
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            key === 'INT' ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = tier === 4 ? '#3a3560' : '#2a2550';
        ctx.lineWidth = tier === 4 ? 1.5 : 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ---- Axis lines ----
    for (const key of ['INT', 'ART', 'AVE']) {
        const a = angles[key];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
        ctx.strokeStyle = '#3a3560';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ---- Filled polygon ----
    ctx.beginPath();
    for (const key of ['INT', 'ART', 'AVE']) {
        const r = vals[key] * radius;
        const a = angles[key];
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        key === 'INT' ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(155,110,255,0.75)');
    grad.addColorStop(0.6, 'rgba(93,63,211,0.55)');
    grad.addColorStop(1, 'rgba(30,15,80,0.2)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ---- Vertex dots ----
    for (const key of ['INT', 'ART', 'AVE']) {
        const r = vals[key] * radius;
        const a = angles[key];
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
    }

    // ---- Labels (emoji + value) ----
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const LABEL_PAD = 18;
    const labelPos = {
        INT: { x: cx, y: cy - radius - LABEL_PAD, emoji: '🧠' },
        ART: { x: cx + Math.cos(angles.ART) * (radius + LABEL_PAD), y: cy + Math.sin(angles.ART) * (radius + LABEL_PAD), emoji: '🎨' },
        AVE: { x: cx + Math.cos(angles.AVE) * (radius + LABEL_PAD), y: cy + Math.sin(angles.AVE) * (radius + LABEL_PAD), emoji: '🗡️' },
    };

    for (const [key, pos] of Object.entries(labelPos)) {
        const val = attrs[key].value;
        ctx.fillStyle = ATTR_META[key].color;
        ctx.fillText(`${pos.emoji}${val}`, pos.x, pos.y);
    }
}

// ============================================================
//   LEVEL UP
// ============================================================
export function showLevelUp(newLevel) {
    const overlay = document.getElementById('level-up-overlay');
    const label = document.getElementById('level-up-new');
    if (!overlay) return;
    if (label) label.textContent = `Nível ${newLevel}`;
    overlay.hidden = false;
    spawnLevelUpStars();
    playLevelUp();
}

function spawnLevelUpStars() {
    const box = document.querySelector('.level-up-box');
    if (!box) return;
    const STARS = ['⭐', '✨', '💫', '🌟', '⚡'];
    for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.className = 'level-up-star';
        const angle = (i / 12) * 360;
        const dist = 60 + Math.random() * 60;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist;
        star.style.cssText = `
      left: 50%; top: 50%;
      --tx: ${tx}px; --ty: ${ty}px;
      --tx2: ${tx * 1.5}px; --ty2: ${ty * 1.5}px;
      animation-delay: ${Math.random() * 0.3}s;
    `;
        star.textContent = STARS[Math.floor(Math.random() * STARS.length)];
        box.appendChild(star);
        star.addEventListener('animationend', () => star.remove(), { once: true });
    }
}

// ============================================================
//   TOAST — Regular
// ============================================================
export function showToast(message, type = 'xp', durationMs = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    _scheduleToastRemoval(toast, durationMs);
}

// ============================================================
//   TOAST — Achievement unlock (special)
// ============================================================
export function showAchievementToast(ach) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast--achievement';
    toast.innerHTML = `
    <div class="toast-icon">${ach.icon}</div>
    <div class="toast-title">🏆 Conquista Desbloqueada!</div>
    <div class="toast-body">${ach.name}</div>
    <span class="rarity-badge rarity-badge--${ach.rarity}">${ach.rarity}</span>
  `;
    container.appendChild(toast);
    _scheduleToastRemoval(toast, 5000);
    playAchievement();
}

function _scheduleToastRemoval(toast, durationMs) {
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 500);
    }, durationMs);
}

// ============================================================
//   NAV BADGE
// ============================================================
let unseenAchievements = 0;

export function incrementAchievementBadge(count = 1) {
    unseenAchievements += count;
    _updateAchievementBadge();
}

export function clearAchievementBadge() {
    unseenAchievements = 0;
    _updateAchievementBadge();
}

function _updateAchievementBadge() {
    ['nav-achievements', 'm-nav-achievements'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        let badge = btn.querySelector('.nav-badge');
        if (unseenAchievements > 0) {
            if (!badge) { badge = document.createElement('div'); badge.className = 'nav-badge'; btn.appendChild(badge); }
            badge.textContent = unseenAchievements;
        } else {
            badge?.remove();
        }
    });
}

// ============================================================
//   NAVIGATION
// ============================================================
export function setActiveNav(viewName) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const active = btn.dataset.view === viewName;
        btn.classList.toggle('nav-btn--active', active);
        btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('.bottom-nav__btn').forEach(btn => {
        btn.classList.toggle('bottom-nav__btn--active', btn.dataset.view === viewName);
    });
}

export function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        const isActive = view.dataset.view === viewName;
        view.classList.toggle('view--active', isActive);
        view.hidden = !isActive;
    });
}

export function setPageTitle(title) {
    _setText('page-title', title);
}

// ============================================================
//   MODAL
// ============================================================
export function openModal({ title, bodyHTML, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm } = {}) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const cancelEl = document.getElementById('modal-cancel');
    const oldConfirm = document.getElementById('modal-confirm');

    if (!overlay) return;

    if (titleEl) titleEl.textContent = title || 'Modal';
    if (bodyEl) bodyEl.innerHTML = bodyHTML || '';
    if (cancelEl) cancelEl.textContent = cancelLabel;

    if (oldConfirm) {
        const newConfirm = oldConfirm.cloneNode(false);
        newConfirm.id = 'modal-confirm';
        newConfirm.className = 'btn-rp btn-rp--primary';
        newConfirm.textContent = confirmLabel;
        oldConfirm.replaceWith(newConfirm);

        if (onConfirm) {
            newConfirm.addEventListener('click', () => {
                onConfirm();
                closeModal();
            }, { once: true });
        }
    }

    playClick();
    overlay.hidden = false;
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.hidden = true;
}
