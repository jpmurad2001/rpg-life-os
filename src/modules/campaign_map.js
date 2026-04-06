/**
 * RPG Life OS — Campaign Map Module (v1.3)
 * =========================================
 * O Mapa do Pesadelo: Sistema de Modo Campanha.
 * Renderiza um mapa visual interativo com nós (encounters),
 * conexões SVG dinâmicas e lógica de progressão sequencial.
 */

import {
  getUserBossMaps, getBossMap, saveBossMap,
  addNodeToMap, completeNodeOnMap,
  getLootTable, addToInventory,
} from '../firebase/db.js';

import { auth } from '../firebase/firebase.js';

import {
  renderHUD, showToast, showLevelUp, openModal, showMemoryObtainedOverlay,
} from '../engine/gamification.js';

import {
  loadState, saveState, awardXP, awardAttributeXP, checkAchievements,
} from '../engine/core.js';

import { calcRank, formatDropResult, rollQuestDrop } from '../engine/drop_engine.js';
import { playBossAttack, playBossDefeat } from '../engine/audio.js';
import { MAPS_GALLERY, BOSS_GALLERY } from '../config/assets_gallery.js';

// ============================================================
//   STATE LOCAL
// ============================================================
let _currentMap           = null;   // Objeto do mapa sendo exibido
let _allMaps              = [];     // Lista de todos os mapas do usuário
let _resizeObserver       = null;   // Para re-renderizar SVG no resize
let _lastCompletedNodeIdx = -1;     // Índice do nó recém-concluído para animação da linha

const BOSS_SPRITES = {
  dragon: '🐉', golem: '🗿', witch: '🧙',
  demon: '😈', giant: '👹', shadow: '👤',
};

const ATTR_META = {
  INT: { icon: '🧠', label: 'INT' },
  ART: { icon: '🎨', label: 'ART' },
  AVE: { icon: '🗡️', label: 'AVE' },
  FOR: { icon: '💪', label: 'FOR' },
  CAR: { icon: '🎭', label: 'CAR' },
};

// ============================================================
//   INIT
// ============================================================
let _initialized = false;

