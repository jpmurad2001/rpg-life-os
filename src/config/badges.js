/**
 * RPG Life OS — Badge Catalog (v2.5 Marcos do Despertar)
 * =======================================================
 * Catálogo estático de todas as badges do jogo.
 * Não requer Firestore — apenas os IDs desbloqueados e o activeBadgeId
 * são persistidos no documento do jogador.
 *
 * Estrutura de cada Badge:
 *   id           — chave única (string)
 *   name         — nome exibido
 *   lore         — descrição narrativa (ex: "Pela constância inabalável")
 *   icon         — emoji principal da badge
 *   category     — 'combat' | 'discipline' | 'knowledge' | 'art' | 'mystery'
 *   rarity       — 'common' | 'uncommon' | 'rare' | 'legendary'
 *   unlockKey    — chave que mapeia para BADGE_UNLOCK_CONDITIONS em core.js
 *   color        — cor neon principal (hex) para o glow
 *   glowColor    — cor do drop-shadow (mais suave)
 *   frame        — cor da borda do frame ('gold'|'silver'|'bronze'|'void')
 */

export const BADGE_CATALOG = [

  // ── COMBAT ──────────────────────────────────────────────────────────────────

  {
    id:       'badge_primeiro_sangue',
    name:     'Primeiro Sangue',
    lore:     'Pela coragem de erguer a espada pela primeira vez.',
    icon:     '⚔️',
    asset:    'primeiro_sangue',
    category: 'combat',
    rarity:   'common',
    unlockKey:'FIRST_QUEST',
    requirement: 'Completar 1 Quest.',
    color:    '#ef5350',
    glowColor:'rgba(239,83,80,0.6)',
    frame:    'bronze',
  },

  {
    id:       'badge_exterminadora_de_trolls',
    name:     'Exterminador de Trolls',
    lore:     'Por derrotar o chefe dos Trolls das Sombras e não recuar.',
    icon:     '💀',
    asset:    'exterminador_de_trolls',
    category: 'combat',
    rarity:   'rare',
    unlockKey:'BOSS_SLAYER',
    requirement: 'Derrotar 1 Chefe.',
    color:    '#e040fb',
    glowColor:'rgba(224,64,251,0.7)',
    frame:    'void',
  },

  {
    id:       'badge_senhor_da_guerra',
    name:     'Senhor da Guerra',
    lore:     'Dez chefes tombaram diante do seu poder. O Vazio teme seu nome.',
    icon:     '👑',
    asset:    'senhor_da_guerra',
    category: 'combat',
    rarity:   'legendary',
    unlockKey:'BOSS_SLAYER_10',
    requirement: 'Derrotar 10 Chefes.',
    color:    '#ffd700',
    glowColor:'rgba(255,215,0,0.8)',
    frame:    'gold',
  },

  // ── DISCIPLINE ───────────────────────────────────────────────────────────────

  {
    id:       'badge_foco_de_ferro',
    name:     'Foco de Ferro',
    lore:     'Pela constância inabalável — sete dias de Pomodoro sem quebrar.',
    icon:     '🔥',
    asset:    'foco_de_ferro',
    category: 'discipline',
    rarity:   'uncommon',
    unlockKey:'POMODORO_STREAK_7',
    requirement: '7 sessões de Pomodoro.',
    color:    '#ff6f00',
    glowColor:'rgba(255,111,0,0.65)',
    frame:    'silver',
  },

  {
    id:       'badge_monge_das_sombras',
    name:     'Monge das Sombras',
    lore:     'Cinquenta sessões de foco completadas. A mente como obsidiana.',
    icon:     '🧘',
    asset:    'monge_das_sombras',
    category: 'discipline',
    rarity:   'rare',
    unlockKey:'POMODORO_50',
    requirement: '50 sessões de Pomodoro.',
    color:    '#7c4dff',
    glowColor:'rgba(124,77,255,0.7)',
    frame:    'void',
  },

  {
    id:       'badge_gladiador_das_sombras',
    name:     'Gladiador das Sombras',
    lore:     'Suor e aço. Sete treinos consecutivos sem hesitar.',
    icon:     '🏋️',
    asset:    'gladiador_das_sombras',
    category: 'discipline',
    rarity:   'uncommon',
    unlockKey:'WORKOUT_STREAK_7',
    requirement: '7 dias de treino.',
    color:    '#00e676',
    glowColor:'rgba(0,230,118,0.65)',
    frame:    'silver',
  },

  // ── KNOWLEDGE ────────────────────────────────────────────────────────────────

  {
    id:       'badge_erudito_do_abismo',
    name:     'Erudito do Abismo',
    lore:     'O conhecimento forjado nas trevas é eterno. INT nível 10 atingido.',
    icon:     '📚',
    asset:    'erudito_do_abismo',
    category: 'knowledge',
    rarity:   'uncommon',
    unlockKey:'INT_10',
    requirement: 'Atingir o nível 10 de Inteligência (INT).',
    color:    '#4fc3f7',
    glowColor:'rgba(79,195,247,0.65)',
    frame:    'silver',
  },

  // ── ART ─────────────────────────────────────────────────────────────────────

  {
    id:       'badge_artesao_das_sombras',
    name:     'Artesão das Sombras',
    lore:     'A arte que nasce do caos é a mais bela. ART nível 10 atingido.',
    icon:     '🎨',
    asset:    'artesao_das_sombras',
    category: 'art',
    rarity:   'uncommon',
    unlockKey:'ART_10',
    requirement: 'Atingir o nível 10 de Arte (ART).',
    color:    '#ff4081',
    glowColor:'rgba(255,64,129,0.65)',
    frame:    'silver',
  },

  // ── MYSTERY ─────────────────────────────────────────────────────────────────

  {
    id:       'badge_o_desperto',
    name:     'O Desperto',
    lore:     'Você cruzou o limiar. O Vazio não lhe é mais desconhecido.',
    icon:     '🌑',
    asset:    'o_desperto',
    category: 'mystery',
    rarity:   'legendary',
    unlockKey:'LEVEL_10',
    requirement: 'Atingir o Nível 10 geral.',
    color:    '#b0bec5',
    glowColor:'rgba(176,190,197,0.9)',
    frame:    'gold',
  },

  {
    id:       'badge_centuriao',
    name:     'Centurião',
    lore:     'Cem missões. Cem vitórias. A legião das sombras te reconhece.',
    icon:     '🛡️',
    asset:    'centuriao',
    category: 'combat',
    rarity:   'rare',
    unlockKey:'QUESTS_100',
    requirement: 'Completar 100 Quests.',
    color:    '#80cbc4',
    glowColor:'rgba(128,203,196,0.7)',
    frame:    'void',
  },

  // ── NEW: v2.6 EXPLORAÇÃO & FORJA ───────────────────────────────────────────

  {
    id:       'badge_apprentice_forge',
    name:     'Aprendiz da Forja',
    lore:     'Pela coragem de iniciar o trabalho no metal bruto.',
    icon:     '🔨',
    asset:    'aprendiz_da_forja',
    category: 'discipline',
    rarity:   'common',
    unlockKey:'BOARD_CARDS_10',
    requirement: 'Criar 10 cards no Quadro de Missões.',
    color:    '#90a4ae',
    glowColor:'rgba(144,164,174,0.5)',
    frame:    'bronze',
  },

  {
    id:       'badge_titan_steel',
    name:     'Titã de Aço',
    lore:     'Seu corpo é uma fornalha. Sua vontade é temperada.',
    icon:     '💪',
    asset:    'tita_de_aço',
    category: 'combat',
    rarity:   'uncommon',
    unlockKey:'FOR_10',
    requirement: 'Atingir FOR (Força) Nível 10.',
    color:    '#ef5350',
    glowColor:'rgba(239,83,80,0.6)',
    frame:    'silver',
  },

  {
    id:       'badge_silver_tongue',
    name:     'Língua de Prata',
    lore:     'Palavras são armas mais afiadas que qualquer lâmina.',
    icon:     '🎭',
    asset:    'lingua_de_prata',
    category: 'mystery',
    rarity:   'uncommon',
    unlockKey:'CAR_10',
    requirement: 'Atingir CAR (Carisma) Nível 10.',
    color:    '#ffb74d',
    glowColor:'rgba(255,183,77,0.6)',
    frame:    'silver',
  },

  {
    id:       'badge_dark_phoenix',
    name:     'Fênix Negra',
    lore:     'Pássaro de chamas sombrias renascendo das cinzas.',
    icon:     '🔥',
    asset:    'fenix_negra',
    category: 'mystery',
    rarity:   'uncommon',
    unlockKey:'STREAK_RECOVERY',
    requirement: '3 tarefas no mesmo dia após perder ofensiva.',
    color:    '#7c4dff',
    glowColor:'rgba(124,77,255,0.7)',
    frame:    'void',
  },

  {
    id:       'badge_dawn_hunter',
    name:     'Caçador da Alvorada',
    lore:     'O Sol nasce apenas para iluminar sua presa.',
    icon:     '☀️',
    asset:    'caçador_da_alvorada',
    category: 'combat',
    rarity:   'rare',
    unlockKey:'DAWN_QUESTS_5',
    requirement: '5 quests antes das 08:00 AM.',
    color:    '#ffd54f',
    glowColor:'rgba(255,213,79,0.7)',
    frame:    'silver',
  },

  {
    id:       'badge_night_guardian',
    name:     'Guardião Noturno',
    lore:     'A escuridão é seu lar. O sono é para os fracos.',
    icon:     '🦉',
    asset:    'guardiao_noturno',
    category: 'mystery',
    rarity:   'rare',
    unlockKey:'NIGHT_QUESTS_5',
    requirement: '5 quests após a meia-noite.',
    color:    '#3f51b5',
    glowColor:'rgba(63,81,181,0.7)',
    frame:    'void',
  },

  {
    id:       'badge_hourglass_master',
    name:     'Mestre da Ampulheta',
    lore:     'O tempo ferve. Você é o senhor dos segundos.',
    icon:     '⏳',
    asset:    'mestre_da_ampulheta',
    category: 'discipline',
    rarity:   'rare',
    unlockKey:'POMODORO_100',
    requirement: 'Completar 100 sessões de Pomodoro.',
    color:    '#ffea00',
    glowColor:'rgba(255,234,0,0.8)',
    frame:    'silver',
  },

  {
    id:       'badge_soul_merchant',
    name:     'Mercador de Almas',
    lore:     'Ouro flui como sangue. Tudo tem um preço.',
    icon:     '💰',
    asset:    'mercador_de_almas',
    category: 'mystery',
    rarity:   'rare',
    unlockKey:'GOLD_1000',
    requirement: 'Acumular 1.000 moedas de Ouro.',
    color:    '#ffd700',
    glowColor:'rgba(255,215,0,0.8)',
    frame:    'gold',
  },

  {
    id:       'badge_abyss_walker',
    name:     'Andarilho do Abismo',
    lore:     'Trinta dias no Vazio. A sanidade é opcional.',
    icon:     '👢',
    asset:    'andarilho_do_abismo',
    category: 'mystery',
    rarity:   'legendary',
    unlockKey:'STREAK_30',
    requirement: 'Manter ofensiva (streak) de 30 dias.',
    color:    '#ff1744',
    glowColor:'rgba(255,23,68,0.9)',
    frame:    'gold',
  },

  {
    id:       'badge_god_killer',
    name:     'Matador de Deuses',
    lore:     'Cinquenta cabeças colhidas. Os deuses tremem.',
    icon:     '💀',
    asset:    'matador_de_deuses',
    category: 'combat',
    rarity:   'legendary',
    unlockKey:'BOSS_SLAYER_50',
    requirement: 'Derrotar 50 Chefes.',
    color:    '#ffffff',
    glowColor:'rgba(255,255,255,0.9)',
    frame:    'gold',
  },
];

