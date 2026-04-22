/**
 * Shadow Slave Life OS — Loadout Slots Config
 * =============================================
 * Definição dos 7 slots de equipamentos do painel de Loadout.
 * A regra de ouro: os efeitos pertencem aos SLOTS, não aos itens.
 * Qualquer Memória ou Eco equipado ativa o bônus passivo do slot.
 */

/**
 * @typedef {Object} LoadoutSlot
 * @property {string} id           - Identificador único do slot
 * @property {string} label        - Nome do slot exibido na UI
 * @property {string} icon         - Emoji/ícone do slot
 * @property {string} bonus_label  - Texto do bônus passivo
 * @property {string} bonus_color  - Cor CSS quando ativo (variável ou hex)
 * @property {string} attr_key     - Atributo relacionado (para filtro futuro), '' se nenhum
 */

/** @type {LoadoutSlot[]} */
export const LOADOUT_SLOTS = [
  {
    id:          'slot_xp',
    label:       'XP',
    icon:        '⭐',
    bonus_label: '+10% Ganho de XP',
    bonus_color: 'var(--color-xp)',
    attr_key:    '',
  },
  {
    id:          'slot_drop',
    label:       'Drop Rate',
    icon:        '💎',
    bonus_label: '+5% Chance de Drops',
    bonus_color: 'var(--color-gold)',
    attr_key:    '',
  },
  {
    id:          'slot_for',
    label:       'Força',
    icon:        '💪',
    bonus_label: '+5% Ganho de Força',
    bonus_color: 'var(--color-for)',
    attr_key:    'FOR',
  },
  {
    id:          'slot_int',
    label:       'Inteligência',
    icon:        '🧠',
    bonus_label: '+5% Ganho de Inteligência',
    bonus_color: 'var(--color-int)',
    attr_key:    'INT',
  },
  {
    id:          'slot_ave',
    label:       'Aventura',
    icon:        '⚡',
    bonus_label: '+5% Ganho de Aventura',
    bonus_color: 'var(--color-ave)',
    attr_key:    'AVE',
  },
  {
    id:          'slot_art',
    label:       'Arte',
    icon:        '🔮',
    bonus_label: '+5% Ganho de Arte',
    bonus_color: 'var(--color-art)',
    attr_key:    'ART',
  },
  {
    id:          'slot_car',
    label:       'Carisma',
    icon:        '✨',
    bonus_label: '+5% Ganho de Carisma',
    bonus_color: 'var(--color-car)',
    attr_key:    'CAR',
  },
];
