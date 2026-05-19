/**
 * RPG Life OS v2.3 Diamond — Habilidades de Aspecto (Talent Tree)
 * ================================================================
 * 7 talent nodes arranged in 3 branches (INT / ART / AVE) on a
 * 7-column × 3-row CSS grid with an SVG overlay for connections.
 */

import { loadState, saveState }  from '../engine/core.js';
import { showToast, renderHUD }  from '../engine/gamification.js';
import { playSound } from '../engine/audio.js';
import { MEMORY_SLOTS } from '../engine/economy_engine.js';

// ============================================================
//   BRANCH COLORS
// ============================================================
const BRANCH_COLORS = {
  FOR:  '#ff5252',  // red
  INT:  '#9c7cf4',  // violet
  AVE:  '#4fc3f7',  // cyan
  ART:  '#ff6b9d',  // pink
  CAR:  '#ffb74d',  // orange
  CORE: '#ffd700',  // gold
};

// ============================================================
//   TALENT NODE DEFINITIONS (Proper Tree Graph)
// ============================================================
// ============================================================
//   TALENT NODE DEFINITIONS (Proper Tree Graph — 7 Tiers)
// ============================================================
const TALENT_DEFINITIONS = [
  // --- TIER 0: ROOT (Row 0) ---
  { id: 'root', name: 'Despertar da Sombra', desc: 'O início de sua jornada. Todas as sombras se originam deste ponto.', cost: 0, type: 'core', value: 0, req: [], attr: 'CORE', position: { col: 4, row: 0 }, icon: '🌑', tier: 0 },

  // --- TIER 1: BASES (Row 1) ---
  { id: 'for_t1', name: 'Músculos Densos', desc: '+2% Dano em Chefes', cost: 1, type: 'boss_damage', value: 0.02, req: ['root'], attr: 'FOR', position: { col: 2, row: 1 }, icon: '💪', tier: 1 },
  { id: 'int_t1', name: 'Mente Clara',    desc: '+2% XP em Quests',  cost: 1, type: 'quest_xp', value: 0.02, req: ['root'], attr: 'INT', position: { col: 3, row: 1 }, icon: '🧠', tier: 1 },
  { id: 'ave_t1', name: 'Passos Leves',   desc: '+2% Ouro Dropado',  cost: 1, type: 'gold_drop', value: 0.02, req: ['root'], attr: 'AVE', position: { col: 4, row: 1 }, icon: '🗡️', tier: 1 },
  { id: 'art_t1', name: 'Mãos Precisas',  desc: '+2% XP de Atributo', cost: 1, type: 'attr_xp',  value: 0.02, req: ['root'], attr: 'ART', position: { col: 5, row: 1 }, icon: '🎨', tier: 1 },
  { id: 'car_t1', name: 'Presença Notável', desc: '+2% Chance Drop Duplo', cost: 1, type: 'double_drop', value: 0.02, req: ['root'], attr: 'CAR', position: { col: 6, row: 1 }, icon: '🎭', tier: 1 },

  // --- TIER 2: SPECIALIZATIONS (Row 2) ---
  { id: 'for_t2', name: 'Golpe Pesado',    desc: '+3% Dano em Chefes', cost: 2, type: 'boss_damage', value: 0.03, req: ['for_t1'], attr: 'FOR', position: { col: 1, row: 2 }, icon: '⚔️', tier: 2 },
  { id: 'int_t2', name: 'Foco Profundo',   desc: '+3% XP em Quests',  cost: 2, type: 'quest_xp', value: 0.03, req: ['int_t1'], attr: 'INT', position: { col: 3, row: 2 }, icon: '📚', tier: 2 },
  { id: 'ave_t2', name: 'Explorador Ágil', desc: '+3% Ouro Dropado',  cost: 2, type: 'gold_drop', value: 0.03, req: ['ave_t1'], attr: 'AVE', position: { col: 4, row: 2 }, icon: '🏃', tier: 2 },
  { id: 'art_t2', name: 'Toque de Mestre', desc: '+3% XP de Atributo', cost: 2, type: 'attr_xp',  value: 0.03, req: ['art_t1'], attr: 'ART', position: { col: 5, row: 2 }, icon: '🎭', tier: 2 },
  { id: 'car_t2', name: 'Sussurros Sedutores', desc: '+3% Chance Drop Duplo', cost: 2, type: 'double_drop', value: 0.03, req: ['car_t1'], attr: 'CAR', position: { col: 7, row: 2 }, icon: '✨', tier: 2 },

  // --- TIER 3: HYBRIDS (Row 3) ---
  { id: 'war_t3', name: 'Mente Marcial', desc: '+6% Dano Boss & XP Quest', cost: 3, type: 'boss_damage', value: 0.06, req: ['for_t1', 'int_t1'], attr: 'FOR', position: { col: 2, row: 3 }, icon: '🛡️', tier: 3 },
  { id: 'tra_t3', name: 'Mercador Viajante', desc: '+6% Ouro & Drop Duplo', cost: 3, type: 'gold_drop', value: 0.06, req: ['ave_t1', 'car_t1'], attr: 'AVE', position: { col: 6, row: 3 }, icon: '⚖️', tier: 3 },
  { id: 'cre_t3', name: 'Visionário Arcano', desc: '+6% Attr XP & XP Quest', cost: 3, type: 'attr_xp', value: 0.06, req: ['int_t1', 'art_t1'], attr: 'ART', position: { col: 4, row: 3 }, icon: '🧿', tier: 3 },

  // --- TIER 4: ADVANCED EXTENSIONS (Row 4) ---
  { id: 'for_t4', name: 'Força Titânica',   desc: '+5% Dano em Chefes', cost: 3, type: 'boss_damage', value: 0.05, req: ['for_t2'], attr: 'FOR', position: { col: 0, row: 4 }, icon: '🧱', tier: 4 },
  { id: 'int_t4', name: 'Sábio Imortal',    desc: '+5% XP em Quests',  cost: 3, type: 'quest_xp', value: 0.05, req: ['int_t2'], attr: 'INT', position: { col: 3, row: 4 }, icon: '🔮', tier: 4 },
  { id: 'ave_t4', name: 'Caminhante do Abismo', desc: '+5% Ouro Dropado',  cost: 3, type: 'gold_drop', value: 0.05, req: ['ave_t2'], attr: 'AVE', position: { col: 4, row: 4 }, icon: '🌪️', tier: 4 },
  { id: 'art_t4', name: 'Obra Prima',       desc: '+5% XP de Atributo', cost: 3, type: 'attr_xp',  value: 0.05, req: ['art_t2'], attr: 'ART', position: { col: 5, row: 4 }, icon: '🏛️', tier: 4 },
  { id: 'car_t4', name: 'Líder de Culto',   desc: '+5% Chance Drop Duplo', cost: 3, type: 'double_drop', value: 0.05, req: ['car_t2'], attr: 'CAR', position: { col: 8, row: 4 }, icon: '👑', tier: 4 },

  // --- TIER 5: LEGENDARY PATHS (Row 5) ---
  { id: 'for_t5', name: 'Soberano da Guerra', desc: '+10% Dano Boss', cost: 4, type: 'boss_damage', value: 0.10, req: ['for_t4', 'war_t3'], attr: 'FOR', position: { col: 1, row: 5 }, icon: '🌋', tier: 5 },
  { id: 'int_t5', name: 'Arquivista do Vazio', desc: '+10% XP Quest', cost: 4, type: 'quest_xp', value: 0.10, req: ['int_t4', 'cre_t3'], attr: 'INT', position: { col: 3, row: 5 }, icon: '📜', tier: 5 },
  { id: 'ave_t5', name: 'Nômade Estelar',     desc: '+10% Ouro Drop',  cost: 4, type: 'gold_drop', value: 0.10, req: ['ave_t4', 'tra_t3'], attr: 'AVE', position: { col: 5, row: 5 }, icon: '✨', tier: 5 },
  { id: 'art_t5', name: 'Mestre da Realidade', desc: '+10% Attr XP',   cost: 4, type: 'attr_xp',  value: 0.10, req: ['art_t4', 'cre_t3'], attr: 'ART', position: { col: 7, row: 5 }, icon: '💎', tier: 5 },


  // --- TIER 6: MYTHIC CONVERGENCE (Row 6) ---
  { id: 'ult_1', name: 'Avatar do Vazio', desc: '+15% All Stats (XP/Gold/Dmg)', cost: 5, type: 'quest_xp', value: 0.15, req: ['for_t5', 'int_t5'], attr: 'CORE', position: { col: 2, row: 6 }, icon: '🌌', tier: 6 },
  { id: 'ult_2', name: 'Deus da Prosperidade', desc: '+15% All Stats (XP/Gold/Dmg)', cost: 5, type: 'gold_drop', value: 0.15, req: ['ave_t5', 'art_t5'], attr: 'CORE', position: { col: 6, row: 6 }, icon: '💠', tier: 6 },

  // --- TIER 7: THE SINGULARITY (Row 7) ---
  { id: 'singular_root', name: 'A Singularidade', desc: 'O ápice da existência Shadow.\n+25% Multiplicador Final.', cost: 10, type: 'quest_xp', value: 0.25, req: ['ult_1', 'ult_2'], attr: 'CORE', position: { col: 4, row: 7 }, icon: '👁️', tier: 7 },
];

