/**
 * Shadow Slave Life OS — Drop Engine (Módulo de RNG)
 * =====================================================
 * Sistema de loot que calcula drops ao completar tarefas e ao derrotar Bosses.
 *
 * Design:
 *  - A loot_table é recebida como parâmetro (vinda do Firestore), tornando este módulo
 *    completamente independente de como/onde os dados são armazenados.
 *  - Funções puras: sem side effects, fácil de testar unitariamente.
 *  - Suporta tanto drops de tarefas normais (chance %) quanto drops de Boss (100% garantido,
 *    filtrado por rank adequado).
 */

// ============================================================
//   RANKS DO SISTEMA
// ============================================================

export const RANKS = [
  'Adormecido',
  'Desperto',
  'Ascendido',
  'Mestre',
  'Santo',
  'Soberano',
  'Sagrado',
  'Divino'
];

/**
 * Retorna o índice numérico do rank (0 = Adormecido, 5 = Soberano).
 * @param {string} rankName
 * @returns {number}
 */
export function rankIndex(rankName) {
  const idx = RANKS.indexOf(rankName);
  return idx === -1 ? 0 : idx;
}

// ============================================================
//   CHANCE BASE DE DROP POR TIPO DE FONTE
// ============================================================

/**
 * Probabilidade base (0–1) de um drop acontecer ao concluir uma tarefa.
 * Ajustada pelo rank do jogador (jogadores mais avançados têm acesso a
 * itens melhores, mas a chance base de drop permanece igual).
 */
const BASE_DROP_CHANCE = {
  quest_normal:   0.18,   // 18% de chance de dropar um item ao concluir quest
  quest_boss_sub: 0.35,   // 35% se a tarefa é subtarefa de boss (Encontro)
  boss_defeat:    1.00,   // 100% garantido ao derrotar Boss
};

// ============================================================
//   FILTROS DE ELEGIBILIDADE
// ============================================================

/**
 * Filtra a loot_table retornando apenas itens elegíveis para o jogador e a fonte.
 *
 * @param {Array<Object>} lootTable    - Array de documentos da coleção loot_table
 * @param {Object}        playerRank   - { rank: "Ascendido", rank_index: 2 }
 * @param {'quest'|'boss'} source      - Origem do drop
 * @returns {Array<Object>}             - Itens que podem ser dropados
 */
function getEligibleItems(lootTable, playerRank, source) {
  return lootTable.filter(item => {
    if (!item.is_active) return false;

    // O item precisa indicar que a fonte (quest ou boss) pode dropá-lo
    if (!item.eligible_for.includes(source)) return false;

    // O jogador precisa ter atingido o rank mínimo para receber o item
    const minRankIdx = rankIndex(item.min_rank_to_drop ?? 'Adormecido');
    if (playerRank.rank_index < minRankIdx) return false;

    return true;
  });
}

// ============================================================
//   WEIGHTED RANDOM SELECTION
// ============================================================

/**
 * Seleciona um item da lista usando seleção ponderada pelo campo `rarity_weight`.
 * Itens com peso maior têm maior probabilidade de serem escolhidos.
 *
 * @param {Array<Object>} items - Lista de itens elegíveis (com campo rarity_weight)
 * @param {()=>number}    rng   - Função geradora de número aleatório [0,1) — injetável para testes
 * @returns {Object|null}        - Item selecionado ou null se lista vazia
 */
export function weightedRandom(items, rng = Math.random) {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + (item.rarity_weight ?? 1), 0);
  let roll = rng() * totalWeight;

  for (const item of items) {
    roll -= (item.rarity_weight ?? 1);
    if (roll <= 0) return item;
  }

  // Fallback (floating point edge case)
  return items[items.length - 1];
}

// ============================================================
//   CORE: ROLAR DROP (QUEST NORMAL)
// ============================================================

/**
 * Calcula se uma Memória é dropada ao concluir uma tarefa normal.
 *
 * @param {Object}         options
 * @param {Array<Object>}  options.lootTable    - Coleção completa da loot_table
 * @param {Object}         options.player       - { rank: string, rank_index: number }
 * @param {boolean}        [options.isBossSub]  - true se a tarefa é subtarefa de um Boss
 * @param {()=>number}     [options.rng]        - RNG injetável (padrão: Math.random)
 *
 * @returns {{ dropped: boolean, item: Object|null, roll: number, threshold: number }}
 */
export function rollQuestDrop({ lootTable, player, isBossSub = false, rng = Math.random }) {
  const threshold = isBossSub
    ? BASE_DROP_CHANCE.quest_boss_sub
    : BASE_DROP_CHANCE.quest_normal;

  const roll = rng();
  const dropped = roll < threshold;

  if (!dropped) {
    return { dropped: false, item: null, roll, threshold };
  }

  const source = 'quest';
  const eligible = getEligibleItems(lootTable, player, source);
  const item = weightedRandom(eligible, rng);

  return { dropped: !!item, item, roll, threshold };
}

// ============================================================
//   CORE: ROLAR DROP (BOSS DEFEAT) — 100% garantido
// ============================================================

