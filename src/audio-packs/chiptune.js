/**
 * Chiptune audio pack — the first reference sound pack. 8-bit oscillator
 * synthesis only (no samples). Built around:
 *   - A Shepard-tone click blip that feels like it rises forever
 *   - A blip → drone blend so high tiers lean on sustained ambient
 *   - 17 per-tier drone voices ('tier' channel, variants '0' through '16')
 *     with optional filter LFO + sub-bass
 *   - Milestone arpeggios (medium/big/huge) + dedicated ONE THOUSAND fanfare
 *   - Black-flash boom + nuclear whoosh+impact stingers
 *
 * Drone configs are the swappable tuning surface. Shape:
 *   { freqs: [...], waveform, filter: {type, freq, Q}|null,
 *     modulation: {lfoFreq, lfoDepth}|null, sub: {freq, gain}|null, gain }
 *
 * To remix: either replace entries on this module at import time, or write
 * a derived pack that delegates to chiptunePack.oneshots but swaps
 * ambients.tier[n] with your own configs.
 */

// ── Tier drone configs (per-tier ambient chords) ────────────────
const TIER_DRONES = [
  // 0 LOW — barely present, a soft hum
  { freqs: [110, 165], waveform: 'triangle', filter: { type: 'lowpass', freq: 800, Q: 2 }, modulation: null, sub: null, gain: 0.04 },
  // 1 MEDIUM
  { freqs: [110, 147, 220], waveform: 'triangle', filter: { type: 'lowpass', freq: 1200, Q: 2 }, modulation: null, sub: null, gain: 0.05 },
  // 2 HIGH — warmer major
  { freqs: [110, 139, 165, 220], waveform: 'triangle', filter: { type: 'lowpass', freq: 1600, Q: 3 }, modulation: null, sub: null, gain: 0.06 },
  // 3 VERY HIGH — start introducing squares
  { freqs: [110, 147, 220], waveform: 'square', filter: { type: 'lowpass', freq: 1400, Q: 4 }, modulation: { lfoFreq: 0.6, lfoDepth: 400 }, sub: null, gain: 0.05 },
  // 4 INSANE — dissonant minor 2nd
  { freqs: [110, 117, 220], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 1200, Q: 5 }, modulation: { lfoFreq: 1.2, lfoDepth: 600 }, sub: null, gain: 0.06 },
  // 5 INSANITY — sub-bass kicks in
  { freqs: [110, 138, 220, 277], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 1800, Q: 6 }, modulation: { lfoFreq: 2, lfoDepth: 800 }, sub: { freq: 55, gain: 0.08 }, gain: 0.08 },
  // 6 BEYOND — violet chord, fatter
  { freqs: [110, 130, 196, 261], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 2200, Q: 6 }, modulation: { lfoFreq: 0.8, lfoDepth: 1000 }, sub: { freq: 50, gain: 0.10 }, gain: 0.09 },
  // 7 SINGULARITY — wide open
  { freqs: [110, 165, 220, 330], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 2800, Q: 8 }, modulation: { lfoFreq: 0.3, lfoDepth: 1600 }, sub: { freq: 45, gain: 0.12 }, gain: 0.10 },
  // 8 GOD MODE — hopeful perfect-5th + sub
  { freqs: [110, 165, 220, 247], waveform: 'square', filter: { type: 'lowpass', freq: 2400, Q: 6 }, modulation: { lfoFreq: 1.6, lfoDepth: 900 }, sub: { freq: 55, gain: 0.13 }, gain: 0.12 },
  // 9 OMNIPOTENT — magenta whole-tone
  { freqs: [110, 123, 196, 247], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 3000, Q: 8 }, modulation: { lfoFreq: 2.4, lfoDepth: 1400 }, sub: { freq: 42, gain: 0.14 }, gain: 0.13 },
  // 10 TRANSCENDENT — huge stack
  { freqs: [110, 165, 220, 293, 370], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 3400, Q: 10 }, modulation: { lfoFreq: 3.2, lfoDepth: 2000 }, sub: { freq: 40, gain: 0.16 }, gain: 0.14 },
  // 11 APOTHEOSIS — golden major 7th
  { freqs: [110, 139, 165, 208], waveform: 'triangle', filter: { type: 'lowpass', freq: 3000, Q: 6 }, modulation: { lfoFreq: 0.6, lfoDepth: 800 }, sub: { freq: 55, gain: 0.14 }, gain: 0.14 },
  // 12 ONE THOUSAND — bright major chord
  { freqs: [110, 138, 165, 220, 277], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 3600, Q: 8 }, modulation: { lfoFreq: 0.5, lfoDepth: 1200 }, sub: { freq: 55, gain: 0.16 }, gain: 0.16 },
  // 13 RIFT — detuned, chromatic split
  { freqs: [110, 116, 220, 233], waveform: 'sawtooth', filter: { type: 'bandpass', freq: 2200, Q: 6 }, modulation: { lfoFreq: 5, lfoDepth: 2000 }, sub: { freq: 40, gain: 0.14 }, gain: 0.14 },
  // 14 PRIMORDIAL — low, ominous, wide
  { freqs: [82, 110, 123], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 1400, Q: 10 }, modulation: { lfoFreq: 0.25, lfoDepth: 600 }, sub: { freq: 38, gain: 0.18 }, gain: 0.15 },
  // 15 HEAT DEATH — sparse, cold, near-silent
  { freqs: [110, 220], waveform: 'triangle', filter: { type: 'lowpass', freq: 900, Q: 4 }, modulation: { lfoFreq: 0.15, lfoDepth: 300 }, sub: { freq: 45, gain: 0.08 }, gain: 0.08 },
  // 16 THE SOURCE — all intervals at once
  { freqs: [110, 139, 165, 196, 220, 247, 277], waveform: 'sawtooth', filter: { type: 'lowpass', freq: 4000, Q: 12 }, modulation: { lfoFreq: 4, lfoDepth: 3000 }, sub: { freq: 35, gain: 0.20 }, gain: 0.16 },
];

