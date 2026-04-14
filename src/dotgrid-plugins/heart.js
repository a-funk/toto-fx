/**
 * @module dotgrid-heart
 * @description Heart-shaped dotgrid effect plugin.
 *
 * Uses the implicit heart equation (x^2 + y^2 - 1)^3 - x^2 * y^3 = 0
 * to inject a heart-shaped density field with pulsing outward velocity,
 * creating a throbbing fluid simulation.
 *
 * @example (ESM)
 * import { createDotgrid } from 'toto-fx';
 * import dotgridHeart from 'toto-fx/dotgrid-plugins/heart';
 *
 * const grid = createDotgrid({ ... });
 * grid.use(dotgridHeart);
 * grid.runEffect('heart', { cx: 400, cy: 300, opts: { radius: 200 } });
 *
 * @example (IIFE)
 * <script src="toto-fx.min.js"></script>
 * <script src="dotgrid-plugins/heart.min.js"></script>
 * <script>
 *   var grid = TotoFX.createDotgrid({ ... });
 *   grid.use(TotoFXDotgridHeart);
 *   grid.runEffect('heart', { cx: 400, cy: 300, opts: { radius: 200 } });
 * </script>
 */

/**
 * Heart dotgrid effect definition.
 */
export var heartEffect = {
  name: 'heart',

  meta: {
    label: 'Heart Pulse',
    description: 'Heart-shaped density injection with pulsing velocity beats',
    tags: ['heart', 'love', 'pulse'],
  },

  params: {
    radius:        { label: 'Heart Radius',    type: 'range', min: 80,  max: 400,  default: 200,  step: 10,  unit: 'px' },
    density:       { label: 'Density',         type: 'range', min: 0.2, max: 1.0,  default: 0.8,  step: 0.1 },
    push:          { label: 'Push Strength',   type: 'range', min: 2,   max: 16,   default: 8,    step: 1 },
    pulses:        { label: 'Pulses',          type: 'range', min: 1,   max: 6,    default: 3,    step: 1 },
    pulseInterval: { label: 'Pulse Interval',  type: 'range', min: 200, max: 800,  default: 450,  step: 50, unit: 'ms' },
    color:         { label: 'Edge Color',      type: 'color', default: '#E8456B' },
    coreColor:     { label: 'Core Color',      type: 'color', default: '#FF8DA1' },
  },

  /**
   * Run the heart effect using the grid context.
   * @param {Object} g - Grid context (density arrays, helpers, config)
   * @param {Object} args - { cx, cy, opts }
   */
  run: function (g, args) {
    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var radius = (opts.radius) || 200;
    if (g.isMobile) radius = Math.min(radius, window.innerWidth * g.mobileMaxRadiusFraction);
    else if (g.isTablet) radius = Math.min(radius, window.innerWidth * g.tabletMaxRadiusFraction);
    var densStr = (opts.density) || 0.8;
    var pushStr = (opts.push) || 8;
    var pulses = (opts.pulses !== undefined) ? opts.pulses : 3;
    var pulseInterval = (opts.pulseInterval) || 450;
    var edgeColor = g.parseColor((opts.color) || '#E8456B');
    var coreCol = g.parseColor((opts.coreColor) || '#FF8DA1');

    var gc = g.v2g(cx, cy);
    // Implicit heart fits in ~[-1.2, 1.2] x [-1, 1.2]
    var hs = (radius / 1.2) / dotSz;  // grid cells per heart-unit

    var gridCols = g.gridCols;
    var gridRows = g.gridRows;
    var density = g.density;
    var velX = g.velX;
    var velY = g.velY;
    var colorR = g.colorR;
    var colorG = g.colorG;
    var colorB = g.colorB;

    var c0 = Math.max(0, Math.floor(gc.col - 1.3 * hs - 1));
    var c1 = Math.min(gridCols - 1, Math.ceil(gc.col + 1.3 * hs + 1));
    var r0 = Math.max(0, Math.floor(gc.row - 1.3 * hs - 1));
    var r1 = Math.min(gridRows - 1, Math.ceil(gc.row + 1.3 * hs + 1));

    function injectBeat(strength) {
      // Re-read arrays in case grid was rebuilt between beats
      density = g.density;
      velX = g.velX;
      velY = g.velY;
      colorR = g.colorR;
      colorG = g.colorG;
      colorB = g.colorB;

      g.expandBbox(c0, c1, r0, r1);
      for (var rr = r0; rr <= r1; rr++) {
        for (var cc = c0; cc <= c1; cc++) {
          var hx = (cc - gc.col) / hs;
          var hy = (gc.row - rr) / hs;  // flip y for screen coords

          // Implicit heart: (x^2 + y^2 - 1)^3 - x^2 * y^3 < 0 means inside
          var x2 = hx * hx;
          var y2 = hy * hy;
          var y3 = y2 * hy;
          var sum = x2 + y2 - 1;
          var f = sum * sum * sum - x2 * y3;

          if (f > 0.15) continue;

          var idx = rr * gridCols + cc;
          var dist = Math.sqrt(x2 + y2);

          if (f <= 0) {
            var depth = Math.min(1, Math.pow(Math.abs(f), 0.3));

            density[idx] = Math.min(1, density[idx] + depth * densStr * strength * dm);

            if (dist > 0.1) {
              var nx = hx / dist, ny = -hy / dist;
              velX[idx] += nx * depth * pushStr * strength / dotSz;
              velY[idx] += ny * depth * pushStr * strength / dotSz;
            }

            var col = depth > 0.6 ? coreCol : edgeColor;
            colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
          } else {
            var edge = 1 - f / 0.15;
            density[idx] = Math.min(1, density[idx] + edge * 0.3 * strength * dm);
            colorR[idx] = edgeColor[0]; colorG[idx] = edgeColor[1]; colorB[idx] = edgeColor[2];
          }
        }
      }
      g.startSim();
    }

    // First beat
    injectBeat(1.0);

    // Subsequent beats with decreasing intensity
    for (var p = 1; p < pulses; p++) {
      (function (str, delay) {
        setTimeout(function () { injectBeat(str); }, delay);
      })(1.0 - p * 0.15, p * pulseInterval);
    }
  },
};

/**
 * Install the heart effect into a dotgrid instance.
 * @param {Object} grid - Dotgrid instance with registerEffect()
 */
export function install(grid) {
  grid.registerEffect('heart', heartEffect);
}

export var dotgridHeartPlugin = {
  name: 'dotgrid-heart',
  install: install,
};

export default dotgridHeartPlugin;
