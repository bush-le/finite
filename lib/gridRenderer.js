import Cairo from 'gi://cairo';
import { clampExpectancyYears, normalizeAccentTheme } from './timeMath.js';

export const MAX_GRID_HEIGHT = 270;

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const PALETTES = Object.freeze({
    amber: {
        accent: [0.961, 0.620, 0.043, 1.0],
        glow: [0.961, 0.620, 0.043, 0.34],
        lived: [0.580, 0.639, 0.722, 0.80],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.48],
        divider: [1.0, 1.0, 1.0, 0.08],
    },
    cyan: {
        accent: [0.220, 0.741, 0.973, 1.0],
        glow: [0.220, 0.741, 0.973, 0.34],
        lived: [0.580, 0.639, 0.722, 0.80],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.48],
        divider: [1.0, 1.0, 1.0, 0.08],
    },
    emerald: {
        accent: [0.204, 0.827, 0.600, 1.0],
        glow: [0.204, 0.827, 0.600, 0.34],
        lived: [0.580, 0.639, 0.722, 0.80],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.48],
        divider: [1.0, 1.0, 1.0, 0.08],
    },
    rose: {
        accent: [0.984, 0.443, 0.522, 1.0],
        glow: [0.984, 0.443, 0.522, 0.34],
        lived: [0.580, 0.639, 0.722, 0.80],
        remaining: [1.0, 1.0, 1.0, 0.09],
        label: [1.0, 1.0, 1.0, 0.48],
        divider: [1.0, 1.0, 1.0, 0.08],
    },
});

export function getThemePalette(theme) {
    return PALETTES[normalizeAccentTheme(theme)];
}

export function computeGridGeometry(expectancyYears, yearStats) {
    const years = clampExpectancyYears(expectancyYears);
    const yearsPerRow = 30;
    const yearRowGroups = Math.ceil(years / yearsPerRow);
    const yearCell = yearRowGroups <= 3 ? 13 : 10;
    const yearGap = 3;
    const decadeGap = 10;

    const totalWeekCols = yearStats
        ? Math.ceil((yearStats.startWeekday + yearStats.totalDays) / 7)
        : 53;
    const dayCell = 8;
    const dayGap = 2;
    const dayLabelW = 24;

    const dayGridW = dayLabelW + totalWeekCols * dayCell + (totalWeekCols - 1) * dayGap;
    const yearBlockW = yearsPerRow * yearCell + (yearsPerRow - 3) * yearGap + 2 * decadeGap;
    const width = Math.max(dayGridW, yearBlockW);

    const macroHeaderH = 14;
    const macroGridH = yearRowGroups * yearCell + (yearRowGroups - 1) * (yearGap + 1);
    const sectionGap = 18;
    const dayHeaderH = 18;
    const dayGridH = 7 * dayCell + 6 * dayGap;
    const height = macroHeaderH + macroGridH + sectionGap + dayHeaderH + dayGridH + 4;

    return {
        years,
        yearsPerRow,
        yearRowGroups,
        yearCell,
        yearGap,
        decadeGap,
        totalWeekCols,
        dayCell,
        dayGap,
        dayLabelW,
        macroHeaderH,
        macroGridH,
        sectionGap,
        dayHeaderH,
        dayGridH,
        width,
        height,
    };
}

export function classifyYearCell(yearIndex, stats) {
    if (!stats)
        return 'remaining';
    if (yearIndex < stats.livedYears)
        return 'lived';
    if (yearIndex === stats.livedYears && stats.livedYears < stats.expectancyYears)
        return 'current';
    return 'remaining';
}

export function classifyDayCell(dayIndex, yearStats) {
    if (!yearStats)
        return 'remaining';
    if (dayIndex < yearStats.todayIndex)
        return 'lived';
    if (dayIndex === yearStats.todayIndex)
        return 'current';
    return 'remaining';
}

export function computeGridCacheKey(stats, yearStats, geom, accentTheme = 'amber', lang = 'en') {
    const safeTheme = normalizeAccentTheme(accentTheme);
    const livedYears = stats ? stats.livedYears : -1;
    const yearKey = yearStats ? `${yearStats.year}:${yearStats.todayIndex}` : 'noyear';
    return `${safeTheme}:${lang}:${livedYears}:${geom.years}:${yearKey}:${geom.width}x${geom.height}`;
}

