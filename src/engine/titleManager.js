/**
 * Shadow Slave Life OS — Title Manager Module
 * Calculates the player's dynamic Title based on stats and achievements.
 */

import { calcRank } from './drop_engine.js';

/**
 * Avalia o progresso geral do jogador e retorna o título de maior prestígio aplicável.
 * 
 * @param {Object} state O estado atual do jogo (loadState)
 * @returns {string} O título dinâmico a ser exibido no perfil.
 */
export function getPlayerTitle(state) {
  if (!state || !state.player) return "Iniciado";

  const attrs = state.player.attributes || {};
  const intVal = attrs.INT?.value || 0;
  const artVal = attrs.ART?.value || 0;
  const aveVal = attrs.AVE?.value || 0;

  const stats = state.player.stats || {};
  const bossKills = stats.bosses_defeated || 0;
  const questsDone = stats.quests_completed || 0;
  
  const xpTotal = stats.total_xp_earned || state.player.xp || 0;
  const rankInfo = calcRank(xpTotal);
  const rankIdx = rankInfo.rank_index; // 0=Adormecido .. 7=Divino

  // A lista deve ir dos mais difíceis/específicos (que sobrescrevem os outros) para os mais simples.
  
  // Tiers Mítico/Divino
  if (rankIdx >= 7 && bossKills > 20) return "Senhor dos Pesadelos";
  if (rankIdx >= 6 && questsDone > 500) return "Tecelão do Vazio";

  // Combinações Híbridas de Alto Nível
  if (intVal > 100 && aveVal > 100 && rankIdx >= 4) return "Lâmina Sábia";
  if (artVal > 100 && aveVal > 100 && rankIdx >= 4) return "Ceifador Artístico";
  if (intVal > 100 && artVal > 100 && rankIdx >= 4) return "Criador de Milagres";

  // Foco Singular
  if (intVal > 50 && rankIdx >= 3) return "Sábio da Torre";
  if (aveVal > 50 && rankIdx >= 3) return "Explorador do Vazio";
  if (artVal > 50 && rankIdx >= 3) return "Artesão Dourado";

  // Conquistas Específicas
  if (bossKills >= 10) return "Assassino de Titãs";
  if (bossKills >= 5) return "Caçador de Pesadelos";
  if (questsDone >= 250) return "Vontade de Ferro";
  if (questsDone >= 100) return "Incansável";

  // Tier Básico
  if (rankIdx === 1) return "Desperto Recente";
  if (rankIdx === 2) return "Veterano";
  if (rankIdx >= 3) return "Mestre Respeitado";

  return "Iniciado";
}
