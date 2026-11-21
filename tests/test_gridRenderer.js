import { computeLifeStats, computeYearDaysStats } from '../lib/timeMath.js';
import {
    MAX_GRID_HEIGHT,
    computeGridGeometry,
    computeGridCacheKey,
    classifyYearCell,
    classifyDayCell,
    getThemePalette,
    GridSurfaceCache,
} from '../lib/gridRenderer.js';

function assertEq(a, b, label) {
    if (a !== b)
        throw new Error(`FAIL [${label}]: ${a} !== ${b}`);
}

function assertTrue(cond, label) {
    if (!cond)
        throw new Error(`FAIL [${label}]`);
}

const year2026 = computeYearDaysStats(new Date(2026, 10, 21, 19, 0, 0).getTime());
const geom = computeGridGeometry(90, year2026);
assertEq(geom.years, 90, 'years count');
assertEq(geom.yearRowGroups, 3, '90 years fits in 3 rows of 30 years');
assertTrue(geom.width >= 556 && geom.width <= 600, 'grid width includes right glow padding');
assertTrue(geom.macroHeaderH >= 16, 'macro header leaves room for accented uppercase glyphs');
assertTrue(geom.height <= MAX_GRID_HEIGHT, '2-tier GitHub grid fits cleanly with no scrollbar');

// OOM & height guard on max 150 years
const hugeGeom = computeGridGeometry(999999, year2026);
assertEq(hugeGeom.years, 150, 'years clamped to 150 max');
assertTrue(hugeGeom.height <= MAX_GRID_HEIGHT, '150y 2-tier grid fits without scrollbar');

const statsEnd = computeLifeStats('1920-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyYearCell(0, statsEnd), 'lived', 'first year lived at end');
assertEq(classifyYearCell(79, statsEnd), 'lived', 'all years lived when expired');

const statsStart = computeLifeStats('2026-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyYearCell(0, statsStart), 'current', 'year 0 is current at birth');
assertEq(classifyYearCell(1, statsStart), 'remaining', 'year 1 remaining at birth');

assertEq(classifyDayCell(0, year2026), 'lived', 'day 0 is past');
assertEq(classifyDayCell(year2026.todayIndex, year2026), 'current', 'todayIndex is current');
assertEq(classifyDayCell(year2026.todayIndex + 1, year2026), 'remaining', 'tomorrow is remaining');

const amber = getThemePalette('amber');
const amberLight = getThemePalette('amber', true);
const cyan = getThemePalette('cyan');
assertTrue(amber.accent[0] !== cyan.accent[0], 'distinct theme palettes');
assertTrue(amber.label[0] !== amberLight.label[0], 'light mode palette switches label ink');

const cache = new GridSurfaceCache();
const s1 = cache.getOrRender(statsStart, year2026, geom, 'amber', 'en');
const s2 = cache.getOrRender(statsStart, year2026, geom, 'amber', 'en');
const s3 = cache.getOrRender(statsStart, year2026, geom, 'cyan', 'en');
const sHi = cache.getOrRender(statsStart, year2026, geom, 'amber', 'en', false, 2);
assertEq(s1 === s2, true, 'identical stats + year + theme reuses cached Cairo surface');
assertEq(s1 !== s3, true, 'changing theme invalidates cached surface');
assertEq(sHi.getWidth(), geom.width * 2, 'HiDPI resourceScale renders 2x pixel backing');
assertEq(
    computeGridCacheKey(statsStart, year2026, geom, 'amber', 'en') !==
        computeGridCacheKey(statsEnd, year2026, geom, 'amber', 'en'),
    true,
    'cache key distinguishes states'
);
cache.dispose();

print('TEST_GRIDRENDERER_OK');
