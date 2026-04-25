/**
 * Shoegaze audio pack — the clicker's score progression is an ALBUM now,
 * not a chord soup. A single continuously-running Transport drives a
 * layered arrangement of chord progressions that advance bar-by-bar,
 * bloom and decay, and cross-fade at track boundaries when the score
 * tier changes.
 *
 * Interface parity with chiptune.js holds: same `oneshots` surface, and
 * `ambients.tier` still has keys '0'..'16'. Factories for those keys are
 * thin views into the shared Transport — they set "current tier" + layer
 * mix and return a voice handle whose .stop() hands ownership back. The
 * Transport itself runs as long as at least one tier is active, or until
 * an idle grace window expires.
 *
 * ── Research block (the homework) ──────────────────────────────────
 *
 * Slowdive — "When the Sun Hits" (Souvlaki, 1993). Key of D major
 * (relative F#m tonal pull), ~93 BPM. The verse oscillates between D
 * (I) and F#m (iii), both held for 4 beats each — the iii creates the
 * melancholy, the I is the sigh of relief. The pre-chorus lifts to G
 * (IV) and A (V), and the chorus lands back on D with the "when the
 * sun hits" refrain. The signature riff is a descending arpeggio on
 * top of D → F#m → G → A that outlines the scale degrees 5-3-2-1.
 * Bar lengths are generous: 4 bars per chord in the verse, 2 bars per
 * chord in the chorus. Open-tuning-flavored voicings — lots of fifths
 * and 9ths, very few closed thirds.
 *   Encoded as: Track 2 "Warming" (tiers 2-3), D major, 4-bar verse +
 *   4-bar chorus, progression I(D)–iii(F#m)–IV(G)–V(A), melody [5,3,2,1].
 *
 * Slowdive — "Alison" (Souvlaki, 1993). Key of E major, ~99 BPM but
 * the pulse reads closer to 75 due to the half-time drum feel. Opens
 * on an E drone that sits for 8 beats (2 bars) before the first chord
 * change. Verse: A (IV) – B (V) alternating — a IV–V vamp that NEVER
 * resolves to the tonic, which is the entire emotional code of the
 * song. The chorus drops to E (I) – D (bVII) — the mixolydian fall is
 * what makes the chorus feel like release after all that hovering. A7
 * and B7sus4 colour the cadences. Vocal lines are phrased across bars,
 * not with bars, which is why 8-bar phrasing feels right.
 *   Encoded as: Track 1 "Intro" (tiers 0-1), E major, 8-bar phrase
 *   opening on 2 bars of sustained E(sus2), then IV(Asus2)–V(Bsus4)–
 *   I(E)–bVII(Dadd9). Melody [1, 2, 1] — the vocal sigh.
 *
 * My Bloody Valentine — "Sometimes" (Loveless, 1991). Eb major (the
 * guitars are in conventional tuning tuned down a half step, so the
 * shapes are D-major shapes voiced a semitone down). ~88 BPM. The
 * opening riff is the iconic progression: Eb (I) – Gm/Eb (iii) –
 * Cm7 (vi) – Ab (IV), 4 bars per chord, and the whole song is built
 * on it. Arrangement arc: sparse acoustic intro → wall-of-sound bloom
 * at the second verse → drum-less dissolution at the outro.
 * Shields's trick: the tremolo-bar is held in the raised position so
 * strums bloom upward in pitch rather than striking a sharp attack;
 * this is the "reverse-reverb" sound that isn't reverb at all.
 *   Encoded as: Track 3 "Bloom" (tiers 4-6), Eb major, 4 bars/chord
 *   progression I(Eb)–iii(Gm)–vi(Cm)–IV(Ab). Melody [1, 3, 5, 3] — the
 *   hovering vocal motif. Glide time increases tier-over-tier so the
 *   walls get bigger.
 *
 * Common DNA across all three: lots of IV and V, extended dwell on
 * each chord (4-8 bars), open voicings (sus2/add9/sus4, avoid close
 * thirds), slow tempi (66-99 BPM), and deferred resolution — the
 * tonic either appears late or never. The Transport encodes these as
 * per-track `progression` arrays with `bars` per chord and open-interval
 * voicings under `quality`.
 *
 * ── Track list → tier coverage ────────────────────────────────────
 *
 *   Track 1 "Intro"      tiers 0-1        75 BPM   E major    Alison
 *   Track 2 "Warming"    tiers 2-3        82 BPM   D major    WTSH
 *   Track 3 "Bloom"      tiers 4-6        88 BPM   Eb major   Sometimes
 *   Track 4 "Drift"      tiers 7-9        78 BPM   Bm         vamp
 *   Track 5 "Ascension"  tiers 10-11      95 BPM   F# major   peak
 *   Track 6 "1000"       tier 12         100 BPM   D major    arrival
 *   Track 7 "Void"       tiers 13-15      70 BPM   C minor    dissonance
 *   Track 8 "Outro"      tier 16          60 BPM   A minor    dissolve
 *
 * At 75 BPM a bar is 3.2s; an 8-bar phrase is 25.6s. Layer mix changes
 * and track crossings are quantized to the bar boundary so nothing
 * ever tears — instruments just enter and leave.
 */

// ── Music theory helpers ─────────────────────────────────────────

// Semitone offsets for a note in the 12-TET scale.
const NOTE_ST = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11,
};

