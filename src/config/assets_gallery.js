/**
 * RPG Life OS — Assets Gallery Config (v1.4)
 * ============================================
 * Registre aqui seus mapas e sprites de boss locais.
 * Os arquivos devem estar nas pastas:
 *   Mapas   → /assets/maps/     (.jpg / .png / .webp)
 *   Bosses  → /assets/bosses/   (.png com fundo transparente)
 *
 * COMO ADICIONAR:
 *   1. Coloque o arquivo na pasta correspondente
 *   2. Adicione a entrada abaixo com path, name (e tag opcional)
 *   3. A galeria do modal de Nova Campanha atualiza automaticamente
 */

// ============================================================
//   MAPAS DE FUNDO (backgrounds do Mapa do Pesadelo)
// ============================================================
export const MAPS_GALLERY = [
  { id: 'costa_esquecida', path: '/assets/maps/costa_esquecida.webp', name: 'Costa Esquecida' },
  { id: 'ermos_carmesins', path: '/assets/maps/ermos_carmesins_abismo_derretido.webp', name: 'Ermos Carmesins' },
  { id: 'espira_congelada', path: '/assets/maps/espira_congelada_sepulcro_de_cristal.webp', name: 'Espira Congelada' },
  { id: 'expansao_sem_estrelas', path: '/assets/maps/expansao_sem_estrelas_bercos_ocos.webp', name: 'Expansão S. Estrelas' },
  { id: 'profundezas_cintilantes', path: '/assets/maps/profundezas_cintilantes_clareira_sussurrante.webp', name: 'Profundezas Cintilantes' },
  { id: 'sepulcro_dourado', path: '/assets/maps/sepulcro_dourado_deserto_dos_ecos.webp', name: 'Sepulcro Dourado' },
  { id: 'costa_azure', path: '/assets/maps/costa_azure_praia_dos_cristais.webp', name: 'Costa Azure' },
  { id: 'metropole_esquecida', path: '/assets/maps/metropole_esquecida_selva_de_concreto.webp', name: 'Metrópole Esquecida' },
  { id: 'planicies_verdejantes', path: '/assets/maps/planicies_verdejantes_da_antiguidade.webp', name: 'Planícies Verdejantes' },
  { id: 'sepulcro_visceral', path: '/assets/maps/sepulcro_visceral_do_deus_caido.webp', name: 'Sepulcro Visceral' },
  { id: 'bastiao_do_lago', path: '/assets/maps/bastiao_do_lago.webp', name: 'Bastião do Lago' },
  { id: 'arquipelago_sombras', path: '/assets/maps/arquipelago_das_sombras.webp', name: 'Arquipélago Sombras' },
  { id: 'caverna_obsidiana', path: '/assets/maps/caverna_de_obsidiana.webp', name: 'Caverna Obsidiana' },
  { id: 'godgrave', path: '/assets/maps/godgrave.webp', name: 'Godgrave' },
  { id: 'o_abismo', path: '/assets/maps/o_abismo.webp', name: 'O Abismo' },
  { id: 'observatorio_49', path: '/assets/maps/observatorio_lunar_49.webp', name: 'Observatório 49' },
  { id: 'vale_colossos', path: '/assets/maps/vale_dos_colossos.webp', name: 'Vale dos Colossos' },
];

// ============================================================
//   SPRITES DE BOSS (PNGs sem fundo — 16-bit pixel art)
// ============================================================
export const BOSS_GALLERY = [
  { id: 'tita_de_obsidiana', path: '/assets/bosses/Tita_de_Obsidiana.webp', name: 'Titã de Obsidiana' },
  { id: 'boca_indizivel', path: '/assets/bosses/a_boca_indizivel_do_pesadelo.webp', name: 'Boca do Pesadelo' },
  { id: 'eco_aethel', path: '/assets/bosses/o_eco_da_costa_esquecida_aethel.webp', name: 'Eco (Aethel)' },
  { id: 'sentinela_jotun', path: '/assets/bosses/o_sentinela_silencioso_jotun.webp', name: 'Sentinela (Jotun)' },
  { id: 'tirano_pyroclast', path: '/assets/bosses/o_tirano_derretido_pyroclast.webp', name: 'Tirano (Pyroclast)' },
  { id: 'fauce_abissal', path: '/assets/bosses/fauce_abissal_mutante.webp', name: 'Fauce Abissal' },
  { id: 'geleia_voraz', path: '/assets/bosses/geleia_voraz_do_vazio.webp', name: 'Geleia Voraz' },
  { id: 'passaro_ladrao', path: '/assets/bosses/passaro_ladrao_vil.webp', name: 'Pássaro Ladrão' },
  { id: 'rei_das_vinhas', path: '/assets/bosses/rei_das_vinhas_vazias_sepulcro_vivo.webp', name: 'Rei das Vinhas' },
  { id: 'semente_escuridao', path: '/assets/bosses/semente_da_escuridao_principio_da_corrupcao.webp', name: 'Semente da Escuridão' },
  { id: 'soberano_esqueleto', path: '/assets/bosses/soberano_esqueleto_de_quatro_bracos.webp', name: 'Soberano Esqueleto' },
  { id: 'espadachim_desolado', path: '/assets/bosses/espadachim_desolado.webp', name: 'Espadachim Desolado' },
  { id: 'abominacao_aguas', path: '/assets/bosses/abominacao_das_aguas_negras.webp', name: 'Abominação Águas' },
  { id: 'arauto_frio', path: '/assets/bosses/arauto_do_frio_eterno.webp', name: 'Arauto do Frio' },
  { id: 'dragao_onix', path: '/assets/bosses/dragao_de_onix_purpura.webp', name: 'Dragão de Ônix' },
  { id: 'espreitador_vazio', path: '/assets/bosses/espreitador_do_vazio.webp', name: 'Espreitador Vazio' },
  { id: 'sacerdote_profanado', path: '/assets/bosses/sacerdote_profanado.webp', name: 'Sacerdote Profanado' },
];
