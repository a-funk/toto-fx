/**
 * @module dotgrid-scorch
 * @description Linear scorch trail dotgrid effect plugin.
 * Burns a density trail from point A to point B with a dark core and lighter edges.
 */

export var scorchEffect = {
  name: 'scorch',

  meta: {
    label: 'Scorch',
    description: 'Linear burn trail with dark core and lighter edges',
    tags: ['scorch', 'trail', 'line', 'burn'],
  },

  params: {
    width: { label: 'Trail Width', type: 'range', min: 10, max: 100, default: 40, step: 5, unit: 'px' },
    color: { label: 'Color',       type: 'color', default: '' },
  },

  run: function (g, args) {
    var opts = args.opts || {};
    var x1 = args.x1, y1 = args.y1, x2 = args.x2, y2 = args.y2;
    // Support legacy call shape: scorch(x1,y1,x2,y2, widthOrOpts)
    // In plugin form, opts may contain width and color
    var dotSz = g.dotSize;
    var dm = g.densityMultiplier;
    var widthPx = opts.width || 40;
    var color = opts.color ? g.parseColor(opts.color) : null;
    var width = widthPx / dotSz;
    var g1 = g.v2g(x1, y1), g2 = g.v2g(x2, y2);

    var gridCols = g.gridCols;
    var gridRows = g.gridRows;
    var density = g.density;
    var colorR = g.colorR;
    var colorG = g.colorG;
    var colorB = g.colorB;

    var tdx = g2.col - g1.col, tdy = g2.row - g1.row;
    var tLen = Math.sqrt(tdx * tdx + tdy * tdy);
    if (tLen < 0.1) return;
    var nx = tdx / tLen, ny = tdy / tLen;

    var coreCol = color || [100, 50, 15];
    var edgeCol = color ? [Math.min(255, color[0] + 50), Math.min(255, color[1] + 30), color[2]] : [220, 120, 40];

    var minCol = Math.max(0, Math.floor(Math.min(g1.col, g2.col) - width - 1));
    var maxCol = Math.min(gridCols - 1, Math.ceil(Math.max(g1.col, g2.col) + width + 1));
    var minRow = Math.max(0, Math.floor(Math.min(g1.row, g2.row) - width - 1));
    var maxRow = Math.min(gridRows - 1, Math.ceil(Math.max(g1.row, g2.row) + width + 1));
    g.expandBbox(minCol, maxCol, minRow, maxRow);

    for (var rr = minRow; rr <= maxRow; rr++) {
      for (var cc = minCol; cc <= maxCol; cc++) {
        var relX = cc - g1.col, relY = rr - g1.row;
        var along = relX * nx + relY * ny;
        var perp = Math.abs(relX * (-ny) + relY * nx);
        if (along < -1 || along > tLen + 1 || perp > width) continue;

        var perpI = 1 - perp / width;
        var idx = rr * gridCols + cc;
        density[idx] = Math.min(1, density[idx] + perpI * 0.7 * dm);

        var col = perp < width * 0.3 ? coreCol : edgeCol;
        colorR[idx] = col[0]; colorG[idx] = col[1]; colorB[idx] = col[2];
      }
    }
    g.startSim();
  },
};

export function install(grid) {
  grid.registerEffect('scorch', scorchEffect);
}

export default { name: 'dotgrid-scorch', install: install };