// Hz for a given note at a given octave (A4 = 440).
function noteFreq(note, octave) {
  const st = NOTE_ST[note];
  if (st == null) return 220;
  const midi = 12 * (octave + 1) + st;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Chord voicing table, returned as an array of SEMITONE offsets from root.
// Open voicings — sus2 / sus4 / add9 / m7 dominate. Avoid close thirds.
const QUALITIES = {
  // root, 2nd, 5th, octave, 2nd-octave — the Souvlaki sus2.
  'sus2':  [0, 2, 7, 12, 14],
  // root, 4th, 5th, octave — 11th flavour.
  'sus4':  [0, 5, 7, 12, 17],
  // root, 3rd, 5th, 9th, octave — open add9.
  'add9':  [0, 4, 7, 12, 14],
  // root, 3rd, 5th, octave, major-7th — Track 6 arrival.
  'maj7':  [0, 4, 7, 11, 12],
  // root, 3rd, 5th, octave — a plain major but wide.
  'maj':   [0, 4, 7, 12, 19],
  // root, minor-3rd, 5th, octave — melancholy but open.
  'min':   [0, 3, 7, 12, 15],
  // root, minor-3rd, 5th, minor-7th, 9th — Cm7 for Sometimes.
  'm7':    [0, 3, 7, 10, 14],
  // root, minor-3rd, 5th, minor-7th, 11th — wider m7.
  'm11':   [0, 3, 7, 10, 17],
  // root, minor-2nd, 5th — Void dissonance.
  'susB2': [0, 1, 7, 12],
  // root, fifth only — drone.
  'fifth': [0, 7, 12, 19],
};

// Resolve (root, quality) → array of concrete Hz at a given base octave.
// Base octave = where the root lives; voicing offsets extend upward.
function voicingFreqs(root, quality, baseOct) {
  const offs = QUALITIES[quality] || QUALITIES['sus2'];
  const rootHz = noteFreq(root, baseOct);
  const out = [];
  for (let i = 0; i < offs.length; i++) {
    out.push(rootHz * Math.pow(2, offs[i] / 12));
  }
  return out;
}

// Scale-degree → semitone offset for a MAJOR scale (1=0, 2=2, 3=4, 4=5, 5=7, 6=9, 7=11).
const MAJOR_DEG_ST = [0, 0, 2, 4, 5, 7, 9, 11, 12];
const MINOR_DEG_ST = [0, 0, 2, 3, 5, 7, 8, 10, 12];

// Frequency of a scale degree within a chord's root — used for the lead motif.
function degreeFreq(root, baseOct, degree, isMinor) {
  const table = isMinor ? MINOR_DEG_ST : MAJOR_DEG_ST;
  const st = table[Math.max(1, Math.min(7, degree | 0))] || 0;
  return noteFreq(root, baseOct) * Math.pow(2, st / 12);
}

// ── Track definitions ────────────────────────────────────────────
// Each track is a concrete musical statement: tempo, key, progression
// (chord sequence with per-chord bar counts and an optional melody
// motif for the lead layer), and a tier→layer-mix map.
//
// Layers available: pad, lead, bass, wall, shimmer. Each is on/off per
// tier-within-track. (Volumes crossfade over 1-2 bars — they don't
// snap.) This is how "building" happens: instruments ENTER.
//
// bloom: { attackBars, decayBars } per chord envelope. Attack swells in
// from 0 to peak over attackBars; hold; decayBars before the next chord,
// start ramping down. This is the "breathing" that static drones lack.

const TRACKS = [
  // ── Track 1: "Intro" — Slowdive "Alison" (E major, IV–V vamp) ──
  {
    name: 'Intro',
    tiers: [0, 1],
    bpm: 75,
    key: 'E',
    isMinor: false,
    // Open on a drone E for 2 bars, then the IV–V vamp that never resolves,
    // then a single pass through I–bVII before looping.
    progression: [
      { root: 'E',  quality: 'sus2', bars: 2, melody: [1] },
      { root: 'E',  quality: 'sus2', bars: 2, melody: [1] },
      { root: 'A',  quality: 'sus2', bars: 2, melody: [5, 3] },
      { root: 'B',  quality: 'sus4', bars: 2, melody: [2, 1] },
      { root: 'E',  quality: 'add9', bars: 2, melody: [1, 3, 1] },
      { root: 'D',  quality: 'add9', bars: 2, melody: [2, 1] },
    ],
    baseOct: 2,
    pattern: 'half-time',
    layers: {
      0: ['pad'],
      1: ['pad', 'lead'],
    },
    bloom: { attackBars: 1, decayBars: 1 },
    glideSec: 2.0,
  },
  // ── Track 2: "Warming" — Slowdive "When the Sun Hits" (D) ──────
  {
    name: 'Warming',
    tiers: [2, 3],
    bpm: 82,
    key: 'D',
    isMinor: false,
    // I–iii–IV–V, 4 bars each — the verse-to-chorus arc compressed.
    progression: [
      { root: 'D',  quality: 'sus2', bars: 4, melody: [5, 3, 2, 1] },
      { root: 'F#', quality: 'min',  bars: 4, melody: [3, 1] },
      { root: 'G',  quality: 'add9', bars: 4, melody: [5, 3, 2] },
      { root: 'A',  quality: 'sus4', bars: 4, melody: [2, 1] },
    ],
    baseOct: 2,
    pattern: 'rock-basic',
    layers: {
      2: ['pad', 'lead'],
      3: ['pad', 'lead', 'bass', 'drums'],
    },
    bloom: { attackBars: 2, decayBars: 1 },
    glideSec: 1.6,
  },
  // ── Track 3: "Bloom" — MBV "Sometimes" (Eb major) ──────────────
  {
    name: 'Bloom',
    tiers: [4, 5, 6],
    bpm: 88,
    key: 'Eb',
    isMinor: false,
    // I–iii–vi–IV, the Loveless signature.
    progression: [
      { root: 'Eb', quality: 'sus2', bars: 4, melody: [1, 3, 5, 3] },
      { root: 'G',  quality: 'min',  bars: 4, melody: [5, 3, 1] },
      { root: 'C',  quality: 'm7',   bars: 4, melody: [1, 3, 1] },
      { root: 'Ab', quality: 'add9', bars: 4, melody: [5, 3, 2, 1] },
    ],
    baseOct: 2,
    pattern: 'eighths',
    layers: {
      4: ['pad', 'lead', 'bass', 'drums'],
      5: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar'],
      6: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar', 'shimmer'],
    },
    bloom: { attackBars: 2, decayBars: 1 },
    glideSec: 1.0,
  },
  // ── Track 4: "Drift" — extended vamp, heavier processing (Bm) ──
  {
    name: 'Drift',
    tiers: [7, 8, 9],
    bpm: 78,
    key: 'B',
    isMinor: true,
    // i–VI–III–VII (natural minor) — the drift never lands.
    progression: [
      { root: 'B',  quality: 'min',  bars: 4, melody: [1, 3, 5] },
      { root: 'G',  quality: 'maj7', bars: 4, melody: [3, 5, 3] },
      { root: 'D',  quality: 'add9', bars: 4, melody: [5, 3, 2] },
      { root: 'A',  quality: 'sus4', bars: 4, melody: [2, 1, 7] },
    ],
    baseOct: 2,
    pattern: 'drift',
    layers: {
      7: ['pad', 'lead', 'bass'],
      8: ['pad', 'lead', 'bass', 'drums', 'wall'],
      9: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar', 'shimmer'],
    },
    bloom: { attackBars: 2, decayBars: 2 },
    glideSec: 1.2,
  },
  // ── Track 5: "Ascension" — peak density (F# major) ─────────────
  {
    name: 'Ascension',
    tiers: [10, 11],
    bpm: 95,
    key: 'F#',
    isMinor: false,
    // I–V–vi–IV — the pop bloom, maxed. Shorter dwell to feel urgent.
    progression: [
      { root: 'F#', quality: 'add9', bars: 2, melody: [1, 3, 5] },
      { root: 'C#', quality: 'sus4', bars: 2, melody: [5, 3] },
      { root: 'D#', quality: 'min',  bars: 2, melody: [3, 1] },
      { root: 'B',  quality: 'add9', bars: 2, melody: [5, 3, 2, 1] },
    ],
    baseOct: 2,
    pattern: 'tom',
    layers: {
      10: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar'],
      11: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar', 'shimmer'],
    },
    bloom: { attackBars: 1, decayBars: 1 },
    glideSec: 0.8,
  },
  // ── Track 6: "1000" — the arrival (D major, maj7 resolution) ──
  {
    name: 'OneK',
    tiers: [12],
    bpm: 100,
    key: 'D',
    isMinor: false,
    // I(maj7)–IV(add9)–vi(m7)–V(sus4). Resolution after long deferral.
    progression: [
      { root: 'D',  quality: 'maj7', bars: 4, melody: [1, 3, 5, 7] },
      { root: 'G',  quality: 'add9', bars: 4, melody: [3, 5, 3] },
      { root: 'B',  quality: 'm7',   bars: 4, melody: [1, 3, 2] },
      { root: 'A',  quality: 'sus4', bars: 4, melody: [5, 2, 1] },
    ],
    baseOct: 3,
    pattern: 'celebrate',
    layers: {
      12: ['pad', 'lead', 'bass', 'drums', 'wall', 'guitar', 'shimmer'],
    },
    bloom: { attackBars: 2, decayBars: 1 },
    glideSec: 0.7,
  },
  // ── Track 7: "Void" — minor, suspended dissonance (C minor) ───
  {
    name: 'Void',
    tiers: [13, 14, 15],
    bpm: 70,
    key: 'C',
    isMinor: true,
    // i–b2sus–VI–v — the void doesn't breathe, it holds.
    progression: [
      { root: 'C',  quality: 'min',   bars: 4, melody: [1] },
      { root: 'Db', quality: 'susB2', bars: 4, melody: [1, 2] },
      { root: 'Ab', quality: 'maj7',  bars: 4, melody: [3, 5, 3] },
      { root: 'G',  quality: 'sus4',  bars: 4, melody: [5, 1] },
    ],
    baseOct: 2,
    pattern: 'pulse',
    layers: {
      13: ['pad', 'bass'],
      14: ['pad', 'bass', 'drums', 'wall'],
      15: ['pad', 'bass', 'drums', 'wall', 'lead', 'guitar'],
    },
    bloom: { attackBars: 3, decayBars: 2 },
    glideSec: 1.8,
  },
  // ── Track 8: "Outro" — dissolution (A minor) ──────────────────
  {
    name: 'Outro',
    tiers: [16],
    bpm: 60,
    key: 'A',
    isMinor: true,
    progression: [
      { root: 'A',  quality: 'fifth', bars: 4, melody: [1] },
      { root: 'A',  quality: 'fifth', bars: 4, melody: [1] },
    ],
    baseOct: 2,
    pattern: 'silent',
    layers: {
      16: ['pad'],
    },
    bloom: { attackBars: 4, decayBars: 4 },
    glideSec: 3.0,
  },
];

function trackForTier(n) {
  for (let i = 0; i < TRACKS.length; i++) {
    if (TRACKS[i].tiers.indexOf(n) !== -1) return { track: TRACKS[i], index: i };
  }
  return { track: TRACKS[0], index: 0 };
}

// Seconds per bar (4/4) at a given bpm.
function barSec(bpm) { return (60 / bpm) * 4; }

// ── Drum patterns ────────────────────────────────────────────────
// Beats are expressed as 0-based positions within a 4/4 bar (0 = beat 1,
// 0.5 = &-of-1, 1 = beat 2, etc.). Each track references one of these by
// name via the `pattern` field; the drum layer schedules hits per bar.
const DRUM_PATTERNS = {
  // Half-time, Alison-esque: just kick on 1 and snare on 3.
  'half-time': { kick: [0, 2], snare: [2], hat: [], shaker: [] },
  // Classic rock backbeat — When the Sun Hits verse feel.
  'rock-basic': { kick: [0, 2], snare: [1, 3], hat: [0, 1, 2, 3], shaker: [] },
  // Eighth-note hats for the Sometimes wall-of-sound bloom.
  'eighths': { kick: [0, 2], snare: [1, 3], hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], shaker: [] },
  // Sparse drift — kick on 1, hat on 3, no snare. Almost a pulse.
  'drift': { kick: [0], snare: [], hat: [2], shaker: [] },
  // Tom-push for the peak density track.
  'tom': { kick: [0, 1.5, 2, 3.5], snare: [1, 3], hat: [0, 1, 2, 3], shaker: [] },
  // Celebration — OneK gets a shaker layer on offbeats.
  'celebrate': {
    kick: [0, 2], snare: [1, 3],
    hat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    shaker: [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75],
  },
  // Void — a single kick per bar, nothing else. Heartbeat.
  'pulse': { kick: [0], snare: [], hat: [], shaker: [] },
  // Outro silence (explicit zero so the layer can mute without skipping logic).
  'silent': { kick: [], snare: [], hat: [], shaker: [] },
};

