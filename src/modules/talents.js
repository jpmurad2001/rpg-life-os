/**
 * RPG Life OS v2.3 Diamond — Habilidades de Aspecto (Talent Tree)
 * ================================================================
 * 7 talent nodes arranged in 3 branches (INT / ART / AVE) on a
 * 7-column × 3-row CSS grid with an SVG overlay for connections.
 */

import { loadState, saveState }  from '../engine/core.js';
import { showToast, renderHUD }  from '../engine/gamification.js';
import { playClick, playXpGain } from '../engine/audio.js';

// ============================================================
//   BRANCH COLORS
// ============================================================
const BRANCH_COLORS = {
  core: '#ffd700',  // gold
  INT:  '#9c7cf4',  // violet
  ART:  '#ff6b9d',  // pink
  AVE:  '#4fc3f7',  // cyan
  FOR:  '#ff5252',  // red
  CAR:  '#ffb74d',  // orange
};

// ============================================================
//   TALENT NODE DEFINITIONS (immutable template)
// ============================================================
const TALENT_DEFINITIONS = [
  // ── CORE ROOT ─────────────────────────────────────────────
  {
    id: 'root', name: 'Despertar da Sombra',
    description: 'O primeiro passo no caminho das trevas.\nO portal para todos os aspectos do poder.',
    icon: '🌑', cost: 0, deps: [], branch: 'core',
    position: { col: 3, row: 0 },
    effect: { type: 'none', label: 'Ponto de partida — todos os caminhos começam aqui' },
  },
  // ── INT BRANCH ────────────────────────────────────────────
  {
    id: 'int_1', name: 'Lente do Conhecimento',
    description: 'Sua mente absorve informações com mais eficiência.\nO aprendizado se torna instinto.',
    icon: '🧠', cost: 2, deps: ['root'], branch: 'INT',
    position: { col: 1, row: 1 },
    effect: { type: 'xpMultiplier', value: 1.05, label: '+5% XP em todas as missões' },
  },
  {
    id: 'int_2', name: 'Tomo Arcano',
    description: 'Conhecimento ancestral flui por você como água.\nVocê vê padrões onde outros veem caos.',
    icon: '📚', cost: 3, deps: ['int_1'], branch: 'INT',
    position: { col: 0, row: 2 },
    effect: { type: 'xpMultiplier', value: 1.10, label: '+10% XP total acumulado' },
  },
  // ── ART BRANCH ────────────────────────────────────────────
  {
    id: 'art_1', name: 'Toque do Criador',
    description: 'Suas criações ganham vida própria.\nA intenção molda a realidade ao redor.',
    icon: '🎨', cost: 2, deps: ['root'], branch: 'ART',
    position: { col: 3, row: 1 },
    effect: { type: 'placeholder', label: 'Amplia o XP de missões ART — Em breve' },
  },
  {
    id: 'art_2', name: 'Voz das Sombras',
    description: 'A arte se torna linguagem. As sombras obedecem\nà melodia que você compõe.',
    icon: '🎭', cost: 4, deps: ['art_1'], branch: 'ART',
    position: { col: 3, row: 2 },
    effect: { type: 'placeholder', label: 'Desbloqueia missões de criação especiais — Em breve' },
  },
  // ── AVE BRANCH ────────────────────────────────────────────
  {
    id: 'ave_1', name: 'Pulmões de Ferro',
    description: 'Seu corpo endurece. Cada treino forja\nalgo além da carne.',
    icon: '⚔️', cost: 2, deps: ['root'], branch: 'AVE',
    position: { col: 5, row: 1 },
    effect: { type: 'placeholder', label: 'Reduz custo de HP em treinos — Em breve' },
  },
  {
    id: 'ave_2', name: 'Fúria da Penumbra',
    description: 'A sombra em você desperta durante o combate.\nVocê nunca para. Nunca recua.',
    icon: '🌪️', cost: 3, deps: ['ave_1'], branch: 'AVE',
    position: { col: 6, row: 2 },
    effect: { type: 'placeholder', label: '+Resistência nos Bosses — Em breve' },
  },
  // ── FOR BRANCH ──────────────────────────────────────────── (New v2.6)
  {
    id: 'for_1', name: 'Sangue de Ferro',
    description: 'Seu corpo se torna um templo de determinação.\nA fadiga é apenas um rumor.',
    icon: '💪', cost: 2, deps: ['root'], branch: 'FOR',
    position: { col: 2, row: 1 },
    effect: { type: 'placeholder', label: '+Dano base contra Bosses — Em breve' },
  },
  {
    id: 'for_2', name: 'Colosso de Sombras',
    description: 'Você se torna uma força da natureza.\nNada pode mover quem já é a própria montanha.',
    icon: '🧱', cost: 4, deps: ['for_1'], branch: 'FOR',
    position: { col: 2, row: 2 },
    effect: { type: 'placeholder', label: 'Imunidade a penalidades de HP — Em breve' },
  },
  // ── CAR BRANCH ──────────────────────────────────────────── (New v2.6)
  {
    id: 'car_1', name: 'Voz de Comando',
    description: 'Suas palavras carregam o peso do destino.\nTodos param para ouvir o som do Vazio.',
    icon: '🎭', cost: 2, deps: ['root'], branch: 'CAR',
    position: { col: 4, row: 1 },
    effect: { type: 'placeholder', label: '+Chances de Drop raro em Quests — Em breve' },
  },
  {
    id: 'car_2', name: 'Presença Soberana',
    description: 'Sua aura é tão vasta que eclipsa a própria luz.\nInimigos hesitam antes do primeiro golpe.',
    icon: '✨', cost: 4, deps: ['car_1'], branch: 'CAR',
    position: { col: 4, row: 2 },
    effect: { type: 'placeholder', label: 'Multiplicador de Ouro passivo — Em breve' },
  },
];