export async function initCampaignMap() {
  if (!_initialized) {
    // Botão de criar nova campanha
    document.getElementById('btn-new-campaign')
      ?.addEventListener('click', openNewCampaignModal);

    // Botões dinâmicos (back + add-node) via event delegation no container pai
    // que sempre existe no DOM, evitando o problema de botoes criados depois do init
    const section = document.getElementById('view-bosses') ??
                    document.querySelector('[data-view="bosses"]') ??
                    document.body;

    section.addEventListener('click', (e) => {
      if (e.target.closest('#btn-back-to-campaigns')) {
        showCampaignList();
        // Scroll para o topo da section de campanhas
        document.getElementById('campaign-list-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (e.target.closest('#btn-add-node')) {
        if (_currentMap) openAddNodeModal(_currentMap);
      }
    });

    _initialized = true;
  }

  // Sempre re-renderizar a lista ao entrar na view
  await renderCampaignList();
}

// ============================================================
//   LISTA DE CAMPANHAS
// ============================================================
async function renderCampaignList() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const list = document.getElementById('campaign-list');
  if (!list) return;

  list.innerHTML = '<div class="empty-state">🌑 Carregando campanhas...</div>';

  try {
    _allMaps = await getUserBossMaps(uid);
  } catch (e) {
    console.warn('[CampaignMap] Erro ao carregar mapas:', e);
    _allMaps = [];
  }

  list.innerHTML = '';

  if (_allMaps.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1; padding: var(--space-7);">
        <div style="font-size:2.5rem; margin-bottom:var(--space-4); animation: map_float 3s ease-in-out infinite;">🗺️</div>
        <p style="font-family:var(--font-pixel); font-size:var(--fs-xs); text-align:center; line-height:2;">
          Nenhuma campanha invocada.<br/>O Pesadelo aguarda o seu comando.
        </p>
      </div>
      <style>
        @keyframes map_float {
          0%,100%{transform:translateY(0);}
          50%{transform:translateY(-10px);}
        }
      </style>
    `;
    return;
  }

  // Ordenar: ativas primeiro
  const sorted = [..._allMaps].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === 'active' ? -1 : 1;
  });

  for (const map of sorted) {
    list.appendChild(buildCampaignCard(map));
  }
}

function buildCampaignCard(map) {
  const card = document.createElement('div');
  card.className = `campaign-card${map.status === 'completed' ? ' campaign-card--defeated' : ''}`;
  card.dataset.mapId = map.map_id;

  const nodes     = map.nodes ?? [];
  const total     = nodes.length;
  const done      = nodes.filter(n => n.status === 'completed').length;
  const hpMax     = map.boss_hp_max     ?? 1000;
  const hpCurrent = map.boss_hp_current ?? hpMax;
  const hpPct     = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100));
  const sprite    = BOSS_SPRITES[map.boss_sprite] ?? '👾';

  // Thumbnail — background do mapa, sprite do boss, ou emoji placeholder
  let thumbHTML;
  if (map.background_image_url) {
    thumbHTML = `
      <div class="campaign-card__thumb-wrap">
        <img class="campaign-card__thumb" src="${map.background_image_url}" alt="Mapa ${map.name}" loading="lazy">
        ${map.boss_sprite_url ? `<img class="boss-sprite-card-overlay" src="${map.boss_sprite_url}" alt="${map.name}">` : ''}
      </div>`;
  } else if (map.boss_sprite_url) {
    thumbHTML = `<div class="campaign-card__thumb-placeholder"><img class="boss-sprite-card-thumb" src="${map.boss_sprite_url}" alt="${map.name}"></div>`;
  } else {
    thumbHTML = `<div class="campaign-card__thumb-placeholder">${sprite}</div>`;
  }

  card.innerHTML = `
    ${thumbHTML}
    <div class="campaign-card__info">
      <div class="campaign-card__name">${map.name}</div>
      <div class="campaign-card__desc">${map.description ?? ''}</div>
      <div class="campaign-card__meta">
        <div class="campaign-card__hp-wrap">
          <div class="campaign-card__hp-label">💀 HP ${Math.round(hpCurrent)} / ${hpMax}</div>
          <div class="campaign-card__hp-bar">
            <div class="campaign-card__hp-fill" style="width:${hpPct.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="campaign-card__nodes-badge">
          ${done}/${total} nós
        </div>
      </div>
    </div>
    <div class="campaign-card__action">
      ${map.status === 'completed'
        ? '<span style="font-size:1.5rem; font-family:var(--font-pixel); color:var(--color-hp-safe); font-size:var(--fs-xxs);">DERROTADO</span>'
        : '<button class="btn-rp btn-rp--ghost" style="font-size:var(--fs-xxs);">▶ Entrar</button>'
      }
    </div>
  `;

  // Clique: entrar no mapa
  if (map.status !== 'completed') {
    card.addEventListener('click', () => openCampaignMap(map.map_id));
  }

  return card;
}

// ============================================================
//   ABRIR MAPA
// ============================================================
async function openCampaignMap(mapId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Mostrar loading
  showCampaignMapView();
  document.getElementById('campaign-map-canvas').innerHTML = `
    <div class="map-empty-state">
      <div class="map-empty-state__icon">🌑</div>
      <div class="map-empty-state__text">Abrindo portal...</div>
    </div>
  `;

  // Carregar mapa atualizado
  try {
    _currentMap = await getBossMap(mapId);
  } catch (e) {
    showToast('⚠️ Erro ao carregar mapa.', 'info');
    showCampaignList();
    return;
  }

  if (!_currentMap) {
    showToast('⚠️ Mapa não encontrado.', 'info');
    showCampaignList();
    return;
  }

  renderCampaignMap(_currentMap);
}

function showCampaignMapView() {
  const listView = document.getElementById('campaign-list-view');
  const mapView  = document.getElementById('campaign-map-view');
  listView?.classList.add('hidden');
  mapView?.classList.remove('hidden');
}

function showCampaignList() {
  const listView = document.getElementById('campaign-list-view');
  const mapView  = document.getElementById('campaign-map-view');
  mapView?.classList.add('hidden');
  listView?.classList.remove('hidden');

  // Cleanup ResizeObserver
  if (_resizeObserver) {
    _resizeObserver.disconnect();
    _resizeObserver = null;
  }
  _currentMap = null;

  // Re-renderizar lista (dados podem ter mudado)
  renderCampaignList();
}

// ============================================================
//   RENDERIZAR O MAPA
// ============================================================
function renderCampaignMap(mapData) {
  updateBossTopbar(mapData);
  renderMapCanvas(mapData);
  updateNodeButton(mapData);
}

function updateBossTopbar(mapData) {
  const sprite  = BOSS_SPRITES[mapData.boss_sprite] ?? '👾';
  const hpMax   = mapData.boss_hp_max     ?? 1000;
  const hpCur   = mapData.boss_hp_current ?? hpMax;
  const hpPct   = Math.max(0, Math.min(100, (hpCur / hpMax) * 100));

  const nameEl    = document.getElementById('map-boss-name');
  const hpTextEl  = document.getElementById('map-boss-hp-text');
  const hpFillEl  = document.getElementById('map-boss-hp-fill');
  const spriteEl  = document.getElementById('map-boss-sprite');

  if (nameEl)   nameEl.textContent = mapData.name;
  if (spriteEl) {
    if (mapData.boss_sprite_url) {
      spriteEl.innerHTML = `<img class="boss-sprite-topbar" src="${mapData.boss_sprite_url}" alt="${mapData.name}">`;
    } else {
      spriteEl.textContent = sprite; // fallback emoji
    }
  }
  if (hpTextEl) hpTextEl.textContent = `${Math.round(hpCur)} / ${hpMax}`;
  if (hpFillEl) hpFillEl.style.width = `${hpPct.toFixed(1)}%`;
}

function renderMapCanvas(mapData) {
  const canvas = document.getElementById('campaign-map-canvas');
  if (!canvas) return;

  // Disconnect existing observer
  if (_resizeObserver) {
    _resizeObserver.disconnect();
    _resizeObserver = null;
  }

  // Background
  if (mapData.background_image_url) {
    canvas.style.backgroundImage = `url('${mapData.background_image_url}')`;
    canvas.classList.remove('campaign-map--no-image');
  } else {
    canvas.style.backgroundImage = '';
    canvas.classList.add('campaign-map--no-image');
  }

  // Clear previous content (keep SVG)
  canvas.querySelectorAll('.map-node, .map-empty-state, .map-defeated-banner').forEach(el => el.remove());

  const nodes = mapData.nodes ?? [];

  // Empty state
  if (nodes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'map-empty-state';
    empty.innerHTML = `
      <div class="map-empty-state__icon">⚔️</div>
      <div class="map-empty-state__text">Nenhum encontro mapeado.<br/>Adicione o primeiro nó para traçar o caminho.</div>
    `;
    canvas.appendChild(empty);
    renderSVGConnections(mapData); // still draw boss marker
    return;
  }

  // Render all nodes
  for (const node of nodes) {
    canvas.appendChild(buildNodeElement(node, mapData));
  }

  // Boss marker (fixed top-right area)
  canvas.appendChild(buildBossMarker(mapData));

  // Draw SVG connections — consome o índice de animação uma única vez
  requestAnimationFrame(() => {
    const animIdx = _lastCompletedNodeIdx;
    _lastCompletedNodeIdx = -1; // reset após consumo
    renderSVGConnections(mapData, animIdx);
  });

  // Observe resizes to redraw SVG lines
  _resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => renderSVGConnections(mapData));
  });
  _resizeObserver.observe(canvas);

  // Boss defeated overlay
  if (mapData.status === 'completed') {
    const banner = document.createElement('div');
    banner.className = 'map-defeated-banner';
    banner.innerHTML = `
      <div class="map-defeated-banner__title">⚔️ BOSS DERROTADO ⚔️</div>
      <div class="map-defeated-banner__sub">${mapData.name} foi conquistado!</div>
    `;
    canvas.appendChild(banner);
  }
}

function buildNodeElement(node, mapData) {
  const el = document.createElement('div');
  el.className = `map-node map-node--${node.status}`;
  el.style.left = `${node.x}%`;
  el.style.top  = `${node.y}%`;
  el.dataset.nodeId = node.id;

  const attrIcon = ATTR_META[node.attribute]?.icon ?? '⚔️';
  const isDone   = node.status === 'completed';
  const isActive = node.status === 'active';

  el.innerHTML = `
    <span class="map-node__icon">${isDone ? '✅' : isActive ? attrIcon : '🔒'}</span>
    <span class="map-node__label">${node.title}</span>
  `;

  // Tooltip on hover
  el.addEventListener('mouseenter', (e) => showNodeTooltip(e, node));
  el.addEventListener('mouseleave', hideNodeTooltip);

  // Clique apenas em nós ativos
  if (isActive && mapData.status !== 'completed') {
    el.addEventListener('click', () => handleNodeComplete(node, mapData));
  }

  return el;
}

function buildBossMarker(mapData) {
  const el = document.createElement('div');
  const sprite  = BOSS_SPRITES[mapData.boss_sprite] ?? '👾';
  const defeated = mapData.status === 'completed';

  // Usa posição salva (definida ao criar campanha) ou fallback
  const bossX = mapData.boss_x ?? 86;
  const bossY = mapData.boss_y ?? 16;

  el.className  = `map-node map-node--boss${defeated ? ' map-node--boss-defeated' : ''}`;
  el.style.left = `${bossX}%`;
  el.style.top  = `${bossY}%`;
  el.innerHTML = mapData.boss_sprite_url
    ? `<img class="boss-sprite-map-node" src="${mapData.boss_sprite_url}" alt="${mapData.name}">
       <span class="map-node__label">${defeated ? '\u2620\ufe0f DERROTADO' : '\ud83d\udca3 BOSS'}</span>`
    : `<span class="map-node__icon" style="font-size:1.8rem;">${sprite}</span>
       <span class="map-node__label">${defeated ? '\u2620\ufe0f DERROTADO' : '\ud83d\udca3 BOSS'}</span>`;

  // Tooltip ao hover do Boss (igual aos encounter nodes)
  el.addEventListener('mouseenter', (e) => showBossTooltip(e, mapData));
  el.addEventListener('mouseleave', hideNodeTooltip);

  return el;
}

function updateNodeButton(mapData) {
  const btn = document.getElementById('btn-add-node');
  if (!btn) return;
  btn.disabled = mapData.status === 'completed';
  btn.style.opacity = mapData.status === 'completed' ? '0.4' : '1';
}

// ============================================================
//   SVG CONNECTIONS
// ============================================================
function renderSVGConnections(mapData, justCompletedIdx = -1) {
  const canvas = document.getElementById('campaign-map-canvas');
  const svg    = document.getElementById('campaign-map-svg');
  if (!canvas || !svg) return;

  svg.innerHTML = '';

  const nodes = mapData.nodes ?? [];
  if (nodes.length === 0) return;

  const { width, height } = canvas.getBoundingClientRect();
  if (width === 0 || height === 0) return;

  // Boss position (uses stored boss_x/boss_y or fallback)
  const bossX = mapData.boss_x ?? 86;
  const bossY = mapData.boss_y ?? 16;
  const bossPoint = { x: bossX, y: bossY, status: mapData.status };

  // Full path: nodes → boss
  const allPoints = [...nodes, bossPoint];

  for (let i = 0; i < allPoints.length - 1; i++) {
    const from = allPoints[i];
    const to   = allPoints[i + 1];

    const x1 = (from.x / 100) * width;
    const y1 = (from.y / 100) * height;
    const x2 = (to.x / 100) * width;
    const y2 = (to.y / 100) * height;

    const isBossLine = i === allPoints.length - 2;
    let lineClass;

    if (from.status === 'completed') {
      lineClass = isBossLine ? 'map-line map-line--boss' : 'map-line map-line--done';
    } else if (from.status === 'active') {
      lineClass = 'map-line map-line--active';
    } else {
      lineClass = 'map-line map-line--locked';
    }

    // Linha principal
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));

    // Animação de fluxo apenas na linha recém-concluída
    if (i === justCompletedIdx) {
      line.setAttribute('class', 'map-line map-line--flowing');
      const finalClass = lineClass;
      line.addEventListener('animationend', () => {
        line.setAttribute('class', finalClass);
      }, { once: true });
    } else {
      line.setAttribute('class', lineClass);
    }

    svg.appendChild(line);

    // Marcador de direção (pequeno círculo no ponto intermediário)
    if (from.status === 'completed' || from.status === 'active') {
      const midX = ((x1 + x2) / 2).toFixed(1);
      const midY = ((y1 + y2) / 2).toFixed(1);
      const dot  = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', midX);
      dot.setAttribute('cy', midY);
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', from.status === 'completed' ? 'var(--color-gold)' : 'var(--color-xp)');
      dot.setAttribute('opacity', '0.7');
      svg.appendChild(dot);
    }
  }
}

// ============================================================
//   COMPLETAR NÓ
// ============================================================
async function handleNodeComplete(node, mapData) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Confirmação antes de marcar como concluído
  openModal({
    title: `⚔️ Confirmar Encontro`,
    bodyHTML: `
      <div class="form-group" style="text-align:center;">
        <div style="font-size:2rem; margin-bottom:var(--space-3);">${ATTR_META[node.attribute]?.icon ?? '⚔️'}</div>
        <p class="font-display" style="font-size:var(--fs-display); color:var(--text-primary); margin-bottom:var(--space-3);">${node.title}</p>
        <div style="display:flex; gap:var(--space-4); justify-content:center; flex-wrap:wrap;">
          <div style="text-align:center;">
            <div style="font-size:var(--fs-xxs); color:var(--text-muted); font-family:var(--font-pixel);">DANO</div>
            <div style="font-size:var(--fs-display); font-family:var(--font-display); color:var(--color-hp);">-${node.damage_to_boss} HP</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:var(--fs-xxs); color:var(--text-muted); font-family:var(--font-pixel);">XP</div>
            <div style="font-size:var(--fs-display); font-family:var(--font-display); color:var(--color-xp);">+${node.xp_reward}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:var(--fs-xxs); color:var(--text-muted); font-family:var(--font-pixel);">ATTR</div>
            <div style="font-size:var(--fs-display); font-family:var(--font-display); color:var(--text-gold);">${ATTR_META[node.attribute]?.label}</div>
          </div>
        </div>
        ${node.description ? `<p style="margin-top:var(--space-3); font-family:var(--font-display); font-size:var(--fs-display); color:var(--text-secondary);">${node.description}</p>` : ''}
      </div>
    `,
    confirmLabel: '✅ Concluído!',
    onConfirm: () => executeNodeComplete(uid, node, mapData),
  });
}

async function executeNodeComplete(uid, node, mapData) {
  try {
    // 1. Completar no Firestore
    const { bossDefeated, damageDone, map: updatedMap } = await completeNodeOnMap(
      uid, mapData.map_id, node.id
    );

    if (!updatedMap) {
      showToast('⚠️ Erro ao salvar progresso.', 'info');
      return;
    }

    // 2. Atualizar estado local (XP + atributo)
    let state = loadState();
    const { state: s1, leveledUp, newLevel } = awardXP(state, node.xp_reward ?? 40);
    const { state: s2 } = awardAttributeXP(s1, node.attribute ?? 'ART', 1);
    checkAchievements(s2);
    saveState(s2);
    renderHUD(s2);

    // 3. Feedback visual
    playBossAttack();
    animateBossHit();
    showToast(`⚔️ Encontro concluído! -${damageDone} HP do Boss  +${node.xp_reward} XP`, 'damage');
    spawnMapDamageFloat(damageDone);

    if (leveledUp) {
      setTimeout(() => showLevelUp(newLevel), 500);
    }

    // 4. Atualizar mapa em memória e re-renderizar (com animação da linha recém-concluída)
    const completedIdx = mapData.nodes.findIndex(n => n.id === node.id);
    _lastCompletedNodeIdx = completedIdx;
    _currentMap = updatedMap;
    renderCampaignMap(updatedMap);

    // 5. Boss derrotado!
    if (bossDefeated) {
      playBossDefeat();
      setTimeout(async () => {
        showToast(`🏆 BOSS DERROTADO! +${updatedMap.xp_reward_on_defeat ?? 500} XP bônus!`, 'defeat', 5000);

        // Bônus de XP de derrota
        let st = loadState();
        const { state: sBonus, leveledUp: bl, newLevel: bn } = awardXP(st, updatedMap.xp_reward_on_defeat ?? 500);
        st.player.stats.bosses_defeated = (st.player.stats.bosses_defeated ?? 0) + 1;
        checkAchievements(sBonus);
        saveState(sBonus);
        renderHUD(sBonus);

        if (bl) setTimeout(() => showLevelUp(bn), 600);

        // Drop engine
        await processBossDrops(updatedMap, sBonus);
      }, 800);
    } else {
      // Quest drop (35% chance)
      await processNodeDrop(node, s2);
    }

  } catch (e) {
    console.error('[CampaignMap] Erro ao completar nó:', e);
    showToast('⚠️ Erro ao processar encontro.', 'info');
  }
}

// ============================================================
//   DROP ENGINE
// ============================================================
async function processNodeDrop(node, state) {
  if (!auth.currentUser) return;
  try {
    const table  = await getLootTable();
    const pRank  = calcRank(state.player.stats.total_xp_earned ?? state.player.xp);
    const result = rollQuestDrop({ lootTable: table, player: pRank, isBossSub: true });

    if (result.dropped && result.item) {
      const uiItem = formatDropResult(result.item);
      setTimeout(() => showMemoryObtainedOverlay(uiItem), 1200);
      await addToInventory(auth.currentUser.uid, result.item.id, 'campaign_node', node.id);
    }
  } catch (e) {
    console.warn('[CampaignMap] Drop engine error:', e);
  }
}

async function processBossDrops(mapData, state) {
  if (!auth.currentUser) return;
  try {
    const table = await getLootTable();
    const pRank = calcRank(state.player.stats.total_xp_earned ?? state.player.xp);

    const { rollBossDrop } = await import('../engine/drop_engine.js');
    const drops = rollBossDrop({
      lootTable:          table,
      guaranteedDropIds:  mapData.guaranteed_drops ?? [],
      bossRank:           mapData.boss_rank ?? 'Desperto',
      player:             pRank,
    });

    for (const item of drops.items) {
      await addToInventory(auth.currentUser.uid, item.id, 'boss', mapData.map_id);
    }

    if (drops.items.length > 0) {
      const uiItem = formatDropResult(drops.items[0]);
      setTimeout(() => showMemoryObtainedOverlay(uiItem), 1600);
    }
  } catch (e) {
    console.warn('[CampaignMap] Boss drop error:', e);
  }
}

// ============================================================
//   VISUAL FX
// ============================================================
function spawnMapDamageFloat(damage) {
  const canvas = document.getElementById('campaign-map-canvas');
  if (!canvas) return;

  const el = document.createElement('div');
  el.className  = 'map-damage-float';
  el.textContent = `-${damage} HP`;

  // Posição próxima ao boss (top-right area)
  el.style.left = `${70 + Math.random() * 10}%`;
  el.style.top  = `${10 + Math.random() * 15}%`;

  canvas.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ============================================================
//   BOSS HIT ANIMATION
// ============================================================
function animateBossHit() {
  const topbar = document.querySelector('.map-boss-topbar');
  const sprite = document.getElementById('map-boss-sprite');

  if (topbar) {
    topbar.classList.remove('map-boss-topbar--hit');
    void topbar.offsetWidth; // força reflow para reiniciar animação
    topbar.classList.add('map-boss-topbar--hit');
    topbar.addEventListener('animationend',
      () => topbar.classList.remove('map-boss-topbar--hit'), { once: true });
  }

  if (sprite) {
    sprite.classList.remove('map-boss-topbar__sprite--hit');
    void sprite.offsetWidth;
    sprite.classList.add('map-boss-topbar__sprite--hit');
    sprite.addEventListener('animationend',
      () => sprite.classList.remove('map-boss-topbar__sprite--hit'), { once: true });
  }
}

// ============================================================
//   TOOLTIP
// ============================================================
function showNodeTooltip(event, node) {
  hideNodeTooltip();

  const nodeEl = event.currentTarget;
  const tip = document.createElement('div');
  tip.className = 'map-node-tooltip';
  tip.id = 'map-node-tooltip';

  const statusLabel = {
    active:    '⚡ Disponível',
    locked:    '🔒 Bloqueado',
    completed: '✅ Concluído',
  }[node.status] ?? node.status;

  tip.innerHTML = `
    <div class="map-node-tooltip__title">${node.title}</div>
    <div class="map-node-tooltip__meta">
      ${statusLabel}<br/>
      -${node.damage_to_boss} HP &nbsp;·&nbsp; +${node.xp_reward} XP<br/>
      ${ATTR_META[node.attribute]?.icon} ${ATTR_META[node.attribute]?.label}
    </div>
  `;

  nodeEl.appendChild(tip);
}

function hideNodeTooltip() {
  document.getElementById('map-node-tooltip')?.remove();
}

function showBossTooltip(event, mapData) {
  hideNodeTooltip();

  const nodeEl = event.currentTarget;
  const tip = document.createElement('div');
  tip.className = 'map-node-tooltip';
  tip.id = 'map-node-tooltip';

  const hpMax = mapData.boss_hp_max     ?? 1000;
  const hpCur = mapData.boss_hp_current ?? hpMax;
  const hpPct = Math.max(0, Math.round((hpCur / hpMax) * 100));
  const rank  = mapData.boss_rank ?? 'Desperto';

  tip.innerHTML = `
    <div class="map-node-tooltip__title">💣 ${mapData.name}</div>
    <div class="map-node-tooltip__meta">
      Rank: ${rank}<br/>
      HP: ${Math.round(hpCur)} / ${hpMax} (${hpPct}%)<br/>
      ${mapData.description ? `<em style="opacity:0.8">${mapData.description}</em>` : ''}
    </div>
  `;

  nodeEl.appendChild(tip);

  // Smart positioning: verifica se o tooltip fica fora da tela pelo topo
  // Se o nó estiver na metade superior da tela, mostra abaixo; senão, acima
  requestAnimationFrame(() => {
    const nodeRect = nodeEl.getBoundingClientRect();
    const tipRect  = tip.getBoundingClientRect();
    const viewport = window.innerHeight;
    const spaceAbove = nodeRect.top;
    const spaceBelow = viewport - nodeRect.bottom;

    if (spaceAbove < tipRect.height + 20 || spaceBelow > spaceAbove) {
      // Mostrar ABAIXO do nó
      tip.style.transform = 'translate(-50%, 10px)';
      tip.style.top = '100%';
      tip.style.bottom = 'auto';
    } else {
      // Mostrar acima (comportamento padrão via CSS)
      tip.style.transform = 'translate(-50%, calc(-100% - 12px))';
      tip.style.top = '0';
      tip.style.bottom = 'auto';
    }
  });
}

// ============================================================
//   AUTO-GERAÇÃO DE COORDENADAS
// ============================================================
/**
 * Distribui N nós em zigue-zague de baixo-esquerda → cima-direita.
 * O Boss fica fixo em (86%, 16%).
 * @param {number} n - número de nós
 * @returns {Array<{x: number, y: number}>}
 */
export function autoGenerateCoordinates(n) {
  if (n === 0) return [];
  if (n === 1) return [{ x: 15, y: 78 }];

  const coords = [];
  for (let i = 0; i < n; i++) {
    const t       = i / n;                       // 0 → 1
    const baseX   = 10 + t * 65;                // 10% → 75%
    const baseY   = 80 - t * 62;                // 80% → 18%
    const zigzag  = (i % 2 === 0) ? 12 : -12;  // alternância vertical
    const x       = Math.round(Math.min(78, Math.max(8, baseX)));
    const y       = Math.round(Math.min(88, Math.max(12, baseY + zigzag)));
    coords.push({ x, y });
  }
  return coords;
}

// ============================================================
//   MODAL: NOVA CAMPANHA
// ============================================================
function openNewCampaignModal() {
  const spriteOptions = Object.entries(BOSS_SPRITES).map(([k, e]) =>
    `<option value="${k}">${e} ${k}</option>`
  ).join('');

  openModal({
    title: '🐉 Invocar Nova Campanha',
    onAfterOpen: () => {
      _initGalleryPickers();
      // Init boss position minimap
      const minimap  = document.getElementById('camp-boss-minimap');
      const preview  = document.getElementById('camp-boss-preview');
      const inputX   = document.getElementById('camp-boss-x');
      const inputY   = document.getElementById('camp-boss-y');
      if (minimap) {
        minimap.addEventListener('click', (e) => {
          const rect = minimap.getBoundingClientRect();
          const bx   = Math.round(Math.min(95, Math.max(5, ((e.clientX - rect.left)  / rect.width)  * 100)));
          const by   = Math.round(Math.min(90, Math.max(5, ((e.clientY - rect.top)   / rect.height) * 100)));
          if (preview) { preview.style.left = `${bx}%`; preview.style.top = `${by}%`; }
          if (inputX)  inputX.value = bx;
          if (inputY)  inputY.value = by;
        });
      }
    },
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Nome da Campanha / Boss</label>
        <input class="form-input" id="camp-name" type="text" placeholder="Ex: Lançar Canal no YouTube" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="camp-desc" type="text" placeholder="Breve descrição do objetivo épico" />
      </div>
      <div class="form-group">
        <label class="form-label">HP Total do Boss</label>
        <input class="form-input" id="camp-hp" type="number" value="1000" min="100" step="50" />
      </div>
      <div class="form-group">
        <label class="form-label">XP de Bônus ao Derrotar</label>
        <input class="form-input" id="camp-xp" type="number" value="500" min="100" step="50" />
      </div>
      <div class="form-group">
        <label class="form-label">Sprite do Boss</label>
        <select class="form-select" id="camp-sprite">${spriteOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Rank do Boss</label>
        <select class="form-select" id="camp-rank">
          <option value="Adormecido">😴 Adormecido</option>
          <option value="Desperto" selected>👁️ Desperto</option>
          <option value="Caído">💀 Caído</option>
          <option value="Corrompido">🖤 Corrompido</option>
          <option value="Grande">⚡ Grande</option>
          <option value="Amaldiçoado">🩸 Amaldiçoado</option>
          <option value="Profano">🌑 Profano</option>
        </select>
      </div>
      ${_buildGalleryField({
        id:      'camp-bg',
        label:   '🖼️ Mapa de Fundo',
        gallery: MAPS_GALLERY,
        fallbackType: 'url',
        fallbackPlaceholder: 'https://i.imgur.com/exemplo.jpg',
        hint: 'Coloque imagens em /assets/maps/ e registre em src/config/assets_gallery.js',
      })}
      ${_buildGalleryField({
        id:      'camp-boss-img',
        label:   '⚔️ Sprite do Boss',
        gallery: BOSS_GALLERY,
        fallbackType: 'url',
        fallbackPlaceholder: 'https://i.imgur.com/sprite.png',
        hint: 'PNG 16-bit sem fundo. Coloque em /assets/bosses/ e registre no gallery.js',
        pixelated: true,
      })}
      <div class="form-group">
        <label class="form-label" style="font-size:var(--fs-xs);letter-spacing:1px;">Boss no Mapa
          <small style="font-family:sans-serif;font-size:11px;color:var(--text-muted);"> — clique para posicionar</small>
        </label>
        <div class="minimap-positioner" id="camp-boss-minimap"
             style="position:relative;cursor:crosshair;">
          <div class="minimap-hint-text">Clique para posicionar o Boss</div>
          <div id="camp-boss-preview" class="minimap-boss-marker"
               style="left:86%;top:16%;position:absolute;transform:translate(-50%,-50%);">👾</div>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);">
          <div style="flex:1;">
            <label class="form-label" style="font-size:var(--fs-xxs);">Boss X%</label>
            <input class="form-input" id="camp-boss-x" type="number" value="86" min="5" max="95" />
          </div>
          <div style="flex:1;">
            <label class="form-label" style="font-size:var(--fs-xxs);">Boss Y%</label>
            <input class="form-input" id="camp-boss-y" type="number" value="16" min="5" max="90" />
          </div>
        </div>
      </div>
    `,
    confirmLabel: '🐉 Invocar Boss',
    onConfirm: async () => {
      const name   = document.getElementById('camp-name')?.value?.trim();
      const desc   = document.getElementById('camp-desc')?.value?.trim() ?? '';
      const hp     = parseInt(document.getElementById('camp-hp')?.value ?? '1000', 10);
      const xpRew  = parseInt(document.getElementById('camp-xp')?.value ?? '500', 10);
      const sprite = document.getElementById('camp-sprite')?.value ?? 'dragon';
      const rank   = document.getElementById('camp-rank')?.value ?? 'Desperto';
      const bgUrl      = _getGalleryValue('camp-bg');
      const bossImgUrl = _getGalleryValue('camp-boss-img');
      const bossX      = parseInt(document.getElementById('camp-boss-x')?.value ?? '86', 10);
      const bossY      = parseInt(document.getElementById('camp-boss-y')?.value ?? '16', 10);

      if (!name) { showToast('⚠️ Dê um nome à campanha!', 'info', 2000); return; }

      const uid = auth.currentUser?.uid;
      if (!uid) { showToast('⚠️ Login necessário.', 'info'); return; }

      try {
        const mapId = await saveBossMap(uid, null, {
          name,
          description:          desc,
          boss_hp_max:          hp,
          boss_hp_current:      hp,
          boss_sprite:          sprite,
          boss_rank:            rank,
          xp_reward_on_defeat:  xpRew,
          background_image_url: bgUrl,
          boss_sprite_url:      bossImgUrl,
          boss_x:               bossX,
          boss_y:               bossY,
          guaranteed_drops:     [],
          nodes:                [],
        });

        showToast('🐉 Campanha invocada! Adicione os encontros no mapa.', 'damage');
        await renderCampaignList();

        // Abrir mapa imediatamente
        await openCampaignMap(mapId);
      } catch (e) {
        console.error('[CampaignMap] Erro ao criar campanha:', e);
        showToast('⚠️ Erro ao criar campanha.', 'info');
      }
    },
  });
}

