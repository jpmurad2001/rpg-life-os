/**
 * Shadow Slave Life OS — Dark Synth Audio Engine (Phase 4.1)
 * ==========================================================
 * Refactor: Added SFX_MAP support for high-quality MP3 assets.
 * Supports procedural synth tones AND file-based SFX.
 */

const SFX_MAP = {
  ui_click: '/assets/sfx/fx/sfx_ui_click.mp3',
  quest_done: '/assets/sfx/fx/sfx_quest_done.mp3',
  pomodoro_end: '/assets/sfx/fx/sfx_pomodoro_end.mp3',
  boss_hit: '/assets/sfx/fx/sfx_boss_hit.mp3',
  boss_defeat: '/assets/sfx/fx/sfx_boss_defeat.mp3',
  level_up: '/assets/sfx/fx/sfx_level_up.mp3',
  critical_hit: '/assets/sfx/fx/sfx_critical_hit.mp3',
  loot_drop: '/assets/sfx/fx/sfx_loot_drop.mp3',
  rank_ascension: '/assets/sfx/fx/sfx_rank_ascension.mp3',
  // Tiers dinâmicos para conquistas, badges e títulos
  unlock_tier1: '/assets/sfx/fx/sfx_unlock_tier1.mp3',
  unlock_tier2: '/assets/sfx/fx/sfx_unlock_tier2.mp3',
  unlock_tier3: '/assets/sfx/fx/sfx_unlock_tier3.mp3',
  unlock_tier4: '/assets/sfx/fx/sfx_unlock_tier4.mp3',
  unlock_tier5: '/assets/sfx/fx/sfx_unlock_tier5.mp3',
  unlock_tier6: '/assets/sfx/fx/sfx_unlock_tier6.mp3'
};

class SoundManager {
  constructor() {
    this._ctx    = null;
    this.enabled = true;
    this.volume  = 0.15;
    this._cache  = {}; // To avoid redundant Audio object creation (minimal latency gain)
  }

  get ctx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._ctx;
  }

  _master() {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    g.connect(this.ctx.destination);
    return g;
  }

  /**
   * Toca um efeito sonoro baseado na chave do SFX_MAP.
   * @param {string} key Chave do som no SFX_MAP
   */
  playSound(key) {
    if (!this.enabled) return;
    const path = SFX_MAP[key];
    if (!path) {
      console.warn(`[SoundManager] Som não encontrado: ${key}`);
      return;
    }

    try {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.play().catch(e => {
        // Ignorar erros de interação do navegador se necessário
        if (e.name !== 'NotAllowedError') {
          console.error(`[SoundManager] Erro ao tocar ${key}:`, e);
        }
      });
    } catch (err) {
      console.error(`[SoundManager] Falha crítica ao inicializar áudio ${key}:`, err);
    }
  }

  /**
   * Tom simples com envelope de decay (Procedural).
   */
  tone(freq, duration, type = 'square', startOffset = 0, gainMod = 1.0, pitchEnd = null) {
    if (!this.enabled) return;
    const now  = this.ctx.currentTime + startOffset;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const master = this._master();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(pitchEnd, 1), now + duration);
    }

    gain.gain.setValueAtTime(gainMod, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Dois osciladores misturados para textura mais rica.
   */
  dual(freq1, freq2, duration, type = 'sine', startOffset = 0) {
    if (!this.enabled) return;
    [freq1, freq2].forEach((f, i) => {
      this.tone(f, duration, type, startOffset + i * 0.01, i === 0 ? 0.8 : 0.4);
    });
  }
}

export const sfx = new SoundManager();

// ============================================================
//   HELPERS DINÂMICOS
// ============================================================

/**
 * Toca o efeito sonoro de destravamento correspondente ao Tier da recompensa.
 * @param {number} tier Nível da recompensa (1 a 6)
 */
export function playUnlockSound(tier) {
  const safeTier = Math.max(1, Math.min(6, tier)); // Garante que fique entre 1 e 6
  const soundKey = `unlock_tier${safeTier}`;
  sfx.playSound(soundKey);
}

/** Função principal exposta para tocar sons dinâmicos */
export function playSound(name) {
  sfx.playSound(name);
}

// ============================================================
//   RETRORRECOMPATIBILIDADE — Mapeando funções antigas para o novo motor
// ============================================================

/** Clique seco e grave */
export function playClick() {
  sfx.playSound('ui_click');
}

/** Conclusão de Quest ou ganho de XP */
export function playXpGain() {
  sfx.playSound('quest_done');
}

/** Level-up */
export function playLevelUp() {
  sfx.playSound('level_up');
}

/** Rank Up */
export function playRankUp() {
  sfx.playSound('rank_ascension');
}

/** Ataque de boss */
export function playBossAttack() {
  sfx.playSound('boss_hit');
}

/** Derrota do Boss */
export function playBossDefeat() {
  sfx.playSound('boss_defeat');
}

/** Memória obtida */
export function playMemoriaObtida() {
  sfx.playSound('loot_drop');
}

/** Achievement desbloqueado — usa o Tier 2 como padrão para conquistas normais */
export function playAchievement() {
  playUnlockSound(2);
}

/** Timer de descanso / Fim de Pomodoro */
export function playTimerDing() {
  sfx.playSound('pomodoro_end');
}

/** Erro / ação inválida (Mantido procedural por ser reativo) */
export function playError() {
  sfx.tone(100, 0.10, 'square', 0, 0.6);
  sfx.tone(80,  0.10, 'square', 0.08, 0.5);
}

/** Woosh e Drop (Mantidos procedurais para evitar latência em interações de UI constantes) */
export function playWoosh() {
  sfx.tone(300, 0.08, 'sawtooth', 0, 0.35, 100);
}

export function playDrop() {
  sfx.tone(196, 0.06, 'sine', 0.00);
  sfx.tone(262, 0.06, 'sine', 0.06);
}

/** Anoitecer — drone grave ao entrar no modo noturno (Mistura procedural + novo SFX se disponível futuramente) */
export function playNightfall() {
  sfx.tone(55,  3.0, 'sine',      0.0, 0.2);
  sfx.tone(110, 2.0, 'triangle',  0.5, 0.15);
}

// ============================================================
//   CONTROLES PÚBLICOS
// ============================================================
export function setSoundEnabled(val)  { sfx.enabled = val; }
export function setSoundVolume(val)   { sfx.volume = Math.max(0, Math.min(1, val)); }