// Connection edges (Calculated between Tier requirements)
const EDGES = TALENT_DEFINITIONS
  .filter(s => s.req && s.req.length > 0)
  .flatMap(s => s.req.map(rId => ({ from: rId, to: s.id })));

// ============================================================
//   RUNTIME STATE
// ============================================================
let _nodes       = [];
let _skillPoints = 5;

function _syncFromState() {
  const state = loadState();
  _skillPoints  = state.player.skill_points ?? 5;
  const saved   = state.player.talents ?? {};

  // BALANCE FIX: If player has 10 unspent points and no talents bought, force reset to 5
  if (_skillPoints === 10 && Object.keys(saved).length === 0) {
    _skillPoints = 5;
    state.player.skill_points = 5;
    saveState(state);
  }

  _nodes = TALENT_DEFINITIONS.map(def => ({
    ...def,
    // THE ROOT IS ALWAYS PURCHASED BY DEFAULT
    status: (def.id === 'root') ? 'purchased' : (saved[def.id] ?? (def.req.length === 0 ? 'available' : 'locked')),
  }));

  // Re-verify availability for all locked nodes
  _nodes.forEach(n => {
    if (n.status === 'locked' && n.id !== 'root') {
      const allDepsOk = n.req.every(rId => _getNode(rId)?.status === 'purchased');
      if (allDepsOk) n.status = 'available';
    }
  });
}