// ── Shepard-tone click ───────────────────────────────────────────
// Four oscillators an octave apart. Each has a triangular window that fades
// in at the bottom of its octave cycle and out at the top, so as `score`
// increases the pitch appears to rise forever while the audible spectrum
// stays bounded (220-1760 Hz). The cycle repeats every 200 clicks.
function shepardFreqs(score) {
  const cycle = ((score || 0) % 200) / 200;  // 0..1 cycle position
  const base = [220, 440, 880, 1760];
  const out = [];
  for (let i = 0; i < base.length; i++) {
    const freq = base[i] * Math.pow(2, cycle);
    const w = Math.sin(Math.PI * cycle);
    const bandBias = i === 0 ? (1 - cycle)
                   : i === base.length - 1 ? cycle
                   : 1;
    out.push({ freq, gain: 0.7 * w + 0.3 * bandBias });
  }
  return out;
}

// Indirection so esbuild can't hoist the array lookup out of the ambient
// factories — we want substitutions to `TIER_DRONES[i] = newCfg` to take
// effect on the next setAmbient('tier', i) call.
function getTierDrone(idx) { return TIER_DRONES[idx]; }

// Click blip amplitude curve: full at tier 0-5, blend 1.0→0.2 across 6-9,
// 0.12 tactile tick at 10+. The drone carries the feel at top tiers.
function clickBlipVolume(tier) {
  const n = tier && tier.n != null ? tier.n : 0;
  if (n <= 5) return 1.0;
  if (n >= 10) return 0.12;
  return 1.0 - (n - 5) * 0.2;
}

