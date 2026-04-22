/**
 * Shadow Slave Life OS — Templos da Dualidade
 * =============================================
 * Catálogo das 14 entidades do Panteão (7 Deuses + 7 Daemons).
 * Sprites mapeados para os assets .webp reais disponíveis.
 *
 * @typedef {Object} DivineEntity
 * @property {string} id
 * @property {string} name
 * @property {'god'|'daemon'} type
 * @property {string} sprite     - path do sprite grande
 * @property {string} icon      - path do ícone do panteão
 * @property {string} trait     - Virtude (deuses) ou Pecado (daemons)
 * @property {string} domain    - Resumo da Lore
 * @property {string} description
 */

/** @type {DivineEntity[]} */
export const TEMPLES_CATALOG = [
  // ── DEUSES ─────────────────────────────────────────────────────────────
  {
    id:          'god_war',
    name:        'Guerra',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_war.webp',
    icon:        'assets/temple/icons/icon_god_war.webp',
    trait:       'Diligência',
    domain:      'Vida e Progresso',
    description: 'O esforço constante e a resiliência para construir e avançar.',
  },
  {
    id:          'god_shadow',
    name:        'Sombras',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_shadow.webp',
    icon:        'assets/temple/icons/icon_god_shadow.webp',
    trait:       'Paciência e Humildade',
    domain:      'Paz e Mistérios',
    description: 'A paciência silenciosa e o conforto para com aqueles que sofrem.',
  },
  {
    id:          'god_sun',
    name:        'Sol',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_fire.webp',   // asset real: sprite_god_fire
    icon:        'assets/temple/icons/icon_god_sun.webp',
    trait:       'Caridade e Zelo',
    domain:      'Luz e Paixão',
    description: 'O amor ardente e o farol inextinguível da existência.',
  },
  {
    id:          'god_heart',
    name:        'Coração',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_heart.webp',
    icon:        'assets/temple/icons/icon_god_heart.webp',
    trait:       'Bondade e Compaixão',
    domain:      'Almas e Memória',
    description: 'A compreensão das emoções e a conexão profunda entre as almas.',
  },
  {
    id:          'god_beast',
    name:        'Bestas',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_beast.webp',
    icon:        'assets/temple/icons/icon_god_beast.webp',
    trait:       'Fortaleza e Vitalidade',
    domain:      'Lua e Caça',
    description: 'A resiliência brutal da natureza e a força do ciclo implacável da vida.',
  },
  {
    id:          'god_storm',
    name:        'Tempestade',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_tempest.webp', // asset real: sprite_god_tempest
    icon:        'assets/temple/icons/icon_god_storm.webp',
    trait:       'Prudência',
    domain:      'Estrelas e Orientação',
    description: 'A sabedoria daquele que guia e navega em segurança pelos perigos.',
  },
  {
    id:          'god_forgotten',
    name:        'Esquecido',
    type:        'god',
    sprite:      'assets/temple/sprites/sprite_god_forgotten.webp',
    icon:        'assets/temple/icons/icon_god_forgotten.webp',
    trait:       'Sacrifício',
    domain:      'O Fardo e o Vazio',
    description: 'O alicerce trágico e a aceitação de suportar o peso do mundo.',
  },

  // ── DAEMONS ────────────────────────────────────────────────────────────
  {
    id:          'daemon_hope',
    name:        'Hope',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_hope.webp',
    icon:        'assets/temple/icons/icon_daemon_hope.webp',
    trait:       'Luxúria e Inveja',
    domain:      'Desejo',
    description: 'A inflamação de paixões e necessidades incontroláveis não saciadas.',
  },
  {
    id:          'daemon_nether',
    name:        'Nether',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_nether.webp',
    icon:        'assets/temple/icons/icon_daemon_nether.webp',
    trait:       'Ira',
    domain:      'Escolha e Submundo',
    description: 'A fúria ressentida, a amargura e o rancor que iniciam guerras.',
  },
  {
    id:          'daemon_ariel',
    name:        'Ariel',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_ariel.webp',
    icon:        'assets/temple/icons/icon_daemon_ariel.webp',
    trait:       'Avareza',
    domain:      'Pavor e Verdade',
    description: 'O acúmulo e monopólio obsessivo de segredos que apodrecem a mente.',
  },
  {
    id:          'daemon_weaver',
    name:        'Weaver',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_weaver.webp',
    icon:        'assets/temple/icons/icon_daemon_weaver.webp',
    trait:       'Orgulho e Soberba',
    domain:      'Destino',
    description: 'A crença arrogante de estar acima das regras primordiais e dos outros.',
  },
  {
    id:          'daemon_imagination',
    name:        'Imaginação',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_imagination.webp',
    icon:        'assets/temple/icons/icon_daemon_imagination.webp',
    trait:       'Vaidade e Ilusão',
    domain:      'Miragens',
    description: 'A recusa em ver a realidade, escondendo-se atrás de fachadas vazias.',
  },
  {
    id:          'daemon_repose',
    name:        'Repouso',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_repose.webp',
    icon:        'assets/temple/icons/icon_daemon_repose.webp',
    trait:       'Preguiça',
    domain:      'Estagnação',
    description: 'O estado de inércia e abstenção de ação em um mundo que exige luta.',
  },
  {
    id:          'daemon_oblivion',
    name:        'Oblivion',
    type:        'daemon',
    sprite:      'assets/temple/sprites/sprite_daemon_oblivion.webp',
    icon:        'assets/temple/icons/icon_daemon_oblivion.webp',
    trait:       'Gula e Apatia',
    domain:      'Esquecimento',
    description: 'O buraco negro que consome a realidade, gerando um vazio absoluto.',
  },
];

export const GODS    = TEMPLES_CATALOG.filter(e => e.type === 'god');
export const DAEMONS = TEMPLES_CATALOG.filter(e => e.type === 'daemon');
