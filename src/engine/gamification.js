/**
 * RPG Life OS — Gamification Renderer (Phase 3)
 * HUD, toasts, level-up stars, modals, nav, badges + radar chart.
 */

import {
    loadState, hpPercent, ATTR_KEYS, ATTR_META
} from './core.js';

import { getPlayerTitle } from './titleManager.js';

import {
    playSound, playUnlockSound
} from './audio.js';

// ============================================================
//   HUD RENDER
// ============================================================
export function renderHUD(state) {
    const p = state.player;
    const xpPercent = p.xp_next > 0 ? (p.xp / p.xp_next) * 100 : 0;
    const hpPct = hpPercent(state) * 100;

    _setText('sidebar-player-name', p.name);
    _setText('profile-widget-name', p.name);
    
    const { title } = getPlayerTitle(state);
    _setText('sidebar-player-title', title);
    _setText('profile-widget-title', title);
    
    _setText('sidebar-player-level', p.rank ?? `Nível ${p.level}`);
    _setText('profile-widget-rank', p.rank ?? `Nível ${p.level}`);

    // v3.1 Economy HUD
    const gold = state.player.progression?.gold_coins ?? state.player.stats?.gold ?? 0;
    const frags = state.player.progression?.shadow_fragments ?? 0;
    _setText('hud-gold', Number(gold).toLocaleString('pt-BR'));
    _setText('hud-shadow', Number(frags).toLocaleString('pt-BR'));

    const xpFill = document.getElementById('sidebar-xp-fill');
    if (xpFill) {
        xpFill.style.width = `${Math.min(100, xpPercent).toFixed(1)}%`;
        xpFill.parentElement?.setAttribute('aria-valuenow', Math.round(xpPercent));
        xpFill.classList.add('xp-gained-anim');
        setTimeout(() => xpFill.classList.remove('xp-gained-anim'), 700);
    }
    _setText('sidebar-xp-text', `${Math.floor(p.xp)} / ${Math.floor(p.xp_next)}`);

    const hpFill = document.getElementById('sidebar-hp-fill');
    if (hpFill) {
        hpFill.style.width = `${Math.min(100, hpPct).toFixed(1)}%`;
        hpFill.className = 'hp-bar__fill ' + _getHPClass(hpPct);
        hpFill.parentElement?.setAttribute('aria-valuenow', Math.round(hpPct));
    }
    _setText('sidebar-hp-text', `${p.hp} / ${p.hp_max}`);

    for (const key of ATTR_KEYS) {
        const a = p.attributes[key] || { value: 1 };
        _setText(`attr-${key.toLowerCase()}`, a.value);
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
//   RADAR CHART (Canvas 2D, Pentagonal v3.1 — Tier System)
// ============================================================

/**
 * TIER SYSTEM: Every 10 attribute points = 1 tier.
 * The chart always shows the value within the current tier (0–10),
 * keeping the polygon full and readable at any progression level.
 * A small '×N' badge glows next to the label when tier > 1.
 */
const ATTR_TIER_SIZE = 10; // points per visual tier

export function renderAttributeRadar(state) {
    const canvas = document.getElementById('attr-radar');
    if (!canvas) return;

    const W = 200;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    const cx = W / 2;
    const cy = H / 2 + 6;
    const radius = 68;

    // 5 axes for INT, FOR, AVE, ART, CAR (72° apart)
    const AXES = ['INT', 'FOR', 'AVE', 'ART', 'CAR'];
    const angles = {};
    AXES.forEach((key, i) => {
        angles[key] = -Math.PI / 2 + (i * (2 * Math.PI / 5));
    });

    const attrs = state.player.attributes;

    // --- Tier-aware normalisation ---
    // tier = floor(value / TIER_SIZE), fills the chart based on position within tier
    const vals  = {};   // 0.0 – 1.0 for chart polygon
    const tiers = {};   // tier index (0-based, tier 0 = ×1)
    for (const key of AXES) {
        const v = (attrs[key] || { value: 1 }).value;
        tiers[key] = Math.floor(v / ATTR_TIER_SIZE);         // 0, 1, 2 ...
        const posInTier = v % ATTR_TIER_SIZE;                // 0–9
        // Normalise within tier: 1–10 range (avoid 0 to keep shape visible)
        const effective = Math.max(1, posInTier === 0 && v > 0 ? ATTR_TIER_SIZE : posInTier);
        vals[key] = Math.min(effective / ATTR_TIER_SIZE, 0.97);
    }

    ctx.clearRect(0, 0, W, H);

    // ---- Background pentagon grid ----
    for (let ring = 1; ring <= 4; ring++) {
        const r = (ring / 4) * radius;
        ctx.beginPath();
        AXES.forEach((key, i) => {
            const a = angles[key];
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = ring === 4 ? '#4a4580' : '#2a2550';
        ctx.lineWidth = ring === 4 ? 1.5 : 0.8;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ---- Axis lines ----
    for (const key of AXES) {
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
    AXES.forEach((key, i) => {
        const r = vals[key] * radius;
        const a = angles[key];
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0,   'rgba(155,110,255,0.80)');
    grad.addColorStop(0.6, 'rgba(93,63,211,0.55)');
    grad.addColorStop(1,   'rgba(30,15,80,0.15)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ---- Vertex dots ----
    for (const key of AXES) {
        const r = vals[key] * radius;
        const a = angles[key];
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ---- Labels: icon + raw value  +  ×N tier badge ----
    const LABEL_PAD = 18;
    for (const key of AXES) {
        const a = angles[key];
        const attr  = attrs[key] || { value: 1 };
        const meta  = ATTR_META[key] || { icon: '?', color: '#fff' };
        const tier  = tiers[key];

        const lx = cx + Math.cos(a) * (radius + LABEL_PAD);
        const ly = cy + Math.sin(a) * (radius + LABEL_PAD);

        // Main label: icon + value
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle  = meta.color;
        ctx.fillText(`${meta.icon}${attr.value}`, lx, ly);

        // Tier badge: ×N shown above/beside the label when tier ≥ 1
        if (tier >= 1) {
            const bx = lx + Math.cos(a) * 6 + (Math.cos(a) >= 0 ? 10 : -10);
            const by = ly + Math.sin(a) * 6 - 8;
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle  = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur  = 4;
            ctx.fillText(`×${tier + 1}`, bx, by);
            ctx.shadowBlur = 0;
        }
    }
}

// ============================================================
//   RANK BAR (Phase 4)
// ============================================================
/**
 * Renders the rank progress bar in the sidebar.
 * @param {Object} rankInfo - Result from calcRank() in drop_engine.js
 */
export function renderRankBar(rankInfo) {
    const fill  = document.getElementById('rank-bar-fill');
    const pct   = document.getElementById('rank-bar-pct');
    const label = document.getElementById('rank-bar-label-text');

    const progress = Math.min(100, rankInfo.progress_pct ?? 0).toFixed(0);
    const nextName = rankInfo.next_rank ?? 'Máx';
    const curName  = rankInfo.rank ?? 'Adormecido';

    if (fill)  fill.style.width = `${progress}%`;
    if (fill)  fill.style.background = `var(--rank-${curName.toLowerCase()}, var(--color-fragment))`;
    if (pct)   pct.textContent  = `${progress}%`;
    if (label) label.textContent = `${curName} → ${nextName}`;
}

// ============================================================
//   RANK UP OVERLAY (Phase 4)
// ============================================================
export const RANK_LORE = {
  Adormecido: 'Ainda sonhando. O Feitiço aguarda o seu despertar.',
  Desperto: 'As sombras sussurram seu nome. Você não é mais o mesmo.',
  Ascendido: 'O Vazio reconhece sua presença. Sua sombra agora é viva.',
  Mestre: 'Criaturas do pesadelo recuam ante seus passos.',
  Santo: 'O mundo real parece uma memória distante.',
  Soberano: 'Você transcendeu o que era possível. O Vazio é seu domínio.',
  Sagrado: 'Sua alma é uma fornalha imortal. As leis da realidade se dobram a você.',
  Divino: 'O Tecelão sorri. Você se tornou a própria essência do pesadelo.'
};

export const RANK_GLYPHS = {
  Adormecido: '🌑',
  Desperto: '🟦', 
  Ascendido: '🟣', 
  Mestre: '🟡',
  Santo: '🔴', 
  Soberano: '⬛',
  Sagrado: '✨',
  Divino: '🌌'
};

export function showRankUpOverlay(newRank) {
    const overlay = document.getElementById('rankup-overlay');
    if (!overlay) return;

    _setText('rankup-new-rank', newRank);
    _setText('rankup-lore', RANK_LORE[newRank] ?? 'A ascensão te muda.');
    _setText('rankup-glyph', RANK_GLYPHS[newRank] ?? '🌑');

    const rankEl = document.getElementById('rankup-new-rank');
    if (rankEl) rankEl.style.color = `var(--rank-${newRank.toLowerCase()}, #e5d9f2)`;

    overlay.classList.remove('hidden');
    
    // Toca o som baseado no Tier do novo título
    const state = loadState();
    const { audioTier } = getPlayerTitle(state);
    playUnlockSound(audioTier);
}

// ============================================================
//   LOOT OVERLAY (Phase 5)
// ============================================================
export function showMemoryObtainedOverlay(item) {
    const overlay = document.getElementById('memoria-overlay');
    if (!overlay) return;

    // Use Gold v1.1 classes
    const rankLower = item.rank?.toLowerCase() || 'adormecido';
    const encHTML = (item.enchantments || []).map(e => `<li>[${e}]</li>`).join('');
    
    // Build the visual container
    overlay.className = 'memoria-overlay-gold show';
    
    // Optional fallback if no image provided yet
    const imgSrc = item.image_url 
      ? `<img src="${item.image_url}" class="mem-img-gold" alt="${item.name}">` 
      : `<div style="font-size:48px; opacity:0.8; font-family:var(--font-pixel)">?</div>`;

    overlay.innerHTML = `
      <div class="mem-card-gold rank-${rankLower}">
         <div class="mem-card-header-gold">
           <span style="color: var(--rank-${rankLower}, #fff)">${item.rank}</span>
           <span>${item.type}</span>
         </div>
         
         <div class="mem-image-container">
            ${imgSrc}
         </div>
         
         <h3 class="mem-title-gold">${item.name}</h3>
         <p class="mem-desc-gold">${item.description}</p>
         
         ${encHTML ? `<ul class="mem-ench-list-gold">${encHTML}</ul>` : ''}
         
         ${item.lore_origin ? `<p class="mem-lore-gold">"${item.lore_origin}"</p>` : ''}
      </div>
    `;

    // Wait 5 seconds, then trigger fade out
    const fadeTimer = setTimeout(() => {
        closeMemoriaOverlay(overlay);
    }, 5000);
    
    // Support early click-to-dismiss
    overlay.addEventListener('click', () => {
        clearTimeout(fadeTimer);
        closeMemoriaOverlay(overlay);
    }, { once: true });
}

function closeMemoriaOverlay(overlay) {
    if (overlay.classList.contains('hide')) return;
    overlay.classList.remove('show');
    overlay.classList.add('hide');
    setTimeout(() => {
        overlay.className = 'hidden';
        overlay.innerHTML = '';
    }, 500); // 0.5s fadeOut match
}

// ============================================================
//   LEVEL UP (legacy wrapper)
// ============================================================
export function showLevelUp(newLevel) {
    const overlay = document.getElementById('level-up-overlay');
    const label = document.getElementById('level-up-new');
    if (!overlay) return;
    if (label) label.textContent = `Nível ${newLevel}`;
    overlay.hidden = false;
    spawnLevelUpStars();
    playSound('level_up');
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
    playUnlockSound(2);
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
export function openModal({ title, bodyHTML, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onAfterOpen } = {}) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const cancelEl = document.getElementById('modal-cancel');
    const oldConfirm = document.getElementById('modal-confirm');

    if (!overlay) return;

    if (titleEl) titleEl.textContent = title || 'Modal';
    if (bodyEl) bodyEl.innerHTML = bodyHTML || '';
    if (cancelEl) {
        cancelEl.textContent = cancelLabel;
        cancelEl.style.display = cancelLabel ? '' : 'none';
    }

    if (oldConfirm) {
        const newConfirm = oldConfirm.cloneNode(false);
        newConfirm.id = 'modal-confirm';
        newConfirm.className = 'btn-rp btn-rp--primary';
        newConfirm.style.display = confirmLabel ? '' : 'none';
        newConfirm.textContent = confirmLabel;
        oldConfirm.replaceWith(newConfirm);

        if (onConfirm) {
            newConfirm.addEventListener('click', () => {
                onConfirm();
                closeModal();
            }, { once: true });
        }
    }

    playSound('ui_click');
    overlay.hidden = false;

    // Chama callback após o modal estar visível no DOM
    if (onAfterOpen) requestAnimationFrame(() => onAfterOpen());
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.hidden = true;
}
