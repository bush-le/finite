import Cairo from 'gi://cairo';
import { clampExpectancyYears } from './timeMath.js';

export const GRID_COLUMNS = 52;

export function computeGridGeometry(expectancyYears, cellSize = 4, gap = 2) {
    const rows = clampExpectancyYears(expectancyYears);
    const cols = GRID_COLUMNS;
    const width = cols * cellSize + (cols - 1) * gap;
    const height = rows * cellSize + (rows - 1) * gap;
    return { cols, rows, width, height, cellSize, gap };
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

export function computeGridCacheKey(stats, width, height) {
    if (!stats)
        return `none:${width}x${height}`;
    return `${stats.livedWeeks}:${stats.totalWeeks}:${stats.currentWeekIndex}:${width}x${height}`;
}

export function drawLifeGrid(cr, width, height, stats, cellSize = 4, gap = 2) {
    const totalWeeks = stats
        ? stats.totalWeeks
        : Math.max(1, Math.round((height + gap) / (cellSize + gap))) * GRID_COLUMNS;

    cr.setOperator(Cairo.Operator.CLEAR);
    cr.paint();
    cr.setOperator(Cairo.Operator.OVER);

    for (let i = 0; i < totalWeeks; i++) {
        const col = i % GRID_COLUMNS;
        const row = Math.floor(i / GRID_COLUMNS);
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);

        if (x + cellSize > width || y + cellSize > height)
            continue;

        const kind = classifyWeekCell(i, stats);
        if (kind === 'lived')
            cr.setSourceRGBA(0.894, 0.894, 0.906, 0.90);
        else if (kind === 'current')
            cr.setSourceRGBA(0.961, 0.620, 0.043, 1.0);
        else
            cr.setSourceRGBA(1.0, 1.0, 1.0, 0.14);

        cr.rectangle(x, y, cellSize, cellSize);
        cr.fill();
    }
}

export class GridSurfaceCache {
    constructor() {
        this._key = null;
        this._surface = null;
    }

    getOrRender(stats, width, height, cellSize = 4, gap = 2) {
        const nextKey = computeGridCacheKey(stats, width, height);
        if (this._surface && this._key === nextKey)
            return this._surface;

        this.dispose();
        const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, width, height);
        const cr = new Cairo.Context(surface);
        try {
            drawLifeGrid(cr, width, height, stats, cellSize, gap);
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
