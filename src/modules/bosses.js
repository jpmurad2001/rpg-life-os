/**
 * RPG Life OS — Bosses Module (Phase 2)
 * Floating damage numbers, defeat confetti, drag-reorder subtasks, link to quest.
 */

import {
  loadState, saveState,
  awardXP, awardAttributeXP,
  attackBoss, bossHpPercent,
  checkAchievements, genId,
  getWeekId, ATTR_KEYS, ATTR_META
} from '../engine/core.js';

import {
  renderHUD, showToast, showLevelUp, openModal, showMemoryObtainedOverlay
} from '../engine/gamification.js';

import { calcRank, formatDropResult, rollQuestDrop } from '../engine/drop_engine.js';
import { getLootTable, addToInventory } from '../firebase/db.js';
import { auth } from '../firebase/firebase.js';

import { playBossAttack, playBossDefeat } from '../engine/audio.js';

// ============================================================
//   SPRITES
// ============================================================
const BOSS_SPRITES = {
  dragon: '🐉', golem: '🗿', witch: '🧙',
  demon: '😈', giant: '👹', shadow: '👤',
};

// ============================================================
//   RENDER
// ============================================================
export function renderBosses() {
  const state = loadState();
  const grid = document.getElementById('bosses-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (state.bosses.length === 0) {
    grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Nenhum Boss invocado ainda. O mundo está em paz... por enquanto.</p>';
    return;
  }

  const sorted = [...state.bosses].sort((a, b) =>
    a.status === b.status ? 0 : a.status === 'active' ? -1 : 1
  );

  for (const boss of sorted) {
    grid.appendChild(buildBossCard(boss));
  }
}

function buildBossCard(boss) {
  const card = document.createElement('div');
  card.className = `boss-card${boss.status === 'defeated' ? ' boss-card--defeated' : ''}`;
  card.dataset.bossId = boss.id;
  card.style.position = 'relative'; // anchor for floating numbers

  const hpPct = bossHpPercent(boss) * 100;
  const sprite = BOSS_SPRITES[boss.sprite] ?? '👾';
  const hpColor = hpPct > 50 ? 'var(--boss-hp-full)' : hpPct > 20 ? 'var(--boss-hp-low)' : 'var(--boss-hp-critical)';

  // Banner
  card.innerHTML += `
    <div class="boss-card__banner">
      <span class="boss-sprite">${sprite}</span>
      <div>
        <div class="boss-name">${boss.name}</div>
        <div class="text-muted font-display" style="font-size:var(--fs-display);margin-top:4px">${boss.description}</div>
      </div>
    </div>
    <div class="boss-card__hp">
      <div class="boss-hp-label">
        <span>💀 HP DO BOSS</span>
        <span id="boss-hp-text-${boss.id}">${boss.hp_current} / ${boss.hp_max}</span>
      </div>
      <div class="boss-hp-bar" id="boss-hp-bar-${boss.id}">
        <div class="boss-hp-bar__fill" id="boss-hp-fill-${boss.id}"
          style="width:${hpPct.toFixed(1)}%;background:linear-gradient(90deg,#7b0000,${hpColor});">
        </div>
      </div>
    </div>
  `;

  // Subtasks
  const subtasksSection = document.createElement('div');
  subtasksSection.className = 'boss-card__subtasks';
  subtasksSection.id = `boss-subtasks-${boss.id}`;

  if (boss.subtasks.length === 0) {
    subtasksSection.innerHTML = '<p class="empty-state" style="padding:var(--space-3)">Sem subtarefas cadastradas.</p>';
  } else {
    // Sort: pending first
    const sorted = [...boss.subtasks].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'pending' ? -1 : 1;
    });
    for (const sub of sorted) {
      subtasksSection.appendChild(buildSubtaskEl(boss, sub));
    }
  }
  card.appendChild(subtasksSection);

  // Footer
  if (boss.status === 'active') {
    const footer = document.createElement('div');
    footer.className = 'boss-card__footer';
    footer.innerHTML = `
      <button class="btn-rp btn-rp--ghost" style="border-color:var(--color-hp);color:var(--color-hp);font-size:var(--fs-xxs)"
        data-boss-add-sub="${boss.id}">⚔️ + Ataque</button>
      <button class="btn-rp btn-rp--ghost" style="font-size:var(--fs-xxs)" data-boss-del="${boss.id}">✕ Deletar</button>
    `;
    footer.querySelector(`[data-boss-add-sub]`)?.addEventListener('click', () => openAddSubtaskModal(boss.id));
    footer.querySelector(`[data-boss-del]`)?.addEventListener('click', () => deleteBoss(boss.id));
    card.appendChild(footer);
  } else {
    const defeatEl = document.createElement('div');
    defeatEl.style.cssText = 'text-align:center;padding:var(--space-3);font-family:var(--font-pixel);font-size:var(--fs-xs);color:var(--color-gold);';
    defeatEl.textContent = '⚔️ BOSS DERROTADO ⚔️';
    card.appendChild(defeatEl);
  }

  return card;
}

