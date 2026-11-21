import Cairo from 'gi://cairo';
import { clampExpectancyYears } from './timeMath.js';

export const GRID_COLUMNS = 52;
export const MAX_GRID_HEIGHT = 270;

export function computeGridGeometry(expectancyYears) {
    const rows = clampExpectancyYears(expectancyYears);
    const cols = GRID_COLUMNS;
    const cellW = 5;
    const gapX = 2;
    const width = cols * cellW + (cols - 1) * gapX;

    let cellH;
    let gapY;
    let decadeGap;

    if (rows <= 45) {
        cellH = 4;
        gapY = 1.5;
        decadeGap = 3;
    } else if (rows <= 90) {
        cellH = 2;
        gapY = 1;
        decadeGap = 2;
    } else {
        cellH = 1;
        gapY = 0.6;
        decadeGap = 1.4;
    }

    const decadeGaps = Math.floor((rows - 1) / 10);
    const height = Math.ceil(
        rows * cellH + Math.max(0, rows - 1) * gapY + decadeGaps * decadeGap
    );

    return { cols, rows, width, height, cellW, cellH, gapX, gapY, decadeGap };
}

export function classifyWeekCell(index, stats) {
    if (!stats)
        return 'remaining';
    if (index < stats.livedWeeks)
        return 'lived';
    if (index === stats.currentWeekIndex && stats.livedWeeks < stats.totalWeeks)
        return 'current';
    return 'remaining';
}

export function computeGridCacheKey(stats, geom) {
    if (!stats)
        return `none:${geom.width}x${geom.height}:${geom.rows}`;
    return `${stats.livedWeeks}:${stats.totalWeeks}:${stats.currentWeekIndex}:${geom.width}x${geom.height}`;
}

export function drawLifeGrid(cr, geom, stats) {
    const { cols, rows, cellW, cellH, gapX, gapY, decadeGap } = geom;
    const totalWeeks = stats ? stats.totalWeeks : rows * cols;

    cr.setOperator(Cairo.Operator.CLEAR);
    cr.paint();
    cr.setOperator(Cairo.Operator.OVER);

    for (let i = 0; i < totalWeeks; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        if (row >= rows)
            break;

        const x = col * (cellW + gapX);
        const y = row * (cellH + gapY) + Math.floor(row / 10) * decadeGap;

        const kind = classifyWeekCell(i, stats);
        if (kind === 'lived')
            cr.setSourceRGBA(0.92, 0.92, 0.94, 0.85);
        else if (kind === 'current')
            cr.setSourceRGBA(0.961, 0.620, 0.043, 1.0);
        else
            cr.setSourceRGBA(1.0, 1.0, 1.0, 0.13);

        cr.rectangle(x, y, cellW, cellH);
        cr.fill();

        if (kind === 'current') {
            cr.setSourceRGBA(0.961, 0.620, 0.043, 0.35);
            cr.rectangle(x - 1, y - 1, cellW + 2, cellH + 2);
            cr.fill();
        }
    }
}

export class GridSurfaceCache {
    constructor() {
        this._key = null;
        this._surface = null;
    }

    getOrRender(stats, geom) {
        const nextKey = computeGridCacheKey(stats, geom);
        if (this._surface && this._key === nextKey)
            return this._surface;

        this.dispose();
        const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, geom.width, geom.height);
        const cr = new Cairo.Context(surface);
        try {
            drawLifeGrid(cr, geom, stats);
        } finally {
            cr.$dispose();
        }

        this._key = nextKey;
        this._surface = surface;
        return surface;
    }

    dispose() {
        if (this._surface) {
            this._surface.finish();
            this._surface = null;
        }
        this._key = null;
    }
}