function _syncToState() {
  const state = loadState();
  state.player.skill_points = _skillPoints;

  // Collect purchased node IDs from the live _nodes array
  const purchasedIds = _nodes
    .filter(n => n.status === 'purchased')
    .map(n => n.id);

  // Calculate and persist talent bonuses
  const bonuses = calculateSkillModifiers(purchasedIds, TALENT_DEFINITIONS);
  state.player.talentBonuses = bonuses;

  // Legacy compatibility: xpMultiplier mapped to quest_xp
  state.player.xpMultiplier = bonuses.questXpMulti;

  state.player.talents = {};
  _nodes.forEach(n => { state.player.talents[n.id] = n.status; });

  saveState(state);
  renderHUD(state);
}

function _getNode(id) { return _nodes.find(n => n.id === id) ?? null; }

// ============================================================
//   PURCHASE ENGINE
// ============================================================
export function purchaseTalent(nodeId) {
  const node = _getNode(nodeId);
  if (!node) return;

  if (node.status === 'locked') {
    showToast('🔒 Desbloqueie os pré-requisitos primeiro.', 'info', 2000);
    return;
  }
  if (node.status === 'purchased') {
    showToast('✅ Habilidade já comprada.', 'info', 1500);
    return;
  }
  if (_skillPoints < node.cost) {
    showToast(`💠 Pontos insuficientes! Precisa de ${node.cost} SK, você tem ${_skillPoints}.`, 'damage', 3000);
    return;
  }

  _skillPoints -= node.cost;
  node.status   = 'purchased';

  // Unlock dependents
  _nodes
    .filter(n => n.req.includes(nodeId) && n.status === 'locked')
    .forEach(n => {
      if (n.req.every(rId => _getNode(rId)?.status === 'purchased')) n.status = 'available';
    });

  _syncToState();
  playSound('quest_done');
  showToast(`✨ ${node.name} desbloqueado!`, 'xp', 3000);
  renderTalents();
}

