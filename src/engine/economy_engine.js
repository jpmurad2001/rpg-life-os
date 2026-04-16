/**
 * Shadow Slave Life OS — Economy Engine v3.1
 * ============================================
 * "A Forja de Memórias & O Mercado"
 *
 * Módulo 100% puro (sem side-effects).
 * Todas as funções recebem parâmetros explícitos e retornam valores.
 * RNG é injetável para testes determinísticos.
 *
 * Economia Hardcore:
 *  - Ouro (gold_coins): moeda de troca do Mercado
 *  - Fragmentos de Sombra (shadow_fragments): combustível da Forja
 *  - Drops escassos, custos altos → valoriza o esforço do jogador
 */

// ============================================================
//   CONFIGURAÇÃO DE DROPS POR FONTE
// ============================================================

/**
 * Tabela de drops de Gold Coins por fonte de ação.
 * Balanceamento hardcore: ouro é valioso, não abundante.
 *
 * @type {Record<string, { min: number, max: number, fragmentChance: number, fragmentMin: number, fragmentMax: number }>}
 */
export const GOLD_DROP_CONFIG = {
  pomodoro: {
    min:             0,
    max:             0,
    fragmentChance:  0.0,
    fragmentMin:     0,
    fragmentMax:     0,
  },
  quest: {
    min:             0,
    max:             0,
    fragmentChance:  0.0,
    fragmentMin:     0,
    fragmentMax:     0,
  },
  boss: {
    min:             0,
    max:             0,
    fragmentChance:  0.0,
    fragmentMin:     0,
    fragmentMax:     0,
  },
};

// ============================================================
//   RECEITAS DA FORJA
// ============================================================

/**
 * Catálogo de receitas de forja de Memórias.
 * Custos deliberadamente altos para criar progressão punitiva e significativa.
 *
 * @type {Array<{
 *   id: string,
 *   name: string,
 *   rank: string,
 *   fragment_cost: number,
 *   lore: string,
 *   effect: string,
 *   rarity: string,
 * }>}
 */
export const FORGE_RECIPES = [
  {
    id:             'forge_desperto',
    name:           'Memória Desperta',
    rank:           'Desperto',
    fragment_cost:  10,
    lore:           'O eco de um sonho que ainda não virou pesadelo.',
    effect:         'Equipável em qualquer Slot de Memória.',
    rarity:         'common',
  },
  {
    id:             'forge_ascendido',
    name:           'Memória Ascendida',
    rank:           'Ascendido',
    fragment_cost:  30,
    lore:           'Forjada nas cinzas de mil falhas superadas.',
    effect:         'Bônus de Slot aumentado em 2%.',
    rarity:         'uncommon',
  },
  {
    id:             'forge_mestre',
    name:           'Memória Mestra',
    rank:           'Mestre',
    fragment_cost:  100,
    lore:           'Apenas os que não pararam de batalhar chegam aqui.',
    effect:         'Bônus de Slot aumentado em 5%.',
    rarity:         'rare',
  },
  {
    id:             'forge_santo',
    name:           'Memória Sagrada',
    rank:           'Santo',
    fragment_cost:  250,
    lore:           'Cristalizada na câmara mais profunda da Sombra.',
    effect:         'Bônus de Slot aumentado em 8%.',
    rarity:         'epic',
  },
  {
    id:             'forge_soberano',
    name:           'Memória Soberana',
    rank:           'Soberano',
    fragment_cost:  500,
    lore:           'O preço da soberania é pago em suor e ausência.',
    effect:         'Bônus de Slot aumentado em 12%.',
    rarity:         'legendary',
  },
  {
    id:             'forge_sagrado',
    name:           'Memória Sagrada Superior',
    rank:           'Sagrado',
    fragment_cost:  1500,
    lore:           'Quebrada e reforjada sete vezes pela vontade de continuar.',
    effect:         'Bônus de Slot aumentado em 20%.',
    rarity:         'mythic',
  },
  {
    id:             'forge_divino',
    name:           'Memória Divina',
    rank:           'Divino',
    fragment_cost:  5000,
    lore:           'Quando a Sombra te conhece pelo nome e ainda assim você caminha.',
    effect:         'Bônus de Slot aumentado em 35%.',
    rarity:         'divine',
  },
];