// ── Shared noise buffer ──────────────────────────────────────────
let _noiseBuf = null;
function getNoiseBuffer(ctx) {
  if (_noiseBuf && _noiseBuf.sampleRate === ctx.sampleRate) return _noiseBuf;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  _noiseBuf = buf;
  return buf;
}

// ── Plate reverb (feedback delay network, Souvlaki "Soft Focus") ─
// NOT a ConvolverNode. Lowpass + bandpass inside a feedback loop, with
// chorus-rate modulation on the delay time. Used once per Transport and
// shared by every layer through a common send bus.
function buildPlateReverb(ctx, opts) {
  const time = opts.time != null ? opts.time : 0.55;
  const feedback = opts.feedback != null ? opts.feedback : 0.72;
  const wet = opts.wet != null ? opts.wet : 0.55;

  const input = ctx.createGain();
  const output = ctx.createGain();
  output.gain.value = 0;

  const pre = ctx.createDelay(2.0);
  pre.delayTime.value = Math.min(1.5, time);
  const fbDelay = ctx.createDelay(2.0);
  fbDelay.delayTime.value = Math.min(1.5, time * 0.87);
  const fbGain = ctx.createGain();
  fbGain.gain.value = feedback;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.7;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.22;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.008;
  lfo.connect(lfoGain);
  lfoGain.connect(fbDelay.delayTime);

  input.connect(pre);
  pre.connect(lp);
  lp.connect(bp);
  bp.connect(fbDelay);
  fbDelay.connect(fbGain);
  fbGain.connect(fbDelay);
  fbDelay.connect(output);

  const t = ctx.currentTime;
  output.gain.setValueAtTime(0, t);
  output.gain.linearRampToValueAtTime(wet, t + 0.5);
  lfo.start(t);

  return {
    input, output,
    setWet(w, fadeSec) {
      const tt = ctx.currentTime;
      const f = fadeSec != null ? fadeSec : 0.3;
      output.gain.cancelScheduledValues(tt);
      output.gain.setValueAtTime(output.gain.value, tt);
      output.gain.linearRampToValueAtTime(w, tt + f);
    },
    stop(fadeSec) {
      const tt = ctx.currentTime;
      const fade = fadeSec != null ? fadeSec : 0.5;
      try {
        output.gain.cancelScheduledValues(tt);
        output.gain.linearRampToValueAtTime(0.0001, tt + fade);
        fbGain.gain.cancelScheduledValues(tt);
        fbGain.gain.linearRampToValueAtTime(0.0001, tt + fade * 0.8);
        lfo.stop(tt + fade + 0.1);
      } catch {}
    },
  };
}

// ── Layer builders ───────────────────────────────────────────────
// Each returns { setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm),
//                setGain(g, atTime, rampSec),
//                stop(fadeSec) }
// The layer owns its oscillators and the per-chord bloom envelope is
// applied inside setChord — this is where the "ebb and flow" lives.
// The Transport calls setChord on every bar boundary that starts a new
// chord, and setGain when the tier-driven layer mix changes.

function makePadLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain(); // per-chord bloom envelope
  envGain.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1600;
  lp.Q.value = 1.4;
  envGain.connect(lp);
  lp.connect(bus);
  bus.connect(dest);
  bus.connect(reverbIn);

  // A pool of 5 voices (triangle+sawtooth pair per slot, detuned).
  const SLOT_COUNT = 5;
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'triangle';
    b.type = 'sawtooth';
    a.frequency.value = 220;
    b.frequency.value = 220;
    a.detune.value = (i - 2) * 4;
    b.detune.value = (i - 2) * 4 + 8;
    const g = ctx.createGain();
    g.gain.value = 1 / SLOT_COUNT;
    a.connect(g);
    b.connect(g);
    g.connect(envGain);
    const t = ctx.currentTime;
    a.start(t); b.start(t);
    slots.push({ a, b });
  }

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm) {
    const bs = barSec(bpm);
    const glide = bs * 0.6; // glide most of one bar
    for (let i = 0; i < slots.length; i++) {
      const f = freqs[i % freqs.length];
      const s = slots[i];
      try {
        s.a.frequency.cancelScheduledValues(atTime);
        s.a.frequency.setValueAtTime(s.a.frequency.value, atTime);
        s.a.frequency.linearRampToValueAtTime(f, atTime + glide);
        s.b.frequency.cancelScheduledValues(atTime);
        s.b.frequency.setValueAtTime(s.b.frequency.value, atTime);
        s.b.frequency.linearRampToValueAtTime(f, atTime + glide);
      } catch {}
    }
    // Bloom envelope on envGain: swell attackBars, hold, decay final decayBars.
    const attackSec = Math.max(0.2, attackBars * bs);
    const totalSec = totalBars * bs;
    const decaySec = Math.max(0.2, decayBars * bs);
    const peak = 1.0;
    const tail = 0.35;
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(peak, atTime + attackSec);
      envGain.gain.linearRampToValueAtTime(peak, atTime + Math.max(attackSec, totalSec - decaySec));
      envGain.gain.linearRampToValueAtTime(tail, atTime + totalSec);
    } catch {}
  }

  function setGain(g, atTime, rampSec) {
    try {
      bus.gain.cancelScheduledValues(atTime);
      bus.gain.setValueAtTime(bus.gain.value, atTime);
      bus.gain.linearRampToValueAtTime(g, atTime + rampSec);
    } catch {}
  }

  function stop(fadeSec) {
    const tt = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(tt);
      bus.gain.linearRampToValueAtTime(0.0001, tt + fadeSec);
      for (const s of slots) {
        s.a.stop(tt + fadeSec + 0.1);
        s.b.stop(tt + fadeSec + 0.1);
      }
    } catch {}
  }

  return { setChord, setGain, stop };
}

function makeLeadLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain();
  envGain.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  lp.Q.value = 1.0;
  envGain.connect(lp); lp.connect(bus);
  bus.connect(dest);
  bus.connect(reverbIn);

  // One triangle voice with a vibrato LFO for the "yearning" sigh.
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 330;
  const vibLfo = ctx.createOscillator();
  vibLfo.type = 'sine';
  vibLfo.frequency.value = 4.5;
  const vibGain = ctx.createGain();
  vibGain.gain.value = 3.5;
  vibLfo.connect(vibGain);
  vibGain.connect(osc.frequency);
  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 0.8;
  osc.connect(voiceGain);
  voiceGain.connect(envGain);
  const t0 = ctx.currentTime;
  osc.start(t0); vibLfo.start(t0);

  // Scheduled note timeouts for the current chord.
  let timers = [];
  function clearTimers() { for (const t of timers) clearTimeout(t); timers = []; }

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm, ctxOpts) {
    clearTimers();
    // Play melody notes across the chord's duration.
    const melody = (ctxOpts && ctxOpts.melody) || [1];
    const chordRoot = ctxOpts && ctxOpts.root;
    const baseOct = (ctxOpts && ctxOpts.baseOct != null ? ctxOpts.baseOct : 2) + 2; // lead sits 2 oct up
    const isMinor = !!(ctxOpts && ctxOpts.isMinor);
    const bs = barSec(bpm);
    const totalSec = totalBars * bs;
    const noteSec = totalSec / Math.max(1, melody.length);

    // Bloom envelope — same shape as pad but slightly behind.
    const attackSec = Math.max(0.3, attackBars * bs * 1.1);
    const decaySec = Math.max(0.3, decayBars * bs);
    const peak = 0.9;
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(peak, atTime + attackSec);
      envGain.gain.linearRampToValueAtTime(peak, atTime + Math.max(attackSec, totalSec - decaySec));
      envGain.gain.linearRampToValueAtTime(0.15, atTime + totalSec);
    } catch {}

    // Schedule the melody notes as frequency ramps at note boundaries.
    const now = ctx.currentTime;
    for (let i = 0; i < melody.length; i++) {
      const noteAt = atTime + i * noteSec;
      const delayMs = Math.max(0, (noteAt - now) * 1000);
      const deg = melody[i];
      const target = degreeFreq(chordRoot || 'C', baseOct, deg, isMinor);
      timers.push(setTimeout(() => {
        try {
          const t = ctx.currentTime;
          osc.frequency.cancelScheduledValues(t);
          osc.frequency.setValueAtTime(osc.frequency.value, t);
          osc.frequency.linearRampToValueAtTime(target, t + noteSec * 0.4);
        } catch {}
      }, delayMs));
    }
  }

  function setGain(g, atTime, rampSec) {
    try {
      bus.gain.cancelScheduledValues(atTime);
      bus.gain.setValueAtTime(bus.gain.value, atTime);
      bus.gain.linearRampToValueAtTime(g, atTime + rampSec);
    } catch {}
  }

  function stop(fadeSec) {
    clearTimers();
    const tt = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(tt);
      bus.gain.linearRampToValueAtTime(0.0001, tt + fadeSec);
      osc.stop(tt + fadeSec + 0.1);
      vibLfo.stop(tt + fadeSec + 0.1);
    } catch {}
  }

  return { setChord, setGain, stop };
}

function makeBassLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain();
  envGain.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 0.9;
  envGain.connect(lp); lp.connect(bus);
  bus.connect(dest);
  // Bass doesn't hit reverb hard — just a taste.
  const sendTrim = ctx.createGain(); sendTrim.gain.value = 0.25;
  bus.connect(sendTrim); sendTrim.connect(reverbIn);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const octOsc = ctx.createOscillator();
  octOsc.type = 'triangle';
  octOsc.frequency.value = 110;
  const octGain = ctx.createGain();
  octGain.gain.value = 0.35;
  octOsc.connect(octGain);
  osc.connect(envGain);
  octGain.connect(envGain);
  const t0 = ctx.currentTime;
  osc.start(t0); octOsc.start(t0);

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm, ctxOpts) {
    // Root one octave below the chord's low voice.
    const chordRoot = (ctxOpts && ctxOpts.root) || 'C';
    const baseOct = (ctxOpts && ctxOpts.baseOct != null) ? ctxOpts.baseOct : 2;
    const subHz = noteFreq(chordRoot, baseOct - 1);
    const octHz = noteFreq(chordRoot, baseOct);
    const bs = barSec(bpm);
    const glide = bs * 0.8;
    try {
      osc.frequency.cancelScheduledValues(atTime);
      osc.frequency.setValueAtTime(osc.frequency.value, atTime);
      osc.frequency.linearRampToValueAtTime(subHz, atTime + glide);
      octOsc.frequency.cancelScheduledValues(atTime);
      octOsc.frequency.setValueAtTime(octOsc.frequency.value, atTime);
      octOsc.frequency.linearRampToValueAtTime(octHz, atTime + glide);
    } catch {}
    const attackSec = Math.max(0.3, attackBars * bs);
    const decaySec = Math.max(0.3, decayBars * bs);
    const totalSec = totalBars * bs;
    const peak = 1.0;
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(peak, atTime + attackSec);
      envGain.gain.linearRampToValueAtTime(peak, atTime + Math.max(attackSec, totalSec - decaySec));
      envGain.gain.linearRampToValueAtTime(0.6, atTime + totalSec);
    } catch {}
  }

  function setGain(g, atTime, rampSec) {
    try {
      bus.gain.cancelScheduledValues(atTime);
      bus.gain.setValueAtTime(bus.gain.value, atTime);
      bus.gain.linearRampToValueAtTime(g, atTime + rampSec);
    } catch {}
  }

  function stop(fadeSec) {
    const tt = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(tt);
      bus.gain.linearRampToValueAtTime(0.0001, tt + fadeSec);
      osc.stop(tt + fadeSec + 0.1);
      octOsc.stop(tt + fadeSec + 0.1);
    } catch {}
  }

  return { setChord, setGain, stop };
}

// Wall-of-sound layer: detuned saws + tremolo + filter LFO.
function makeWallLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain();
  envGain.gain.value = 0;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1800;
  filt.Q.value = 4;
  const trem = ctx.createGain();
  trem.gain.value = 0.75;
  envGain.connect(filt);
  filt.connect(trem);
  trem.connect(bus);
  bus.connect(dest);
  bus.connect(reverbIn);

  // Tremolo LFO
  const tremLfo = ctx.createOscillator();
  tremLfo.type = 'sine'; tremLfo.frequency.value = 2.4;
  const tremDepth = ctx.createGain(); tremDepth.gain.value = 0.25;
  tremLfo.connect(tremDepth); tremDepth.connect(trem.gain);

  // Filter LFO
  const fLfo = ctx.createOscillator();
  fLfo.type = 'sine'; fLfo.frequency.value = 0.35;
  const fDepth = ctx.createGain(); fDepth.gain.value = 800;
  fLfo.connect(fDepth); fDepth.connect(filt.frequency);

  // 6 detuned sawtooth voices — 3 freqs × 2 detunes.
  const SLOT_COUNT = 3;
  const DETUNES = [[-14, 14]];
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const pair = [];
    for (const d of DETUNES[0]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 220;
      osc.detune.value = d;
      const g = ctx.createGain();
      g.gain.value = 1 / (SLOT_COUNT * 2);
      osc.connect(g);
      g.connect(envGain);
      pair.push(osc);
    }
    slots.push(pair);
  }
  const t0 = ctx.currentTime;
  tremLfo.start(t0); fLfo.start(t0);
  for (const s of slots) for (const o of s) o.start(t0);

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm, ctxOpts) {
    const bs = barSec(bpm);
    const glide = (ctxOpts && ctxOpts.glideSec != null ? ctxOpts.glideSec : 0.9);
    // Use root + third + fifth from the voicing (indices 0, 1, 2) if available.
    for (let i = 0; i < slots.length; i++) {
      const f = freqs[Math.min(i, freqs.length - 1)] * 2; // up an octave for brightness
      for (const osc of slots[i]) {
        try {
          osc.frequency.cancelScheduledValues(atTime);
          osc.frequency.setValueAtTime(osc.frequency.value, atTime);
          osc.frequency.linearRampToValueAtTime(f, atTime + glide);
        } catch {}
      }
    }
    const attackSec = Math.max(0.3, attackBars * bs);
    const decaySec = Math.max(0.3, decayBars * bs);
    const totalSec = totalBars * bs;
    const peak = 0.9;
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(peak, atTime + attackSec);
      envGain.gain.linearRampToValueAtTime(peak, atTime + Math.max(attackSec, totalSec - decaySec));
      envGain.gain.linearRampToValueAtTime(0.25, atTime + totalSec);
    } catch {}
  }

  function setGain(g, atTime, rampSec) {
    try {
      bus.gain.cancelScheduledValues(atTime);
      bus.gain.setValueAtTime(bus.gain.value, atTime);
      bus.gain.linearRampToValueAtTime(g, atTime + rampSec);
    } catch {}
  }

  function stop(fadeSec) {
    const tt = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(tt);
      bus.gain.linearRampToValueAtTime(0.0001, tt + fadeSec);
      tremLfo.stop(tt + fadeSec + 0.1);
      fLfo.stop(tt + fadeSec + 0.1);
      for (const s of slots) for (const o of s) o.stop(tt + fadeSec + 0.1);
    } catch {}
  }

  return { setChord, setGain, stop };
}