/**
 * Mapa de lookup: id → badge object (O(1) access)
 */
export const BADGE_MAP = Object.fromEntries(
  BADGE_CATALOG.map(b => [b.id, b])
);

/**
 * Mapa unlockKey → badge id (para lookup reverso)
 */
export const BADGE_BY_KEY = Object.fromEntries(
  BADGE_CATALOG.map(b => [b.unlockKey, b.id])
);

/**
 * Metadados visuais por raridade
 */
export const RARITY_META = {
  common:    { label: 'Comum',     color: '#90a4ae', glow: 'rgba(144,164,174,0.4)' },
  uncommon:  { label: 'Incomum',   color: '#66bb6a', glow: 'rgba(102,187,106,0.5)' },
  rare:      { label: 'Raro',      color: '#5c6bc0', glow: 'rgba(92,107,192,0.6)'  },
  legendary: { label: 'Lendário',  color: '#ffd700', glow: 'rgba(255,215,0,0.75)'  },
};

/**
 * Retorna a badge pelo ID ou null se não existir
 */
export function getBadgeById(id) {
  return BADGE_MAP[id] ?? null;
}

/**
 * Retorna o ID da badge associada a uma unlockKey, ou null
 */
export function getBadgeIdByKey(key) {
  return BADGE_BY_KEY[key] ?? null;
}

