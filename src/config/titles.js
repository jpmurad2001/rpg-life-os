/**
 * RPG Life OS — Title Catalog (v3.0 O Despertar da Identidade)
 * =============================================================
 * Títulos desbloqueáveis. Cada título compartilha a unlockKey com
 * uma badge — ao desbloquear a badge, o título correspondente
 * é concedido automaticamente.
 *
 * Estrutura:
 *   id        — chave única
 *   text      — texto exibido no perfil
 *   unlockKey — mapeia para BADGE_UNLOCK_CONDITIONS em core.js
 *   rarity    — 'common' | 'uncommon' | 'rare' | 'legendary'
 *   lore      — descrição narrativa curta
 *   color     — cor do texto no seletor de títulos
 */

export const TITLE_CATALOG = [

  // ── DEFAULT ─────────────────────────────────────────────────────
  {
    id:        'title_default',
    text:      'Iniciado',
    unlockKey: 'DEFAULT',
    rarity:    'common',
    lore:      'O primeiro passo de toda jornada começa nas trevas.',
    color:     '#90a4ae',
  },

  // ── COMBAT ──────────────────────────────────────────────────────
  {
    id:        'title_first_blood',
    text:      'do Primeiro Sangue',
    unlockKey: 'FIRST_QUEST',
    rarity:    'common',
    lore:      'A coragem de erguer a espada pela primeira vez.',
    color:     '#ef5350',
  },
  {
    id:        'title_boss_slayer',
    text:      'Exterminador de Trolls',
    unlockKey: 'BOSS_SLAYER',
    rarity:    'rare',
    lore:      'Quem derrota um chefe é chamado pelo nome.',
    color:     '#e040fb',
  },
  {
    id:        'title_lord_of_war',
    text:      'Senhor da Guerra',
    unlockKey: 'BOSS_SLAYER_10',
    rarity:    'legendary',
    lore:      'Dez chefes tombaram. O Vazio teme seu nome.',
    color:     '#ffd700',
  },
  {
    id:        'title_god_killer',
    text:      'Matador de Deuses',
    unlockKey: 'BOSS_SLAYER_50',
    rarity:    'legendary',
    lore:      'Cinquenta cabeças colhidas. Os deuses tremem.',
    color:     '#ffffff',
  },
  {
    id:        'title_centurion',
    text:      'Centurião',
    unlockKey: 'QUESTS_100',
    rarity:    'rare',
    lore:      'Cem vitórias. A legião das sombras te reconhece.',
    color:     '#80cbc4',
  },

  // ── DISCIPLINE ───────────────────────────────────────────────────
  {
    id:        'title_iron_focus',
    text:      'Foco de Ferro',
    unlockKey: 'POMODORO_STREAK_7',
    rarity:    'uncommon',
    lore:      'A mente como obsidiana, a vontade como aço.',
    color:     '#ff6f00',
  },
  {
    id:        'title_shadow_monk',
    text:      'Monge das Sombras',
    unlockKey: 'POMODORO_50',
    rarity:    'rare',
    lore:      'Cinquenta sessões de foco. A mente transcendeu.',
    color:     '#7c4dff',
  },
  {
    id:        'title_hourglass',
    text:      'Mestre da Ampulheta',
    unlockKey: 'POMODORO_100',
    rarity:    'rare',
    lore:      'O senhor dos segundos não perde nem um.',
    color:     '#ffea00',
  },
  {
    id:        'title_gladiator',
    text:      'Gladiador das Sombras',
    unlockKey: 'WORKOUT_STREAK_7',
    rarity:    'uncommon',
    lore:      'Sete dias. Cada rep forjou um caçador mais forte.',
    color:     '#00e676',
  },
  {
    id:        'title_abyss_walker',
    text:      'Andarilho do Abismo',
    unlockKey: 'STREAK_30',
    rarity:    'legendary',
    lore:      'Trinta dias sem parar. A sanidade é opcional.',
    color:     '#ff1744',
  },

  // ── KNOWLEDGE / ART ─────────────────────────────────────────────
  {
    id:        'title_scholar',
    text:      'Erudito do Abismo',
    unlockKey: 'INT_10',
    rarity:    'uncommon',
    lore:      'O conhecimento forjado nas trevas é eterno.',
    color:     '#4fc3f7',
  },
  {
    id:        'title_artisan',
    text:      'Artesão das Sombras',
    unlockKey: 'ART_10',
    rarity:    'uncommon',
    lore:      'A arte que nasce do caos é a mais bela.',
    color:     '#ff4081',
  },
  {
    id:        'title_titan',
    text:      'Titã de Aço',
    unlockKey: 'FOR_10',
    rarity:    'uncommon',
    lore:      'Seu corpo forjado nas chamas da disciplina.',
    color:     '#ef5350',
  },
  {
    id:        'title_silver_tongue',
    text:      'Língua de Prata',
    unlockKey: 'CAR_10',
    rarity:    'uncommon',
    lore:      'Palavras são armas mais afiadas que qualquer lâmina.',
    color:     '#ffb74d',
  },

  // ── MYSTERY ─────────────────────────────────────────────────────
  {
    id:        'title_the_awakened',
    text:      'O Desperto',
    unlockKey: 'LEVEL_10',
    rarity:    'legendary',
    lore:      'Você cruzou o limiar. O Vazio te reconhece.',
    color:     '#b0bec5',
  },
  {
    id:        'title_dawn_hunter',
    text:      'Caçador da Alvorada',
    unlockKey: 'DAWN_QUESTS_5',
    rarity:    'rare',
    lore:      'O sol nasce para iluminar sua presa.',
    color:     '#ffd54f',
  },
  {
    id:        'title_night_guardian',
    text:      'Guardião Noturno',
    unlockKey: 'NIGHT_QUESTS_5',
    rarity:    'rare',
    lore:      'A escuridão é seu lar. O sono é para os fracos.',
    color:     '#5c6bc0',
  },
  {
    id:        'title_dark_phoenix',
    text:      'Fênix Negra',
    unlockKey: 'STREAK_RECOVERY',
    rarity:    'uncommon',
    lore:      'Renasceu das cinzas mais forte do que antes.',
    color:     '#7c4dff',
  },
  {
    id:        'title_soul_merchant',
    text:      'Mercador de Almas',
    unlockKey: 'GOLD_1000',
    rarity:    'rare',
    lore:      'Ouro flui como sangue. Tudo tem um preço.',
    color:     '#ffd700',
  },
];