// ============================================================
//   7 SLOTS DE MEMÓRIA
// ============================================================

/**
 * Definição dos 7 Slots de Memória do perfil do jogador.
 * O bônus é do Slot, não da Memória — qualquer Memória equipada ativa o bônus.
 *
 * @type {Array<{
 *   key: string,
 *   label: string,
 *   icon: string,
 *   bonus_type: string,
 *   bonus_value: number,
 *   bonus_label: string,
 *   color: string,
 * }>}
 */
export const MEMORY_SLOTS = [
  {
    key:          'Slot_XP',
    label:        'Slot XP',
    icon:         '✨',
    bonus_type:   'xp_multiplier',
    bonus_value:  0.10,        // +10%
    bonus_label:  '+10% XP Global',
    color:        '#ffd700',
  },
  {
    key:          'Slot_Attr1',
    label:        'Slot INT',
    icon:         '🧠',
    bonus_type:   'attr_xp_multiplier',
    bonus_attr:   'INT',
    bonus_value:  0.15,        // +15%
    bonus_label:  '+15% XP em INT',
    color:        '#9c7cf4',
  },
  {
    key:          'Slot_Attr2',
    label:        'Slot ART',
    icon:         '🎨',
    bonus_type:   'attr_xp_multiplier',
    bonus_attr:   'ART',
    bonus_value:  0.15,
    bonus_label:  '+15% XP em ART',
    color:        '#ff6b9d',
  },
  {
    key:          'Slot_Attr3',
    label:        'Slot AVE',
    icon:         '🗡️',
    bonus_type:   'attr_xp_multiplier',
    bonus_attr:   'AVE',
    bonus_value:  0.15,
    bonus_label:  '+15% XP em AVE',
    color:        '#4fc3f7',
  },
  {
    key:          'Slot_Attr4',
    label:        'Slot FOR',
    icon:         '💪',
    bonus_type:   'attr_xp_multiplier',
    bonus_attr:   'FOR',
    bonus_value:  0.15,
    bonus_label:  '+15% XP em FOR',
    color:        '#ff5252',
  },
  {
    key:          'Slot_Attr5',
    label:        'Slot CAR',
    icon:         '🎭',
    bonus_type:   'attr_xp_multiplier',
    bonus_attr:   'CAR',
    bonus_value:  0.15,
    bonus_label:  '+15% XP em CAR',
    color:        '#ffb74d',
  },
  {
    key:          'Slot_DropRate',
    label:        'Slot Drop',
    icon:         '💎',
    bonus_type:   'drop_rate_bonus',
    bonus_value:  0.05,        // +5%
    bonus_label:  '+5% Chance de Drop',
    color:        '#b39ddb',
  },
];

/** Mapa chave → definição de slot (lookup rápido) */
export const MEMORY_SLOT_BY_KEY = Object.fromEntries(MEMORY_SLOTS.map(s => [s.key, s]));

// ============================================================
//   CATÁLOGO DO MERCADO — COSMÉTICOS
// ============================================================

/**
 * Itens cosméticos disponíveis no Mercado.
 * Preços altos são intencionais — themes são marcos de progressão.
 *
 * @type {Array<{ id: string, name: string, type: string, cost_gold: number, description: string }>}
 */
