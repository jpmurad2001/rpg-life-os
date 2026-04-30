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
  orderBy, limit, onSnapshot, runTransaction, writeBatch,
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

// v3.1 — Economia, Forja e Mercado
function _forgeInvRef(uid)          { return collection(db, 'users', uid, 'forge_inventory'); }
function _forgeInvDocRef(uid, id)   { return doc(db, 'users', uid, 'forge_inventory', id); }
function _marketRef(uid)            { return collection(db, 'users', uid, 'market_items'); }
function _marketDocRef(uid, id)     { return doc(db, 'users', uid, 'market_items', id); }

// ============================================================
//   PLAYER (documento raiz do usuário)
// ============================================================

/**
 * Carrega o documento raiz do jogador.
 * Se não existe, retorna null (app criará na primeira sessão).
 */
export async function getPlayerData(uid) {
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
 * Salva os cosméticos do jogador (avatar, frame, título, tema).
 * @param {string} uid
 * @param {Object} cosmetics - { avatar_image, profile_frame, equipped_title, active_theme }
 */
export async function saveCosmetics(uid, cosmetics) {
  await setDoc(_userRef(uid), {
    cosmetics,
    last_active: serverTimestamp(),
  }, { merge: true });
  console.log('✨ [DB] Cosméticos salvos:', cosmetics);
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
    // v3.0 — O Despertar da Identidade
    cosmetics: {
      avatar_image:   '',
      profile_frame:  '',
      equipped_title: 'Iniciado',
      active_theme:   'abyssal-dark',
    },
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
    'stats.memories_collected': (await getPlayerData(uid))?.stats?.memories_collected + 1,
  });
  return ref.id;
}

// ============================================================
//   LOOT TABLE (cache global)
// ============================================================

/**
 * Normaliza o image_url de uma Memória da loot_table.
 *
 * Regras (em ordem de prioridade):
 *  1. URLs absolutas (http/https) → Firebase Storage ou CDN → retorna intacta.
 *  2. Caminhos legados "assets/sprites_memorias/…" → remove "assets/" redundante.
 *  3. Caminhos sem prefixo "assets/" → adiciona prefixo.
 */
function _normalizeImageUrl(raw) {
  if (!raw) return null;

  // 1. URL absoluta — Firebase Storage, CDN, etc. Preservar sem tocar.
  if (/^https?:\/\//i.test(raw)) return raw;

  const clean = raw.replace(/^\/+/, '');

  // 2. Legado: "assets/sprites_memorias/" → "sprites_memorias/"
  if (clean.startsWith('assets/sprites_memorias/')) {
    return clean.replace('assets/sprites_memorias/', 'sprites_memorias/');
  }

  // 3. Já tem prefixo correto
  if (clean.startsWith('assets/') || clean.startsWith('sprites_memorias/')) {
    return clean;
  }

  // 4. Caminho sem prefixo → assume relativo a assets/
  return `assets/${clean}`;
}

export async function getLootTable(forceRefresh = false) {
  if (_cache.lootTable && !forceRefresh) return _cache.lootTable;

  const snap = await getDocs(
    query(collection(db, 'loot_table'), where('is_active', '==', true))
  );

  const all = snap.docs.map(d => {
    const data = d.data();
    if (data.image_url) data.image_url = _normalizeImageUrl(data.image_url);
    return { id: d.id, ...data };
  });

  // Garante que apenas Memórias com sprite configurado entram na pool de drops.
  // Itens sem image_url seriam exibidos como ícone emoji — aceitável no inventário
  // mas excluídos do pool de drops para manter a imersão visual.
  const withSprite    = all.filter(item => !!item.image_url);
  const withoutSprite = all.filter(item => !item.image_url);

  if (withoutSprite.length > 0) {
    console.warn(
      `[DB] loot_table: ${withoutSprite.length} Memória(s) sem sprite ignorada(s) do pool de drops:`,
      withoutSprite.map(i => i.id)
    );
  }

  _cache.lootTable = withSprite;
  console.log(`[DB] loot_table carregada: ${withSprite.length} Memórias com sprite (${withoutSprite.length} sem sprite excluídas)`);
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
  try {
    const snap = await getDocs(_userBossesRef(uid));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        map_id: d.id,
        ...data,
        gold_reward:   data.gold_reward   ?? 0,
        shadow_reward: data.shadow_reward ?? 0,
        nodes: (data.nodes || []).map(n => ({
          ...n,
          damage_to_boss: n.damage_to_boss ?? 0,
          xp_reward:      n.xp_reward      ?? 0,
          gold_reward:    n.gold_reward    ?? 0,
          shadow_reward:  n.shadow_reward  ?? 0
        }))
      };
    });
  } catch (e) {
    console.error(`[DB] Erro em getUserBossMaps (uid: ${uid}):`, e);
    throw e; // Propagar para que o módulo saiba que falhou
  }
}