// Connection edges (for SVG drawing)
const EDGES = [
  { from: 'root',  to: 'int_1' },
  { from: 'root',  to: 'art_1' },
  { from: 'root',  to: 'ave_1' },
  { from: 'root',  to: 'for_1' },
  { from: 'root',  to: 'car_1' },
  { from: 'int_1', to: 'int_2' },
  { from: 'art_1', to: 'art_2' },
  { from: 'ave_1', to: 'ave_2' },
  { from: 'for_1', to: 'for_2' },
  { from: 'car_1', to: 'car_2' },
];

// ============================================================
//   RUNTIME STATE
// ============================================================
let _nodes       = [];
let _skillPoints = 10;

function _syncFromState() {
  const state = loadState();
  _skillPoints  = state.player.skill_points ?? 10;
  const saved   = state.player.talents ?? {};

  _nodes = TALENT_DEFINITIONS.map(def => ({
    ...def,
    status: saved[def.id] ?? (def.deps.length === 0 ? 'purchased' : 'locked'),
  }));

  // On first use (no saved talents): unlock nodes whose deps are already purchased
  if (Object.keys(saved).length === 0) {
    _nodes.forEach(n => {
      if (n.status === 'locked') {
        const allDepsOk = n.deps.every(d => _getNode(d)?.status === 'purchased');
        if (allDepsOk) n.status = 'available';
      }
    });
  }
}

function _syncToState() {
  const state = loadState();
  state.player.skill_points = _skillPoints;
  state.player.xpMultiplier = _nodes
    .filter(n => n.status === 'purchased' && n.effect.type === 'xpMultiplier')
    .reduce((acc, n) => acc * (n.effect.value ?? 1), 1.0);
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
    .filter(n => n.deps.includes(nodeId) && n.status === 'locked')
    .forEach(n => {
      if (n.deps.every(d => _getNode(d)?.status === 'purchased')) n.status = 'available';
    });

  _syncToState();
  playXpGain();
  showToast(`✨ ${node.name} desbloqueado!`, 'xp', 3000);
  renderTalents();
}

// ============================================================
//   TOOLTIP
// ============================================================
function _showTooltip(node, e) {
  const tip = document.getElementById('talent-tooltip');
  if (!tip) return;

  const branchLabel = { core: 'NÚCLEO', INT: 'INT', ART: 'ART', AVE: 'AVE', FOR: 'FOR', CAR: 'CAR' }[node.branch] ?? node.branch;
  const color       = BRANCH_COLORS[node.branch] ?? '#ffd700';

  const statusHTML = {
    purchased: `<span class="talent-tooltip__status talent-tt-purchased">✅ Comprado</span>`,
    available: `<span class="talent-tooltip__status talent-tt-available">💠 Custo: ${node.cost} SK</span>`,
    locked:    `<span class="talent-tooltip__status talent-tt-locked">🔒 Bloqueado</span>`,
  }[node.status];

  tip.innerHTML = `
    <div class="talent-tooltip__title" style="color:${color}">${node.icon} ${node.name}</div>
    <div class="talent-tooltip__branch" style="color:${color}99">[${branchLabel}]</div>
    <div class="talent-tooltip__desc">${node.description.replace(/\n/g, '<br>')}</div>
    <div class="talent-tooltip__effect">${node.effect.label}</div>
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
    const color    = BRANCH_COLORS[toNode?.branch ?? 'core'];

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
  el.style.setProperty('--branch-color', BRANCH_COLORS[node.branch] ?? '#ffd700');

  el.innerHTML = `
    <span class="talent-node__icon" aria-hidden="true">${node.icon}</span>
    <span class="talent-node__name">${node.name}</span>
    ${node.status === 'locked'    ? '<span class="talent-lock-icon"       aria-hidden="true">🔒</span>' : ''}
    ${node.status === 'purchased' ? '<span class="talent-purchased-check" aria-hidden="true">✓</span>'  : ''}
  `;

  // Interactions
  el.addEventListener('click',   () => { playClick(); purchaseTalent(node.id); });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playClick(); purchaseTalent(node.id); }
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
}

// ============================================================
//   INIT (called by app.js router)
// ============================================================
export function initTalents() {
  renderTalents();
}
