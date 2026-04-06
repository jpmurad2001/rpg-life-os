/**
 * Shadow Slave Life OS — Firestore Database Layer
 * =================================================
 * Única camada de acesso ao Firestore.
 * Todos os módulos chamam estas funções — nenhum importa Firestore diretamente.
 *
 * Estratégia de cache em memória:
 *   - loot_table e boss_registry são carregados uma vez e cacheados
 *   - Dados por usuário são lidos sob demanda com merge
 */

import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc,
  addDoc, deleteDoc, serverTimestamp, query, where,
  orderBy, limit, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

import { db } from './firebase.js';

// ============================================================
//   CACHE EM MEMÓRIA
// ============================================================
const _cache = {
  lootTable:    null,   // Array<Object>
  bossRegistry: null,   // Array<Object>
};

// ============================================================
//   HELPERS
// ============================================================
function _userRef(uid)              { return doc(db, 'users', uid); }
function _questRef(uid, weekId)     { return doc(db, 'users', uid, 'quests', weekId); }
function _inventoryRef(uid)         { return collection(db, 'users', uid, 'inventory'); }
function _templateRef(uid, tplId)   { return doc(db, 'users', uid, 'templates', tplId); }
function _templatesRef(uid)         { return collection(db, 'users', uid, 'templates'); }
function _sessionRef(uid)           { return collection(db, 'users', uid, 'battle_sessions'); }
function _tavernaRef(uid, monthKey) { return doc(db, 'users', uid, 'taverna', monthKey); }
function _bossMapRef(mapId)         { return doc(db, 'boss_maps', mapId); }
function _userBossesRef(uid)        { return query(collection(db, 'boss_maps'), where('uid', '==', uid)); }

// ============================================================
//   PLAYER (documento raiz do usuário)
// ============================================================

/**
 * Carrega o documento raiz do jogador.
 * Se não existe, retorna null (app criará na primeira sessão).
 */