/**
 * Aplica drops garantidos ao derrotar um Boss.
 * Retorna TODOS os drops: fixos (guaranteed_drops do boss_registry) +
 * drops extras por RNG filtrados pelo rank do player e do Boss.
 *
 * @param {Object}        options
 * @param {Array<Object>} options.lootTable          - Coleção completa da loot_table
 * @param {Array<string>} options.guaranteedDropIds   - IDs fixos do boss_registry.guaranteed_drops
 * @param {string}        options.bossRank            - Rank do Boss (usado para drop_rank_min extra)
 * @param {Object}        options.player              - { rank: string, rank_index: number }
 * @param {()=>number}    [options.rng]               - RNG injetável
 *
 * @returns {{ items: Array<Object>, guaranteed: Array<Object>, bonus: Object|null }}
 */
export function rollBossDrop({ lootTable, guaranteedDropIds, bossRank, player, rng = Math.random }) {
  // 1. Drops fixos (guaranteed)
  const guaranteed = guaranteedDropIds
    .map(id => lootTable.find(item => item.id === id))
    .filter(Boolean);

  // 2. Drop extra por RNG (elegíveis para boss e com rank >= rank do boss)
  const eligible = getEligibleItems(lootTable, player, 'boss').filter(item => {
    const itemRankIdx = rankIndex(item.rank);
    const bossRankIdx = rankIndex(bossRank);
    return itemRankIdx >= bossRankIdx - 1; // permite 1 nível abaixo do boss
  });

  // Boss drops extras: 1 item adicional ponderado (sempre acontece)
  const bonus = weightedRandom(eligible, rng);

  const items = [
    ...guaranteed,
    ...(bonus && !guaranteed.find(g => g.id === bonus.id) ? [bonus] : []),
  ];

  return { items, guaranteed, bonus };
}

// ============================================================
//   FRAGMENTOS DE SOMBRA (XP) — RANK THRESHOLDS
// ============================================================

/**
 * Tabela de Fragmentos Totais necessários para cada Rank.
 * Baseada em progressão logarítmica agressiva.
 */
export const RANK_THRESHOLDS = {
  Adormecido: 0,
  Desperto:   500,
  Ascendido:  2_000,
  Mestre:     8_000,
  Santo:      25_000,
  Soberano:   100_000,
  Sagrado:    250_000,
  Divino:     1_000_000,
};

/**
 * Calcula o Rank atual do jogador com base nos Fragmentos totais acumulados.
 *
 * @param {number} fragmentosTotal - Total de Fragmentos acumulados (nunca reseta)
 * @returns {{ rank: string, rank_index: number, next_rank: string|null, fragmentos_to_next: number }}
 */
export function calcRank(fragmentosTotal) {
  let currentRank = 'Adormecido';
  let currentIdx  = 0;

  for (const [rank, threshold] of Object.entries(RANK_THRESHOLDS)) {
    if (fragmentosTotal >= threshold) {
      currentRank = rank;
      currentIdx  = rankIndex(rank);
    }
  }

  const nextRankName = RANKS[currentIdx + 1] ?? null;
  const nextThreshold = nextRankName ? RANK_THRESHOLDS[nextRankName] : null;
  const fragmentosToNext = nextThreshold !== null
    ? Math.max(0, nextThreshold - fragmentosTotal)
    : 0;

  return {
    rank:               currentRank,
    rank_index:         currentIdx,
    next_rank:          nextRankName,
    fragmentos_to_next: fragmentosToNext,
    progress_pct:       nextThreshold !== null
      ? ((fragmentosTotal - RANK_THRESHOLDS[currentRank]) /
         (nextThreshold      - RANK_THRESHOLDS[currentRank])) * 100
      : 100,
  };
}

// ============================================================
//   HELPER: FORMATAR RESULTADO DE DROP PARA A UI
// ============================================================

/**
 * Converte o resultado de um drop em uma estrutura pronta para exibir na UI.
 *
 * @param {Object|null} item - Item dropado (pode ser null)
 * @returns {Object}          - Objeto de UI com campos garantidos
 */
export function formatDropResult(item) {
  if (!item) return { dropped: false };
  return {
    dropped:       true,
    id:            item.id,
    name:          item.name,
    rank:          item.rank,
    type:          item.type,
    description:   item.description,
    lore_origin:   item.lore_origin ?? '',
    enchantments:  item.enchantments ?? [],
    image_url:     item.image_url ?? null,
  };
}

// ============================================================
//   EXEMPLO DE USO (comentado, para referência)
// ============================================================

/*
import { rollQuestDrop, rollBossDrop, calcRank, formatDropResult } from './drop_engine.js';

// Ao completar uma quest normal:
const result = rollQuestDrop({
  lootTable:  await getCollection('loot_table'),  // do Firestore
  player:     { rank: 'Ascendido', rank_index: 2 },
  isBossSub:  false,
});

if (result.dropped) {
  const ui = formatDropResult(result.item);
  showMemoriaObtidaOverlay(ui);  // exibir na UI
  await addToInventory(uid, result.item.id, 'quest', quest_id);  // salvar no Firestore
}

// Ao derrotar um Boss:
const bossDrops = rollBossDrop({
  lootTable:        await getCollection('loot_table'),
  guaranteedDropIds: boss.guaranteed_drops,
  bossRank:          boss.rank,
  player:            { rank: 'Ascendido', rank_index: 2 },
});

for (const item of bossDrops.items) {
  await addToInventory(uid, item.id, 'boss', boss_id);
}

// Calcular rank atual:
const rankInfo = calcRank(player.progression.fragmentos_total);
// rankInfo = { rank: 'Ascendido', rank_index: 2, next_rank: 'Mestre',
//              fragmentos_to_next: 5200, progress_pct: 35.5 }
*/