export const RARITY_TITLE_META = {
  common:    { label: 'Comum',    glow: 'rgba(144,164,174,0.4)' },
  uncommon:  { label: 'Incomum',  glow: 'rgba(102,187,106,0.5)' },
  rare:      { label: 'Raro',     glow: 'rgba(92,107,192,0.6)'  },
  legendary: { label: 'Lendário', glow: 'rgba(255,215,0,0.75)'  },
};

/** Lookup id → title */
export const TITLE_MAP = Object.fromEntries(
  TITLE_CATALOG.map(t => [t.id, t])
);

/** Lookup unlockKey → title id */
export const TITLE_BY_KEY = Object.fromEntries(
  TITLE_CATALOG.map(t => [t.unlockKey, t.id])
);

export function getTitleById(id)  { return TITLE_MAP[id]    ?? null; }
export function getTitleByKey(key){ return TITLE_BY_KEY[key] ? TITLE_MAP[TITLE_BY_KEY[key]] : null; }

/**
 * Returns the title IDs that should be unlocked given an array of already-unlocked
 * badge unlockKeys (+ the DEFAULT title for everyone).
 * @param {string[]} unlockedBadgeKeys  - e.g. ['FIRST_QUEST', 'BOSS_SLAYER']
 * @param {string[]} alreadyUnlocked    - title IDs already in the player state
 * @returns {string[]} newly unlocked title IDs
 */
export function checkTitleUnlocks(unlockedBadgeKeys, alreadyUnlocked = []) {
  const alreadySet = new Set(alreadyUnlocked);
  const newTitles = [];

  for (const title of TITLE_CATALOG) {
    if (alreadySet.has(title.id)) continue;
    if (title.unlockKey === 'DEFAULT') continue; // handled separately
    if (unlockedBadgeKeys.includes(title.unlockKey)) {
      newTitles.push(title.id);
    }
  }

  return newTitles;
}