/**
 * Retorna as badges desbloqueadas a partir de um array de IDs
 */
export function getUnlockedBadges(unlockedIds = []) {
  const set = new Set(unlockedIds);
  return BADGE_CATALOG.filter(b => set.has(b.id));
}

/**
 * Retorna as badges ainda bloqueadas
 */
export function getLockedBadges(unlockedIds = []) {
  const set = new Set(unlockedIds);
  return BADGE_CATALOG.filter(b => !set.has(b.id));
}

/**
 * Gera o SVG de uma badge para exibição inline.
 * Usado para o medalhão na sidebar e nos cards do Arsenal.
 *
 * @param {Object} badge - Objeto badge do catálogo
 * @param {Object} opts  - { size: number, glow: bool, locked: bool }
 */
export function renderBadgeSVG(badge, opts = {}) {
  const size   = opts.size   ?? 64;
  const glow   = opts.glow   ?? true;
  const locked = opts.locked ?? false;

  const filterId = `glow-${badge.id}`;
  const glowColor = badge.glowColor ?? 'rgba(255,215,0,0.7)';

  // Frame border color
  const frameColors = {
    gold:   ['#ffd700', '#b8860b'],
    silver: ['#c0c0c0', '#808080'],
    bronze: ['#cd7f32', '#8b4513'],
    void:   ['#7c4dff', '#3d0066'],
  };
  const [frameOuter, frameInner] = frameColors[badge.frame ?? 'bronze'];

  const glowFilter = glow && !locked ? `
    <defs>
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feFlood flood-color="${badge.color}" flood-opacity="0.7" result="color"/>
        <feComposite in="color" in2="blur" operator="in" result="glow"/>
        <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  ` : '';

  const saturation = locked ? 'filter: saturate(0) brightness(0.4);' : '';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
         viewBox="0 0 80 80" style="${saturation}">
      ${glowFilter}
      
      <!-- Badge Image/Icon Container -->
      <g transform="translate(40, 40)">
        ${locked ? `
          <!-- Locked state: structure to show where the badge would be -->
          <polygon points="40,-38 72,-20 72,20 40,38 8,20 8,-20" transform="translate(-40,-40)"
                   fill="#0d0d1a" stroke="${frameOuter}" stroke-width="2" opacity="0.4"/>
          <text x="0" y="8" font-size="32" text-anchor="middle" dominant-baseline="middle" font-family="serif">🔒</text>
        ` : `
          <!-- Custom image from assets/badges/ — No SVG Hex border needed as it's part of the image -->
          <image href="assets/badges/${badge.asset ?? badge.name.toLowerCase().replace(/ /g, '_')}.webp" 
                 x="-40" y="-40" width="80" height="80" 
                 style="image-rendering: pixelated;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
                 
          <!-- Fallback Icon (initially hidden, shown via JS if image fails) -->
          <text x="0" y="8" font-size="32" text-anchor="middle" dominant-baseline="middle" 
                font-family="serif" style="display:none;">${badge.icon}</text>
        `}
      </g>
    </svg>
  `.trim();
}

/**
 * Gera o SVG do medalhão padrão (D20) para quando nenhuma badge está equipada
 */
export function renderDefaultMedallionSVG(size = 48) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
         viewBox="0 0 64 64">
      <defs>
        <filter id="d20-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feFlood flood-color="#5c6bc0" flood-opacity="0.5" result="color"/>
          <feComposite in="color" in2="blur" operator="in" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Hex frame -->
      <polygon points="32,2 58,16 58,48 32,62 6,48 6,16"
               fill="#13132b" stroke="#5c6bc0" stroke-width="2.5"
               filter="url(#d20-glow)"/>
      <polygon points="32,7 53,19 53,45 32,57 11,45 11,19"
               fill="none" stroke="#3949ab" stroke-width="1" opacity="0.6"/>
      <!-- D20 face -->
      <text x="32" y="42" font-size="30" text-anchor="middle"
            font-family="serif">🎲</text>
    </svg>
  `.trim();
}