export const MARKET_COSMETICS = [
  {
    id:          'theme_blood_mode',
    name:        'Blood Mode',
    type:        'theme',
    cost_gold:   1000,
    theme_id:    'blood-mode',
    description: 'Carmesim + Sombra Vampírica. Para os que sobreviveram à escuridão.',
    icon:        '🩸',
  },
  {
    id:          'theme_void_mode',
    name:        'Void Mode',
    type:        'theme',
    cost_gold:   1500,
    theme_id:    'void-mode',
    description: 'Roxo Cósmico + Corrupção. A Sombra te escolheu.',
    icon:        '🌌',
  },
  {
    id:          'frame_ext_shadow',
    name:        'Sombra Eterna (Moldura)',
    type:        'frame',
    cost_gold:   500,
    description: 'Moldura de obsidiana com fumaça púrpura.',
    icon:        '🌑',
  },
  {
    id:          'frame_ext_gold',
    name:        'Prestígio Dourado (Moldura)',
    type:        'frame',
    cost_gold:   2000,
    description: 'Moldura de ouro maciço com brilho heróico.',
    icon:        '🪙',
  },
  {
    id:          'frame_ext_blood',
    name:        'Ritual Carmesim (Moldura)',
    type:        'frame',
    cost_gold:   1200,
    description: 'Moldura de cristal rubi com runas de sangue.',
    icon:        '🩸',
  },
  {
    id:          'frame_ext_cosmic',
    name:        'Vazio Cósmico (Moldura)',
    type:        'frame',
    cost_gold:   1500,
    description: 'Moldura estelar com fragmentos de nebulosa.',
    icon:        '🌌',
  },
  {
    id:          'frame_tecelao',
    name:        'Tecelão do Destino (Moldura)',
    type:        'frame',
    cost_gold:   2500,
    description: 'Linhas de seda dourada que amarram o destino.',
    icon:        '🕸️',
  },
  {
    id:          'frame_nephilim',
    name:        'Chama Nephilim (Moldura)',
    type:        'frame',
    cost_gold:   3500,
    description: 'A luz radiante da linhagem proibida.',
    icon:        '👼',
  },
  {
    id:          'frame_eclipse',
    name:        'Eclipse do Vazio (Moldura)',
    type:        'frame',
    cost_gold:   5000,
    description: 'Onde a luz é devorada pela ausência absoluta.',
    icon:        '🌑',
  },
];

// ============================================================
//   CÁLCULO DE DROPS DE ECONOMIA
// ============================================================

/**
 * Calcula os drops de moeda (gold_coins + shadow_fragments) para uma dada fonte.
 * Função pura — RNG injetável.
 *
 * @param {'pomodoro'|'quest'|'boss'} source  — Origem da ação
 * @param {()=>number}                [rng]   — Gerador de número aleatório [0,1)
 * @returns {{ gold_coins: number, shadow_fragments: number, source: string }}
 */
export function rollEconomyDrop(source, rng = Math.random) {
  const config = GOLD_DROP_CONFIG[source];
  if (!config) {
    console.warn(`[EconomyEngine] Fonte desconhecida: "${source}". Retornando 0.`);
    return { gold_coins: 0, shadow_fragments: 0, source };
  }

  // Gold coins: inteiro aleatório no intervalo [min, max]
  const gold_coins = Math.floor(rng() * (config.max - config.min + 1)) + config.min;

  // Shadow fragments: somente se chance > 0
  let shadow_fragments = 0;
  if (config.fragmentChance > 0 && rng() < config.fragmentChance) {
    shadow_fragments = Math.floor(rng() * (config.fragmentMax - config.fragmentMin + 1)) + config.fragmentMin;
  }

  return { gold_coins, shadow_fragments, source };
}

// ============================================================
//   VALIDAÇÃO DE SALDO
// ============================================================

/**
 * Verifica se o jogador tem saldo suficiente para uma transação.
 *
 * @param {{ gold_coins: number, shadow_fragments: number }} wallet   — Carteira atual
 * @param {{ gold?: number, fragments?: number }}            cost     — Custo da operação
 * @returns {{ canAfford: boolean, reason: string|null }}
 */
export function canAfford(wallet, cost) {
  const goldNeeded      = cost.gold      ?? 0;
  const fragmentsNeeded = cost.fragments ?? 0;

  if (wallet.gold_coins < goldNeeded) {
    return {
      canAfford: false,
      reason: `Ouro insuficiente. Você tem ${wallet.gold_coins} e precisa de ${goldNeeded}.`,
    };
  }

  if (wallet.shadow_fragments < fragmentsNeeded) {
    return {
      canAfford: false,
      reason: `Fragmentos insuficientes. Você tem ${wallet.shadow_fragments} e precisa de ${fragmentsNeeded}.`,
    };
  }

  return { canAfford: true, reason: null };
}

