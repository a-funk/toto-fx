/**
 * @module dotgrid-vortex
 * @description Rotational velocity injection dotgrid effect plugin.
 * Makes dots spiral around a center point with tangential velocity and inward pull.
 */

export var vortexEffect = {
  name: 'vortex',

  meta: {
    label: 'Vortex',
    description: 'Rotational velocity injection — dots spiral around a center point',
    tags: ['vortex', 'spin', 'spiral'],
  },

  params: {
    radius:    { label: 'Radius',    type: 'range', min: 50,  max: 600, default: 300, step: 10, unit: 'px' },
    speed:     { label: 'Speed',     type: 'range', min: 0.5, max: 4.0, default: 1.5, step: 0.1 },
    pull:      { label: 'Pull',      type: 'range', min: 0,   max: 1.0, default: 0.3, step: 0.1 },
    density:   { label: 'Density',   type: 'range', min: 0.1, max: 1.0, default: 0.5, step: 0.1 },
    color:     { label: 'Color',     type: 'color', default: '#C45A3C' },
  },

  run: function (g, args) {
    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var radius = opts.radius || 300;
    if (g.isMobile) radius = Math.min(radius, window.innerWidth * g.mobileMaxRadiusFraction);
    else if (g.isTablet) radius = Math.min(radius, window.innerWidth * g.tabletMaxRadiusFraction);
    var speed = opts.speed || 1.5;
    var pull = opts.pull || 0.3;
    var cw = !((opts.direction) === 'ccw');
    var densStr = opts.density || 0.5;
    var color = g.parseColor(opts.color || '#C45A3C');
    var gridR = radius / dotSz;
    var dir = cw ? 1 : -1;
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
        if (dist > gridR || dist < 0.5) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;
        var nx = dx / dist, ny = dy / dist;

        // Tangential velocity (perpendicular to radial)
        velX[idx] += (-ny * dir) * intensity * speed;
        velY[idx] += (nx * dir) * intensity * speed;
        // Inward pull
        velX[idx] -= nx * intensity * pull;
        velY[idx] -= ny * intensity * pull;

        density[idx] = Math.min(1, density[idx] + intensity * densStr * dm);
        colorR[idx] = color[0]; colorG[idx] = color[1]; colorB[idx] = color[2];
      }
    }
    g.startSim();
  },
};

export function install(grid) {
  grid.registerEffect('vortex', vortexEffect);
}

export default { name: 'dotgrid-vortex', install: install };
