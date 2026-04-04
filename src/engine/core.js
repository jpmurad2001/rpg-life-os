/**
 * RPG Life OS — Core Engine
 * Handles all localStorage I/O, state management, and business rules.
 * Pure ES Module — no framework dependencies.
 */

// ============================================================
//   CONSTANTS
// ============================================================
export const STORAGE_KEY  = 'rpg_life_os_v1';
export const BASE_XP      = 100;
export const ATTR_XP_PER_LEVEL = 50;

export const DAYS_OF_WEEK = [
  'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'
];

export const DAYS_LABEL = {
  segunda: 'Seg', terça: 'Ter', quarta: 'Qua',
  quinta: 'Qui', sexta: 'Sex', sábado: 'Sáb', domingo: 'Dom'
};

export const ATTR_KEYS = ['INT', 'ART', 'AVE'];

export const ATTR_META = {
  INT: { icon: '🧠', color: 'var(--color-int)', label: 'Inteligência' },
  ART: { icon: '🎨', color: 'var(--color-art)', label: 'Arte'         },
  AVE: { icon: '🗡️', color: 'var(--color-ave)', label: 'Aventura'    },
};

// ============================================================
//   DEFAULT STATE
// ============================================================
function buildDefaultState() {
  const now = new Date().toISOString();
  return {
    _meta: {
      schema_version: '1.0.0',
      app_name: 'RPG Life OS',
      created_at: now,
      last_saved: now,
    },
    player: {
      id: 'player_001',
      name: 'Herói',
      avatar: 'warrior',
      level: 1,
      xp: 0,
      xp_next: BASE_XP,
      hp: 100,
      hp_max: 100,
      attributes: {
        INT: { value: 1, xp_pool: 0, xp_per_level: ATTR_XP_PER_LEVEL },
        ART: { value: 1, xp_pool: 0, xp_per_level: ATTR_XP_PER_LEVEL },
        AVE: { value: 1, xp_pool: 0, xp_per_level: ATTR_XP_PER_LEVEL },
      },
      badges: [],
      item_drops: [],
      stats: {
        quests_completed: 0,
        bosses_defeated: 0,
        workouts_completed: 0,
        total_xp_earned: 0,
        streak_days: 0,
        last_active_date: '',
      },
    },
    quests: {
      current_week_start: '',
      current_week_id: '',
      weeks: {},
    },
    battle_ground: {
      templates: [],
      sessions: [],
    },
    taverna: {
      months: {},
    },
    bosses: [],
    achievements: [
      { id: 'ach_001', key: 'FIRST_QUEST',       name: 'Primeira Missão',      description: 'Complete sua primeira tarefa semanal.', icon: '⚔️', rarity: 'common',   unlocked: false, unlocked_at: null },
      { id: 'ach_002', key: 'LEVEL_5',            name: 'Aventureiro',          description: 'Alcance o nível 5.',                    icon: '🌟', rarity: 'uncommon', unlocked: false, unlocked_at: null },
      { id: 'ach_003', key: 'BOSS_SLAYER',        name: 'Caçador de Chefes',    description: 'Derrote seu primeiro Boss.',             icon: '🏆', rarity: 'rare',     unlocked: false, unlocked_at: null },
      { id: 'ach_004', key: 'WORKOUT_STREAK_7',   name: 'Guerreiro da Semana',  description: 'Complete treinos por 7 dias seguidos.', icon: '💪', rarity: 'uncommon', unlocked: false, unlocked_at: null },
      { id: 'ach_005', key: 'LEVEL_10',           name: 'Veterano',             description: 'Alcance o nível 10.',                   icon: '💫', rarity: 'rare',     unlocked: false, unlocked_at: null },
      { id: 'ach_006', key: 'INT_10',             name: 'Scholar',              description: 'Atributo INT chegou a 10.',             icon: '📚', rarity: 'uncommon', unlocked: false, unlocked_at: null },
      { id: 'ach_007', key: 'ART_10',             name: 'Artesão',              description: 'Atributo ART chegou a 10.',             icon: '🎸', rarity: 'uncommon', unlocked: false, unlocked_at: null },
      { id: 'ach_008', key: 'AVE_10',             name: 'Gladiador',            description: 'Atributo AVE chegou a 10.',             icon: '🏋️', rarity: 'uncommon', unlocked: false, unlocked_at: null },
    ],
    settings: {
      theme: 'dark',
      sound_enabled: true,
      notifications_enabled: false,
      base_xp: BASE_XP,
      hp_decay_per_missed_day: 5,
      language: 'pt-BR',
    },
  };
}

