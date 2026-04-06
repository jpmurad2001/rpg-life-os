/**
 * RPG Life OS v2.4 Diamond — Tear do Destino (Gamified Analytics)
 * ================================================================
 * Magical observatory-style dashboard:
 *  - Teia dos Atributos: 5-axis SVG radar (pure SVG, no library)
 *  - Constelação de Ofensiva: SVG streak constellation (14 stars)
 *  - KPI cards: Level/XP, HP, Weekly Missions, Pomodoro sessions
 *
 * Data strategy: real player state + safe fallbacks for new accounts
 */

import { loadState } from '../engine/core.js';

// ============================================================
//   RADAR CONSTANTS
// ============================================================
const R_CX  = 190;   // SVG center X
const R_CY  = 190;   // SVG center Y
const R_MAX = 100;   // max radius
const R_N   = 5;     // number of axes

/** 5 Radar axes — 3 real attributes + 2 derived stats */
const AXES = [
  {
    key: 'MENTE',      label: 'MENTE (INT)',      icon: '🧠',
    color: '#9c7cf4',
    get: p => _norm(p.attributes.INT?.value ?? 1, 25),
  },
  {
    key: 'CRIACAO',    label: 'CRIAÇÃO (ART)',    icon: '🎨',
    color: '#ff6b9d',
    get: p => _norm(p.attributes.ART?.value ?? 1, 25),
  },
  {
    key: 'FORCA',      label: 'FORÇA (FOR)',      icon: '💪',
    color: '#ff5252',
    get: p => _norm(p.attributes.FOR?.value ?? 1, 25),
  },
  {
    key: 'PRESENCA',    label: 'PRESENÇA (CAR)', icon: '🎭',
    color: '#ffb74d',
    get: p => _norm(p.attributes.CAR?.value ?? 1, 25),
  },
  {
    key: 'AVENTURA',   label: 'AVENTURA (AVE)',   icon: '🗡️',
    color: '#4fc3f7',
    get: p => _norm(p.attributes.AVE?.value ?? 1, 25),
  },
];