// ============================================================
//   HELPERS: GALLERY PICKER
// ============================================================

/**
 * Constrói um campo de seleção de asset com galeria visual.
 * Se a galeria estiver vazia, exibe um input de URL como fallback.
 */
function _buildGalleryField({ id, label, gallery, fallbackPlaceholder, hint, pixelated }) {
  const imgStyle = pixelated
    ? 'image-rendering:pixelated;image-rendering:crisp-edges;object-fit:contain;'
    : 'object-fit:cover;';

  // Galeria vazia → URL fallback
  if (gallery.length === 0) {
    return `
      <div class="form-group">
        <label class="form-label" style="font-size:var(--fs-xs);letter-spacing:1px;">${label}
          <small style="font-family:var(--font-display);font-size:12px;color:var(--text-muted);font-family:sans-serif;"> (URL · opcional)</small>
        </label>
        <input class="form-input" id="${id}" data-gallery-value="" type="url"
               placeholder="${fallbackPlaceholder}"
               style="font-size:13px;font-family:sans-serif;" />
        <p style="font-size:11px;font-family:sans-serif;color:var(--text-muted);margin-top:4px;line-height:1.6;">
          ${hint}
        </p>
      </div>`;
  }

  // Lista de itens
  const listItems = gallery.map((item, i) => `
    <button type="button" class="gallery-list-item" data-gallery-id="${id}"
            data-asset-path="${item.path}" data-item-idx="${i}"
            style="display:flex;align-items:center;gap:10px;width:100%;
                   padding:6px 8px;border:2px solid var(--color-border);
                   background:var(--color-bg-deepest);cursor:pointer;
                   text-align:left;transition:border-color 100ms,background 100ms;">
      <img src="${item.path}" alt="${item.name}"
           style="width:48px;height:34px;${imgStyle}flex-shrink:0;display:block;" loading="lazy" />
      <span style="font-family:sans-serif;font-size:13px;color:var(--text-primary);
                   overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${item.name}
      </span>
    </button>`).join('');

  return `
    <div class="form-group">
      <label class="form-label" style="font-size:var(--fs-xs);letter-spacing:1px;">${label}</label>
      <!-- Botão toggle + resumo da seleção atual -->
      <button type="button" id="${id}-toggle"
              style="display:flex;align-items:center;justify-content:space-between;
                     width:100%;padding:8px 10px;border:2px solid var(--color-border);
                     background:var(--color-bg-element);cursor:pointer;font-family:sans-serif;
                     font-size:13px;color:var(--text-secondary);">
        <span id="${id}-summary">Nenhum selecionado</span>
        <span style="font-size:10px;opacity:0.6;">▼ abrir</span>
      </button>
      <!-- Lista colapsável (começa fechada) -->
      <div id="${id}-list" style="display:none;max-height:200px;overflow-y:auto;
                                   border:2px solid var(--color-border);border-top:none;
                                   background:var(--color-bg-deepest);">
        <!-- Opção nenhum -->
        <button type="button" class="gallery-list-item gallery-list-item--active" data-gallery-id="${id}"
                data-asset-path=""
                style="display:flex;align-items:center;gap:10px;width:100%;
                       padding:6px 8px;border:none;border-bottom:1px solid rgba(255,255,255,0.05);
                       background:rgba(79,195,247,0.08);cursor:pointer;text-align:left;">
          <span style="width:48px;height:34px;display:flex;align-items:center;
                       justify-content:center;font-size:18px;flex-shrink:0;">✕</span>
          <span style="font-family:sans-serif;font-size:13px;color:var(--text-muted);">Nenhum</span>
        </button>
        ${listItems}
      </div>
      <input type="hidden" id="${id}" data-gallery-value="" />
      <p style="font-size:11px;font-family:sans-serif;color:var(--text-muted);
                margin-top:4px;line-height:1.6;">${hint}</p>
    </div>`;
}