// ============================================================
//   TOOLTIP
// ============================================================
function _showTooltip(node, e) {
  const tip = document.getElementById('talent-tooltip');
  if (!tip) return;

  const branchLabel = node.attr;
  const color       = BRANCH_COLORS[node.attr] ?? '#ffd700';

  const statusHTML = {
    purchased: `<span class="talent-tooltip__status talent-tt-purchased">✅ Comprado</span>`,
    available: `<span class="talent-tooltip__status talent-tt-available">💠 Custo: ${node.cost} SK</span>`,
    locked:    `<span class="talent-tooltip__status talent-tt-locked">🔒 Bloqueado</span>`,
  }[node.status];

  tip.innerHTML = `
    <div class="talent-tooltip__title" style="color:${color}">${node.icon} ${node.name}</div>
    <div class="talent-tooltip__branch" style="color:${color}99">[TIER ${node.tier} - ${branchLabel}]</div>
    <div class="talent-tooltip__desc">${node.desc.replace(/\n/g, '<br>')}</div>
    <div class="talent-tooltip__effect">Tier ${node.tier} ${node.attr}</div>
    ${statusHTML}
  `;

  _positionTooltip(e);
  tip.classList.add('talent-tooltip--visible');
  tip.removeAttribute('aria-hidden');
}

function _positionTooltip(e) {
  const tip = document.getElementById('talent-tooltip');
  if (!tip || !tip.classList.contains('talent-tooltip--visible')) return;
  const margin = 14;
  const tw = tip.offsetWidth  || 248;
  const th = tip.offsetHeight || 160;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - margin;
  if (y + th > window.innerHeight - 8) y = e.clientY - th - margin;
  tip.style.left = `${x}px`;
  tip.style.top  = `${y}px`;
}

function _hideTooltip() {
  const tip = document.getElementById('talent-tooltip');
  if (tip) {
    tip.classList.remove('talent-tooltip--visible');
    tip.setAttribute('aria-hidden', 'true');
  }
}

// ============================================================
//   SVG CONNECTIONS
// ============================================================
function _drawConnections(svgEl, gridEl) {
  const gridRect = gridEl.getBoundingClientRect();

  svgEl.innerHTML = `
    <defs>
      <filter id="talent-line-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  `;

  EDGES.forEach(edge => {
    const fromEl = document.getElementById(`talent-node-${edge.from}`);
    const toEl   = document.getElementById(`talent-node-${edge.to}`);
    if (!fromEl || !toEl) return;

    const fr = fromEl.getBoundingClientRect();
    const tr = toEl.getBoundingClientRect();

    const x1 = (fr.left + fr.width  / 2 - gridRect.left).toFixed(1);
    const y1 = (fr.top  + fr.height / 2 - gridRect.top ).toFixed(1);
    const x2 = (tr.left + tr.width  / 2 - gridRect.left).toFixed(1);
    const y2 = (tr.top  + tr.height / 2 - gridRect.top ).toFixed(1);

    const fromNode = _getNode(edge.from);
    const toNode   = _getNode(edge.to);
    const isActive = fromNode?.status === 'purchased';
    const color    = BRANCH_COLORS[toNode?.attr ?? 'FOR'];

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke-linecap', 'round');

    if (isActive) {
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke-dasharray', '8 5');
      line.setAttribute('filter', 'url(#talent-line-glow)');
      line.classList.add('talent-line--active');
    } else {
      line.setAttribute('stroke', '#2a2550');
      line.setAttribute('stroke-width', '1.5');
    }

    svgEl.appendChild(line);
  });
}

