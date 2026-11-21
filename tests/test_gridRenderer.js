import { computeLifeStats } from '../lib/timeMath.js';
import {
    GRID_COLUMNS,
    MAX_GRID_HEIGHT,
    computeGridGeometry,
    computeGridCacheKey,
    classifyWeekCell,
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
assertTrue(geom.width >= 320 && geom.width <= 400, 'grid width balanced for popover');
assertTrue(geom.height <= MAX_GRID_HEIGHT, '80y grid fits without scrollbar');

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

const cache = new GridSurfaceCache();
const s1 = cache.getOrRender(statsStart, geom);
const s2 = cache.getOrRender(statsStart, geom);
assertEq(s1 === s2, true, 'identical stats reuses cached Cairo surface');
assertEq(
    computeGridCacheKey(statsStart, geom) !==
        computeGridCacheKey(statsEnd, geom),
    true,
    'cache key distinguishes states'
);
cache.dispose();

print('TEST_GRIDRENDERER_OK');
