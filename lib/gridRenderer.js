import Cairo from 'gi://cairo';
import { clampExpectancyYears, normalizeAccentTheme } from './timeMath.js';

export const GRID_COLUMNS = 52;
export const MAX_GRID_HEIGHT = 270;

const PALETTES = Object.freeze({
    amber: {
        accent: [0.961, 0.620, 0.043, 1.0],
        glow: [0.961, 0.620, 0.043, 0.32],
        lived: [0.580, 0.639, 0.722, 0.78],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.42],
    },
    cyan: {
        accent: [0.220, 0.741, 0.973, 1.0],
        glow: [0.220, 0.741, 0.973, 0.32],
        lived: [0.580, 0.639, 0.722, 0.78],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.42],
    },
    emerald: {
        accent: [0.204, 0.827, 0.600, 1.0],
        glow: [0.204, 0.827, 0.600, 0.32],
        lived: [0.580, 0.639, 0.722, 0.78],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.42],
    },
    rose: {
        accent: [0.984, 0.443, 0.522, 1.0],
        glow: [0.984, 0.443, 0.522, 0.32],
        lived: [0.580, 0.639, 0.722, 0.78],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.42],
    },
});

export function getThemePalette(theme) {
    return PALETTES[normalizeAccentTheme(theme)];
}

export function computeGridGeometry(expectancyYears) {
    const rows = clampExpectancyYears(expectancyYears);
    const cols = GRID_COLUMNS;
    const leftRows = Math.ceil(rows / 2);
    const rightRows = rows - leftRows;

    const cellSize = leftRows <= 45 ? 4 : 2;
    const gap = 1;
    const decadeGap = leftRows <= 45 ? 5 : 3;
    const gutterW = 20;
    const midGap = 18;

    const blockW = cols * cellSize + (cols - 1) * gap;
    const hasRight = rightRows > 0;
    const width = hasRight ? gutterW + blockW + midGap + gutterW + blockW : gutterW + blockW;

    const maxColRows = Math.max(leftRows, rightRows);
    const decadeGaps = Math.floor(Math.max(0, maxColRows - 1) / 10);
    const height = Math.max(
        16,
        maxColRows * cellSize + Math.max(0, maxColRows - 1) * gap + decadeGaps * decadeGap + 4
    );

    return {
        cols,
        rows,
        leftRows,
        rightRows,
        cellSize,
        gap,
        decadeGap,
        gutterW,
        midGap,
        blockW,
        width,
        height,
    };
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

export function computeGridCacheKey(stats, geom, accentTheme = 'amber') {
    const safeTheme = normalizeAccentTheme(accentTheme);
    if (!stats)
        return `none:${safeTheme}:${geom.width}x${geom.height}:${geom.rows}`;
    return `${safeTheme}:${stats.livedWeeks}:${stats.totalWeeks}:${stats.currentWeekIndex}:${geom.width}x${geom.height}`;
}

function drawRoundedCell(cr, x, y, size, radius) {
    if (size <= 2) {
        cr.rectangle(x, y, size, size);
        cr.fill();
        return;
    }
    const r = Math.min(radius, size / 2);
    cr.newSubPath();
    cr.arc(x + size - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + size - r, y + size - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + size - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
    cr.closePath();
    cr.fill();
}

export function drawLifeGrid(cr, geom, stats, accentTheme = 'amber') {
    const {
        cols,
        rows,
        leftRows,
        cellSize,
        gap,
        decadeGap,
        gutterW,
        midGap,
        blockW,
    } = geom;
    const palette = getThemePalette(accentTheme);

    cr.setOperator(Cairo.Operator.CLEAR);
    cr.paint();
    cr.setOperator(Cairo.Operator.OVER);

    cr.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
    cr.setFontSize(9);

    for (let row = 0; row < rows; row++) {
        const isRight = row >= leftRows;
        const localRow = isRight ? row - leftRows : row;
        const blockX = isRight ? gutterW + blockW + midGap : 0;
        const gridStartX = blockX + gutterW;
        const y = 2 + localRow * (cellSize + gap) + Math.floor(localRow / 10) * decadeGap;

        if (row % 10 === 0) {
            cr.setSourceRGBA(...palette.label);
            const label = String(row);
            const ext = cr.textExtents(label);
            cr.moveTo(gridStartX - ext.width - 5, y + Math.max(cellSize, 7));
            cr.showText(label);
        }

        for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            const x = gridStartX + col * (cellSize + gap);
            const kind = classifyWeekCell(idx, stats);

            if (kind === 'lived') {
                cr.setSourceRGBA(...palette.lived);
                drawRoundedCell(cr, x, y, cellSize, 1);
            } else if (kind === 'current') {
                cr.setSourceRGBA(...palette.glow);
                drawRoundedCell(cr, x - 1.5, y - 1.5, cellSize + 3, 2);
                cr.setSourceRGBA(...palette.accent);
                drawRoundedCell(cr, x, y, cellSize, 1);
            } else {
                cr.setSourceRGBA(...palette.remaining);
                drawRoundedCell(cr, x, y, cellSize, 1);
            }
        }
    }
}

export class GridSurfaceCache {
    constructor() {
        this._key = null;
        this._surface = null;
    }

    getOrRender(stats, geom, accentTheme = 'amber') {
        const nextKey = computeGridCacheKey(stats, geom, accentTheme);
        if (this._surface && this._key === nextKey)
            return this._surface;

        this.dispose();
        const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, geom.width, geom.height);
        const cr = new Cairo.Context(surface);
        try {
            drawLifeGrid(cr, geom, stats, accentTheme);
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