export async function getBossMap(mapId) {
  try {
    const snap = await getDoc(_bossMapRef(mapId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      map_id: snap.id,
      ...data,
      gold_reward:   data.gold_reward   ?? 0,
      shadow_reward: data.shadow_reward ?? 0,
      nodes: (data.nodes || []).map(n => ({
        ...n,
        damage_to_boss: n.damage_to_boss ?? 0,
        xp_reward:      n.xp_reward      ?? 0,
        gold_reward:    n.gold_reward    ?? 0,
        shadow_reward:  n.shadow_reward  ?? 0
      }))
    };
  } catch (e) {
    console.error(`[DB] Erro em getBossMap (mapId: ${mapId}):`, e);
    throw e;
  }
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
    gold_reward:    nodeData.gold_reward    ?? 0,
    shadow_reward:  nodeData.shadow_reward  ?? 0,
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

    const existingPlayer = await getPlayerData(uid);
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

// ============================================================
//   v3.1 — ECONOMIA: TRANSAÇÕES ATÔMICAS
// ============================================================

/**
 * Deduz gold_coins e/ou shadow_fragments do documento do jogador.
 * Usa runTransaction — sem race conditions, sem saldo negativo.
 *
 * @param {string} uid
 * @param {number} goldCost      — Custo em gold_coins (0 = sem custo)
 * @param {number} fragmentCost  — Custo em shadow_fragments (0 = sem custo)
 * @throws {Error} se saldo insuficiente
 */
export async function spendCurrencyTx(uid, goldCost = 0, fragmentCost = 0) {
  const userRef = _userRef(uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('Perfil não encontrado.');

    const data  = snap.data();
    const prog  = data.progression ?? {};
    const gold  = prog.gold_coins       ?? 0;
    const frags = prog.shadow_fragments ?? 0;

    if (goldCost > 0 && gold < goldCost) {
      throw new Error(`Ouro insuficiente. Você tem ${gold} e precisa de ${goldCost}.`);
    }
    if (fragmentCost > 0 && frags < fragmentCost) {
      throw new Error(`Fragmentos insuficientes. Você tem ${frags} e precisa de ${fragmentCost}.`);
    }

    const updates = { last_active: serverTimestamp() };
    if (goldCost > 0)     updates['progression.gold_coins']       = gold  - goldCost;
    if (fragmentCost > 0) updates['progression.shadow_fragments'] = frags - fragmentCost;

    tx.update(userRef, updates);
  });

  console.log(`[DB] spendCurrencyTx: -${goldCost}g / -${fragmentCost}f uid=${uid}`);
}

/**
 * Adiciona gold_coins e/ou shadow_fragments ao jogador (batch atômico).
 *
 * @param {string} uid
 * @param {number} goldAmount
 * @param {number} fragmentAmount
 */
export async function earnCurrencyBatch(uid, goldAmount = 0, fragmentAmount = 0) {
  if (goldAmount === 0 && fragmentAmount === 0) return;

  const userRef = _userRef(uid);
  const snap    = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const prog = data.progression ?? {};

  const updates = { last_active: serverTimestamp() };
  if (goldAmount > 0) {
    updates['progression.gold_coins'] = (prog.gold_coins ?? 0) + goldAmount;
  }
  if (fragmentAmount > 0) {
    updates['progression.shadow_fragments'] =
      (prog.shadow_fragments ?? 0) + fragmentAmount;
    updates['progression.shadow_fragments_total'] =
      (prog.shadow_fragments_total ?? 0) + fragmentAmount;
  }

  const batch = writeBatch(db);
  batch.update(userRef, updates);
  await batch.commit();

  console.log(`[DB] earnCurrencyBatch: +${goldAmount}g / +${fragmentAmount}f uid=${uid}`);
}

/**
 * Forja uma Memória: deduz shadow_fragments e adiciona ao forge_inventory.
 * Operação atômica via runTransaction.
 *
 * @param {string} uid
 * @param {string} recipeId       — ID da receita (ex: 'forge_mestre')
 * @param {number} fragmentCost
 * @returns {{ newInventory: Array, newItemId: string }}
 */
export async function craftMemoryTx(uid, recipeId, fragmentCost) {
  const userRef = _userRef(uid);
  let   newItemId;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('Perfil não encontrado.');

    const data  = snap.data();
    const frags = data.progression?.shadow_fragments ?? 0;

    if (frags < fragmentCost) {
      throw new Error(
        `Fragmentos insuficientes. Você tem ${frags} e precisa de ${fragmentCost}.`
      );
    }

    // Deduzir fragmentos
    tx.update(userRef, {
      'progression.shadow_fragments': frags - fragmentCost,
      last_active:                    serverTimestamp(),
    });

    // Adicionar ao forge_inventory
    const newRef = doc(_forgeInvRef(uid));
    newItemId    = newRef.id;
    tx.set(newRef, {
      recipe_id:   recipeId,
      forged_at:   serverTimestamp(),
      equipped_in: null,
    });
  });

  const newInventory = await getForgeInventory(uid);
  console.log(`[DB] craftMemoryTx: ${recipeId} (${fragmentCost}f) uid=${uid}`);
  return { newInventory, newItemId };
}

