/**
 * Shadow Slave Life OS — Dark Synth Audio Engine (Phase 4)
 * ==========================================================
 * Revisão completa dos sons para um timbre sombrio e grave.
 * Osciladores com frequências mais baixas, decays longos, reverb sintético.
 */

class SoundManager {
  constructor() {
    this._ctx    = null;
    this.enabled = true;
    this.volume  = 0.15;
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
   * Tom simples com envelope de decay.
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
//   SONS DARK SYNTH — Revisados para Shadow Slave
// ============================================================

/** Clique seco e grave */
export function playClick() {
  sfx.tone(220, 0.05, 'square', 0, 0.5);
}

/** Fragmentos de Sombra ganhos — descida sombria em vez de acorde alegre */
export function playXpGain() {
  sfx.tone(330, 0.09, 'square', 0.00, 0.65);
  sfx.tone(247, 0.09, 'square', 0.07, 0.55);
  sfx.tone(196, 0.12, 'square', 0.14, 0.45);
}

/** Level-up → Rank Up agora chama playRankUp() */
export function playLevelUp() {
  playRankUp();
}

/** Fanfarra sombria do Rank Up — descendente, grave, épica */
export function playRankUp() {
  // Acordes descendentes — Do menor natural
  const seq = [
    { f: 523, t: 0.00, type: 'sawtooth' },
    { f: 440, t: 0.15, type: 'sawtooth' },
    { f: 349, t: 0.30, type: 'sawtooth' },
    { f: 294, t: 0.48, type: 'sawtooth' },
    { f: 196, t: 0.68, type: 'sawtooth' },   // nota final grave, longa
  ];
  seq.forEach(({ f, t, type }, i) =>
    sfx.tone(f, i === seq.length - 1 ? 0.8 : 0.18, type, t, 0.7)
  );
  // Drone de fundo
  sfx.tone(98, 1.4, 'sine', 0.0, 0.3);
}

/** Ataque de boss — percussivo, impactante */
export function playBossAttack() {
  sfx.tone(180, 0.12, 'sawtooth', 0.00, 0.85, 60);
  sfx.tone(60,  0.18, 'sine',     0.02, 0.6);
}

/** Derrota épica do Boss — queda dramática */
export function playBossDefeat() {
  const melody = [
    { f: 392, t: 0.00 },
    { f: 330, t: 0.12 },
    { f: 294, t: 0.24 },
    { f: 246, t: 0.36 },
    { f: 196, t: 0.52 },
    { f: 147, t: 0.72 },
    { f: 110, t: 0.95 },  // grave final
  ];
  melody.forEach(({ f, t }, i) =>
    sfx.tone(f, i === melody.length - 1 ? 1.0 : 0.15, 'sawtooth', t, 0.75)
  );
  sfx.tone(55, 1.8, 'sine', 0.5, 0.25);  // sub-bass
}

/** Memória obtida — shimmer etéreo e misterioso */
export function playMemoriaObtida() {
  // Arpejo ascendente em tom menor
  const notes = [220, 261, 311, 370];
  notes.forEach((f, i) => {
    sfx.tone(f * 2, 0.4, 'sine',     i * 0.09, 0.4);  // harmônico superior
    sfx.tone(f,     0.6, 'triangle', i * 0.09, 0.3);  // base
  });
  // Shimmer final
  sfx.tone(880, 1.2, 'sine', 0.38, 0.2);
}

/** Achievement desbloqueado */
export function playAchievement() {
  const arp = [262, 311, 370, 440];
  arp.forEach((f, i) => sfx.tone(f, 0.14, 'triangle', i * 0.07, 0.7));
  sfx.tone(440, 0.5, 'sine', 0.3, 0.35);
}

/** Timer de descanso — dois bipes graves */
export function playTimerDing() {
  sfx.tone(220, 0.15, 'sine', 0.00, 0.65);
  sfx.tone(330, 0.18, 'sine', 0.20, 0.55);
}

/** Erro / ação inválida */
export function playError() {
  sfx.tone(100, 0.10, 'square', 0, 0.6);
  sfx.tone(80,  0.10, 'square', 0.08, 0.5);
}

/** Drag de tarefa — woosh sombrio */
export function playWoosh() {
  sfx.tone(300, 0.08, 'sawtooth', 0, 0.35, 100);
}

/** Drop de tarefa — clique satisfatório */
export function playDrop() {
  sfx.tone(196, 0.06, 'sine', 0.00);
  sfx.tone(262, 0.06, 'sine', 0.06);
}

/** Anoitecer — drone grave ao entrar no modo noturno */
export function playNightfall() {
  sfx.tone(55,  3.0, 'sine',      0.0, 0.2);  // sub-bass long
  sfx.tone(110, 2.0, 'triangle',  0.5, 0.15);
  sfx.tone(82,  2.5, 'sawtooth',  1.0, 0.05);
}

// ============================================================
//   CONTROLES PÚBLICOS
// ============================================================
export function setSoundEnabled(val)  { sfx.enabled = val; }
export function setSoundVolume(val)   { sfx.volume = Math.max(0, Math.min(1, val)); }