// High bell-like shimmer, dry-ish (light reverb only).
function makeShimmerLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain();
  envGain.gain.value = 0;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 1200; hp.Q.value = 0.7;
  envGain.connect(hp); hp.connect(bus);
  bus.connect(dest);
  const sendTrim = ctx.createGain(); sendTrim.gain.value = 0.4;
  bus.connect(sendTrim); sendTrim.connect(reverbIn);

  // Two triangle voices an octave apart.
  const a = ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = 880;
  const b = ctx.createOscillator(); b.type = 'triangle'; b.frequency.value = 1320;
  const ga = ctx.createGain(); ga.gain.value = 0.5;
  const gb = ctx.createGain(); gb.gain.value = 0.35;
  a.connect(ga); b.connect(gb);
  ga.connect(envGain); gb.connect(envGain);
  const t0 = ctx.currentTime;
  a.start(t0); b.start(t0);

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm, ctxOpts) {
    const bs = barSec(bpm);
    // Sit on the chord's root/fifth two octaves up.
    const root = freqs[0] * 4;
    const fifth = (freqs[2] || freqs[1] || freqs[0]) * 4;
    const glide = bs * 0.5;
    try {
      a.frequency.cancelScheduledValues(atTime);
      a.frequency.setValueAtTime(a.frequency.value, atTime);
      a.frequency.linearRampToValueAtTime(root, atTime + glide);
      b.frequency.cancelScheduledValues(atTime);
      b.frequency.setValueAtTime(b.frequency.value, atTime);
      b.frequency.linearRampToValueAtTime(fifth, atTime + glide);
    } catch {}
    const attackSec = Math.max(0.4, attackBars * bs * 1.3);
    const decaySec = Math.max(0.4, decayBars * bs);
    const totalSec = totalBars * bs;
    const peak = 0.7;
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(peak, atTime + attackSec);
      envGain.gain.linearRampToValueAtTime(peak, atTime + Math.max(attackSec, totalSec - decaySec));
      envGain.gain.linearRampToValueAtTime(0.2, atTime + totalSec);
    } catch {}
  }

  function setGain(g, atTime, rampSec) {
    try {
      bus.gain.cancelScheduledValues(atTime);
      bus.gain.setValueAtTime(bus.gain.value, atTime);
      bus.gain.linearRampToValueAtTime(g, atTime + rampSec);
    } catch {}
  }

  function stop(fadeSec) {
    const tt = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(tt);
      bus.gain.linearRampToValueAtTime(0.0001, tt + fadeSec);
      a.stop(tt + fadeSec + 0.1);
      b.stop(tt + fadeSec + 0.1);
    } catch {}
  }

  return { setChord, setGain, stop };
}

