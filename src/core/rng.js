/**
 * @module core/rng
 * @description Engine-owned seeded pseudo-random pool.
 *
 * Live mode: `rand()` forwards to `Math.random()`. Namespace arg is ignored.
 * Render mode: `rand(ns)` returns a value from a mulberry32 PRNG keyed by
 * `ns`. Each namespace gets its own generator, derived from
 * `hash(ns) ^ globalSeed`, so per-animation-instance determinism holds
 * even when animations interleave and advance their sequences at different
 * rates.
 *
 * Seeded means: same seed + same namespace + same Nth call → same value,
 * across runs, across processes, across machines.
 *
 * Why mulberry32: small (10 LOC), fast, passes basic uniformity tests,
 * 2^32 period. Not cryptographic — don't use this for secrets. Fine for
 * particle positions, jitter, and visual RNG.
 */

const LIVE = 'live';
const RENDER = 'render';
const DEFAULT_NS = '__global__';

/**
 * FNV-1a 32-bit hash. Deterministic string → uint32.
 * @param {string} s
 * @returns {number}
 */
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG factory. Returns a function that yields floats in [0, 1).
 * @param {number} seed uint32
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a new RNG pool. The pool lazily creates per-namespace mulberry32
 * generators on first access to each namespace.
 *
 * @param {number} [initialSeed=0] uint32
 * @returns {{
 *   rand: (namespace?: string) => number,
 *   reset: () => void,
 *   setSeed: (seed: number) => void,
 *   setMode: (mode: 'live' | 'render') => void,
 *   getMode: () => 'live' | 'render'
 * }}
 */
export function createRngPool(initialSeed = 0) {
  let mode = LIVE;
  let globalSeed = (initialSeed >>> 0);
  /** @type {Map<string, () => number>} */
  const pool = new Map();

  function getGenerator(namespace) {
    let g = pool.get(namespace);
    if (!g) {
      const seed = hashString(String(namespace)) ^ globalSeed;
      g = mulberry32(seed);
      pool.set(namespace, g);
    }
    return g;
  }

  return {
    /**
     * Draw the next float in [0, 1).
     * Live mode: ignores namespace, returns `Math.random()`.
     * Render mode: advances the PRNG for `namespace` and returns the next value.
     */
    rand(namespace) {
      if (mode === LIVE) return Math.random();
      return getGenerator(namespace == null ? DEFAULT_NS : namespace)();
    },

    /** Discard all per-namespace generators. Next `rand(ns)` lazily re-seeds. */
    reset() {
      pool.clear();
    },

    /**
     * Change the global seed. Clears the pool so every namespace re-seeds
     * from the new value on next access.
     */
    setSeed(seed) {
      globalSeed = (seed >>> 0);
      pool.clear();
    },

    /**
     * Switch modes. Render mode clears the pool so each render run starts
     * from a fresh lazy-init state.
     */
    setMode(newMode) {
      if (newMode !== LIVE && newMode !== RENDER) {
        throw new TypeError(`rng.setMode: invalid mode "${newMode}" (expected "live" or "render")`);
      }
      mode = newMode;
      if (newMode === RENDER) pool.clear();
    },

    getMode() { return mode; },
  };
}