// ============================================================
//   CÁLCULO DOS BÔNUS ATIVOS DE SLOTS
// ============================================================

/**
 * Calcula os modificadores totais com base nos Slots de Memória equipados.
 *
 * @param {Record<string, { inventory_id: string, loot_id: string }|null>} equippedSlots
 *   Mapa de slotKey → { inventory_id, loot_id } | null
 * @returns {{
 *   xp_multiplier: number,       // ex: 1.10 quando Slot_XP equipado
 *   attr_multipliers: Record<string, number>, // ex: { INT: 1.15, ART: 1.0, ... }
 *   drop_rate_bonus: number,     // ex: 0.05
 * }}
 */
export function calcSlotBonuses(equippedSlots) {
  const result = {
    xp_multiplier:    1.0,
    attr_multipliers: { INT: 1.0, ART: 1.0, AVE: 1.0, FOR: 1.0, CAR: 1.0 },
    drop_rate_bonus:  0.0,
  };

  for (const slot of MEMORY_SLOTS) {
    const equipped = equippedSlots?.[slot.key];
    if (!equipped) continue;   // slot vazio — sem bônus

    switch (slot.bonus_type) {
      case 'xp_multiplier':
        result.xp_multiplier += slot.bonus_value;
        break;

      case 'attr_xp_multiplier':
        if (slot.bonus_attr && result.attr_multipliers[slot.bonus_attr] !== undefined) {
          result.attr_multipliers[slot.bonus_attr] += slot.bonus_value;
        }
        break;

      case 'drop_rate_bonus':
        result.drop_rate_bonus += slot.bonus_value;
        break;
    }
  }

  return result;
}

// ============================================================
//   RESET SEMANAL — CÁLCULO DA PRÓXIMA SEGUNDA-FEIRA
// ============================================================

/**
 * Calcula o timestamp (ms) da próxima segunda-feira à meia-noite.
 * Usado para exibir countdown no Mercado para itens IRL.
 *
 * @param {Date} [now] — Data de referência (padrão: agora)
 * @returns {{ resetAt: number, msUntilReset: number, resetDateStr: string }}
 */
export function calcWeeklyReset(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);

  // Dia da semana: 0=Dom, 1=Seg... 6=Sáb
  const dayOfWeek = d.getDay();
  // Dias até a próxima segunda (0 se hoje é segunda, senão dias restantes)
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;

  d.setDate(d.getDate() + daysUntilMonday);

  return {
    resetAt:        d.getTime(),
    msUntilReset:   d.getTime() - now.getTime(),
    resetDateStr:   d.toISOString().slice(0, 10),
  };
}

/**
 * Retorna qual é a "semana IRL" atual (chave YYYY-Www).
 * Usada como campo de controle de limite de compras por semana.
 *
 * @param {Date} [now]
 * @returns {string}  ex: "2026-W16"
 */
export function currentIRLWeekKey(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ============================================================
//   FORMATAÇÃO DE MOEDA
// ============================================================

/**
 * Formata o valor de gold_coins com separador de milhar.
 * @param {number} amount
 * @returns {string}  ex: "1.250"
 */
export function formatGold(amount) {
  return Math.floor(amount).toLocaleString('pt-BR');
}

/**
 * Retorna o asset SVG correto de pilha de ouro de acordo com a quantidade.
 * @param {number} amount
 * @returns {string}  nome do arquivo SVG (sem extensão)
 */
export function goldTierAsset(amount) {
  if (amount  >=  500) return 'gold_sea';
  if (amount  >=  100) return 'gold_chest';
  if (amount  >=   20) return 'gold_many';
  if (amount  >=    5) return 'gold_few';
  return 'gold_single';
}

// ============================================================
//   LOOKUP DE RECEITA
// ============================================================

/**
 * Retorna a receita de forja pelo ID.
 * @param {string} recipeId
 * @returns {Object|null}
 */
export function getForgeRecipeById(recipeId) {
  return FORGE_RECIPES.find(r => r.id === recipeId) ?? null;
}