// ── Drum layer ──────────────────────────────────────────────────
// Synthesized kit (no samples). Each chord change schedules one pattern
// per bar of that chord. The pattern name comes in via ctxOpts.pattern.
// Kick = sine sweep + short noise click. Snare = noise through bandpass
// + body tone. Hi-hat = hi-passed noise burst. Shaker = bandpassed noise
// with a fast decay. Everything sends to the plate reverb bus.
function makeDrumLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0.0001;
  bus.connect(dest);

  // Drums sit mostly dry so the backbeat stays clear, with a light send
  // to the shared plate reverb for that gated-reverb snare feel.
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  bus.connect(wet);
  wet.connect(reverbIn);

  const noiseBuf = getNoiseBuffer(ctx);

  function hitKick(t, vel) {
    const v = vel != null ? vel : 1.0;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    osc.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.85 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.start(t); osc.stop(t + 0.25);
    // Click attack — short burst of noise low-passed into the body.
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass'; nf.frequency.value = 600; nf.Q.value = 1.5;
    const ng = ctx.createGain();
    n.connect(nf); nf.connect(ng); ng.connect(bus);
    ng.gain.setValueAtTime(0.35 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    try { n.start(t, Math.random() * 1.5, 0.03); n.stop(t + 0.04); } catch {}
  }

  function hitSnare(t, vel) {
    const v = vel != null ? vel : 0.8;
    // Tone body at ~200Hz for snap.
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    osc.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.start(t); osc.stop(t + 0.15);
    // Noise for the snare wires + gated reverb feel.
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 2800; nf.Q.value = 0.7;
    const ng = ctx.createGain();
    n.connect(nf); nf.connect(ng); ng.connect(bus);
    ng.gain.setValueAtTime(0.55 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    try { n.start(t, Math.random() * 1.5, 0.2); n.stop(t + 0.2); } catch {}
  }

  function hitHat(t, vel) {
    const v = vel != null ? vel : 0.5;
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass'; nf.frequency.value = 7000; nf.Q.value = 0.8;
    const ng = ctx.createGain();
    n.connect(nf); nf.connect(ng); ng.connect(bus);
    ng.gain.setValueAtTime(0.22 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    try { n.start(t, Math.random() * 1.5, 0.05); n.stop(t + 0.06); } catch {}
  }

  function hitShaker(t, vel) {
    const v = vel != null ? vel : 0.35;
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 5800; nf.Q.value = 2.5;
    const ng = ctx.createGain();
    n.connect(nf); nf.connect(ng); ng.connect(bus);
    ng.gain.setValueAtTime(0.18 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    try { n.start(t, Math.random() * 1.5, 0.09); n.stop(t + 0.1); } catch {}
  }

  function scheduleBar(patternName, atTime, barDur) {
    const p = DRUM_PATTERNS[patternName] || DRUM_PATTERNS['rock-basic'];
    const beatDur = barDur / 4;
    if (p.kick)   for (const b of p.kick)   hitKick(atTime + b * beatDur, 1.0);
    if (p.snare)  for (const b of p.snare)  hitSnare(atTime + b * beatDur, 0.8);
    if (p.hat)    for (const b of p.hat)    hitHat(atTime + b * beatDur, 0.5);
    if (p.shaker) for (const b of p.shaker) hitShaker(atTime + b * beatDur, 0.4);
  }

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm, ctxOpts) {
    // Drums schedule a full pattern per bar of this chord.
    const patternName = (ctxOpts && ctxOpts.pattern) || 'rock-basic';
    if (patternName === 'silent') return;
    const bd = barSec(bpm);
    for (let i = 0; i < totalBars; i++) {
      scheduleBar(patternName, atTime + i * bd, bd);
    }
  }

  function setGain(g, atTime, rampSec) {
    const t = atTime != null ? atTime : ctx.currentTime;
    const r = rampSec != null ? rampSec : 0.3;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(Math.max(0.0001, g), t + r);
  }

  function stop(fadeSec) {
    const t = ctx.currentTime;
    const fade = fadeSec != null ? fadeSec : 0.4;
    bus.gain.cancelScheduledValues(t);
    bus.gain.linearRampToValueAtTime(0.0001, t + fade);
  }

  return { setChord, setGain, stop };
}

// ── Guitar layer (RAT + Big Muff pedalboard) ────────────────────
// Real distortion via WaveShaperNode. The node chain is modeled on a
// guitar signal path: stacked detuned oscillators (simulating string +
// pickup stack) → pre-EQ to shape mids going into the clipper → first
// WaveShaper stage (RAT-style hard-ish asymmetric clip) → body bandpass
// (the amp cab response) → second WaveShaper stage (Big Muff soft
// saturation for sustain) → post-EQ (Muff mid-scoop + HPF + LPF) →
// LFO-modulated short delay (Electric Mistress flange) → dry/wet split
// to the plate reverb.
//
// Pre-EQ BEFORE distortion matters: shaping the input spectrum changes
// which harmonics get generated by the clipper. Bumping mids going IN
// yields more aggressive clipping; cutting lows prevents mud. That's
// exactly how a pedal chain works in meat-space.
function makeRATCurve(amount) {
  const n = 4096;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    // Asymmetric hard-clip-ish curve: sharpens odd harmonics, keeps some bite.
    curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function makeMuffCurve(amount) {
  const n = 4096;
  const curve = new Float32Array(n);
  const k = amount;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    // Soft saturation (tanh-shaped) — sustain-heavy, 2nd-harmonic-rich.
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

function makeGuitarLayer(ctx, dest, reverbIn) {
  const bus = ctx.createGain();
  bus.gain.value = 0;
  const envGain = ctx.createGain(); // per-chord bloom envelope
  envGain.gain.value = 0;

  // ── Pre-distortion EQ: HPF to lose mud, mid bump for bite ──────
  const preHP = ctx.createBiquadFilter();
  preHP.type = 'highpass'; preHP.frequency.value = 160; preHP.Q.value = 0.7;
  const preMid = ctx.createBiquadFilter();
  preMid.type = 'peaking'; preMid.frequency.value = 800; preMid.Q.value = 1.0; preMid.gain.value = 9;
  const preGain = ctx.createGain();
  preGain.gain.value = 7.5; // slams into the clipper — "sustainer" gain

  // ── Stage 1: RAT-style hard clip (pushed harder) ──────────────
  const rat = ctx.createWaveShaper();
  rat.curve = makeRATCurve(45);
  rat.oversample = '4x';

  // ── Inter-stage gain: another 2× into Muff for fuzz velvet ────
  const interGain = ctx.createGain();
  interGain.gain.value = 2.2;

  // ── Cab body filter (post-stage-1): bandpass around the speaker cone ──
  const body = ctx.createBiquadFilter();
  body.type = 'bandpass'; body.frequency.value = 1100; body.Q.value = 1.1;

  // ── Stage 2: Big Muff soft saturation (max sustain) ───────────
  // tanh at k=26 is effectively a soft-square — sustain forever, 2nd-harmonic
  // rich, compressed dynamics. Classic Muff "violin" character.
  const muff = ctx.createWaveShaper();
  muff.curve = makeMuffCurve(26);
  muff.oversample = '4x';

  // ── Post-distortion tone stack: DEEP mid-scoop + HPF + LPF ────
  // The Muff's signature: a huge scoop around 450-500Hz. Deeper scoop
  // = more "Muff" — the guitar sits around the vocal, not on top of it.
  const postScoop = ctx.createBiquadFilter();
  postScoop.type = 'peaking'; postScoop.frequency.value = 480; postScoop.Q.value = 1.2; postScoop.gain.value = -12;
  const postHP = ctx.createBiquadFilter();
  postHP.type = 'highpass'; postHP.frequency.value = 130; postHP.Q.value = 0.5;
  const postLP = ctx.createBiquadFilter();
  postLP.type = 'lowpass'; postLP.frequency.value = 3200; postLP.Q.value = 1.1;

  // ── Electric-Mistress-ish modulated short delay (flange) ──────
  const delay = ctx.createDelay(0.02);
  delay.delayTime.value = 0.006;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = 0.4;
  const flangeLFO = ctx.createOscillator();
  flangeLFO.type = 'sine';
  flangeLFO.frequency.value = 0.35;
  const flangeDepth = ctx.createGain();
  flangeDepth.gain.value = 0.004; // 4ms sweep
  flangeLFO.connect(flangeDepth);
  flangeDepth.connect(delay.delayTime);
  flangeLFO.start(ctx.currentTime);

  // Wire chain: envGain → preHP → preMid → preGain → rat → interGain → body
  //           → muff → postScoop → postHP → postLP → [dry + delay feedback] → bus
  //           The interGain between RAT and Muff pushes more hot signal into
  //           the soft-saturation stage, extending sustain dramatically.
  envGain.connect(preHP);
  preHP.connect(preMid);
  preMid.connect(preGain);
  preGain.connect(rat);
  rat.connect(interGain);
  interGain.connect(body);
  body.connect(muff);
  muff.connect(postScoop);
  postScoop.connect(postHP);
  postHP.connect(postLP);
  postLP.connect(bus);
  // Delay feedback line (subtle, flanger-ish):
  postLP.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(bus);

  // Bus → dry to dest, heavy wet to plate reverb for the wash.
  bus.connect(dest);
  const wet = ctx.createGain();
  wet.gain.value = 0.75;
  bus.connect(wet);
  wet.connect(reverbIn);

  // ── Oscillator "string stack" — 3 detuned sawtooth pairs ──────
  const STRINGS = 3;
  const strings = [];
  for (let i = 0; i < STRINGS; i++) {
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sawtooth';
    a.frequency.value = 220;
    b.frequency.value = 220;
    // ±10 cents per string pair, slight per-slot offset — "detuned strings"
    a.detune.value = -10 + i * 6;
    b.detune.value = 10 - i * 6;
    const g = ctx.createGain();
    g.gain.value = 0.6 / STRINGS;
    a.connect(g); b.connect(g);
    g.connect(envGain);
    const t = ctx.currentTime;
    a.start(t); b.start(t);
    strings.push({ a, b });
  }

  function setChord(freqs, atTime, attackBars, totalBars, decayBars, bpm) {
    const bs = barSec(bpm);
    const glide = bs * 0.4;
    for (let i = 0; i < strings.length; i++) {
      const f = freqs[i % freqs.length];
      const s = strings[i];
      try {
        s.a.frequency.cancelScheduledValues(atTime);
        s.a.frequency.setValueAtTime(s.a.frequency.value, atTime);
        s.a.frequency.linearRampToValueAtTime(f, atTime + glide);
        s.b.frequency.cancelScheduledValues(atTime);
        s.b.frequency.setValueAtTime(s.b.frequency.value, atTime);
        s.b.frequency.linearRampToValueAtTime(f, atTime + glide);
      } catch {}
    }
    // Bloom envelope — slightly delayed attack (pick → sustain swell).
    const attackSec = Math.max(0.25, attackBars * bs);
    const totalSec = totalBars * bs;
    const decaySec = Math.max(0.2, decayBars * bs);
    try {
      envGain.gain.cancelScheduledValues(atTime);
      envGain.gain.setValueAtTime(envGain.gain.value, atTime);
      envGain.gain.linearRampToValueAtTime(1.0, atTime + attackSec * 1.15);
      envGain.gain.setValueAtTime(1.0, atTime + totalSec - decaySec);
      envGain.gain.linearRampToValueAtTime(0.5, atTime + totalSec);
    } catch {}
  }

  function setGain(g, atTime, rampSec) {
    const t = atTime != null ? atTime : ctx.currentTime;
    const r = rampSec != null ? rampSec : 0.3;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(Math.max(0.0001, g), t + r);
  }

  function stop(fadeSec) {
    const t = ctx.currentTime;
    const fade = fadeSec != null ? fadeSec : 0.4;
    bus.gain.cancelScheduledValues(t);
    bus.gain.linearRampToValueAtTime(0.0001, t + fade);
  }

  return { setChord, setGain, stop };
}

const LAYER_BUILDERS = {
  pad:     makePadLayer,
  lead:    makeLeadLayer,
  bass:    makeBassLayer,
  wall:    makeWallLayer,
  shimmer: makeShimmerLayer,
  drums:   makeDrumLayer,
  guitar:  makeGuitarLayer,
};

// Per-layer peak gains (overall mix balance).
// Drums slightly prominent to keep time; guitar pulled back because the
// distortion + wet reverb is LOUD even at modest bus gain.
const LAYER_PEAK = {
  pad:     0.16,
  lead:    0.09,
  bass:    0.12,
  wall:    0.10,
  shimmer: 0.07,
  drums:   0.18,
  guitar:  0.055, // pulled back — more gain/saturation means more perceived loudness
};

// ── Transport ────────────────────────────────────────────────────
// A single module-level Transport that holds all the music. Built
// lazily on first tier factory call. When no tier owner remains and an
// idle grace window expires, it tears down.
//
// The scheduler uses setInterval at 50ms (20 Hz) — plenty of resolution
// for bar-scheduled events at these tempos (shortest bar is 2.4s at 100
// BPM). We don't use RAF because the transport must keep running while
// the page is in the background; RAF pauses there.

let _transport = null;

function ensureTransport(ctx, dest) {
  if (_transport) return _transport;

  const reverb = buildPlateReverb(ctx, { time: 0.6, feedback: 0.75, wet: 0.55 });
  reverb.output.connect(dest);

  // Build one instance of each layer, shared across tracks.
  const layers = {};
  for (const k of Object.keys(LAYER_BUILDERS)) {
    layers[k] = LAYER_BUILDERS[k](ctx, dest, reverb.input);
  }

  // Tape hiss bed — a colour that sits under everything.
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.loop = true;
  const noiseFilt = ctx.createBiquadFilter();
  noiseFilt.type = 'bandpass'; noiseFilt.frequency.value = 4800; noiseFilt.Q.value = 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 2);
  noise.connect(noiseFilt); noiseFilt.connect(noiseGain); noiseGain.connect(dest);
  noise.start(ctx.currentTime);

  const state = {
    ctx,
    dest,
    reverb,
    layers,
    noise, noiseGain,
    // Track + position
    currentTrackIdx: -1,
    targetTrackIdx: 0,
    chordIdx: 0,
    // Absolute ctx time at which the CURRENT chord's bar sequence started.
    currentChordAt: 0,
    // Bars used by the current chord (set when we schedule the chord).
    currentChordBars: 4,
    // Current tier (most-recently-requested).
    currentTier: 0,
    // Active layer set (which layers are currently audible for this tier).
    activeLayers: new Set(),
    // Reference count of live voice handles. When it drops to 0 and
    // stays 0 past graceMs, the Transport tears down.
    refCount: 0,
    graceTimer: null,
    graceMs: 6000,
    // Scheduler handle.
    tickHandle: null,
  };

  // ── Scheduling helpers ─────────────────────────────────────────

  function nowCtx() { return ctx.currentTime; }

  function currentTrack() {
    return TRACKS[state.currentTrackIdx >= 0 ? state.currentTrackIdx : state.targetTrackIdx];
  }

  function scheduleChordAt(trackIdx, chordIdx, atTime) {
    const track = TRACKS[trackIdx];
    const entry = track.progression[chordIdx];
    const freqs = voicingFreqs(entry.root, entry.quality, track.baseOct);
    const bars = entry.bars;
    const bpm = track.bpm;
    const ctxOpts = {
      melody: entry.melody,
      root: entry.root,
      baseOct: track.baseOct,
      isMinor: track.isMinor,
      glideSec: track.glideSec,
      pattern: track.pattern || 'rock-basic',
    };
    const bloom = track.bloom || { attackBars: 1, decayBars: 1 };
    // Tell every layer builder to voice this chord — even the silent
    // ones. They'll be inaudible thanks to their bus gain, but the
    // oscillators are already locked to the right frequencies so when
    // setGain ramps them in they arrive in-tune.
    for (const k of Object.keys(state.layers)) {
      state.layers[k].setChord(freqs, atTime, bloom.attackBars, bars, bloom.decayBars, bpm, ctxOpts);
    }
    state.currentChordAt = atTime;
    state.currentChordBars = bars;
    state.chordIdx = chordIdx;
  }

  // Apply the tier → layer mix for the *currently playing* track.
  function applyLayerMix(tierN, atTime, rampSec) {
    const track = currentTrack();
    if (!track) return;
    const active = track.layers[tierN] || track.layers[track.tiers[0]] || ['pad'];
    const activeSet = new Set(active);
    // Fade in newly-active layers; fade out deactivated ones.
    for (const k of Object.keys(state.layers)) {
      const want = activeSet.has(k);
      const peak = LAYER_PEAK[k] || 0.1;
      state.layers[k].setGain(want ? peak : 0.0001, atTime, rampSec);
    }
    state.activeLayers = activeSet;
  }

  // Switch to a new track at the next bar boundary.
  function startTrack(trackIdx, atTime) {
    state.currentTrackIdx = trackIdx;
    state.chordIdx = 0;
    scheduleChordAt(trackIdx, 0, atTime);
    applyLayerMix(state.currentTier, atTime, barSec(TRACKS[trackIdx].bpm) * 1.0);
  }

  // ── Tick: advance chord index when bar time elapses ─────────────
  function tick() {
    if (!_transport) return;
    const t = nowCtx();
    // Initial start: if no track is active, start the target track now.
    if (state.currentTrackIdx === -1) {
      // Pre-fade-in of layers starts at 0 for the first chord.
      startTrack(state.targetTrackIdx, t);
      return;
    }
    const track = TRACKS[state.currentTrackIdx];
    const bs = barSec(track.bpm);
    const chordDur = state.currentChordBars * bs;
    if (t >= state.currentChordAt + chordDur - 0.04) {
      // Time to advance. If a target track differs, crossfade there on
      // the next chord boundary.
      if (state.targetTrackIdx !== state.currentTrackIdx) {
        const nextTrack = TRACKS[state.targetTrackIdx];
        const at = state.currentChordAt + chordDur;
        // Begin new track's first chord at `at`.
        state.currentTrackIdx = state.targetTrackIdx;
        state.chordIdx = 0;
        scheduleChordAt(state.currentTrackIdx, 0, at);
        // Crossfade the layer mix across 2 bars of the NEW track.
        applyLayerMix(state.currentTier, at, barSec(nextTrack.bpm) * 2.0);
      } else {
        const nextIdx = (state.chordIdx + 1) % track.progression.length;
        const at = state.currentChordAt + chordDur;
        scheduleChordAt(state.currentTrackIdx, nextIdx, at);
      }
    }
  }

  state.tickHandle = setInterval(tick, 50);
  // Kick immediately so the first chord lines up with "now".
  tick();

  // ── Public transport API (called from tier factories) ──────────
  _transport = {
    state,
    // Tier change: update target track + layer mix. Returns a handle
    // whose .stop(fadeSec) decrements the ref count.
    requestTier(tierN) {
      if (state.graceTimer) { clearTimeout(state.graceTimer); state.graceTimer = null; }
      state.refCount += 1;
      state.currentTier = tierN;
      const { index } = trackForTier(tierN);
      state.targetTrackIdx = index;
      if (state.currentTrackIdx === -1) {
        // First tier ever — tick() will start on its own.
      } else if (state.currentTrackIdx === index) {
        // Same track, different tier: just adjust the layer mix at the
        // next bar boundary (roughly — use a 1-bar ramp starting now).
        const bpm = TRACKS[index].bpm;
        applyLayerMix(tierN, ctx.currentTime, barSec(bpm) * 1.0);
      }
      // If it's a different track, tick() will transition at the next
      // chord boundary (see `if targetTrackIdx !== currentTrackIdx`).

      let released = false;
      return {
        stop(fadeSec) {
          if (released) return;
          released = true;
          if (_transport && _transport.state === state) {
            state.refCount = Math.max(0, state.refCount - 1);
            if (state.refCount === 0) {
              // Arm grace timer — if nobody takes over, tear down.
              if (state.graceTimer) clearTimeout(state.graceTimer);
              state.graceTimer = setTimeout(() => {
                tearDown(fadeSec != null ? fadeSec : 2.5);
              }, state.graceMs);
            }
          }
        },
      };
    },
    // Compute an engine-facing fade time for the PREVIOUS voice handle.
    // The engine calls .stop(fade) on the prior ambient when a new
    // setAmbient arrives — we want that fade to be small so the
    // ownership handoff is quick, because the Transport itself carries
    // the actual musical continuity.
    fadeForEngine(nextTierN) {
      const { track, index } = trackForTier(nextTierN);
      const cur = state.currentTrackIdx;
      const sameTrack = (index === cur);
      // Intra-track: handoff is essentially a pointer move (20ms).
      // Inter-track: still fast — the actual crossfade happens
      // internally over 2 bars of the new track, not via the engine.
      return sameTrack ? 0.05 : 0.25;
    },
    // Query used by tier-stinger.
    isTrackCrossing(nextTierN) {
      const { index } = trackForTier(nextTierN);
      return state.currentTrackIdx !== -1 && index !== state.currentTrackIdx;
    },
  };

  function tearDown(fadeSec) {
    if (!_transport || _transport.state !== state) return;
    const fade = fadeSec != null ? fadeSec : 2.5;
    for (const k of Object.keys(state.layers)) state.layers[k].stop(fade);
    state.reverb.stop(fade);
    const tt = ctx.currentTime;
    try {
      state.noiseGain.gain.cancelScheduledValues(tt);
      state.noiseGain.gain.linearRampToValueAtTime(0.0001, tt + fade);
      state.noise.stop(tt + fade + 0.2);
    } catch {}
    clearInterval(state.tickHandle);
    _transport = null;
  }

  return _transport;
}

// ── Click throttle ────────────────────────────────────────────────
let _lastBlipCtxTime = 0;
const BLIP_MIN_INTERVAL = 1 / 15;

function clickBlipVolume(tier) {
  const n = tier && tier.n != null ? tier.n : 0;
  if (n <= 5) return 1.0;
  if (n >= 10) return 0.12;
  return 1.0 - (n - 5) * 0.2;
}

// Muted-pick click (kept from previous pack).
function playClick(ctx, dest, opts) {
  const t = ctx.currentTime;
  if (t - _lastBlipCtxTime < BLIP_MIN_INTERVAL) return;
  _lastBlipCtxTime = t;

  const tier = opts.tier || { n: 0 };
  const score = opts.score || 0;
  const vol = clickBlipVolume(tier);

  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'triangle';
  const bodyFreq = 140 + (score % 200) * 0.4;
  body.frequency.setValueAtTime(bodyFreq * 1.3, t);
  body.frequency.exponentialRampToValueAtTime(bodyFreq * 0.7, t + 0.04);
  bodyGain.gain.setValueAtTime(0, t);
  bodyGain.gain.linearRampToValueAtTime(0.05 * vol, t + 0.002);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  body.connect(bodyGain); bodyGain.connect(dest);
  body.start(t); body.stop(t + 0.06);

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const nf = ctx.createBiquadFilter();
  nf.type = 'highpass'; nf.frequency.value = 1800; nf.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(0.04 * vol, t + 0.001);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  noise.connect(nf); nf.connect(ng); ng.connect(dest);
  noise.start(t); noise.stop(t + 0.05);
}

// Reverse-reverb swell (kept).
function playReverseSwell(ctx, dest, opts) {
  const t = ctx.currentTime;
  const dur = opts.dur || 0.8;
  const peak = opts.peak || 0.14;
  const startHz = opts.startHz || 400;
  const endHz = opts.endHz || 3200;

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(startHz, t);
  bp.frequency.exponentialRampToValueAtTime(endHz, t + dur);
  bp.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
  noise.connect(bp); bp.connect(g); g.connect(dest);
  noise.start(t); noise.stop(t + dur + 0.1);
}

// Chord swell for milestones (kept).
function playChordSwell(ctx, dest, freqs, opts) {
  const t = ctx.currentTime;
  const attack = opts.attack || 0.2;
  const hold = opts.hold || 0.8;
  const release = opts.release || 1.0;
  const peak = opts.peak || 0.08;
  const wave = opts.wave || 'triangle';
  for (let i = 0; i < freqs.length; i++) {
    for (const d of [0, 8, -8]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = freqs[i] * Math.pow(2, d / 1200);
      osc.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak / freqs.length, t + attack);
      g.gain.linearRampToValueAtTime(peak / freqs.length * 0.6, t + attack + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
      osc.start(t); osc.stop(t + attack + hold + release + 0.05);
    }
  }
}

// ── Build the pack ───────────────────────────────────────────────
export const shoegazePack = {
  name: 'shoegaze',

  oneshots: {
    click(ctx, dest, opts) { playClick(ctx, dest, opts || {}); },

    // tier-stinger: reverse-reverb swell whose size depends on whether
    // we're crossing into a new track. The Transport tells us.
    'tier-stinger'(ctx, dest, opts) {
      const tier = (opts && opts.tier) || { n: 0 };
      const n = tier.n || 0;
      const crossing = !!(_transport && _transport.isTrackCrossing(n));
      playReverseSwell(ctx, dest, {
        dur: crossing ? 1.6 : 0.9,
        peak: crossing ? 0.18 : 0.1,
        startHz: 300 + n * 40,
        endHz: 2200 + n * 120,
      });
      if (crossing) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 55;
        osc.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        osc.start(t); osc.stop(t + 1.5);
      }
    },

    milestone(ctx, dest, opts) {
      const kind = (opts && opts.kind) || 'medium';
      if (kind === 'medium') {
        playChordSwell(ctx, dest, [146.83, 220.0, 293.66],
          { attack: 0.15, hold: 0.6, release: 0.9, peak: 0.18, wave: 'triangle' });
      } else if (kind === 'big') {
        playChordSwell(ctx, dest, [146.83, 220.0, 293.66, 369.99, 440.0],
          { attack: 0.2, hold: 0.9, release: 1.4, peak: 0.22, wave: 'sawtooth' });
        playReverseSwell(ctx, dest, { dur: 1.2, peak: 0.12, startHz: 500, endHz: 3500 });
      } else {
        playChordSwell(ctx, dest, [146.83, 220.0, 293.66, 369.99, 440.0, 587.33],
          { attack: 0.25, hold: 1.3, release: 2.0, peak: 0.25, wave: 'sawtooth' });
        playReverseSwell(ctx, dest, { dur: 1.6, peak: 0.16, startHz: 400, endHz: 4000 });
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = 73.42;
        osc.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
        osc.start(t); osc.stop(t + 2.6);
      }
    },

    'one-thousand'(ctx, dest) {
      playReverseSwell(ctx, dest, { dur: 2.2, peak: 0.18, startHz: 300, endHz: 4500 });
      const t0 = ctx.currentTime;
      const chord = [146.83, 185.0, 220.0, 277.18, 329.63, 440.0, 587.33];
      for (let i = 0; i < chord.length; i++) {
        for (const d of [0, 6, -6, 12]) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = i < 3 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(chord[i] * 0.98 * Math.pow(2, d / 1200), t0);
          osc.frequency.linearRampToValueAtTime(chord[i] * Math.pow(2, d / 1200), t0 + 2.0);
          osc.connect(g); g.connect(dest);
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.03, t0 + 1.2);
          g.gain.linearRampToValueAtTime(0.02, t0 + 3.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.0);
          osc.start(t0); osc.stop(t0 + 5.1);
        }
      }
      setTimeout(() => {
        const t = ctx.currentTime;
        const notes = [587.33, 659.25, 740.0, 880.0, 987.77, 1174.66];
        for (let i = 0; i < notes.length; i++) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = notes[i];
          osc.connect(g); g.connect(dest);
          const start = t + i * 0.18;
          g.gain.setValueAtTime(0, start);
          g.gain.linearRampToValueAtTime(0.05, start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
          osc.start(start); osc.stop(start + 1.0);
        }
      }, 1500);
    },

    'black-flash'(ctx, dest) {
      playReverseSwell(ctx, dest, { dur: 0.7, peak: 0.2, startHz: 200, endHz: 2800 });
      const t = ctx.currentTime + 0.55;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.5);
      osc.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.32, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.start(t); osc.stop(t + 0.75);
    },

    nuclear(ctx, dest, opts) {
      const tier = (opts && opts.tier) || { n: 0 };
      const n = tier.n || 0;
      playReverseSwell(ctx, dest, { dur: 1.4, peak: 0.22, startHz: 250, endHz: 5000 });
      const impactAt = ctx.currentTime + 1.15;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(50, impactAt);
      sub.frequency.exponentialRampToValueAtTime(28, impactAt + 0.7);
      sub.connect(subGain); subGain.connect(dest);
      subGain.gain.setValueAtTime(0, impactAt);
      subGain.gain.linearRampToValueAtTime(0.35, impactAt + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, impactAt + 1.0);
      sub.start(impactAt); sub.stop(impactAt + 1.1);
      const feedbackBase = 220 + n * 20;
      for (const d of [0, 13, -11, 24, -27]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = feedbackBase * Math.pow(2, d / 1200);
        osc.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0, impactAt);
        g.gain.linearRampToValueAtTime(0.04, impactAt + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, impactAt + 1.2);
        osc.start(impactAt); osc.stop(impactAt + 1.3);
      }
    },
  },

  ambients: {
    // Each '0'..'16' is a view onto the shared Transport. The engine
    // calls the factory on tier change; we ask the Transport to become
    // (or stay) at the requested tier, and return a handle. When the
    // engine later calls .stop() on this handle (because a new tier
    // arrived), the Transport knows the handoff happened and keeps
    // playing. If no new handle replaces it within graceMs, the
    // Transport tears down.
    tier: (function () {
      const out = {};
      for (let i = 0; i < 17; i++) {
        const n = i;
        out[String(i)] = (ctx, dest /*, opts */) => {
          const tp = ensureTransport(ctx, dest);
          return tp.requestTier(n);
        };
      }
      return out;
    })(),
  },

  // ── Exposed for inspection / tests / advanced consumers ─────────
  tracks: TRACKS,
  // Compat: `tierDrones` used to exist but is no longer the source of
  // truth. We keep a thin shim so anyone poking at it gets a sensible
  // view (the track+chord for each tier) instead of undefined.
  get tierDrones() {
    const out = [];
    for (let i = 0; i < 17; i++) {
      const { track } = trackForTier(i);
      out.push({ track: track.name, key: track.key, bpm: track.bpm,
                 progression: track.progression, layers: track.layers[i] || [] });
    }
    return out;
  },
  // Bar-fade helper — now mostly informational since the Transport
  // handles its own internal fades. Callers that previously passed
  // `{ fade: shoegazePack.barFade(n) }` still work.
  barFade(nextTierN) {
    if (_transport) return _transport.fadeForEngine(nextTierN);
    const { track } = trackForTier(nextTierN);
    return barSec(track.bpm);
  },
};

export default shoegazePack;