// ============================================================
//   BUILD NODE ELEMENT
// ============================================================
function _buildNodeEl(node) {
  const el       = document.createElement('div');
  el.id          = `talent-node-${node.id}`;
  el.className   = `talent-node talent-node--${node.status}`;
  el.dataset.nodeId = node.id;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', node.status === 'locked' ? '-1' : '0');
  el.setAttribute('aria-label',
    `${node.name} — ${node.status === 'purchased' ? 'Comprado'
      : node.status === 'available' ? `Disponível, custo ${node.cost} SK`
      : 'Bloqueado'}`
  );

  // CSS Grid placement (CSS Grid is 1-indexed)
  el.style.gridColumn = node.position.col + 1;
  el.style.gridRow    = node.position.row + 1;
  el.style.setProperty('--branch-color', BRANCH_COLORS[node.attr] ?? '#ffd700');

  el.innerHTML = `
    <span class="talent-node__icon" aria-hidden="true">${node.icon}</span>
    <span class="talent-node__name">${node.name}</span>
    ${node.status === 'locked'    ? '<span class="talent-lock-icon"       aria-hidden="true">🔒</span>' : ''}
    ${node.status === 'purchased' ? '<span class="talent-purchased-check" aria-hidden="true">✓</span>'  : ''}
  `;

  // Interactions
  el.addEventListener('click',   () => { playSound('ui_click'); purchaseTalent(node.id); });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playSound('ui_click'); purchaseTalent(node.id); }
  });
  el.addEventListener('mouseenter', ev => _showTooltip(node, ev));
  el.addEventListener('mousemove',  ev => _positionTooltip(ev));
  el.addEventListener('mouseleave', _hideTooltip);

  return el;
}

// ============================================================
//   MAIN RENDER
// ============================================================
export function renderTalents() {
  _syncFromState();

  const gridEl = document.getElementById('talent-grid');
  const svgEl  = document.getElementById('talent-svg');
  const skEl   = document.getElementById('talent-sk-value');

  if (!gridEl || !svgEl) return;

  if (skEl) {
    skEl.textContent = _skillPoints;
    skEl.classList.remove('talent-sk-value--flash');
    void skEl.offsetWidth;
    skEl.classList.add('talent-sk-value--flash');
  }

  gridEl.innerHTML = '';
  _nodes.forEach(node => gridEl.appendChild(_buildNodeEl(node)));

  // Draw SVG after layout paint
  requestAnimationFrame(() => _drawConnections(svgEl, gridEl));

  // Render Active Status Panel
  renderStatusPanel();
}

// ============================================================
//   INIT (called by app.js router)
// ============================================================
export function initTalents() {
  renderTalents();
}

/**
 * Calcula os multiplicadores finais baseados nas habilidades desbloqueadas.
 * @param {Array<string>} unlockedSkillIds Array com os IDs desbloqueados (ex: ['for_t1', 'int_t2'])
 * @param {Array} skillTreeDef O array de definição da árvore
 * @returns {Object} Objeto contendo os multiplicadores finais.
 */
export function calculateSkillModifiers(unlockedSkillIds, skillTreeDef) {
  const modifiers = {
    bossDamageMulti: 1.0,
    questXpMulti: 1.0,
    goldDropMulti: 1.0,
    attrXpMulti: 1.0,
    doubleDropChance: 0.0 // Base é 0 (chance percentual adicional)
  };

  if (!unlockedSkillIds || !Array.isArray(unlockedSkillIds)) return modifiers;

  unlockedSkillIds.forEach(id => {
    const skill = skillTreeDef.find(s => s.id === id);
    if (skill) {
      switch (skill.type) {
        case 'boss_damage': modifiers.bossDamageMulti += skill.value; break;
        case 'quest_xp':    modifiers.questXpMulti += skill.value; break;
        case 'gold_drop':   modifiers.goldDropMulti += skill.value; break;
        case 'attr_xp':     modifiers.attrXpMulti += skill.value; break;
        case 'double_drop': modifiers.doubleDropChance += skill.value; break;
      }
    }
  });

  return modifiers;
}

// ============================================================
//   MASTER MODIFIER ENGINE
//   Combines Talent Tree bonuses + Equipped Memory Slot bonuses
// ============================================================

/**
 * Returns the combined modifier object from:
 *   - Purchased talent nodes
 *   - Equipped memory slots (from player.memory_slots in state)
 *
 * Formula: each bonus is additive on top of the 1.0 base multiplier.
 * @param {Object} state - Current app state (from loadState())
 * @returns {Object} modifiers
 */
