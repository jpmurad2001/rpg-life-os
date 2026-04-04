/**
 * RPG Life OS — 8-bit Audio Engine (Phase 3)
 * Pure Web Audio API sound synthesis — zero external files, works offline.
 * All sounds procedurally generated: square/saw/sine wave oscillators.
 */

// ============================================================
//   SOUND MANAGER
// ============================================================
class SoundManager {
    constructor() {
        this._ctx = null;
        this.enabled = true;
        this.volume = 0.18; // subtle by default
    }

    get ctx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this._ctx;
    }

    /** Master gain node */
    _masterGain() {
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        g.connect(this.ctx.destination);
        return g;
    }

    /**
     * Play a single oscillator tone.
     * @param {number} freq - Frequency in Hz
     * @param {number} duration - Duration in seconds
     * @param {'square'|'sawtooth'|'sine'|'triangle'} type - Wave type
     * @param {number} startOffset - Delay from now in seconds
     * @param {number} gainMod - Gain multiplier (0–1)
     */
    tone(freq, duration, type = 'square', startOffset = 0, gainMod = 1.0) {
        if (!this.enabled) return;

        const now = this.ctx.currentTime + startOffset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const master = this._masterGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(gainMod, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    /**
     * Pitch-sweep: start freq → end freq over duration.
     */
    sweep(freqStart, freqEnd, duration, type = 'square', startOffset = 0) {
        if (!this.enabled) return;

        const now = this.ctx.currentTime + startOffset;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const master = this._masterGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }
}

// ============================================================
//   SINGLETON INSTANCE
// ============================================================
export const sfx = new SoundManager();

// ============================================================
//   SOUND EFFECTS
// ============================================================

/** Short UI tick for button clicks */
export function playClick() {
    sfx.tone(880, 0.04, 'square', 0, 0.6);
}

/** Ascending triad when XP is gained: C→E→G */
export function playXpGain() {
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
        sfx.tone(freq, 0.08, 'square', i * 0.07, 0.7);
    });
}

/** 4-note fanfare on level-up: C→E→G→C(octave) */
export function playLevelUp() {
    const seq = [
        { f: 523, t: 0.00 },  // C5
        { f: 659, t: 0.12 },  // E5
        { f: 784, t: 0.24 },  // G5
        { f: 1047, t: 0.38 },  // C6 (hold)
    ];
    seq.forEach(({ f, t }) => sfx.tone(f, t === 0.38 ? 0.5 : 0.1, 'square', t, 0.85));
}

/** Percussive hit on boss attack: pitch drop saw */
export function playBossAttack() {
    sfx.sweep(600, 120, 0.15, 'sawtooth', 0);
    sfx.tone(80, 0.1, 'sine', 0.02, 0.5); // thud
}

/** Epic 8-note sequence for boss defeat */
export function playBossDefeat() {
    const melody = [
        { f: 262, t: 0.00 },  // C4
        { f: 392, t: 0.09 },  // G4
        { f: 440, t: 0.18 },  // A4
        { f: 330, t: 0.27 },  // E4
        { f: 349, t: 0.36 },  // F4
        { f: 523, t: 0.50 },  // C5
        { f: 784, t: 0.63 },  // G5
        { f: 1047, t: 0.78 },  // C6 (finale)
    ];
    melody.forEach(({ f, t }) => {
        sfx.tone(f, t >= 0.63 ? 0.35 : 0.10, 'square', t, 0.8);
    });
    // Chord stab during finale
    sfx.tone(523, 0.35, 'square', 0.78, 0.5);
    sfx.tone(659, 0.35, 'square', 0.78, 0.4);
}

/** Two gentle sine bipes for rest timer done */
export function playTimerDing() {
    sfx.tone(880, 0.12, 'sine', 0.00, 0.7);
    sfx.tone(1320, 0.14, 'sine', 0.18, 0.6);
}

/** Buzzer for errors / invalid actions */
export function playError() {
    sfx.tone(150, 0.08, 'square', 0, 0.6);
}

/** Achievement unlock: ascending arpeggio + shimmer */
export function playAchievement() {
    const arp = [523, 659, 784, 1047];
    arp.forEach((f, i) => sfx.tone(f, 0.12, 'triangle', i * 0.06, 0.75));
    sfx.tone(1047, 0.4, 'sine', 0.28, 0.4); // sustain shimmer
}

/** Drag start subtle woosh */
export function playWoosh() {
    sfx.sweep(200, 400, 0.08, 'sine', 0);
}

/** Drop task on day card */
export function playDrop() {
    sfx.tone(440, 0.05, 'sine', 0);
    sfx.tone(660, 0.05, 'sine', 0.06);
}

// ============================================================
//   PERSISTENCE HELPERS
// ============================================================
export function setSoundEnabled(val) {
    sfx.enabled = val;
}

export function setSoundVolume(val) {
    sfx.volume = Math.max(0, Math.min(1, val));
}