function drawRoundedCell(cr, x, y, size, radius) {
    const r = Math.min(radius, size / 2);
    cr.newSubPath();
    cr.arc(x + size - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + size - r, y + size - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + size - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
    cr.closePath();
    cr.fill();
}

export function drawLifeGrid(cr, geom, stats, yearStats, accentTheme = 'amber', lang = 'en') {
    const palette = getThemePalette(accentTheme);
    const isVi = lang === 'vi';

    cr.setOperator(Cairo.Operator.CLEAR);
    cr.paint();
    cr.setOperator(Cairo.Operator.OVER);

    cr.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.BOLD);
    cr.setFontSize(9.5);

    // 1. Macro Tier: Life in Years (30 years/row grouped in decades of 10)
    cr.setSourceRGBA(...palette.label);
    cr.moveTo(geom.dayLabelW, 9);
    cr.showText(isVi ? `CUỘC ĐỜI (${geom.years} NĂM)` : `LIFE (${geom.years} YEARS)`);

    for (let i = 0; i < geom.years; i++) {
        const rowGroup = Math.floor(i / geom.yearsPerRow);
        const colInRow = i % geom.yearsPerRow;
        const decadeInRow = Math.floor(colInRow / 10);

        const x = geom.dayLabelW + colInRow * (geom.yearCell + geom.yearGap) + decadeInRow * geom.decadeGap;
        const y = geom.macroHeaderH + rowGroup * (geom.yearCell + geom.yearGap + 1);
        const kind = classifyYearCell(i, stats);

        if (kind === 'lived') {
            cr.setSourceRGBA(...palette.lived);
            drawRoundedCell(cr, x, y, geom.yearCell, 3);
        } else if (kind === 'current') {
            cr.setSourceRGBA(...palette.glow);
            drawRoundedCell(cr, x - 1.5, y - 1.5, geom.yearCell + 3, 4);
            cr.setSourceRGBA(...palette.accent);
            drawRoundedCell(cr, x, y, geom.yearCell, 3);
        } else {
            cr.setSourceRGBA(...palette.remaining);
            drawRoundedCell(cr, x, y, geom.yearCell, 3);
        }
    }

    // Divider line
    const divY = geom.macroHeaderH + geom.macroGridH + Math.floor(geom.sectionGap / 2);
    cr.setSourceRGBA(...palette.divider);
    cr.rectangle(geom.dayLabelW, divY, geom.width - geom.dayLabelW, 1);
    cr.fill();

    // 2. Micro Tier: GitHub-style 365/366-Day Grid for Current Year
    if (!yearStats)
        return;

    const microTopY = geom.macroHeaderH + geom.macroGridH + geom.sectionGap;
    const months = isVi ? MONTHS_VI : MONTHS_EN;
    cr.setFontSize(9);
    cr.setSourceRGBA(...palette.label);

    let lastDrawnCol = -3;
    for (let m = 0; m < 12; m++) {
        const col = yearStats.monthCols[m];
        if (col - lastDrawnCol >= 3) {
            const mx = geom.dayLabelW + col * (geom.dayCell + geom.dayGap);
            cr.moveTo(mx, microTopY + 10);
            cr.showText(months[m]);
            lastDrawnCol = col;
        }
    }

    const dayGridY = microTopY + geom.dayHeaderH;
    const weekdayLabels = isVi ? { 1: 'T2', 3: 'T4', 5: 'T6' } : { 1: 'M', 3: 'W', 5: 'F' };
    for (const [rStr, text] of Object.entries(weekdayLabels)) {
        const r = Number(rStr);
        const ly = dayGridY + r * (geom.dayCell + geom.dayGap) + geom.dayCell - 1;
        cr.setSourceRGBA(...palette.label);
        cr.moveTo(2, ly);
        cr.showText(text);
    }

    for (let d = 0; d < yearStats.totalDays; d++) {
        const gridPos = yearStats.startWeekday + d;
        const col = Math.floor(gridPos / 7);
        const row = gridPos % 7;

        const x = geom.dayLabelW + col * (geom.dayCell + geom.dayGap);
        const y = dayGridY + row * (geom.dayCell + geom.dayGap);
        const kind = classifyDayCell(d, yearStats);

        if (kind === 'lived') {
            cr.setSourceRGBA(...palette.lived);
            drawRoundedCell(cr, x, y, geom.dayCell, 2);
        } else if (kind === 'current') {
            cr.setSourceRGBA(...palette.glow);
            drawRoundedCell(cr, x - 1.5, y - 1.5, geom.dayCell + 3, 3);
            cr.setSourceRGBA(...palette.accent);
            drawRoundedCell(cr, x, y, geom.dayCell, 2);
        } else {
            cr.setSourceRGBA(...palette.remaining);
            drawRoundedCell(cr, x, y, geom.dayCell, 2);
        }
    }
}

export class GridSurfaceCache {
    constructor() {
        this._key = null;
        this._surface = null;
    }

    getOrRender(stats, yearStats, geom, accentTheme = 'amber', lang = 'en') {
        const nextKey = computeGridCacheKey(stats, yearStats, geom, accentTheme, lang);
        if (this._surface && this._key === nextKey)
            return this._surface;

        this.dispose();
        const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, geom.width, geom.height);
        const cr = new Cairo.Context(surface);
        try {
            drawLifeGrid(cr, geom, stats, yearStats, accentTheme, lang);
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