// ============================================================
//   GEOMETRY HELPERS
// ============================================================
const _norm  = (v, max) => Math.min(100, Math.round((v / max) * 100));
const _angle = i => (-Math.PI / 2) + (2 * Math.PI / R_N) * i;
const _pt    = (i, pct) => ({
  x: R_CX + R_MAX * pct * Math.cos(_angle(i)),
  y: R_CY + R_MAX * pct * Math.sin(_angle(i)),
});
const _polyPts = pct =>
  Array.from({ length: R_N }, (_, i) => {
    const p = _pt(i, pct);
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');

/** 5-pointed star polygon around (cx, cy) */
function _starPoly(cx, cy, outerR, innerR) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

// ============================================================
//   DATA COMPOSITION
// ============================================================
function _buildData() {
  const state = loadState();
  const p     = state.player;

  // Try to count weekly missions from quests state (safe traversal)
  let done = 0, total = 0;
  try {
    const wk = state.quests?.weeks?.[state.quests.current_week_id];
    if (wk) {
      Object.values(wk).forEach(day => {
        if (Array.isArray(day)) {
          day.forEach(q => { total++; if (q.done || q.completed) done++; });
        }
      });
    }
  } catch (_) { /* safe fallback below */ }
  if (!total) {
    done  = p.stats.quests_completed % 21;
    total = 21;
  }

  return {
    axes:    AXES.map(a => ({ ...a, value: a.get(p) })),
    streak:  { current: p.stats.streak_days ?? 0, display: 14 },
    level:   p.level,
    xp:      p.xp,
    xp_next: p.xp_next,
    hp:      p.hp,
    hp_max:  p.hp_max,
    missions:  { done, total },
    pomo:    p.stats.pomodoro_sessions_completed ?? 0,
    total_xp:  p.stats.total_xp_earned ?? 0,
    xpMult:    p.xpMultiplier ?? 1.0,
  };
}

// ============================================================
//   RENDER: RADAR CHART (SVG)
// ============================================================
function _renderRadar(el, axes) {
  const SIZE       = 380;
  const GRID_PCTS  = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Grid polygons (teia de fundo)
  const gridPolys = GRID_PCTS.map((pct, li) => `
    <polygon points="${_polyPts(pct)}"
             class="radar-grid-poly"
             style="stroke-width:${li === 4 ? 1.2 : 0.7}; opacity:${0.35 + li * 0.13}"/>
  `).join('');

  // Axis lines (center → vertex)
  const axisLines = axes.map((_, i) => {
    const v = _pt(i, 1.0);
    return `<line x1="${R_CX}" y1="${R_CY}" x2="${v.x.toFixed(2)}" y2="${v.y.toFixed(2)}"
                  class="radar-axis"/>`;
  }).join('');

  // Data polygon (minimum 4% so a zero value is still visible)
  const dataPts = axes.map((a, i) => {
    const p = _pt(i, Math.max(0.04, a.value / 100));
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ');

  // Data dots (colored per axis)
  const dots = axes.map((a, i) => {
    const p = _pt(i, Math.max(0.04, a.value / 100));
    return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5"
                    fill="${a.color}" filter="url(#dot-glow)"
                    class="radar-dot" style="--dot-color:${a.color}"/>`;
  }).join('');

  // Axis labels (beyond vertex)
  const labels = axes.map((a, i) => {
    const lp     = _pt(i, 1.40);
    const anchor = lp.x < R_CX - 8 ? 'end' : lp.x > R_CX + 8 ? 'start' : 'middle';
    return `
      <text x="${lp.x.toFixed(1)}" y="${(lp.y - 5).toFixed(1)}"
            text-anchor="${anchor}" class="radar-label" fill="${a.color}">${a.label}</text>
      <text x="${lp.x.toFixed(1)}" y="${(lp.y + 11).toFixed(1)}"
            text-anchor="${anchor}" class="radar-value" fill="${a.color}">${a.value}%</text>
    `;
  }).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}"
         class="radar-svg" role="img" aria-label="Teia dos Atributos — Gráfico de radar pentagonal">
      <defs>
        <filter id="radar-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#1a1a35" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#050510" stop-opacity="0.2"/>
        </radialGradient>
      </defs>

      <!-- Observatory backdrop -->
      <circle cx="${R_CX}" cy="${R_CY}" r="${R_MAX + 18}"
              fill="url(#radar-bg)" stroke="#1a1a35" stroke-width="1"/>

      <!-- Grid teia -->
      ${gridPolys}

      <!-- Axis lines -->
      ${axisLines}

      <!-- Data polygon (glowing) -->
      <polygon points="${dataPts}" class="radar-polygon" filter="url(#radar-glow)"/>

      <!-- Data dots -->
      ${dots}

      <!-- Labels -->
      ${labels}

      <!-- Center crystal -->
      <circle cx="${R_CX}" cy="${R_CY}" r="4" fill="#9c7cf4"
              filter="url(#dot-glow)" opacity="0.8"/>
    </svg>
  `;
}

// ============================================================
//   RENDER: CONSTELLATION (SVG)
// ============================================================
function _renderConstellation(el, streak) {
  const N    = streak.display;  // 14 stars
  const W    = 680;
  const H    = 110;
  const step = W / (N + 1);
  const cy   = 50;

  const stars = Array.from({ length: N }, (_, i) => ({
    cx:     step * (i + 1),
    active: i < streak.current,
    label:  `D${i + 1}`,
  }));

  // Connection lines (drawn first, under stars)
  const lines = Array.from({ length: N - 1 }, (_, i) => {
    const s1 = stars[i], s2 = stars[i + 1];
    const active = s1.active && s2.active;
    return `<line x1="${s1.cx.toFixed(1)}" y1="${cy}"
                  x2="${s2.cx.toFixed(1)}" y2="${cy}"
                  stroke="${active ? '#4fc3f7' : '#1a1a40'}"
                  stroke-width="${active ? 2.5 : 1}"
                  opacity="${active ? 1 : 0.4}"
                  ${active ? 'class="constellation-line--active" stroke-dasharray="6 4" filter="url(#const-glow)"' : ''}/>`;
  }).join('');

  // Star elements
  const starEls = stars.map(s => {
    if (s.active) {
      return `
        <circle cx="${s.cx.toFixed(1)}" cy="${cy}" r="11"
                fill="rgba(79,195,247,0.12)" stroke="#4fc3f7" stroke-width="1.5"
                filter="url(#const-glow)" class="star-ring"/>
        <polygon points="${_starPoly(s.cx, cy, 7, 3)}"
                 fill="#4fc3f7" filter="url(#const-glow)" class="star--active"/>
      `;
    }
    return `
      <polygon points="${_starPoly(s.cx, cy, 5, 2.5)}"
               fill="none" stroke="#2a2550" stroke-width="1" opacity="0.35"/>
    `;
  }).join('');

  // Day labels
  const labelEls = stars.map(s => `
    <text x="${s.cx.toFixed(1)}" y="${cy + 27}"
          text-anchor="middle" class="star-label"
          fill="${s.active ? '#ffd700' : '#2a2550'}"
          opacity="${s.active ? 1 : 0.45}">${s.label}</text>
  `).join('');

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="constellation-svg"
         role="img" aria-label="Constelação de Ofensiva — ${streak.current} dias ativos">
      <defs>
        <filter id="const-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      ${lines}
      ${starEls}
      ${labelEls}
    </svg>
  `;
}

// ============================================================
//   RENDER: KPI STAT CARDS
// ============================================================
function _renderStats(data) {
  // ── Level / XP ──────────────────────────────────────────
  const levelEl = document.getElementById('analytics-level-card');
  if (levelEl) {
    const xpPct = Math.min(100, Math.round((data.xp / data.xp_next) * 100));
    levelEl.innerHTML = `
      <div class="stat-card__icon">⚡</div>
      <div class="stat-card__label">NÍVEL DO CAÇADOR</div>
      <div class="stat-card__value" style="color:var(--color-gold)">${data.level}</div>
      <div class="stat-bar" role="progressbar" aria-valuenow="${xpPct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="XP Progress">
        <div class="stat-bar__fill stat-bar__fill--gold" style="width:${xpPct}%"></div>
      </div>
      <div class="stat-card__sub">${data.xp.toLocaleString()} / ${data.xp_next.toLocaleString()} XP</div>
      ${data.xpMult > 1 ? `<div class="stat-card__bonus">✨ ×${data.xpMult.toFixed(2)} multiplicador ativo</div>` : ''}
    `;
  }

  // ── HP / Vitalidade ─────────────────────────────────────
  const hpEl = document.getElementById('analytics-hp-card');
  if (hpEl) {
    const hpPct   = Math.min(100, Math.round((data.hp / data.hp_max) * 100));
    const hpColor = hpPct > 60 ? '#66bb6a' : hpPct > 30 ? '#ffa726' : '#ef5350';
    hpEl.innerHTML = `
      <div class="stat-card__icon">❤️</div>
      <div class="stat-card__label">VITALIDADE</div>
      <div class="stat-card__value" style="color:${hpColor}">${data.hp}</div>
      <div class="stat-bar" role="progressbar" aria-valuenow="${hpPct}" aria-valuemin="0" aria-valuemax="100">
        <div class="stat-bar__fill" style="width:${hpPct}%; background:${hpColor}; box-shadow:0 0 8px ${hpColor}"></div>
      </div>
      <div class="stat-card__sub">${data.hp} / ${data.hp_max} HP</div>
    `;
  }

  // ── Weekly Missions ──────────────────────────────────────
  const mEl = document.getElementById('analytics-missions-card');
  if (mEl) {
    const mPct = data.missions.total
      ? Math.min(100, Math.round((data.missions.done / data.missions.total) * 100))
      : 0;
    mEl.innerHTML = `
      <div class="stat-card__icon">📜</div>
      <div class="stat-card__label">MISSÕES DA SEMANA</div>
      <div class="stat-card__value" style="color:var(--color-xp)">${data.missions.done}</div>
      <div class="stat-bar" role="progressbar" aria-valuenow="${mPct}" aria-valuemin="0" aria-valuemax="100">
        <div class="stat-bar__fill stat-bar__fill--xp" style="width:${mPct}%"></div>
      </div>
      <div class="stat-card__sub">${data.missions.done} / ${data.missions.total} concluídas · ${mPct}%</div>
    `;
  }

  // ── Pomodoro ─────────────────────────────────────────────
  const pomoEl = document.getElementById('analytics-pomodoro-card');
  if (pomoEl) {
    const mins = data.pomo * 25;
    const hrs  = Math.floor(mins / 60);
    const rem  = mins % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${rem}m de foco` : `${rem}m de foco`;
    pomoEl.innerHTML = `
      <div class="stat-card__icon">⏳</div>
      <div class="stat-card__label">SESSÕES DE FOCO</div>
      <div class="stat-card__value" style="color:var(--color-warning)">${data.pomo}</div>
      <div class="stat-card__sub">${timeStr}</div>
      <div class="stat-card__sub">${data.total_xp.toLocaleString()} XP ganho total</div>
    `;
  }
}

// ============================================================
//   MAIN RENDER
// ============================================================
export function renderAnalytics() {
  const data    = _buildData();
  const radarEl = document.getElementById('analytics-radar');
  const constEl = document.getElementById('analytics-constellation');
  const textEl  = document.getElementById('analytics-streak-text');

  if (radarEl) _renderRadar(radarEl, data.axes);
  if (constEl) _renderConstellation(constEl, data.streak);

  if (textEl) {
    const s = data.streak.current;
    textEl.textContent = s === 0
      ? '— Nenhum dia de ofensiva. Comece hoje. —'
      : s === 1
        ? '— 1 dia em chamas. A corrente começou. —'
        : `— ${s} dias em chamas 🔥 Não quebre a corrente. —`;
  }

  _renderStats(data);
}

// ============================================================
//   INIT (called by app.js router)
// ============================================================
export function initAnalytics() {
  renderAnalytics();
}
