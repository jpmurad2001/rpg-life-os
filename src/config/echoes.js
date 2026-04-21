/**
 * Shadow Slave Life OS — Echoes Data (Ecos do Vazio)
 * ===================================================
 * Catálogo dos 10 Ecos disponíveis no jogo.
 * Sprite path: assets/ecos/<sprite>
 */

export const ECHO_RANKS = [
  'Adormecido',
  'Desperto',
  'Caído',
  'Ascendido',
  'Corrompido',
  'Grande',
  'Supremo',
];

/** @type {Array<{id: string, name: string, rank: string, sprite: string, lore: string}>} */
export const ECHOES_CATALOG = [
  {
    id:     'carapace_centurion',
    name:   'Centurião de Carapaça',
    rank:   'Ascendido',
    sprite: 'assets/ecos/echo_carapace_centurion.webp',
    lore:   'Uma armadura viva que nunca conheceu a derrota. Sua carapaça absorve o caos.',
  },
  {
    id:     'scavenger_imp',
    name:   'Diabrete Carniçal',
    rank:   'Adormecido',
    sprite: 'assets/ecos/echo_scavenger_imp.webp',
    lore:   'Criatura das sombras que se alimenta dos restos do Vazio. Pequeno, mas imprevisível.',
  },
  {
    id:     'blood_fiend',
    name:   'Demônio de Sangue',
    rank:   'Corrompido',
    sprite: 'assets/ecos/echo_blood_fiend.webp',
    lore:   'Nascido da corrupção, ele transforma dor em poder. Seu sangue é veneno e cura ao mesmo tempo.',
  },
  {
    id:     'fallen_knight',
    name:   'Cavaleiro Caído',
    rank:   'Caído',
    sprite: 'assets/ecos/echo_fallen_knight.webp',
    lore:   'Outrora um paladino da luz, agora serve ao Vazio. Sua honra foi o seu maior pecado.',
  },
  {
    id:     'stone_saint',
    name:   'Santa de Pedra',
    rank:   'Grande',
    sprite: 'assets/ecos/echo_stone_saint.webp',
    lore:   'Petrificada ao tentar conter o Vazio, sua devoção tornou-se eterna e inabalável.',
  },
  {
    id:     'shadow_steed',
    name:   'Corcel das Sombras',
    rank:   'Desperto',
    sprite: 'assets/ecos/echo_shadow_steed.webp',
    lore:   'Galopante entre dimensões, sua crina é feita de escuridão condensada.',
  },
  {
    id:     'mirror_beast',
    name:   'Fera do Espelho',
    rank:   'Ascendido',
    sprite: 'assets/ecos/echo_mirror_beast.webp',
    lore:   'Existe apenas como reflexo. Copia seu pior pesadelo e o transforma em arma.',
  },
  {
    id:     'abyssal_terror',
    name:   'Terror Abissal',
    rank:   'Supremo',
    sprite: 'assets/ecos/echo_abyssal_terror.webp',
    lore:   'O mais antigo dos Ecos. Seu nome é proibido. Sua presença apaga a luz de uma sala inteira.',
  },
  {
    id:     'winter_beast',
    name:   'Fera do Inverno',
    rank:   'Grande',
    sprite: 'assets/ecos/echo_winter_beast.webp',
    lore:   'Predador do Vazio eterno congelado. Cada rugido cristaliza o ar ao redor.',
  },
  {
    id:     'soul_serpent',
    name:   'Serpente de Almas',
    rank:   'Corrompido',
    sprite: 'assets/ecos/echo_soul_serpent.webp',
    lore:   'Devora almas para crescer. Diz-se que contém os espíritos de mil caçadores perdidos.',
  },
];
