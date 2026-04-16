/**
 * Shadow Slave Life OS — Title Manager Module
 * Calculates the player's dynamic Title and its corresponding Audio Tier.
 */

import { calcRank } from './drop_engine.js';

/**
 * Avalia o progresso geral do jogador e retorna um objeto com o Título e o Tier de Áudio.
 * @param {Object} state O estado atual do jogo (loadState)
 * @returns {Object} { title: string, audioTier: number }
 */
export function getPlayerTitle(state) {
  if (!state || !state.player) return { title: "Iniciado", audioTier: 1 };

  const attrs = state.player.attributes || {};
  const intVal = attrs.INT?.value || 0;
  const artVal = attrs.ART?.value || 0;
  const aveVal = attrs.AVE?.value || 0;
  const carVal = attrs.CAR?.value || 0;
  const forVal = attrs.FOR?.value || 0;

  const stats = state.player.stats || {};
  const bossKills = stats.bosses_defeated || 0;
  const questsDone = stats.quests_completed || 0;

  const xpTotal = stats.total_xp_earned || state.player.xp || 0;
  const rankInfo = calcRank(xpTotal);
  const rankIdx = rankInfo.rank_index;

  // --- Tier 6 (Áudio 6 - Divino/Mítico) ---
  if (rankIdx >= 7 && bossKills > 50) return { title: "Fim do Pesadelo", audioTier: 6 };
  if (rankIdx >= 7 && bossKills > 20) return { title: "Senhor das Sombras", audioTier: 6 };
  if (rankIdx >= 6 && questsDone > 1000) return { title: "Herdeiro do Tecelão", audioTier: 6 };
  if (rankIdx >= 6 && questsDone > 500) return { title: "Demônio do Vazio", audioTier: 6 };

  // --- Tier 5 (Áudio 5 - Soberano/Sagrado | Lendário) ---
  if (intVal > 150 && artVal > 150 && rankIdx >= 5) return { title: "Lorde Feiticeiro", audioTier: 5 };
  if (forVal > 150 && aveVal > 150 && rankIdx >= 5) return { title: "Santo da Guerra", audioTier: 5 };
  if (carVal > 150 && aveVal > 150 && rankIdx >= 5) return { title: "Comandante da Coorte", audioTier: 5 };

  // --- Tier 4 (Áudio 4 - Santo | Épico) ---
  if (forVal > 100 && artVal > 100 && rankIdx >= 4) return { title: "Artífice da Morte", audioTier: 4 };
  if (forVal > 100 && carVal > 100 && rankIdx >= 4) return { title: "Tirano do Abismo", audioTier: 4 };
  if (carVal > 100 && intVal > 100 && rankIdx >= 4) return { title: "Mestre dos Sussurros", audioTier: 4 };
  if (forVal > 100 && intVal > 100 && rankIdx >= 4) return { title: "Mago de Batalha", audioTier: 4 };
  if (forVal > 100 && aveVal > 100 && rankIdx >= 4) return { title: "Juggernaut do Labirinto", audioTier: 4 };
  if (carVal > 100 && artVal > 100 && rankIdx >= 4) return { title: "Bardo das Sombras", audioTier: 4 };
  if (intVal > 100 && aveVal > 100 && rankIdx >= 4) return { title: "Lâmina Sábia", audioTier: 4 };
  if (artVal > 100 && aveVal > 100 && rankIdx >= 4) return { title: "Ceifador Artístico", audioTier: 4 };
  if (intVal > 100 && artVal > 100 && rankIdx >= 4) return { title: "Criador de Milagres", audioTier: 4 };
  if (bossKills >= 30) return { title: "Algoz de Corrompidos", audioTier: 4 };
  if (questsDone >= 500) return { title: "Cativo do Destino", audioTier: 4 };

  // --- Tier 3 (Áudio 3 - Mestre | Raro) ---
  if (forVal > 80 && rankIdx >= 4) return { title: "Vanguarda Transcendida", audioTier: 3 };
  if (intVal > 80 && rankIdx >= 4) return { title: "Vidente do Destino", audioTier: 3 };
  if (carVal > 80 && rankIdx >= 4) return { title: "Voz do Feitiço", audioTier: 3 };
  if (artVal > 80 && rankIdx >= 4) return { title: "Forjador de Memórias", audioTier: 3 };
  if (aveVal > 80 && rankIdx >= 4) return { title: "Andarilho do Reino dos Sonhos", audioTier: 3 };
  if (bossKills >= 10) return { title: "Assassino de Titãs", audioTier: 3 };
  if (questsDone >= 250) return { title: "Vontade de Ferro", audioTier: 3 };

  // --- Tier 2 (Áudio 2 - Ascendido | Incomum) ---
  if (forVal > 50 && rankIdx >= 3) return { title: "Colosso de Pedra", audioTier: 2 };
  if (carVal > 50 && rankIdx >= 3) return { title: "Soberano dos Ecos", audioTier: 2 };
  if (intVal > 50 && rankIdx >= 3) return { title: "Sábio da Torre", audioTier: 2 };
  if (aveVal > 50 && rankIdx >= 3) return { title: "Explorador de Ruínas", audioTier: 2 };
  if (artVal > 50 && rankIdx >= 3) return { title: "Artesão Dourado", audioTier: 2 };
  if (bossKills >= 5) return { title: "Caçador de Pesadelos", audioTier: 2 };

  // --- Tier 1 (Áudio 1 - Adormecido/Desperto | Comum) ---
  if (questsDone >= 100) return { title: "Incansável", audioTier: 1 };

  return { title: "Iniciado", audioTier: 1 };
}