/** Lê o valor do gallery picker (ou do input URL de fallback) */
function _getGalleryValue(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  // hidden input (gallery mode) tem dataset.galleryValue
  if (el.tagName === 'INPUT' && el.type === 'hidden') return el.dataset.galleryValue ?? '';
  // URL input (fallback mode)
  return el.value?.trim() ?? '';
}

/** Inicializa o comportamento de seleção da galeria (chamado após openModal) */
function _initGalleryPickers() {
  // Botões de toggle (abrir/fechar lista)
  document.querySelectorAll('[id$="-toggle"]').forEach(toggleBtn => {
    const id       = toggleBtn.id.replace('-toggle', '');
    const listEl   = document.getElementById(`${id}-list`);
    const chevron  = toggleBtn.querySelector('span:last-child');
    if (!listEl) return;

    toggleBtn.addEventListener('click', () => {
      const isOpen = listEl.style.display !== 'none';
      listEl.style.display = isOpen ? 'none' : 'block';
      if (chevron) chevron.textContent = isOpen ? '▼ abrir' : '▲ fechar';
    });
  });

  // Itens clicáveis da lista
  document.querySelectorAll('.gallery-list-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const galleryId = btn.dataset.galleryId;
      const path      = btn.dataset.assetPath ?? '';
      const name      = btn.querySelector('span:last-child')?.textContent?.trim() ?? 'Nenhum';

      // Remove destaque de todos os itens desta galeria
      document.querySelectorAll(`.gallery-list-item[data-gallery-id="${galleryId}"]`)
        .forEach(b => {
          b.classList.remove('gallery-list-item--active');
          b.style.background = '';
        });

      // Marca o selecionado
      btn.classList.add('gallery-list-item--active');
      btn.style.background = 'rgba(79,195,247,0.12)';

      // Salva no hidden input
      const hidden = document.getElementById(galleryId);
      if (hidden) hidden.dataset.galleryValue = path;

      // Se o mapa de fundo foi selecionado, propaga para o minimap do boss
      if (galleryId === 'camp-bg') {
        const bossMini = document.getElementById('camp-boss-minimap');
        if (bossMini) {
          bossMini.style.backgroundImage  = path ? `url('${path}')` : '';
          bossMini.style.backgroundSize   = 'cover';
          bossMini.style.backgroundPosition = 'center';
        }
      }

      // Atualiza o summary e fecha a lista
      const summary = document.getElementById(`${galleryId}-summary`);
      if (summary) summary.textContent = path ? name : 'Nenhum selecionado';

      const listEl  = document.getElementById(`${galleryId}-list`);
      const chevron = document.querySelector(`#${galleryId}-toggle span:last-child`);
      if (listEl)  listEl.style.display = 'none';
      if (chevron) chevron.textContent  = '▼ abrir';
    });
  });
}

