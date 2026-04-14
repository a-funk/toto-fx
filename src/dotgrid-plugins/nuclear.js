/**
 * @module dotgrid-nuclear
 * @description Mushroom cloud dotgrid effect plugin.
 * Ground-zero fire core, vertical smoke stem, elliptical cap, and shockwave ring.
 */

export var nuclearEffect = {
  name: 'nuclear',

  meta: {
    label: 'Nuclear',
    description: 'Mushroom cloud with stem, cap, and expanding shockwave ring',
    tags: ['nuclear', 'mushroom', 'explosion', 'blast'],
  },

  params: {
    blastRadius: { label: 'Blast Radius', type: 'range', min: 100, max: 500, default: 280, step: 10, unit: 'px' },
    color:       { label: 'Ring Color',   type: 'color', default: '#C45A3C' },
  },

  run: function (g, args) {
    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var rawBlastR = opts.blastRadius || 280;
    if (g.isMobile) rawBlastR = Math.min(rawBlastR, window.innerWidth * g.mobileMaxRadiusFraction);
    else if (g.isTablet) rawBlastR = Math.min(rawBlastR, window.innerWidth * g.tabletMaxRadiusFraction);
    var blastR = rawBlastR / dotSz;
    var gc = g.v2g(cx, cy);

    var gridCols = g.gridCols;
    var gridRows = g.gridRows;
    var density = g.density;
    var velX = g.velX;
    var velY = g.velY;
    var colorR = g.colorR;
    var colorG = g.colorG;
    var colorB = g.colorB;

    var fireCol = [255, 240, 180];
    var stemCol = [255, 150, 50];
    var smokeCol = [200, 180, 150];
    var ringCol = g.parseColor(opts.color || '#C45A3C');

    // Scale mushroom cloud proportionally with blast radius
    var s = blastR / (280 / dotSz);
    var stemW = (35 / dotSz) * s, stemH = (140 / dotSz) * s;
    var capW = (100 / dotSz) * s, capH = (60 / dotSz) * s;
    var gzR = (60 / dotSz) * s;
    var ringW = (30 / dotSz) * Math.max(1, s * 0.6);
    var ringVel = 1.5 * Math.max(1, s * 0.7);
    var capRow = gc.row - stemH - capH * 0.3;

    var extentC0 = Math.max(0, Math.floor(gc.col - blastR - capW));
    var extentC1 = Math.min(gridCols - 1, Math.ceil(gc.col + blastR + capW));
    var extentR0 = Math.max(0, Math.floor(capRow - capH - 3));
    var extentR1 = Math.min(gridRows - 1, Math.ceil(gc.row + blastR + 3));
    g.expandBbox(extentC0, extentC1, extentR0, extentR1);

    for (var rr = extentR0; rr <= extentR1; rr++) {
      for (var cc = extentC0; cc <= extentC1; cc++) {
        var dx = cc - gc.col, dy = rr - gc.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var relY = rr - gc.row;
        var absDx = Math.abs(dx);

        if (dist > blastR && Math.abs(relY) > stemH + capH + 3) continue;

        var idx = rr * gridCols + cc;
        var inGZ = dist < gzR;
        var inStem = absDx < stemW && relY < 0 && relY > -stemH;
        var capDist = Math.sqrt(dx * dx / (capW * capW) + (rr - capRow) * (rr - capRow) / (capH * capH));
        var inCap = capDist < 1.0;
        var ringDist = Math.abs(dist - blastR * 0.7);
        var onRing = ringDist < ringW && dist > gzR;

        if (inGZ) {
          density[idx] = Math.min(1, density[idx] + 0.95 * dm);
          colorR[idx] = fireCol[0]; colorG[idx] = fireCol[1]; colorB[idx] = fireCol[2];
        } else if (inStem) {
          var t = Math.abs(relY) / stemH;
          density[idx] = Math.min(1, density[idx] + 0.7 * (1 - t * 0.5) * dm);
          var col = t < 0.4 ? stemCol : smokeCol;
          colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
        } else if (inCap) {
          density[idx] = Math.min(1, density[idx] + 0.8 * (1 - capDist) * dm);
          var col = capDist < 0.4 ? fireCol : smokeCol;
          colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
        } else if (onRing) {
          var ri = 1 - ringDist / ringW;
          density[idx] = Math.min(1, density[idx] + ri * 0.7 * dm);
          velX[idx] += (dx / (dist || 1)) * ri * ringVel;
          velY[idx] += (dy / (dist || 1)) * ri * ringVel;
          colorR[idx] = ringCol[0]; colorG[idx] = ringCol[1]; colorB[idx] = ringCol[2];
        }
      }
    }
    g.startSim();
  },
};

export function install(grid) {
  grid.registerEffect('nuclear', nuclearEffect);
}

export default { name: 'dotgrid-nuclear', install: install };
