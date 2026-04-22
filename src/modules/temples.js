/**
 * Shadow Slave Life OS — Temples Module
 * =======================================
 * Lógica e renderização dos Templos da Dualidade.
 * Estado isolado no módulo (local state pattern).
 *
 * @module temples
 */

import { TEMPLES_CATALOG, GODS, DAEMONS } from '../config/templesData.js';
import { showToast } from '../engine/gamification.js';
import { playSound } from '../engine/audio.js';

// ============================================================
//   STATE LOCAL
// ============================================================

/** @type {{ entity: import('../config/templesData.js').DivineEntity | null, xp: number, devotion: number }} */
let _lightAltar = {
  entity:   GODS[0], // Deus de Guerra por padrão
  xp:       0,
  devotion: 0,      // 0..100
};

/** @type {{ entity: import('../config/templesData.js').DivineEntity | null, xp: number, devotion: number }} */
let _shadowAltar = {
  entity:   DAEMONS[0], // Hope por padrão
  xp:       0,
  devotion: 0,
};

const XP_PER_ACTION = 10;
const XP_PER_LEVEL  = 100;

// ============================================================
//   RENDER PRINCIPAL
// ============================================================

export function renderTemples() {
  const container = document.getElementById('temples-view');
  if (!container) return;

  container.innerHTML = `
    ${_buildAltarHTML()}
    ${_buildPantheonHTML()}
  `;

  _bindAltarEvents();
  _bindPantheonEvents();
}

// ============================================================
//   ALTAR ATIVO
// ============================================================

function _buildAltarHTML() {
  return `
    <div class="altar-container">
      ${_buildSingleAltarHTML('light', _lightAltar)}
      ${_buildSingleAltarHTML('shadow', _shadowAltar)}
    </div>
  `;
}

function _buildSingleAltarHTML(side, altar) {
  const isLight    = side === 'light';
  const cardClass  = isLight ? 'altar-card--light' : 'altar-card--shadow';
  const label      = isLight ? '✦ Altar da Luz' : '✧ Altar da Sombra';
  const btnLabel   = isLight ? '☀️ Honrar Virtude' : '🌑 Dominar Defeito';
  const btnId      = `altar-btn-${side}`;
  const inputId    = `altar-input-${side}`;
  const barId      = `altar-bar-${side}`;
  const cardId     = `altar-card-${side}`;

  const e = altar.entity;

  const lvl     = Math.floor(altar.xp / XP_PER_LEVEL) + 1;
  const xpInLvl = altar.xp % XP_PER_LEVEL;
  const pct     = xpInLvl;

  const innerHTML = e
    ? `
      <div class="altar-card__body">
        <div class="altar-card__sprite-wrap">
          <img class="altar-sprite" src="${e.sprite}" alt="${e.name}"
               onerror="this.style.opacity='0.3'">
        </div>
        <div class="altar-card__info">
          <div class="altar-entity-name">${e.name}</div>
          <span class="altar-trait-tag">${e.trait}</span>
          <div class="altar-domain">🌐 ${e.domain}</div>
          <div class="altar-description">${e.description}</div>
        </div>
      </div>
      <div class="altar-devotion">
        <div class="altar-devotion__header">
          <span>Nível ${lvl}</span>
          <span>${xpInLvl} / ${XP_PER_LEVEL} Devoção</span>
        </div>
        <div class="altar-devotion__bar">
          <div class="altar-devotion__fill" id="${barId}" style="width:${pct}%"></div>
        </div>
        <div class="altar-devotion__input-row">
          <input class="altar-devotion__input" id="${inputId}"
                 type="text" placeholder="Sua meta diária..."
                 autocomplete="off">
          <button class="altar-devotion__btn" id="${btnId}">${btnLabel}</button>
        </div>
      </div>
    `
    : `
      <div class="altar-empty">
        <div class="altar-empty__icon">${isLight ? '☀️' : '🌑'}</div>
        <div class="altar-empty__text">Selecione ${isLight ? 'um Deus' : 'um Daemon'}<br>no Panteão abaixo</div>
      </div>
    `;

  return `
    <div class="altar-card ${cardClass}" id="${cardId}">
      <div class="altar-card__label">${label}</div>
      ${innerHTML}
    </div>
  `;
}