function buildSubtaskEl(boss, sub) {
  const subEl = document.createElement('div');
  subEl.className = `boss-subtask${sub.status === 'completed' ? ' boss-subtask--done' : ''}`;
  subEl.dataset.subId = sub.id;
  subEl.innerHTML = `
    <span>${sub.status === 'completed' ? '☑' : '☐'}</span>
    <span class="boss-subtask__title">${sub.title}</span>
    <span class="boss-subtask__damage">-${sub.damage} HP</span>
    <span class="task-attr-badge ${sub.attribute}">${sub.attribute}</span>
  `;

  if (sub.status !== 'completed' && boss.status === 'active') {
    subEl.addEventListener('click', () => handleAttackBoss(boss.id, sub.id, subEl));
  }
  return subEl;
}

// ============================================================
//   ATTACK & ANIMATIONS
// ============================================================
async function handleAttackBoss(bossId, subtaskId, subtaskEl) {
  let state = loadState();
  const boss = state.bosses.find(b => b.id === bossId);
  const subtask = boss?.subtasks.find(s => s.id === subtaskId);
  if (!boss || !subtask) return;

  const result = attackBoss(state, bossId, subtaskId);

  // Award XP & attribute
  const { state: s1, leveledUp, newLevel } = awardXP(result.state, subtask.xp_reward ?? 30);
  const { state: s2 } = awardAttributeXP(s1, subtask.attribute ?? 'ART', Math.floor((subtask.xp_reward ?? 30) / 2));
  checkAchievements(s2);

  // If boss defeated, add bonus XP
  let finalState = s2;
  let bonusLevelUp = false;
  let bonusLevel = s2.player.level;
  if (result.bossDefeated) {
    const { state: s3, leveledUp: l3, newLevel: n3 } = awardXP(s2, boss.xp_reward_on_defeat ?? 500);
    finalState = s3;
    bonusLevelUp = l3;
    bonusLevel = n3;
  }

  saveState(finalState);

  // Spawn floating damage number
  spawnFloatingDamage(`-${subtask.damage} HP`, bossId);
  playBossAttack();

  // HP bar shake
  const bossCard = document.querySelector(`[data-boss-id="${bossId}"]`);
  const hpBar = document.getElementById(`boss-hp-bar-${bossId}`);
  bossCard?.classList.remove('anim-hit');
  hpBar?.classList.remove('anim-flash');
  void bossCard?.offsetWidth; // reflow to restart animation
  bossCard?.classList.add('anim-hit');
  hpBar?.classList.add('anim-flash');

  // Animate HP bar fill
  const newHpPct = bossHpPercent(result.boss) * 100;
  const hpFill = document.getElementById(`boss-hp-fill-${bossId}`);
  if (hpFill) hpFill.style.width = `${newHpPct.toFixed(1)}%`;
  const hpText = document.getElementById(`boss-hp-text-${bossId}`);
  if (hpText) hpText.textContent = `${result.boss.hp_current} / ${result.boss.hp_max}`;

  showToast(`💥 Ataque! -${subtask.damage} HP do Boss  +${subtask.xp_reward} XP`, 'damage');

  if (result.bossDefeated) {
    spawnDefeatConfetti(bossCard);
    playBossDefeat();
    setTimeout(() => showToast(`🏆 BOSS DERROTADO! +${boss.xp_reward_on_defeat} XP bônus!`, 'defeat', 5000), 800);
    if (bonusLevelUp) setTimeout(() => showLevelUp(bonusLevel), 1200);
    setTimeout(() => renderBosses(), 1500);
  } else {
    if (leveledUp) setTimeout(() => showLevelUp(newLevel), 400);
    // Greyed out subtask inline
    subtaskEl.classList.add('boss-subtask--done');
    subtaskEl.querySelector('span:first-child').textContent = '☑';
  }

  renderHUD(finalState);

  // --- PHASE 5: Drop Engine Integration ---
  if (auth.currentUser) {
      try {
          const table = await getLootTable();
          const pRank = calcRank(finalState.player.stats.total_xp_earned ?? finalState.player.xp);
          
          if (result.bossDefeated) {
              // Boss defeat drops (100% guaranteed + RNG bonuses)
              const { rollBossDrop } = await import('../engine/drop_engine.js');
              const bossDrops = rollBossDrop({
                  lootTable: table,
                  guaranteedDropIds: result.boss.guaranteed_drops || [],
                  bossRank: result.boss.rank || 'Desperto',
                  player: pRank
              });
              
              for (const item of bossDrops.items) {
                  await addToInventory(auth.currentUser.uid, item.id, 'boss', result.boss.id);
              }
              
              if (bossDrops.items.length > 0) {
                  const uiItem = formatDropResult(bossDrops.items[0]);
                  setTimeout(() => showMemoryObtainedOverlay(uiItem), 1200); 
                  console.log('🐉 Boss Drops:', bossDrops.items.map(i => i.name));
              }
          } else {
              // Subtask drop (35% chance since isBossSub = true)
              const dropResult = rollQuestDrop({
                  lootTable: table,
                  player: pRank,
                  isBossSub: true
              });
              
              if (dropResult.dropped && dropResult.item) {
                  const uiItem = formatDropResult(dropResult.item);
                  setTimeout(() => showMemoryObtainedOverlay(uiItem), 1200); 
                  await addToInventory(auth.currentUser.uid, dropResult.item.id, 'boss_subtask', subtaskId);
                  console.log('💎 Boss Subtask Drop obtained:', uiItem.name);
              }
          }
      } catch (e) {
          console.warn('Falha ao processar drop engine no Boss:', e);
      }
  }
}