// ── Ambient (drone) factory ──────────────────────────────────────
// Returns a voice with a .stop(fadeSec) method the engine calls on
// channel variant change or clearAmbient.
function buildDroneVoice(ctx, dest, cfg) {
  const t = ctx.currentTime;
  const attack = 0.4;

  // Per-drone filter on a shared sub-bus so LFO modulates the whole chord.
  let node = dest;
  let filter = null, lfo = null, lfoGain = null;
  if (cfg.filter) {
    filter = ctx.createBiquadFilter();
    filter.type = cfg.filter.type;
    filter.frequency.value = cfg.filter.freq;
    filter.Q.value = cfg.filter.Q;
    filter.connect(dest);
    node = filter;
    if (cfg.modulation) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.modulation.lfoFreq;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = cfg.modulation.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(t);
    }
  }

  const voiceGain = cfg.gain / Math.max(1, cfg.freqs.length);
  const voices = [];
  for (let i = 0; i < cfg.freqs.length; i++) {
    const osc = ctx.createOscillator();
    osc.type = cfg.waveform;
    osc.frequency.value = cfg.freqs[i];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(voiceGain, t + attack);
    osc.connect(g);
    g.connect(node);
    osc.start(t);
    voices.push({ osc, gain: g });
  }

  let sub = null, subGain = null;
  if (cfg.sub) {
    sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = cfg.sub.freq;
    subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(cfg.sub.gain, t + attack);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(t);
  }

  return {
    stop(fadeSec) {
      const tt = ctx.currentTime;
      const fade = (fadeSec != null ? fadeSec : 0.4);
      for (const v of voices) {
        try {
          v.gain.gain.cancelScheduledValues(tt);
          v.gain.gain.linearRampToValueAtTime(0.0001, tt + fade);
          v.osc.stop(tt + fade + 0.02);
        } catch {}
      }
      if (sub) {
        try {
          subGain.gain.cancelScheduledValues(tt);
          subGain.gain.linearRampToValueAtTime(0.0001, tt + fade);
          sub.stop(tt + fade + 0.02);
        } catch {}
      }
      if (lfo) { try { lfo.stop(tt + fade + 0.02); } catch {} }
    },
  };
}

// ── One-shot helpers ─────────────────────────────────────────────
function playArpeggio(ctx, dest, freqs, noteDur, peakGain, wave) {
  const t = ctx.currentTime;
  const w = wave || 'square';
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = w;
    osc.frequency.value = freqs[i];
    osc.connect(g); g.connect(dest);
    const start = t + i * noteDur;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peakGain, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + noteDur * 1.6);
    osc.start(start);
    osc.stop(start + noteDur * 1.7);
  }
}

// ── Voice pool throttle for click blips ──────────────────────────
// 15 Hz ceiling so 30 cps input doesn't GC-stutter on short voices.
// Module-level state because the pack instance is a singleton; if multiple
// engines adopt the same pack they share the throttle, which is fine —
// they can't all be the foreground anyway.
let _lastBlipCtxTime = 0;
const BLIP_MIN_INTERVAL = 1 / 15;