/**
 * Compra item cosmético do Mercado com dedução atômica de gold_coins.
 *
 * @param {string} uid
 * @param {string} itemId     — ex: 'theme_blood_mode'
 * @param {number} goldCost
 */
export async function purchaseMarketItemTx(uid, itemId, goldCost) {
  const userRef = _userRef(uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('Perfil não encontrado.');

    const data = snap.data();
    const gold = data.progression?.gold_coins ?? 0;

    if (gold < goldCost) {
      throw new Error(`Ouro insuficiente. Você tem ${gold} e precisa de ${goldCost}.`);
    }

    const unlockedItems = data.cosmetics?.unlocked_market_items ?? [];
    if (unlockedItems.includes(itemId)) throw new Error('Item já adquirido.');

    tx.update(userRef, {
      'progression.gold_coins':          gold - goldCost,
      'cosmetics.unlocked_market_items': [...unlockedItems, itemId],
      last_active:                       serverTimestamp(),
    });
  });

  console.log(`[DB] purchaseMarketItemTx: ${itemId} (${goldCost}g) uid=${uid}`);
}

/**
 * Compra recompensa IRL com limite semanal — operação atômica.
 *
 * @param {string} uid
 * @param {string} rewardId
 * @param {number} goldCost
 * @param {string} weekKey    — ex: "2026-W16"
 */
export async function purchaseIRLRewardTx(uid, rewardId, goldCost, weekKey) {
  const userRef   = _userRef(uid);
  const rewardRef = _marketDocRef(uid, rewardId);

  await runTransaction(db, async (tx) => {
    const [userSnap, rewardSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(rewardRef),
    ]);

    if (!userSnap.exists())   throw new Error('Perfil não encontrado.');
    if (!rewardSnap.exists()) throw new Error('Recompensa não encontrada.');

    const gold = userSnap.data().progression?.gold_coins ?? 0;
    if (gold < goldCost) {
      throw new Error(`Ouro insuficiente. Você tem ${gold} e precisa de ${goldCost}.`);
    }

    const rewardData        = rewardSnap.data();
    const weekLimit         = rewardData.week_limit ?? 1;
    const purchasesByWeek   = rewardData.purchases_by_week ?? {};
    const purchasedThisWeek = purchasesByWeek[weekKey] ?? 0;

    if (purchasedThisWeek >= weekLimit) {
      throw new Error('Limite semanal atingido para esta recompensa.');
    }

    tx.update(userRef,   { 'progression.gold_coins': gold - goldCost, last_active: serverTimestamp() });
    tx.update(rewardRef, { [`purchases_by_week.${weekKey}`]: purchasedThisWeek + 1 });
  });

  console.log(`[DB] purchaseIRLRewardTx: ${rewardId} semana=${weekKey} (${goldCost}g) uid=${uid}`);
}

/**
 * Equipa (ou desequipa) uma Memória forjada em um Slot.
 * writeBatch — atualiza raiz + forge_inventory atomicamente.
 *
 * @param {string}      uid
 * @param {string}      slotKey       — ex: 'Slot_XP'
 * @param {string|null} inventoryId   — null = desequipar
 * @param {string|null} lootId
 */
export async function equipMemorySlotTx(uid, slotKey, inventoryId, lootId) {
  const userRef = _userRef(uid);
  const batch   = writeBatch(db);

  const slotPayload = inventoryId
    ? { inventory_id: inventoryId, loot_id: lootId, equipped_at: new Date().toISOString() }
    : null;

  batch.update(userRef, {
    [`memory_slots.${slotKey}`]: slotPayload,
    last_active:                 serverTimestamp(),
  });

  if (inventoryId) {
    const invRef = _forgeInvDocRef(uid, inventoryId);
    batch.update(invRef, { equipped_in: slotKey });
  }

  await batch.commit();
  console.log(`[DB] equipMemorySlotTx: slot=${slotKey} inv=${inventoryId} uid=${uid}`);
}

// ============================================================
//   v3.1 — FORGE INVENTORY
// ============================================================

/**
 * Carrega todas as Memórias forjadas do inventário do jogador.
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function getForgeInventory(uid) {
  const snap = await getDocs(_forgeInvRef(uid));
  return snap.docs.map(d => ({ inventory_id: d.id, ...d.data() }));
}

// ============================================================
//   v3.1 — MARKET ITEMS CRUD
// ============================================================

/**
 * Retorna todos os itens do Mercado do jogador (recompensas IRL).
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function getMarketItems(uid) {
  const snap = await getDocs(_marketRef(uid));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Cria ou atualiza um item do Mercado (recompensa IRL).
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function saveMarketItem(uid, data) {
  if (data.id) {
    await setDoc(_marketDocRef(uid, data.id), data, { merge: true });
    return { id: data.id, ...data };
  }
  const ref = await addDoc(_marketRef(uid), {
    ...data,
    created_at: serverTimestamp(),
  });
  return { id: ref.id, ...data };
}

/**
 * Remove um item do Mercado.
 * @param {string} uid
 * @param {string} itemId
 */
export async function deleteMarketItem(uid, itemId) {
  await deleteDoc(_marketDocRef(uid, itemId));
}
