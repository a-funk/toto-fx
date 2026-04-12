/**
 * @module defaults
 * @description Production-ready default configuration for TotoFX.
 *
 * These defaults provide a complete, tuned configuration that works
 * out of the box. Override individual values via AnimationSettings
 * or pass a custom defaults object to createSettings().
 *
 * Category names: action, destroy, enter, persist, container, containerExit
 */

export const DEFAULTS = {
  _version: 2,
  theme: 'mono',

  display: {
    cardOpacity: 0.5,
    bulkAnimations: false,
    disableFlash: false,
    cardPadding: 8,
    cardMaxHeight: 0,
    cardMinHeight: 44,
    cardBorderRadius: 14,
    cardFontSize: 14,
    layout: {
      gridColumns: 'auto',
      gridMinColumnWidth: 340,
      defaultListSpan: 1,
      defaultCardColumns: 1,
      cardGap: 10,
      listGap: 16,
    },
  },

  animations: {
    action: {
      style: 'thud',
      variant: 'anime-slam',
      intensity: 5,
      speed: 1,
      fx: {
        shake: true,
        speedLines: true,
        dotgrid: true,
        flash: false,
        cardSquash: true,
      },
      params: {
        liftDur: 140,
        particles: 30,
        spread: 9,
        particleSize: 8,
      },
      behavior: {
        showStrikethrough: false,
        showBadge: false,
        badgeText: 'done',
        badgeDuration: 500,
        badgeColor: 'var(--green)',
        cardHideDelay: 550,
      },
    },

    destroy: {
      style: 'death',
      variant: 'shredder',
      intensity: 5,
      speed: 1,
      fx: {
        shake: false,
        speedLines: false,
        dotgrid: false,
        flash: false,
        cardSquash: false,
      },
      params: {},
      behavior: null,
    },

    enter: {
      style: 'dramatic',
      variant: 'slam-down',
      intensity: 5,
      speed: 1,
      fx: {},
      params: {},
    },

    persist: {
      style: 'rich',
      variant: 'progress-bar',
      intensity: 5,
      speed: 1,
      color: '',
      fx: {},
      params: {},
    },

    container: {
      style: 'pulse',
      variant: 'dotgrid-ripple',
      intensity: 5,
      speed: 1,
      fx: { dotgrid: true },
      params: {},
    },

    containerExit: {
      style: 'thud',
      variant: 'anime-slam',
      intensity: 5,
      speed: 1,
      fx: { shake: true, speedLines: true, dotgrid: true, flash: false, cardSquash: true },
      params: {},
    },
  },

  dotgrid: {
    grid: {
      dotSize: 28,
      fontSize: 19,
      baseChar: '\u00b7',
      baseOpacity: 0.67,
      palette: 'default',
    },
    physics: {
      densityDecay: 0.97,
      velDecay: 0.94,
      diffusionRate: 0.15,
      displacementScale: 1.2,
    },
    visual: {
      opacityMin: 0.75,
      opacityMax: 1,
      densityMultiplier: 2.5,
      glowEnabled: false,
      glowRadius: 8,
      glowIntensity: 0.6,
      resetOnAnimation: false,
    },
    binding: {
      enabled: true,
      effect: 'ripple',
      params: {
        ripple: { radius: 300, push: 10, density: 0.5, color: 'var(--accent)' },
        vortex: { radius: 300, speed: 1.5, pull: 0.3, density: 0.5, direction: 'cw', color: 'var(--accent)' },
        crater: { radius: 160, depth: 1, cracks: 6, crackLength: 220, color: '' },
        nuclear: { blastRadius: 280, color: 'var(--accent)' },
        scorch: { width: 40, length: 300, color: '' },
      },
    },
  },

  particleColors: {
    impact: [[196, 90, 60], [200, 120, 50]],
    smoke: [[120, 120, 110]],
    fire: [[196, 90, 60], [200, 140, 60]],
    debris: [[180, 160, 140]],
    confetti: [[196, 90, 60], [58, 125, 92], [201, 168, 76], [155, 133, 196]],
    hearts: [[196, 90, 60]],
    sparkle: [[201, 168, 76], [196, 90, 60]],
  },

  particleChars: {
    particles: ['#', '*', '+', '=', '~', '^'],
    smoke: ['\u2591', '\u2592', '~', '\u2248'],
    confetti: ['*', '+', '\u2726', '\u2605'],
    fire: ['*', '\u2726', '\u2668', '#'],
    debris: ['\u2591', '\u2592', '\u2593', '#', '^'],
    shatter: ['\u2571', '\u2572', '\u2502', '\u2500', '\u2573'],
    blast: ['\u2588', '\u2593', '\u2592', '#', '@'],
    hearts: ['\u2665'],
    sparkle: ['\u2726', '\u2727', '*'],
  },

  mobile: {
    particleScale: 0.3,
    maxParticles: 20,
    maxParticlesTotal: 40,
    shadow: false,
    dotgrid: {
      dotSize: 28,
      simRate: 0.5,
      velDecayScale: 0.92,
      densityDecayScale: 0.97,
      maxRadiusFraction: 0.65,
    },
  },
};

export default DEFAULTS;