export function getActiveModifiers(state) {
  // 1. Talent bonuses (pre-computed and stored in state, or recalculated live)
  const purchasedIds = Object.keys(state.player?.talents || {})
    .filter(k => state.player.talents[k] === 'purchased');
  const talentMods = state.player?.talentBonuses
    ?? calculateSkillModifiers(purchasedIds, TALENT_DEFINITIONS);

  // 2. Accumulate equipped memory slot bonuses using MEMORY_SLOTS definitions
  const equippedSlots = state.player?.memory_slots ?? {};

  let slotXpBonus      = 0;  // additive to questXpMulti
  let slotAttrBonus    = 0;  // additive to attrXpMulti (generic)
  let slotDropRateBonus= 0;  // additive to doubleDropChance

  for (const slot of MEMORY_SLOTS) {
    const isEquipped = equippedSlots[slot.key] != null;
    if (!isEquipped) continue;

    switch (slot.bonus_type) {
      case 'xp_multiplier':
        slotXpBonus += slot.bonus_value;      // e.g. +0.10
        break;
      case 'attr_xp_multiplier':
        slotAttrBonus += slot.bonus_value;    // e.g. +0.15 per slot
        break;
      case 'drop_rate_bonus':
        slotDropRateBonus += slot.bonus_value; // e.g. +0.05
        break;
    }
  }

  // 3. Merge: talent base + slot additions
  const combined = {
    bossDamageMulti:  talentMods.bossDamageMulti  ?? 1.0,
    questXpMulti:     (talentMods.questXpMulti    ?? 1.0) + slotXpBonus,
    goldDropMulti:    talentMods.goldDropMulti    ?? 1.0,
    attrXpMulti:      (talentMods.attrXpMulti     ?? 1.0) + slotAttrBonus,
    doubleDropChance: (talentMods.doubleDropChance ?? 0.0) + slotDropRateBonus,
  };

  console.debug(
    `[ModifierEngine] XP×${combined.questXpMulti.toFixed(2)} ` +
    `Attr×${combined.attrXpMulti.toFixed(2)} ` +
    `Gold×${combined.goldDropMulti.toFixed(2)} ` +
    `Boss×${combined.bossDamageMulti.toFixed(2)} ` +
    `Drop+${(combined.doubleDropChance * 100).toFixed(1)}%`
  );

  return combined;
}

// ============================================================
//   STATUS PANEL RENDER
// ============================================================

/**
 * Renders the Active Status Panel inside #talent-status-panel.
 * Shows combined multipliers from talents + equipment.
 */
export function renderStatusPanel() {
  const panel = document.getElementById('talent-status-panel');
  if (!panel) return;

  const state = loadState();
  if (!state?.player) return;

  const mods = getActiveModifiers(state);

  const xpBonus   = Math.round((mods.questXpMulti   - 1) * 100);
  const attrBonus = Math.round((mods.attrXpMulti    - 1) * 100);
  const goldBonus = Math.round((mods.goldDropMulti  - 1) * 100);
  const bossBonus = Math.round((mods.bossDamageMulti - 1) * 100);
  const dropBonus = (mods.doubleDropChance * 100).toFixed(1);

  const row = (icon, label, value, color, unit = '%') =>
    `<div class="talent-status__row">
      <span class="talent-status__icon">${icon}</span>
      <span class="talent-status__label">${label}</span>
      <span class="talent-status__value" style="color:${color}">${value > 0 ? '+' : ''}${value}${unit}</span>
    </div>`;

  panel.innerHTML = `
    <div class="talent-status__header">📊 Bônus Ativos</div>
    <div class="talent-status__grid">
      ${row('⭐', 'XP de Quests',    xpBonus,   'var(--color-xp)')}
      ${row('📚', 'XP de Atributo',  attrBonus, 'var(--color-int)')}
      ${row('💰', 'Ouro Drop',       goldBonus, 'var(--color-gold)')}
      ${row('⚔️', 'Dano em Chefes',  bossBonus, 'var(--color-danger)')}
      ${row('🌠', 'Chance Drop 2×', dropBonus, 'var(--color-ave)')}
    </div>
  `;
}

export { TALENT_DEFINITIONS };