// ============================================================
//   PANTEÃO
// ============================================================

function _buildPantheonHTML() {
  const godSlots = GODS.map(e => _buildPantheonSlot(e)).join('');
  const daemonSlots = DAEMONS.map(e => _buildPantheonSlot(e)).join('');

  return `
    <div class="pantheon-section">
      <div class="pantheon-section__title">⚜ Panteão da Dualidade</div>

      <div class="pantheon-row pantheon-row--gods">
        <div class="pantheon-row__label">☀️ Deuses</div>
        <div class="pantheon-grid" id="pantheon-gods">${godSlots}</div>
      </div>

      <div class="pantheon-row pantheon-row--daemons">
        <div class="pantheon-row__label">🌑 Daemons</div>
        <div class="pantheon-grid" id="pantheon-daemons">${daemonSlots}</div>
      </div>
    </div>
  `;
}

function _buildPantheonSlot(entity) {
  const isActive = entity.type === 'god'
    ? _lightAltar.entity?.id  === entity.id
    : _shadowAltar.entity?.id === entity.id;

  const activeClass = isActive
    ? (entity.type === 'god' ? 'pantheon-slot--active-god' : 'pantheon-slot--active-daemon')
    : '';

  return `
    <div class="pantheon-slot ${activeClass}"
         data-entity-id="${entity.id}"
         title="${entity.name} — ${entity.trait}">
      <img src="${entity.icon}" alt="${entity.name}"
           onerror="this.style.opacity='0.3'">
      <div class="pantheon-slot__tooltip">${entity.name}</div>
    </div>
  `;
}

// ============================================================
//   EVENT BINDING
// ============================================================

function _bindAltarEvents() {
  _bindAltarButton('light');
  _bindAltarButton('shadow');
}

function _bindAltarButton(side) {
  const btn   = document.getElementById(`altar-btn-${side}`);
  const card  = document.getElementById(`altar-card-${side}`);
  const barEl = document.getElementById(`altar-bar-${side}`);

  if (!btn) return;

  btn.addEventListener('click', () => {
    const altar = side === 'light' ? _lightAltar : _shadowAltar;
    if (!altar.entity) return;

    // Award XP
    altar.xp += XP_PER_ACTION;
    const lvl     = Math.floor(altar.xp / XP_PER_LEVEL) + 1;
    const xpInLvl = altar.xp % XP_PER_LEVEL;

    // Animate bar
    if (barEl) barEl.style.width = `${xpInLvl}%`;

    // Flash card
    if (card) {
      card.classList.remove('altar-card--xp-flash');
      void card.offsetWidth; // reflow
      card.classList.add('altar-card--xp-flash');
    }

    // Atualiza texto do nível
    const header = card?.querySelector('.altar-devotion__header');
    if (header) {
      header.children[0].textContent = `Nível ${lvl}`;
      header.children[1].textContent = `${xpInLvl} / ${XP_PER_LEVEL} Devoção`;
    }

    playSound('ui_click');

    const label = side === 'light'
      ? `☀️ Virtude honrada! +${XP_PER_ACTION} Devoção`
      : `🌑 Defeito dominado! +${XP_PER_ACTION} Devoção`;

    showToast(label, side === 'light' ? 'xp' : 'damage');
  });
}

function _bindPantheonEvents() {
  document.querySelectorAll('.pantheon-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const id = slot.dataset.entityId;
      const entity = TEMPLES_CATALOG.find(e => e.id === id);
      if (!entity) return;

      playSound('ui_click');

      if (entity.type === 'god') {
        _lightAltar.entity = entity;
      } else {
        _shadowAltar.entity = entity;
      }

      // Rebind render
      renderTemples();
    });
  });
}