// ============================================================
//   STORAGE LAYER
// ============================================================
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultState();
    let parsed = JSON.parse(raw);
    
    // Future/Legacy: migration logic here (schema_version checks)
    if (parsed.player && parsed.player.attributes) {
      ['INT', 'ART', 'AVE'].forEach(k => {
        if (parsed.player.attributes[k] && parsed.player.attributes[k].xp_pool === undefined) {
          parsed.player.attributes[k].xp_pool = 0;
          parsed.player.attributes[k].xp_per_level = 50;
        }
      });
    }

    return parsed;
  } catch (err) {
    console.error('[CoreEngine] Failed to load state:', err);
    return buildDefaultState();
  }
}

export function saveState(state) {
  try {
    state._meta.last_saved = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Phase 5: Firestore Background Sync Hook
    if (typeof window !== 'undefined' && window._syncStateToFirestore) {
      window._syncStateToFirestore(state);
    }
  } catch (err) {
    console.error('[CoreEngine] Failed to save state:', err);
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return buildDefaultState();
}

export function exportState(state) {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `rpg_life_os_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importState(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed._meta || !parsed.player) throw new Error('Invalid schema');
    return parsed;
  } catch (err) {
    console.error('[CoreEngine] Import failed:', err);
    return null;
  }
}

// ============================================================
//   XP & LEVELING
// ============================================================

/**
 * XP required to reach the NEXT level from `level`.
 * Formula: XP_next = BaseXP × level^1.5
 */
export function calcXpNext(level) {
  return Math.floor(BASE_XP * Math.pow(level, 1.5));
}

/**
 * Award XP to the player. Handles level-ups (recursive).
 * Returns { state, leveledUp: bool, newLevel: number }
 */
export function awardXP(state, amount) {
  if (amount <= 0) return { state, leveledUp: false, newLevel: state.player.level };

  const p = state.player;
  p.xp += amount;
  p.stats.total_xp_earned += amount;

  let leveledUp = false;
  let newLevel   = p.level;

  // Handle potential multi-level ups
  while (p.xp >= p.xp_next) {
    p.xp       -= p.xp_next;
    p.level    += 1;
    p.xp_next   = calcXpNext(p.level);
    p.hp_max   += 10; // HP pool increases on level up
    p.hp        = p.hp_max; // Full heal on level up
    leveledUp   = true;
    newLevel     = p.level;
  }

  return { state, leveledUp, newLevel };
}

/**
 * Award flat points to a specific attribute.
 * Returns { state, attr: string, newValue: number }
 */
export function awardAttributeXP(state, attr, amount) {
  if (!ATTR_KEYS.includes(attr)) return { state };

  const a = state.player.attributes[attr];
  // Directly increment the attribute's value
  a.value += amount;

  return { state, attr, newValue: a.value };
}

// ============================================================
//   HP SYSTEM
// ============================================================

/**
 * Modifies HP (positive = gain, negative = loss).
 * Clamps to [0, hp_max].
 */
export function modifyHP(state, delta) {
  const p    = state.player;
  p.hp       = Math.min(p.hp_max, Math.max(0, p.hp + delta));
  return state;
}

/**
 * HP decay for missed workout days.
 */
export function applyHPDecay(state) {
  const decay = state.settings.hp_decay_per_missed_day ?? 5;
  return modifyHP(state, -decay);
}

/** HP % as float 0..1 */
export function hpPercent(state) {
  return state.player.hp / state.player.hp_max;
}

// ============================================================
//   BOSS DAMAGE SYSTEM
// ============================================================

/**
 * Applies damage to a boss when a subtask is completed.
 * Returns { state, bossDefeated: bool, boss }
 */
export function attackBoss(state, bossId, subtaskId) {
  const boss = state.bosses.find(b => b.id === bossId);
  if (!boss || boss.status !== 'active') return { state, bossDefeated: false, boss: null };

  const subtask = boss.subtasks.find(s => s.id === subtaskId);
  if (!subtask || subtask.status === 'completed') return { state, bossDefeated: false, boss };

  // Mark subtask done
  subtask.status       = 'completed';
  subtask.completed_at = new Date().toISOString();

  // Deal damage
  boss.hp_current = Math.max(0, boss.hp_current - subtask.damage);

  let bossDefeated = false;
  if (boss.hp_current <= 0) {
    boss.status      = 'defeated';
    boss.defeated_at = new Date().toISOString();
    state.player.stats.bosses_defeated += 1;
    bossDefeated = true;
  }

  return { state, bossDefeated, boss };
}

/** HP % of a boss as float 0..1 */
export function bossHpPercent(boss) {
  return boss.hp_current / boss.hp_max;
}

// ============================================================
//   WEEKLY QUEST HELPERS
// ============================================================

/** Returns ISO week ID string like "2026-W10" */
export function getWeekId(date = new Date()) {
  const d    = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Returns "YYYY-MM-DD" for the Monday of the week containing `date` */
export function getMondayOfWeek(date = new Date()) {
  const d   = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

/** Returns "YYYY-MM-DD" string for a given date */
export function toDateString(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

/** Returns today's day-of-week key (e.g. "segunda") */
export function todayDayKey() {
  const keys = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  return keys[new Date().getDay()];
}

/**
 * Ensures the current week exists in state.quests.weeks.
 * Initializes it if not present.
 */
export function ensureCurrentWeek(state) {
  const weekId = getWeekId();
  if (!state.quests.weeks[weekId]) {
    state.quests.weeks[weekId] = {
      id:         weekId,
      start_date: getMondayOfWeek(),
      end_date:   toDateString(new Date(getMondayOfWeek() + 'T00:00:00Z').setDate(new Date(getMondayOfWeek()).getDate() + 6)),
      tasks:      [],
      reset_done: false,
    };
  }
  state.quests.current_week_id    = weekId;
  state.quests.current_week_start = getMondayOfWeek();
  return state;
}

/** Complete a quest task: awards XP + attribute XP + HP, checks achievements */
export function completeTask(state, weekId, taskId) {
  const week = state.quests.weeks[weekId];
  if (!week) return { state, xpGained: 0, attrGained: 0 };

  const task = week.tasks.find(t => t.id === taskId);
  if (!task || task.status === 'completed') return { state, xpGained: 0, attrGained: 0 };

  task.status        = 'completed';
  task.completed_at  = new Date().toISOString();
  state.player.stats.quests_completed += 1;

  const xpGained   = task.xp_reward ?? 20;
  const attrAmount = 1; // 1 flat point per task
  const hpGain     = task.hp_reward ?? 0;

  // Award XP
  const { state: s1, leveledUp, newLevel } = awardXP(state, xpGained);
  // Award exactly 1 attribute point
  const { state: s2 }                      = awardAttributeXP(s1, task.attribute, attrAmount);
  // HP change
  if (hpGain > 0) modifyHP(s2, hpGain);
  // Boss link
  let bossDefeated = false;
  let defeatedBoss = null;
  if (task.boss_id) {
    const attackResult = attackBoss(s2, task.boss_id, task.id);
    bossDefeated = attackResult.bossDefeated;
    defeatedBoss = attackResult.boss;
  }

  // Check achievements
  checkAchievements(s2);

  return { state: s2, xpGained, attrGained: attrAmount, leveledUp, newLevel, bossDefeated, defeatedBoss };
}

// ============================================================
//   FINANCIAL HELPERS (Taverna)
// ============================================================

/** Returns YYYY-MM key for a given date */
export function getMonthId(date = new Date()) {
  return new Date(date).toISOString().slice(0, 7);
}

/** Formats a number as BRL currency string */
export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Calculates and caches the financial summary for a month */
export function calcMonthSummary(state, monthId) {
  const month = state.taverna.months[monthId];
  if (!month) return null;

  const totalReceipts = month.receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid     = month.expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
  const totalPending  = month.expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const freeBalance   = totalReceipts - totalPaid - totalPending;

  month.summary_cache = {
    total_receipts:  totalReceipts,
    total_paid:      totalPaid,
    total_pending:   totalPending,
    free_balance:    freeBalance,
    last_calculated: new Date().toISOString(),
  };

  return month.summary_cache;
}

// ============================================================
//   ACHIEVEMENTS
// ============================================================
const ACHIEVEMENT_CONDITIONS = {
  FIRST_QUEST:     s => s.player.stats.quests_completed >= 1,
  LEVEL_5:         s => s.player.level >= 5,
  LEVEL_10:        s => s.player.level >= 10,
  BOSS_SLAYER:     s => s.player.stats.bosses_defeated >= 1,
  WORKOUT_STREAK_7:s => s.player.stats.workouts_completed >= 7,
  INT_10:          s => s.player.attributes.INT.value >= 10,
  ART_10:          s => s.player.attributes.ART.value >= 10,
  AVE_10:          s => s.player.attributes.AVE.value >= 10,
};

/**
 * Checks all unearned achievements. Returns array of newly unlocked keys.
 */
export function checkAchievements(state) {
  const newlyUnlocked = [];
  for (const ach of state.achievements) {
    if (ach.unlocked) continue;
    const condition = ACHIEVEMENT_CONDITIONS[ach.key];
    if (condition && condition(state)) {
      ach.unlocked    = true;
      ach.unlocked_at = new Date().toISOString();
      newlyUnlocked.push(ach.key);
    }
  }
  return newlyUnlocked;
}

// ============================================================
//   ID GENERATOR
// ============================================================
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
