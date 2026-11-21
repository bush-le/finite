import { computeLifeStats } from '../lib/timeMath.js';
import {
    GRID_COLUMNS,
    MAX_GRID_HEIGHT,
    computeGridGeometry,
    computeGridCacheKey,
    classifyWeekCell,
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

const geom = computeGridGeometry(80);
assertEq(GRID_COLUMNS, 52, 'GRID_COLUMNS constant');
assertEq(geom.cols, 52, 'cols');
assertEq(geom.rows, 80, 'rows');
assertEq(geom.leftRows, 40, '2-column split puts 40 rows on left');
assertEq(geom.rightRows, 40, '2-column split puts 40 rows on right');
assertTrue(geom.cellSize >= 4, '80y grid uses crisp >=4px square cells');
assertTrue(geom.height <= MAX_GRID_HEIGHT, '80y grid fits comfortably without scrollbar');

// OOM & height guard on max 150 years
const hugeGeom = computeGridGeometry(999999);
assertEq(hugeGeom.rows, 150, 'grid rows clamped to 150 max');
assertTrue(hugeGeom.height <= MAX_GRID_HEIGHT, '150y grid fits without scrollbar');

const statsEnd = computeLifeStats('1920-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyWeekCell(0, statsEnd), 'lived', 'first week lived at end');
assertEq(classifyWeekCell(statsEnd.totalWeeks - 1, statsEnd), 'lived', 'all weeks lived when expired');

const statsStart = computeLifeStats('2026-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyWeekCell(0, statsStart), 'current', 'week 0 is current at birth');
assertEq(classifyWeekCell(1, statsStart), 'remaining', 'week 1 remaining at birth');

const amber = getThemePalette('amber');
const cyan = getThemePalette('cyan');
assertTrue(amber.accent[0] !== cyan.accent[0], 'distinct theme palettes');

const cache = new GridSurfaceCache();
const s1 = cache.getOrRender(statsStart, geom, 'amber');
const s2 = cache.getOrRender(statsStart, geom, 'amber');
const s3 = cache.getOrRender(statsStart, geom, 'cyan');
assertEq(s1 === s2, true, 'identical stats + theme reuses cached Cairo surface');
assertEq(s1 !== s3, true, 'changing theme invalidates cached surface');
assertEq(
    computeGridCacheKey(statsStart, geom, 'amber') !==
        computeGridCacheKey(statsEnd, geom, 'amber'),
    true,
    'cache key distinguishes states'
);
cache.dispose();

print('TEST_GRIDRENDERER_OK');