export async function getPlayer(uid) {
  const snap = await getDoc(_userRef(uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Cria ou atualiza campos do documento raiz (merge).
 */
export async function savePlayer(uid, data) {
  await setDoc(_userRef(uid), {
    ...data,
    last_active: serverTimestamp(),
  }, { merge: true });
}

/**
 * Salva o estado de badges do jogador (achievements + activeBadgeId).
 * Operação de merge parcial — não sobrescreve outros campos.
 * @param {string} uid
 * @param {string[]} achievements  - Array de badge IDs desbloqueados
 * @param {string|null} activeBadgeId - Badge equipada (ou null)
 */
export async function saveBadgeState(uid, { achievements, activeBadgeId }) {
  await setDoc(_userRef(uid), {
    achievements,
    activeBadgeId,
    last_active: serverTimestamp(),
  }, { merge: true });
  console.log('🏅 [DB] Badge state salvo:', { achievements, activeBadgeId });
}

/**
 * Deletes the player root doc AND all known subcollections from Firestore.
 * Firestore doesn't cascade-delete subcollections automatically.
 */
export async function deletePlayer(uid) {
  // Helper: delete all docs in a collection reference
  async function _wipeCollection(colRef) {
    const snap = await getDocs(colRef);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }

  // 1. Subcollections under /users/{uid}/
  const subcols = ['quests', 'inventory', 'templates', 'battle_sessions', 'taverna'];
  await Promise.all(subcols.map(sub =>
    _wipeCollection(collection(db, 'users', uid, sub))
  ));

  // 2. Boss maps belonging to this user
  const bossSnap = await getDocs(query(collection(db, 'boss_maps'), where('uid', '==', uid)));
  await Promise.all(bossSnap.docs.map(d => deleteDoc(d.ref)));

  // 3. Root user document
  await deleteDoc(_userRef(uid));
  console.log('🗑️ [DB] Conta e subcoleções apagadas do Firestore:', uid);
}

/**
 * Inicializa o perfil de um novo usuário após registro.
 */
export async function initNewPlayer(uid, displayName) {
  const defaultPlayer = {
    uid,
    display_name: displayName,
    created_at: serverTimestamp(),
    progression: {
      fragmentos:       0,
      fragmentos_total: 0,
      rank:             'Adormecido',
      rank_index:       0,
      hp:               100,
      hp_max:           100,
      attributes: {
        INT: { value: 1, xp: 0, xp_next: 50 },
        ART: { value: 1, xp: 0, xp_next: 50 },
        AVE: { value: 1, xp: 0, xp_next: 50 },
      },
    },
    stats: {
      quests_completed:   0,
      bosses_defeated:    0,
      workouts_completed: 0,
      memories_collected: 0,
      total_damage_dealt: 0,
      last_active_date:   new Date().toISOString().slice(0, 10),
    },
    settings: {
      theme:                    'dark',
      sound_enabled:            true,
      sound_volume:             18,
      notifications_enabled:    false,
      hp_decay_per_missed_day:  5,
    },
    // v2.5 — Marcos do Despertar
    achievements:  [],
    activeBadgeId: null,
  };

  await setDoc(_userRef(uid), defaultPlayer, { merge: false });
  console.log('[DB] Perfil inicializado para:', uid);
  return defaultPlayer;
}

// ============================================================
//   QUESTS (subcoleção por semana)
// ============================================================

export async function getWeek(uid, weekId) {
  const snap = await getDoc(_questRef(uid, weekId));
  return snap.exists() ? snap.data() : null;
}

export async function saveWeek(uid, weekId, data) {
  await setDoc(_questRef(uid, weekId), data, { merge: true });
}

// ============================================================
//   INVENTÁRIO (Memórias)
// ============================================================

export async function getInventory(uid) {
  const snap = await getDocs(
    query(_inventoryRef(uid), orderBy('obtained_at', 'desc'))
  );
  return snap.docs.map(d => ({ inventory_id: d.id, ...d.data() }));
}

/**
 * Adiciona uma Memória ao inventário do jogador.
 */
export async function addToInventory(uid, lootId, source, sourceId) {
  const ref = await addDoc(_inventoryRef(uid), {
    loot_id:     lootId,
    obtained_at: serverTimestamp(),
    obtained_from: source,
    source_id:   sourceId ?? null,
    quantity:    1,
  });
  // Incrementa contador no perfil
  await savePlayer(uid, {
    'stats.memories_collected': /* incremento via transação */ (await getPlayer(uid))?.stats?.memories_collected + 1,
  });
  return ref.id;
}

// ============================================================
//   LOOT TABLE (cache global)
// ============================================================

export async function getLootTable(forceRefresh = false) {
  if (_cache.lootTable && !forceRefresh) return _cache.lootTable;
  const snap = await getDocs(
    query(collection(db, 'loot_table'), where('is_active', '==', true))
  );
  _cache.lootTable = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`[DB] loot_table carregada: ${_cache.lootTable.length} Memórias`);
  return _cache.lootTable;
}

// ============================================================
//   BOSS REGISTRY (cache global)
// ============================================================

export async function getBossRegistry(forceRefresh = false) {
  if (_cache.bossRegistry && !forceRefresh) return _cache.bossRegistry;
  const snap = await getDocs(
    query(collection(db, 'boss_registry'), where('is_active', '==', true))
  );
  _cache.bossRegistry = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _cache.bossRegistry;
}

// ============================================================
//   BOSS MAPS (mapas de campanha do usuário)
// ============================================================

export async function getUserBossMaps(uid) {
  const snap = await getDocs(_userBossesRef(uid));
  return snap.docs.map(d => ({ map_id: d.id, ...d.data() }));
}

export async function getBossMap(mapId) {
  const snap = await getDoc(_bossMapRef(mapId));
  return snap.exists() ? { map_id: snap.id, ...snap.data() } : null;
}

export async function saveBossMap(uid, mapId, data) {
  if (mapId) {
    await setDoc(_bossMapRef(mapId), { ...data, uid }, { merge: true });
    return mapId;
  }
  // Criar novo
  const ref = await addDoc(collection(db, 'boss_maps'), {
    ...data,
    uid,
    created_at: serverTimestamp(),
    status:     'active',
  });
  return ref.id;
}

export async function deleteBossMap(mapId) {
  await deleteDoc(_bossMapRef(mapId));
}

// ============================================================
//   CAMPAIGN MAP NODES — v1.3
// ============================================================

/**
 * Adiciona um novo nó (encounter) ao mapa de campanha.
 * O primeiro nó criado fica com status 'active', os demais 'locked'.
 */
export async function addNodeToMap(mapId, nodeData) {
  const map = await getBossMap(mapId);
  if (!map) throw new Error('Map not found: ' + mapId);

  const nodes = map.nodes ?? [];
  const isFirst     = nodes.length === 0;
  const allCompleted = nodes.length > 0 && nodes.every(n => n.status === 'completed');
  const newStatus   = (isFirst || allCompleted) ? 'active' : 'locked';

  const newNode = {
    id: `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    title:          nodeData.title        ?? 'Encontro',
    description:    nodeData.description  ?? '',
    status:         newStatus,
    damage_to_boss: nodeData.damage_to_boss ?? 100,
    xp_reward:      nodeData.xp_reward      ?? 40,
    attribute:      nodeData.attribute      ?? 'ART',
    x:              nodeData.x              ?? 50,
    y:              nodeData.y              ?? 50,
    completed_at:   null,
  };

  nodes.push(newNode);
  await setDoc(_bossMapRef(mapId), { nodes }, { merge: true });
  return newNode;
}

/**
 * Marca um nó como concluído, desbloqueia o próximo e drena HP do Boss.
 * Retorna { bossDefeated: bool, damageDone: number, map: object }
 */
export async function completeNodeOnMap(uid, mapId, nodeId) {
  const map = await getBossMap(mapId);
  if (!map || map.uid !== uid) {
    console.warn('[DB] completeNodeOnMap: mapa não encontrado ou sem permissão');
    return { bossDefeated: false, damageDone: 0, map: null };
  }

  const nodes   = map.nodes ?? [];
  const nodeIdx = nodes.findIndex(n => n.id === nodeId);
  if (nodeIdx === -1) return { bossDefeated: false, damageDone: 0, map };

  const node = nodes[nodeIdx];
  if (node.status !== 'active') return { bossDefeated: false, damageDone: 0, map };

  // 1. Marcar este nó como concluído
  nodes[nodeIdx] = { ...node, status: 'completed', completed_at: new Date().toISOString() };

  // 2. Desbloquear o próximo nó (se existir)
  if (nodeIdx + 1 < nodes.length) {
    nodes[nodeIdx + 1] = { ...nodes[nodeIdx + 1], status: 'active' };
  }

  // 3. Calcular novo HP do Boss
  const damageDone = node.damage_to_boss ?? 0;
  const newHp      = Math.max(0, (map.boss_hp_current ?? map.boss_hp_max ?? 1000) - damageDone);

  let bossDefeated = false;
  let updatePayload;

  if (newHp <= 0) {
    bossDefeated  = true;
    updatePayload = {
      nodes,
      boss_hp_current: 0,
      status:          'completed',
      defeated_at:     serverTimestamp(),
    };
  } else {
    updatePayload = {
      nodes,
      boss_hp_current: newHp,
    };
  }

  await setDoc(_bossMapRef(mapId), updatePayload, { merge: true });

  const updatedMap = { ...map, nodes, boss_hp_current: newHp, ...(bossDefeated ? { status: 'completed' } : {}) };
  return { bossDefeated, damageDone, map: updatedMap };
}

// ============================================================
//   TRAINING TEMPLATES
// ============================================================

export async function getTemplates(uid) {
  const snap = await getDocs(_templatesRef(uid));
  return snap.docs.map(d => ({ template_id: d.id, ...d.data() }));
}

export async function saveTemplate(uid, tplId, data) {
  if (tplId) {
    await setDoc(_templateRef(uid, tplId), data, { merge: true });
    return tplId;
  }
  const ref = await addDoc(_templatesRef(uid), {
    ...data,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTemplate(uid, tplId) {
  await deleteDoc(_templateRef(uid, tplId));
}

// ============================================================
//   TRAINING SESSIONS
// ============================================================

export async function addBattleSession(uid, sessionData) {
  return addDoc(_sessionRef(uid), {
    ...sessionData,
    created_at: serverTimestamp(),
  });
}

export async function getRecentSessions(uid, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const snap = await getDocs(
    query(
      _sessionRef(uid),
      where('date', '>=', cutoff.toISOString().slice(0, 10)),
      orderBy('date', 'desc'),
      limit(50)
    )
  );
  return snap.docs.map(d => ({ session_id: d.id, ...d.data() }));
}

// ============================================================
//   TAVERNA (finanças por mês)
// ============================================================

export async function getTaverna(uid, monthKey) {
  const snap = await getDoc(_tavernaRef(uid, monthKey));
  return snap.exists() ? snap.data() : { month_key: monthKey, receipts: [], expenses: [] };
}

export async function saveTaverna(uid, monthKey, data) {
  await setDoc(_tavernaRef(uid, monthKey), data, { merge: true });
}

// ============================================================
//   MIGRAÇÃO LOCALSTORAGE → FIRESTORE (opt-in)
// ============================================================

/**
 * Tenta migrar dados de localStorage para Firestore.
 * Chamada na primeira sessão após login, caso exista estado local.
 */
export async function migrateFromLocalStorage(uid) {
  const LOCAL_KEY = 'rpg_life_os_state';
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return false;

  try {
    const local = JSON.parse(raw);
    if (!local.player) return false;

    const existingPlayer = await getPlayer(uid);
    if (existingPlayer) {
      console.log('[DB] Perfil Firestore já existe, migração abortada.');
      return false;
    }

    console.log('[DB] Iniciando migração localStorage → Firestore...');

    // Mapeamento de campos locais para novi schema
    const p = local.player;
    await savePlayer(uid, {
      display_name: p.name ?? 'Caçador',
      progression: {
        fragmentos:       p.xp       ?? 0,
        fragmentos_total: p.xp       ?? 0,
        rank:             'Adormecido',
        rank_index:       0,
        hp:               p.hp       ?? 100,
        hp_max:           p.hp_max   ?? 100,
        attributes:       p.attributes ?? {
          INT: { value: 1, xp: 0, xp_next: 50 },
          ART: { value: 1, xp: 0, xp_next: 50 },
          AVE: { value: 1, xp: 0, xp_next: 50 },
        },
      },
      stats: {
        quests_completed:   p.stats?.quests_completed   ?? 0,
        bosses_defeated:    p.stats?.bosses_defeated     ?? 0,
        workouts_completed: p.stats?.workouts_completed  ?? 0,
        memories_collected: 0,
        total_damage_dealt: 0,
        last_active_date:   new Date().toISOString().slice(0, 10),
      },
      settings: local.settings ?? {},
    });

    // Migrar quests da semana atual
    const weekId = local.quests?.current_week_id;
    const weekData = weekId ? local.quests?.weeks?.[weekId] : null;
    if (weekId && weekData) {
      await saveWeek(uid, weekId, weekData);
    }

    console.log('[DB] Migração concluída!');
    return true;
  } catch (e) {
    console.warn('[DB] Falha na migração:', e);
    return false;
  }
}