// ============================================================
//   MODAL: ADICIONAR NÓ
// ============================================================
function openAddNodeModal(mapData) {
  const existingNodes = mapData.nodes ?? [];
  const nextCoords    = autoGenerateCoordinates(existingNodes.length + 1);
  const suggested     = nextCoords[existingNodes.length] ?? { x: 50, y: 50 };

  let selectedX = suggested.x;
  let selectedY = suggested.y;

  openModal({
    title: '⚔️ Novo Encontro',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Título do Encontro / Subtarefa</label>
        <input class="form-input" id="node-title" type="text" placeholder="Ex: Escrever roteiro ep.1" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição (opcional)</label>
        <input class="form-input" id="node-desc" type="text" placeholder="Detalhes da tarefa..." />
      </div>
      <div class="form-group" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
        <div>
          <label class="form-label">Dano ao Boss (HP)</label>
          <input class="form-input" id="node-dmg" type="number" value="100" min="10" step="10" />
        </div>
        <div>
          <label class="form-label">XP de Recompensa</label>
          <input class="form-input" id="node-xp" type="number" value="40" min="5" max="300" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Atributo</label>
        <select class="form-select" id="node-attr">
          <option value="INT">🧠 INT — Inteligência</option>
          <option value="ART" selected>🎨 ART — Arte</option>
          <option value="AVE">🗡️ AVE — Aventura</option>
          <option value="FOR">💪 FOR — Força</option>
          <option value="CAR">🎭 CAR — Carisma</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Posição no Mapa <small style="color:var(--text-muted)">(clique para posicionar)</small></label>
        <div class="minimap-positioner" id="minimap-pos"
             style="${mapData.background_image_url
               ? `background-image:url('${mapData.background_image_url}');background-size:cover;background-position:center;`
               : ''}">
          <!-- Boss marker na posição real -->
          <div class="minimap-boss-marker"
               style="left:${mapData.boss_x ?? 86}%;top:${mapData.boss_y ?? 16}%;position:absolute;transform:translate(-50%,-50%);">
            ${mapData.boss_sprite_url
              ? `<img src="${mapData.boss_sprite_url}" style="width:20px;height:20px;image-rendering:pixelated;" />`
              : '👾'}
          </div>
          ${existingNodes.map(n => `
            <div class="minimap-existing-node" style="left:${n.x}%;top:${n.y}%;"></div>
          `).join('')}
          <div class="minimap-node-preview" id="minimap-preview"
               style="left:${suggested.x}%;top:${suggested.y}%;"></div>
          <div class="minimap-hint-text" id="minimap-hint">Clique para posicionar o nó</div>
        </div>
        <div style="display:flex; gap:var(--space-2); margin-top:var(--space-2);">
          <div style="flex:1;">
            <label class="form-label" style="font-size:var(--fs-xxs);">X%</label>
            <input class="form-input" id="node-x" type="number" value="${suggested.x}" min="5" max="80" />
          </div>
          <div style="flex:1;">
            <label class="form-label" style="font-size:var(--fs-xxs);">Y%</label>
            <input class="form-input" id="node-y" type="number" value="${suggested.y}" min="5" max="90" />
          </div>
        </div>
      </div>
    `,
    confirmLabel: '⚔️ Adicionar Encontro',
    onConfirm: async () => {
      const title  = document.getElementById('node-title')?.value?.trim();
      const desc   = document.getElementById('node-desc')?.value?.trim() ?? '';
      const damage = parseInt(document.getElementById('node-dmg')?.value ?? '100', 10);
      const xp     = parseInt(document.getElementById('node-xp')?.value  ?? '40',  10);
      const attr   = document.getElementById('node-attr')?.value ?? 'ART';
      const x      = parseInt(document.getElementById('node-x')?.value   ?? selectedX, 10);
      const y      = parseInt(document.getElementById('node-y')?.value   ?? selectedY, 10);

      if (!title) { showToast('⚠️ Dê um título ao encontro!', 'info', 2000); return; }

      try {
        await addNodeToMap(mapData.map_id, {
          title, description: desc,
          damage_to_boss: damage,
          xp_reward: xp,
          attribute: attr,
          x, y,
        });

        showToast('⚔️ Encontro adicionado ao mapa!', 'info');

        // Recarregar mapa
        _currentMap = await getBossMap(mapData.map_id);
        renderCampaignMap(_currentMap);
      } catch (e) {
        console.error('[CampaignMap] Erro ao adicionar nó:', e);
        showToast('⚠️ Erro ao adicionar encontro.', 'info');
      }
    },
  });

  // Setup mini-mapa clicável (APÓS o modal abrir)
  requestAnimationFrame(() => {
    const minimap = document.getElementById('minimap-pos');
    const preview = document.getElementById('minimap-preview');
    const inputX  = document.getElementById('node-x');
    const inputY  = document.getElementById('node-y');

    if (!minimap) return;

    const handler = (e) => {
      const rect = minimap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      selectedX = Math.round(Math.min(80, Math.max(5, ((clientX - rect.left) / rect.width)  * 100)));
      selectedY = Math.round(Math.min(90, Math.max(5, ((clientY - rect.top)  / rect.height) * 100)));

      if (preview) {
        preview.style.left = `${selectedX}%`;
        preview.style.top  = `${selectedY}%`;
      }
      if (inputX) inputX.value = selectedX;
      if (inputY) inputY.value = selectedY;

      minimap.classList.add('has-pos');
    };

    minimap.addEventListener('click', handler);
    minimap.addEventListener('touchend', handler);
  });
}

// ============================================================
//   EXPORT para app.js (re-render e navegação)
// ============================================================
export { renderCampaignList };
