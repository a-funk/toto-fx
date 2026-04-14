/**
 * @module dotgrid-crater
 * @description Impact crater dotgrid effect plugin.
 * Shaped density injection with radial color zones and crack lines.
 */

export var craterEffect = {
  name: 'crater',

  meta: {
    label: 'Crater',
    description: 'Impact crater with fire/orange/brown zones and radial crack lines',
    tags: ['crater', 'impact', 'explosion'],
  },

  params: {
    radius:      { label: 'Radius',       type: 'range', min: 40,  max: 400, default: 160, step: 10, unit: 'px' },
    depth:       { label: 'Depth',        type: 'range', min: 0.3, max: 3.0, default: 1.0, step: 0.1 },
    cracks:      { label: 'Crack Count',  type: 'range', min: 0,   max: 12,  default: 6,   step: 1 },
    crackLength: { label: 'Crack Length', type: 'range', min: 50,  max: 500, default: 0,   step: 10, unit: 'px' },
  },

  run: function (g, args) {
    var cx = args.cx, cy = args.cy;
    var opts = args.opts || {};
    var radius = opts.radius || 160;
    var depth = opts.depth || 1.0;
    if (g.isMobile) radius = Math.min(radius, window.innerWidth * g.mobileMaxRadiusFraction);
    else if (g.isTablet) radius = Math.min(radius, window.innerWidth * g.tabletMaxRadiusFraction);
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var crackCount = (opts.cracks !== undefined) ? opts.cracks : 6;
    var crackLenPx = opts.crackLength || radius * 1.4;
    var crackLen = crackLenPx / dotSz;
    var gridR = radius / dotSz;
    var gc = g.v2g(cx, cy);

    var gridCols = g.gridCols;
    var gridRows = g.gridRows;
    var density = g.density;
    var velX = g.velX;
    var velY = g.velY;
    var colorR = g.colorR;
    var colorG = g.colorG;
    var colorB = g.colorB;

    // Zone colors
    var fireCol = [255, 220, 80];
    var midCol = [255, 130, 50];
    var outerCol = [200, 150, 100];
    var crackCol = [255, 120, 60];

    var c0 = Math.max(0, (gc.col - gridR * 1.6) | 0);
    var c1 = Math.min(gridCols - 1, (gc.col + gridR * 1.6 + 1) | 0);
    var r0 = Math.max(0, (gc.row - gridR * 1.6) | 0);
    var r1 = Math.min(gridRows - 1, (gc.row + gridR * 1.6 + 1) | 0);

    var crackExtent = Math.ceil(crackLen + gridR * 0.3);
    var bboxC0 = Math.max(0, (gc.col - crackExtent) | 0);
    var bboxC1 = Math.min(gridCols - 1, (gc.col + crackExtent + 1) | 0);
    var bboxR0 = Math.max(0, (gc.row - crackExtent) | 0);
    var bboxR1 = Math.min(gridRows - 1, (gc.row + crackExtent + 1) | 0);
    g.expandBbox(bboxC0, bboxC1, bboxR0, bboxR1);

    // Main crater body
    for (var rr = r0; rr <= r1; rr++) {
      for (var cc = c0; cc <= c1; cc++) {
        var dx = cc - gc.col, dy = rr - gc.row;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridR) continue;
        var intensity = 1 - dist / gridR;
        var idx = rr * gridCols + cc;

        density[idx] = Math.min(1, density[idx] + intensity * intensity * depth * dm);

        if (dist > 0.5) {
          var nx = dx / dist, ny = dy / dist;
          velX[idx] += nx * intensity * 2;
          velY[idx] += ny * intensity * 2;
        }

        var col = intensity > 0.65 ? fireCol : intensity > 0.35 ? midCol : outerCol;
        colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
      }
    }

    // Crack lines
    for (var ci = 0; ci < crackCount; ci++) {
      var angle = (ci / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      var len = crackLen * (0.5 + Math.random() * 0.5);
      var curAngle = angle;
      var steps = Math.floor(len);
      for (var s = 0; s < steps; s++) {
        curAngle += (Math.random() - 0.5) * 0.4;
        var crCol2 = gc.col + Math.cos(curAngle) * (gridR * 0.3 + s);
        var crRow = gc.row + Math.sin(curAngle) * (gridR * 0.3 + s);
        var ci2 = Math.round(crRow) * gridCols + Math.round(crCol2);
        if (ci2 >= 0 && ci2 < density.length) {
          var crIntensity = 1 - s / steps;
          density[ci2] = Math.min(1, density[ci2] + crIntensity * 0.6 * dm);
          colorR[ci2] = crackCol[0]; colorG[ci2] = crackCol[1]; colorB[ci2] = crackCol[2];
          velX[ci2] += Math.cos(curAngle + Math.PI / 2) * crIntensity * 0.5;
          velY[ci2] += Math.sin(curAngle + Math.PI / 2) * crIntensity * 0.5;
        }
      }
    }
    g.startSim();
  },
};

export function install(grid) {
  grid.registerEffect('crater', craterEffect);
}

export default { name: 'dotgrid-crater', install: install };