// ============================================================
//   VISUAL FX
// ============================================================
function spawnFloatingDamage(text, bossId) {
  const card = document.querySelector(`[data-boss-id="${bossId}"]`);
  if (!card) return;

  const el = document.createElement('div');
  el.className = 'damage-float';
  el.textContent = text;
  el.style.cssText = `
    position: absolute;
    left: 50%;
    top: 30%;
    transform: translateX(-50%);
    z-index: 100;
  `;
  card.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

const CONFETTI_COLORS = ['#ffd700', '#ff4081', '#7c4dff', '#00e676', '#4fc3f7', '#ff7043'];

function spawnDefeatConfetti(cardEl) {
  if (!cardEl) return;
  const container = document.createElement('div');
  container.className = 'confetti-container';
  cardEl.appendChild(container);

  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      animation-duration: ${0.8 + Math.random() * 1.2}s;
      animation-delay: ${Math.random() * 0.4}s;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3000);
}

// ============================================================
//   MODALS
// ============================================================
function openNewBossModal() {
  const spriteOptions = Object.entries(BOSS_SPRITES).map(([k, e]) =>
    `<option value="${k}">${e} ${k}</option>`
  ).join('');

  openModal({
    title: '🐉 Invocar Novo Boss',
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Nome do Boss</label>
        <input class="form-input" id="boss-name" type="text" placeholder="Ex: Lançar Canal no YouTube" />
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input class="form-input" id="boss-desc" type="text" placeholder="Breve descrição do projeto" />
      </div>
      <div class="form-group">
        <label class="form-label">HP Total do Boss</label>
        <input class="form-input" id="boss-hp" type="number" value="1000" min="100" step="50" />
      </div>
      <div class="form-group">
        <label class="form-label">Atributo de Bônus</label>
        <select class="form-select" id="boss-attr-bonus">
          ${ATTR_KEYS.map(k => `<option value="${k}">${ATTR_META[k].icon} ${k}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sprite</label>
        <select class="form-select" id="boss-sprite">${spriteOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">XP de Bônus ao Derrotar</label>
        <input class="form-input" id="boss-xp-reward" type="number" value="500" min="100" step="50" />
      </div>
    `,
    confirmLabel: 'Invocar Boss',
    onConfirm: () => {
      const name = document.getElementById('boss-name')?.value?.trim();
      const desc = document.getElementById('boss-desc')?.value?.trim() ?? '';
      const hp = parseInt(document.getElementById('boss-hp')?.value ?? '1000', 10);
      const sprite = document.getElementById('boss-sprite')?.value ?? 'dragon';
      const xpReward = parseInt(document.getElementById('boss-xp-reward')?.value ?? '500', 10);

      if (!name) { showToast('⚠️ Dê um nome ao Boss!', 'info', 2000); return; }

      let state = loadState();
      state.bosses.push({
        id: genId('boss'), name, description: desc, sprite,
        hp_max: hp, hp_current: hp, attribute_bonus: document.getElementById('boss-attr-bonus')?.value ?? 'INT',
        xp_reward_on_defeat: xpReward, status: 'active',
        created_at: new Date().toISOString(), defeated_at: null, subtasks: [],
      });
      saveState(state);
      showToast('🐉 Boss invocado! Prepare-se!', 'damage');
      renderBosses();
    },
  });
}

function openAddSubtaskModal(bossId) {
  const state = loadState();
  const boss = state.bosses.find(b => b.id === bossId);
  if (!boss) return;

  // Build quest selector for linking
  const weekId = getWeekId();
  const pendingQuests = state.quests.weeks[weekId]?.tasks.filter(t => t.status === 'pending') ?? [];
  const questOptions = pendingQuests.length > 0
    ? `<option value="">— nenhuma —</option>` + pendingQuests.map(q =>
      `<option value="${q.id}">${q.title} (${q.day})</option>`
    ).join('')
    : '<option value="">— sem quests pendentes —</option>';

  openModal({
    title: `⚔️ Novo Ataque — ${boss.name}`,
    bodyHTML: `
      <div class="form-group">
        <label class="form-label">Título da Subtarefa</label>
        <input class="form-input" id="sub-title" type="text" placeholder="Ex: Escrever roteiro ep.1" />
      </div>
      <div class="form-group">
        <label class="form-label">Dano ao Boss (HP)</label>
        <input class="form-input" id="sub-dmg" type="number" value="50" min="10" step="10" />
      </div>
      <div class="form-group">
        <label class="form-label">XP de Recompensa</label>
        <input class="form-input" id="sub-xp" type="number" value="30" min="5" max="200" />
      </div>
      <div class="form-group">
        <label class="form-label">Atributo</label>
        <select class="form-select" id="sub-attr">
          ${ATTR_KEYS.map(k => `<option value="${k}">${ATTR_META[k].icon} ${k}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Vincular a Quest Semanal (opcional)</label>
        <select class="form-select" id="sub-quest">${questOptions}</select>
      </div>
    `,
    confirmLabel: 'Adicionar Ataque',
    onConfirm: () => {
      const title = document.getElementById('sub-title')?.value?.trim();
      const damage = parseInt(document.getElementById('sub-dmg')?.value ?? '50', 10);
      const xp = parseInt(document.getElementById('sub-xp')?.value ?? '30', 10);
      const attr = document.getElementById('sub-attr')?.value ?? 'ART';
      const questId = document.getElementById('sub-quest')?.value || null;

      if (!title) { showToast('⚠️ Dê um título ao ataque!', 'info', 2000); return; }

      let st = loadState();
      const b = st.bosses.find(b => b.id === bossId);
      if (b) {
        const subId = genId('sub');
        b.subtasks.push({ id: subId, title, damage, xp_reward: xp, attribute: attr, status: 'pending', completed_at: null, quest_id: questId });
        // If linked to a quest, update that quest's boss_id
        if (questId) {
          const wk = st.quests.weeks[getWeekId()];
          const q = wk?.tasks.find(t => t.id === questId);
          if (q) { q.boss_id = bossId; }
        }
        saveState(st);
        showToast('⚔️ Ataque adicionado!', 'info');
        renderBosses();
      }
    },
  });
}

function deleteBoss(bossId) {
  openModal({
    title: 'Deletar Boss',
    bodyHTML: `<p class="font-display" style="font-size:var(--fs-display)">Deletar este Boss e todos os seus ataques? O projeto será removido.</p>`,
    confirmLabel: '✕ Deletar',
    onConfirm: () => {
      let state = loadState();
      state.bosses = state.bosses.filter(b => b.id !== bossId);
      saveState(state);
      renderBosses();
    },
  });
}

// ============================================================
//   INIT
// ============================================================
export function initBosses() {
  renderBosses();
  document.getElementById('btn-new-boss')?.addEventListener('click', openNewBossModal);
}