// ── Build the pack ───────────────────────────────────────────────
export const chiptunePack = {
  name: 'chiptune',

  // Fire-and-forget one-shots.
  oneshots: {
    // click: Shepard blip + tactile tick at tier 10+. opts: { score, tier }
    click(ctx, dest, opts) {
      const t = ctx.currentTime;
      if (t - _lastBlipCtxTime < BLIP_MIN_INTERVAL) return;
      _lastBlipCtxTime = t;

      const score = opts.score || 0;
      const tier = opts.tier || null;
      const blipVol = clickBlipVolume(tier);
      const voices = shepardFreqs(score);

      for (const v of voices) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = v.freq;
        osc.connect(g); g.connect(dest);
        const peak = 0.06 * v.gain * blipVol;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.09);
      }

      if (tier && tier.n >= 10) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 180;
        osc.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    },

    // tier-stinger: 3-note ascending arpeggio pitched by tier. opts: { tier }
    'tier-stinger'(ctx, dest, opts) {
      const tier = opts.tier || { n: 0 };
      const roots = [261.63, 329.63, 392.0]; // C E G
      const scaled = roots.map(f => f * (1 + tier.n * 0.02));
      playArpeggio(ctx, dest, scaled, 0.08, 0.08, 'square');
    },

    // milestone: opts: { kind: 'medium' | 'big' | 'huge' }
    milestone(ctx, dest, opts) {
      const kind = opts.kind || 'medium';
      const base = 523.25; // C5
      if (kind === 'medium') {
        playArpeggio(ctx, dest, [base, base * 1.26, base * 1.5, base * 1.89, base * 2.0], 0.06, 0.10, 'square');
      } else if (kind === 'big') {
        playArpeggio(ctx, dest, [base, base * 1.26, base * 1.5, base * 1.89, base * 2.0, base * 2.52, base * 3.0], 0.07, 0.11, 'square');
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = 110;
        osc.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t); osc.stop(t + 0.4);
      } else {
        // huge — held chord + ascending sweep
        const t = ctx.currentTime;
        const chord = [261.63, 329.63, 392.0, 523.25];
        for (const f of chord) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = f;
          osc.connect(g); g.connect(dest);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.07, t + 0.02);
          g.gain.linearRampToValueAtTime(0.04, t + 0.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
          osc.start(t); osc.stop(t + 1.0);
        }
        playArpeggio(ctx, dest, [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0], 0.08, 0.10, 'sawtooth');
      }
    },

    // one-thousand: dedicated fanfare. Caller should gate by "first reach".
    'one-thousand'(ctx, dest) {
      const t = ctx.currentTime;
      const notes = [130.81, 164.81, 196.0, 261.63, 329.63, 392.0, 523.25];
      for (let i = 0; i < notes.length; i++) {
        const f = notes[i];
        const detunes = [0, 6, -6];
        for (const d of detunes) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = i < 3 ? 'sawtooth' : 'square';
          osc.frequency.value = f;
          osc.detune.value = d;
          osc.connect(g); g.connect(dest);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.04);
          g.gain.linearRampToValueAtTime(0.035, t + 1.2);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
          osc.start(t); osc.stop(t + 2.0);
        }
      }
      // Rising chromatic sweep on top
      const sweep = [];
      for (let i = 0; i < 12; i++) sweep.push(523.25 * Math.pow(2, i / 12));
      playArpeggio(ctx, dest, sweep, 0.05, 0.08, 'square');
      // Ringing cluster 300ms in
      setTimeout(() => {
        const t2 = ctx.currentTime;
        const cluster = [1046.5, 1244.5, 1397.0, 1760.0, 2093.0];
        for (const f of cluster) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = f;
          osc.connect(g); g.connect(dest);
          g.gain.setValueAtTime(0, t2);
          g.gain.linearRampToValueAtTime(0.04, t2 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t2 + 1.0);
          osc.start(t2); osc.stop(t2 + 1.1);
        }
      }, 300);
    },

    // black-flash: low pitched boom (anime impact frame)
    'black-flash'(ctx, dest) {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
      osc.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t); osc.stop(t + 0.45);
    },

    // nuclear: whoosh + delayed low boom
    nuclear(ctx, dest) {
      const t = ctx.currentTime;
      const noise = ctx.createOscillator();
      const ng = ctx.createGain();
      const nf = ctx.createBiquadFilter();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(220, t);
      noise.frequency.exponentialRampToValueAtTime(880, t + 0.25);
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(400, t);
      nf.frequency.exponentialRampToValueAtTime(3000, t + 0.22);
      nf.Q.value = 2;
      noise.connect(nf); nf.connect(ng); ng.connect(dest);
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.12, t + 0.05);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      noise.start(t); noise.stop(t + 0.3);
      // Low impact after the whoosh
      const impactAt = t + 0.22;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, impactAt);
      osc.frequency.exponentialRampToValueAtTime(40, impactAt + 0.4);
      osc.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0, impactAt);
      g.gain.linearRampToValueAtTime(0.28, impactAt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, impactAt + 0.5);
      osc.start(impactAt); osc.stop(impactAt + 0.55);
    },
  },

  // Ambients keyed by channel → variant → factory.
  ambients: {
    // 'tier' channel: 17 variants, one per clicker tier (0..16).
    // Factories go through `getTierDrone(i)` so esbuild can't hoist the
    // TIER_DRONES[i] lookup out of the closure — the array index is read
    // fresh on every setAmbient() call. Substitutions via
    // `chiptunePack.tierDrones[n] = { ... }` take effect on the next
    // setAmbient('tier', n) without rebuilding the pack.
    tier: (function () {
      const out = {};
      for (let i = 0; i < TIER_DRONES.length; i++) {
        const idx = i;
        out[String(i)] = (ctx, dest) => buildDroneVoice(ctx, dest, getTierDrone(idx));
      }
      return out;
    })(),
  },

  // Exposed for direct edit/substitution. Assigning to
  // chiptunePack.tierDrones[n] = { ... } at runtime is safe but requires
  // a subsequent setAmbient('tier', n) call to take effect.
  tierDrones: TIER_DRONES,
};

export default chiptunePack;
