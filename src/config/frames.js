/**
 * RPG Life OS — Profile Frame Catalog (v3.0 O Despertar da Identidade)
 * ======================================================================
 * 8 molduras SVG built-in, uma por rank da progressão.
 * O jogador pode usar qualquer frame cujo rank já alcançou.
 * Cada frame é um SVG de viewBox="0 0 136 136" projetado para
 * overlay sobre um avatar de 120×120px (com inset=-8px).
 */

import { rankIndex } from '../engine/drop_engine.js';

export const FRAME_CATALOG = [

  {
    id:           'frame_adormecido',
    name:         'Sombra Adormecida',
    rankRequired: 'Adormecido',
    rankIndex:    0,
    color:        '#3a3a5a',
    glowColor:    'rgba(58,58,90,0.5)',
    description:  'A silhueta de quem ainda dorme.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#3a3a5a" stroke-width="3" rx="1"/>
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="#252540" stroke-width="1" rx="1"/>
      <circle cx="3"   cy="3"   r="4.5" fill="#3a3a5a"/>
      <circle cx="133" cy="3"   r="4.5" fill="#3a3a5a"/>
      <circle cx="3"   cy="133" r="4.5" fill="#3a3a5a"/>
      <circle cx="133" cy="133" r="4.5" fill="#3a3a5a"/>
    </svg>`,
  },

  {
    id:           'frame_desperto',
    name:         'Brilho do Despertar',
    rankRequired: 'Desperto',
    rankIndex:    1,
    color:        '#4488ff',
    glowColor:    'rgba(68,136,255,0.6)',
    description:  'A luz que rasga a escuridão ao despertar.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#4488ff" stroke-width="2.5"/>
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="#1a3a80" stroke-width="1.5" stroke-dasharray="6 3"/>
      <!-- corner accents -->
      <polyline points="3,20 3,3 20,3"   fill="none" stroke="#88bbff" stroke-width="3" stroke-linecap="square"/>
      <polyline points="116,3 133,3 133,20" fill="none" stroke="#88bbff" stroke-width="3" stroke-linecap="square"/>
      <polyline points="3,116 3,133 20,133"  fill="none" stroke="#88bbff" stroke-width="3" stroke-linecap="square"/>
      <polyline points="116,133 133,133 133,116" fill="none" stroke="#88bbff" stroke-width="3" stroke-linecap="square"/>
    </svg>`,
  },

  {
    id:           'frame_ascendido',
    name:         'Corte do Ascendido',
    rankRequired: 'Ascendido',
    rankIndex:    2,
    color:        '#00bcd4',
    glowColor:    'rgba(0,188,212,0.6)',
    description:  'A geometria perfeita do ascendido.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <!-- Octagon cut-corner frame -->
      <polygon points="18,3 118,3 133,18 133,118 118,133 18,133 3,118 3,18"
               fill="none" stroke="#00bcd4" stroke-width="2.5"/>
      <polygon points="22,8 114,8 128,22 128,114 114,128 22,128 8,114 8,22"
               fill="none" stroke="#006080" stroke-width="1" opacity="0.6"/>
      <!-- corner diamonds -->
      <polygon points="18,3 3,18 3,3"     fill="#00bcd4" opacity="0.4"/>
      <polygon points="118,3 133,3 133,18" fill="#00bcd4" opacity="0.4"/>
      <polygon points="3,118 3,133 18,133" fill="#00bcd4" opacity="0.4"/>
      <polygon points="133,118 133,133 118,133" fill="#00bcd4" opacity="0.4"/>
    </svg>`,
  },

  {
    id:           'frame_mestre',
    name:         'Rúnas do Mestre',
    rankRequired: 'Mestre',
    rankIndex:    3,
    color:        '#43a047',
    glowColor:    'rgba(67,160,71,0.6)',
    description:  'Rúnas ancestrais gravadas por um Mestre.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#43a047" stroke-width="2.5"/>
      <!-- runic tick marks — top -->
      <line x1="34" y1="3" x2="34" y2="11"  stroke="#43a047" stroke-width="2"/>
      <line x1="68" y1="3" x2="68" y2="14"  stroke="#43a047" stroke-width="3"/>
      <line x1="102" y1="3" x2="102" y2="11" stroke="#43a047" stroke-width="2"/>
      <!-- bottom -->
      <line x1="34"  y1="133" x2="34"  y2="125" stroke="#43a047" stroke-width="2"/>
      <line x1="68"  y1="133" x2="68"  y2="122" stroke="#43a047" stroke-width="3"/>
      <line x1="102" y1="133" x2="102" y2="125" stroke="#43a047" stroke-width="2"/>
      <!-- left -->
      <line x1="3"  y1="34"  x2="11"  y2="34"  stroke="#43a047" stroke-width="2"/>
      <line x1="3"  y1="68"  x2="14"  y2="68"  stroke="#43a047" stroke-width="3"/>
      <line x1="3"  y1="102" x2="11"  y2="102" stroke="#43a047" stroke-width="2"/>
      <!-- right -->
      <line x1="133" y1="34"  x2="125" y2="34"  stroke="#43a047" stroke-width="2"/>
      <line x1="133" y1="68"  x2="122" y2="68"  stroke="#43a047" stroke-width="3"/>
      <line x1="133" y1="102" x2="125" y2="102" stroke="#43a047" stroke-width="2"/>
      <!-- corner squares -->
      <rect x="1"   y="1"   width="8" height="8" fill="#43a047"/>
      <rect x="127" y="1"   width="8" height="8" fill="#43a047"/>
      <rect x="1"   y="127" width="8" height="8" fill="#43a047"/>
      <rect x="127" y="127" width="8" height="8" fill="#43a047"/>
    </svg>`,
  },

  {
    id:           'frame_santo',
    name:         'Coroa do Santo',
    rankRequired: 'Santo',
    rankIndex:    4,
    color:        '#ffd700',
    glowColor:    'rgba(255,215,0,0.7)',
    description:  'A coroa de ouro do Santo, forjada no Vazio.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#ffd700" stroke-width="2"/>
      <rect x="6" y="6" width="124" height="124" fill="none" stroke="#b8860b" stroke-width="1"/>
      <!-- Cross ornaments at each corner -->
      <!-- TL -->
      <line x1="16" y1="3"  x2="16" y2="22" stroke="#ffd700" stroke-width="2.5"/>
      <line x1="3"  y1="16" x2="22" y2="16" stroke="#ffd700" stroke-width="2.5"/>
      <!-- TR -->
      <line x1="120" y1="3"  x2="120" y2="22" stroke="#ffd700" stroke-width="2.5"/>
      <line x1="114" y1="16" x2="133" y2="16" stroke="#ffd700" stroke-width="2.5"/>
      <!-- BL -->
      <line x1="16"  y1="114" x2="16"  y2="133" stroke="#ffd700" stroke-width="2.5"/>
      <line x1="3"   y1="120" x2="22"  y2="120" stroke="#ffd700" stroke-width="2.5"/>
      <!-- BR -->
      <line x1="120" y1="114" x2="120" y2="133" stroke="#ffd700" stroke-width="2.5"/>
      <line x1="114" y1="120" x2="133" y2="120" stroke="#ffd700" stroke-width="2.5"/>
      <!-- center diamonds on each side -->
      <polygon points="68,0 72,5 68,10 64,5" fill="#ffd700"/>
      <polygon points="68,136 72,131 68,126 64,131" fill="#ffd700"/>
      <polygon points="0,68 5,64 10,68 5,72"  fill="#ffd700"/>
      <polygon points="136,68 131,64 126,68 131,72" fill="#ffd700"/>
    </svg>`,
  },

  {
    id:           'frame_soberano',
    name:         'Escudo do Soberano',
    rankRequired: 'Soberano',
    rankIndex:    5,
    color:        '#ff8f00',
    glowColor:    'rgba(255,111,0,0.7)',
    description:  'Nenhum poder iguala o do Soberano das Sombras.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="2"  y="2"  width="132" height="132" fill="none" stroke="#ff8f00" stroke-width="3"/>
      <rect x="7"  y="7"  width="122" height="122" fill="none" stroke="#e65100" stroke-width="1.5"/>
      <rect x="11" y="11" width="114" height="114" fill="none" stroke="#bf360c" stroke-width="1" opacity="0.5"/>
      <!-- Corner arrow-heads (outward spikes) -->
      <polygon points="2,2 18,2 2,18"    fill="#ff8f00"/>
      <polygon points="134,2 118,2 134,18"  fill="#ff8f00"/>
      <polygon points="2,134 2,118 18,134"  fill="#ff8f00"/>
      <polygon points="134,134 118,134 134,118" fill="#ff8f00"/>
      <!-- Mid-side ornaments -->
      <rect x="62" y="0"   width="12" height="5" fill="#ff8f00"/>
      <rect x="62" y="131" width="12" height="5" fill="#ff8f00"/>
      <rect x="0"   y="62" width="5" height="12" fill="#ff8f00"/>
      <rect x="131" y="62" width="5" height="12" fill="#ff8f00"/>
    </svg>`,
  },

  {
    id:           'frame_sagrado',
    name:         'Véu do Sagrado',
    rankRequired: 'Sagrado',
    rankIndex:    6,
    color:        '#cc0000',
    glowColor:    'rgba(180,0,0,0.7)',
    description:  'Tecido de sangue e poder, forjado pelo Sagrado.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#cc0000" stroke-width="3"/>
      <!-- diagonal corner slashes -->
      <line x1="3"   y1="25"  x2="25"  y2="3"   stroke="#cc0000" stroke-width="2"/>
      <line x1="111" y1="3"   x2="133" y2="25"  stroke="#cc0000" stroke-width="2"/>
      <line x1="3"   y1="111" x2="25"  y2="133" stroke="#cc0000" stroke-width="2"/>
      <line x1="111" y1="133" x2="133" y2="111" stroke="#cc0000" stroke-width="2"/>
      <!-- inner border partial -->
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="#800000" stroke-width="1.5" opacity="0.7"/>
      <!-- mid-side blood drops -->
      <polygon points="68,0 72,6 68,12 64,6" fill="#cc0000"/>
      <polygon points="68,136 72,130 68,124 64,130" fill="#cc0000"/>
      <polygon points="0,68 6,64 12,68 6,72" fill="#cc0000"/>
      <polygon points="136,68 130,64 124,68 130,72" fill="#cc0000"/>
      <!-- corner filled triangles -->
      <polygon points="3,3 3,14 14,3"   fill="#cc0000" opacity="0.8"/>
      <polygon points="133,3 122,3 133,14" fill="#cc0000" opacity="0.8"/>
      <polygon points="3,133 3,122 14,133" fill="#cc0000" opacity="0.8"/>
      <polygon points="133,133 133,122 122,133" fill="#cc0000" opacity="0.8"/>
    </svg>`,
  },

  {
    id:           'frame_divino',
    name:         'Halo Divino',
    rankRequired: 'Divino',
    rankIndex:    7,
    color:        '#ffffff',
    glowColor:    'rgba(255,255,255,0.8)',
    description:  'O halo dos que transcenderam tudo.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <defs>
        <linearGradient id="div-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#ff88cc"/>
          <stop offset="25%"  stop-color="#ffd700"/>
          <stop offset="50%"  stop-color="#88ffff"/>
          <stop offset="75%"  stop-color="#cc88ff"/>
          <stop offset="100%" stop-color="#ff88cc"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="url(#div-grad)" stroke-width="3"/>
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <!-- 4-pointed stars at corners -->
      <!-- TL star -->
      <polygon points="3,3 6,10 3,17 0,10" fill="url(#div-grad)"/>
      <polygon points="3,3 10,6 17,3 10,0" fill="url(#div-grad)"/>
      <!-- TR star -->
      <polygon points="133,3 130,10 133,17 136,10" fill="url(#div-grad)"/>
      <polygon points="133,3 126,6 119,3 126,0"    fill="url(#div-grad)"/>
      <!-- BL star -->
      <polygon points="3,133 6,126 3,119 0,126"    fill="url(#div-grad)"/>
      <polygon points="3,133 10,130 17,133 10,136"  fill="url(#div-grad)"/>
      <!-- BR star -->
      <polygon points="133,133 130,126 133,119 136,126" fill="url(#div-grad)"/>
      <polygon points="133,133 126,130 119,133 126,136" fill="url(#div-grad)"/>
      <!-- mid-side sparkles -->
      <polygon points="68,0 70,5 68,10 66,5"   fill="white" opacity="0.9"/>
      <polygon points="68,136 70,131 68,126 66,131" fill="white" opacity="0.9"/>
      <polygon points="0,68 5,66 10,68 5,70"   fill="white" opacity="0.9"/>
      <polygon points="136,68 131,66 126,68 131,70" fill="white" opacity="0.9"/>
    </svg>`,
  },

  // ============================================================
  //   PREMIUM MARKET FRAMES (Purchasable)
  // ============================================================
  {
    id:           'frame_ext_shadow',
    name:         'Sombra Eterna',
    purchasable:  true,
    color:        '#7b1fa2',
    description:  'A essência bruta da Sombra comprimida em forma.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="2" y="2" width="132" height="132" fill="none" stroke="#7b1fa2" stroke-width="4" rx="2"/>
      <rect x="6" y="6" width="124" height="124" fill="none" stroke="#4a148c" stroke-width="1.5" rx="1"/>
      <path d="M2,2 L30,2 L2,30 Z" fill="#7b1fa2" opacity="0.6"/>
      <path d="M134,2 L106,2 L134,30 Z" fill="#7b1fa2" opacity="0.6"/>
      <path d="M2,134 L30,134 L2,106 Z" fill="#7b1fa2" opacity="0.6"/>
      <path d="M134,134 L106,134 L134,106 Z" fill="#7b1fa2" opacity="0.6"/>
      <!-- smoke particles -->
      <circle cx="10" cy="10" r="2" fill="#ce93d8"/>
      <circle cx="126" cy="10" r="2" fill="#ce93d8"/>
      <circle cx="10" cy="126" r="2" fill="#ce93d8"/>
      <circle cx="126" cy="126" r="2" fill="#ce93d8"/>
    </svg>`,
  },
  {
    id:           'frame_ext_gold',
    name:         'Prestígio Dourado',
    purchasable:  true,
    color:        '#ffd700',
    description:  'O ouro mais puro da Terceira Pesadilla.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="4" y="4" width="128" height="128" fill="none" stroke="#ffd700" stroke-width="3"/>
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="#b8860b" stroke-width="1"/>
      <!-- pixel gold corner accents -->
      <rect x="0" y="0" width="16" height="16" fill="#ffd700"/>
      <rect x="120" y="0" width="16" height="16" fill="#ffd700"/>
      <rect x="0" y="120" width="16" height="16" fill="#ffd700"/>
      <rect x="120" y="120" width="16" height="16" fill="#ffd700"/>
      <rect x="4" y="4" width="8" height="8" fill="#fff" opacity="0.5"/>
      <rect x="124" y="4" width="8" height="8" fill="#fff" opacity="0.5"/>
      <rect x="4" y="124" width="8" height="8" fill="#fff" opacity="0.5"/>
      <rect x="124" y="124" width="8" height="8" fill="#fff" opacity="0.5"/>
    </svg>`,
  },
  {
    id:           'frame_ext_blood',
    name:         'Ritual Carmesim',
    purchasable:  true,
    color:        '#d32f2f',
    description:  'Forjado no altar dos sacrifícios.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#d32f2f" stroke-width="3"/>
      <line x1="10" y1="3" x2="3" y2="10" stroke="#d32f2f" stroke-width="6"/>
      <line x1="126" y1="3" x2="133" y2="10" stroke="#d32f2f" stroke-width="6"/>
      <line x1="10" y1="133" x2="3" y2="126" stroke="#d32f2f" stroke-width="6"/>
      <line x1="126" y1="133" x2="133" y2="126" stroke="#d32f2f" stroke-width="6"/>
      <polygon points="68,0 74,10 68,20 62,10" fill="#b71c1c"/>
      <polygon points="68,136 74,126 68,116 62,126" fill="#b71c1c"/>
    </svg>`,
  },
  {
    id:           'frame_ext_cosmic',
    name:         'Vazio Cósmico',
    purchasable:  true,
    color:        '#304ffe',
    description:  'As estrelas observam o seu progresso.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="3" y="3" width="130" height="130" fill="none" stroke="#304ffe" stroke-width="2.5" stroke-dasharray="10 5"/>
      <circle cx="3" cy="3" r="5" fill="#8c9eff"/>
      <circle cx="133" cy="3" r="5" fill="#8c9eff"/>
      <circle cx="3" cy="133" r="5" fill="#8c9eff"/>
      <circle cx="133" cy="133" r="5" fill="#8c9eff"/>
      <!-- stars -->
      <circle cx="20" cy="40" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="110" cy="90" r="1" fill="white" opacity="0.6"/>
      <circle cx="50" cy="120" r="1.2" fill="white" opacity="0.9"/>
    </svg>`,
  },
  {
    id:           'frame_tecelao',
    name:         'Tecelão do Destino',
    purchasable:  true,
    color:        '#ffab00',
    description:  'Linhas de seda dourada que amarram o destino.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="4" y="4" width="128" height="128" fill="none" stroke="#ffab00" stroke-width="2"/>
      <!-- spider web patterns at corners -->
      <path d="M4,4 L34,4 M4,4 L4,34 M4,4 L24,24" stroke="#ffab00" stroke-width="1.5" opacity="0.8"/>
      <path d="M132,4 L102,4 M132,4 L132,34 M132,4 L112,24" stroke="#ffab00" stroke-width="1.5" opacity="0.8"/>
      <path d="M4,132 L34,132 M4,132 L4,102 M4,132 L24,112" stroke="#ffab00" stroke-width="1.5" opacity="0.8"/>
      <path d="M132,132 L102,132 M132,132 L132,102 M132,132 L112,112" stroke="#ffab00" stroke-width="1.5" opacity="0.8"/>
      <!-- golden threads -->
      <line x1="68" y1="4" x2="68" y2="132" stroke="#ffab00" stroke-width="0.5" opacity="0.3"/>
      <line x1="4" y1="68" x2="132" y2="68" stroke="#ffab00" stroke-width="0.5" opacity="0.3"/>
      <circle cx="68" cy="68" r="66" fill="none" stroke="#ffab00" stroke-width="0.5" opacity="0.2"/>
      <rect x="64" y="2" width="8" height="8" fill="#ffab00" transform="rotate(45 68 6)"/>
      <rect x="64" y="126" width="8" height="8" fill="#ffab00" transform="rotate(45 68 130)"/>
    </svg>`,
  },
  {
    id:           'frame_nephilim',
    name:         'Chama Nephilim',
    purchasable:  true,
    color:        '#ffffff',
    description:  'A luz radiante da linhagem proibida.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <defs>
        <filter id="glow-white">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="4" y="4" width="128" height="128" fill="none" stroke="#fff" stroke-width="3" filter="url(#glow-white)"/>
      <rect x="10" y="10" width="116" height="116" fill="none" stroke="#eee" stroke-width="1" opacity="0.5"/>
      <!-- wing-like accents -->
      <path d="M4,30 L15,30 L4,50 Z" fill="#fff"/>
      <path d="M132,30 L121,30 L132,50 Z" fill="#fff"/>
      <path d="M4,106 L15,106 L4,86 Z" fill="#fff"/>
      <path d="M132,106 L121,106 L132,86 Z" fill="#fff"/>
      <!-- halo top -->
      <path d="M40,4 Q68,-5 96,4" fill="none" stroke="#fff" stroke-width="4" filter="url(#glow-white)"/>
    </svg>`,
  },
  {
    id:           'frame_eclipse',
    name:         'Eclipse do Vazio',
    purchasable:  true,
    color:        '#222',
    description:  'Onde a luz é devorada pela ausência absoluta.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 136" width="100%" height="100%">
      <rect x="2" y="2" width="132" height="132" fill="none" stroke="#333" stroke-width="6"/>
      <rect x="8" y="8" width="120" height="120" fill="none" stroke="#000" stroke-width="2"/>
      <!-- pulsating orbs context -->
      <circle cx="10" cy="10" r="6" fill="#111" stroke="#444" stroke-width="1"/>
      <circle cx="126" cy="10" r="6" fill="#111" stroke="#444" stroke-width="1"/>
      <circle cx="10" cy="126" r="6" fill="#111" stroke="#444" stroke-width="1"/>
      <circle cx="126" cy="126" r="6" fill="#111" stroke="#444" stroke-width="1"/>
      <!-- dark cracks -->
      <path d="M68,2 L68,15 M2,68 L15,68 M136,68 L121,68 M68,136 L68,121" stroke="#555" stroke-width="2"/>
      <!-- internal shadow border -->
      <rect x="14" y="14" width="108" height="108" fill="none" stroke="#444" stroke-width="1" stroke-dasharray="4 4"/>
    </svg>`,
  },
];

/** Lookup: id → frame */
export const FRAME_MAP = Object.fromEntries(
  FRAME_CATALOG.map(f => [f.id, f])
);

/**
 * Returns the frames available for a player at a given rank index.
 * Players can use frames of their rank and below.
 * @param {number} playerRankIndex - 0 (Adormecido) … 7 (Divino)
 * @returns {{ available: Frame[], locked: Frame[] }}
 */
export function getFramesForRank(playerRankIndex) {
  return {
    available: FRAME_CATALOG.filter(f => f.rankIndex <= playerRankIndex),
    locked:    FRAME_CATALOG.filter(f => f.rankIndex >  playerRankIndex),
  };
}

export function getFrameById(id) {
  return FRAME_MAP[id] ?? null;
}

/**
 * Returns the SVG string for a frame, or a minimal fallback if not found.
 */
export function getFrameSVG(frameId) {
  const frame = FRAME_MAP[frameId];
  return frame ? frame.svg : '';
}
