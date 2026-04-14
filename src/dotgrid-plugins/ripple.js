/**
 * @module dotgrid-ripple
 * @description Radial push wave dotgrid effect plugin.
 * Injects outward velocity and density in a circular pattern.
 */

export var rippleEffect = {
  name: 'ripple',

  meta: {
    label: 'Ripple',
    description: 'Radial velocity burst and density ring from a center point',
    tags: ['ripple', 'wave', 'radial'],
  },

  params: {
    radius:  { label: 'Radius',   type: 'range', min: 50,  max: 800, default: 500, step: 10, unit: 'px' },
    push:    { label: 'Push',     type: 'range', min: 1,   max: 30,  default: 14,  step: 1 },
    density: { label: 'Density',  type: 'range', min: 0.1, max: 1.0, default: 0.6, step: 0.1 },
    color:   { label: 'Color',    type: 'color', default: '#C45A3C' },
  },

  run: function (g, args) {
    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var maxRadius = opts.radius || 500;
    if (g.isMobile) maxRadius = Math.min(maxRadius, window.innerWidth * g.mobileMaxRadiusFraction);
    else if (g.isTablet) maxRadius = Math.min(maxRadius, window.innerWidth * g.tabletMaxRadiusFraction);
    var pushStr = opts.push || 14;
    var densStr = opts.density || 0.6;
    var color = g.parseColor(opts.color || '#C45A3C');
    var gridR = maxRadius / dotSz;
    var gc = g.v2g(cx, cy);

    var gridCols = g.gridCols;
    var density = g.density;
    var velX = g.velX;
    var velY = g.velY;
    var colorR = g.colorR;
    var colorG = g.colorG;
    var colorB = g.colorB;

    var c0 = Math.max(0, (gc.col - gridR) | 0);
    var c1 = Math.min(gridCols - 1, (gc.col + gridR + 1) | 0);
    var r0 = Math.max(0, (gc.row - gridR) | 0);
    var r1 = Math.min(g.gridRows - 1, (gc.row + gridR + 1) | 0);

    g.expandBbox(c0, c1, r0, r1);

    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var dx = cc - gc.col, dy = rr - gc.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridR || dist < 0.1) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;
        var nx = dx / dist, ny = dy / dist;

        density[idx] = Math.min(1, density[idx] + intensity * densStr * dm);
        velX[idx] += nx * intensity * pushStr / dotSz;
        velY[idx] += ny * intensity * pushStr / dotSz;
        colorR[idx] = color[0]; colorG[idx] = color[1]; colorB[idx] = color[2];
      }
    }
    g.startSim();
  },
};

export function install(grid) {
  grid.registerEffect('ripple', rippleEffect);
}

export default { name: 'dotgrid-ripple', install: install };
