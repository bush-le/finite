import { computeLifeStats } from '../lib/timeMath.js';
import {
    GRID_COLUMNS,
    computeGridGeometry,
    computeGridCacheKey,
    classifyWeekCell,
    GridSurfaceCache,
} from '../lib/gridRenderer.js';

function assertEq(a, b, label) {
    if (a !== b)
        throw new Error(`FAIL [${label}]: ${a} !== ${b}`);
}

const geom = computeGridGeometry(80, 4, 2);
assertEq(GRID_COLUMNS, 52, 'GRID_COLUMNS constant');
assertEq(geom.cols, 52, 'cols');
assertEq(geom.rows, 80, 'rows');
assertEq(geom.width, 52 * 4 + 51 * 2, 'grid width');
assertEq(geom.height, 80 * 4 + 79 * 2, 'grid height');

// OOM guard on huge expectancyYears passed directly
const hugeGeom = computeGridGeometry(999999, 4, 2);
assertEq(hugeGeom.rows, 150, 'grid rows clamped to 150 max');

const statsEnd = computeLifeStats('1920-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyWeekCell(0, statsEnd), 'lived', 'first week lived at end');
assertEq(classifyWeekCell(statsEnd.totalWeeks - 1, statsEnd), 'lived', 'all weeks lived when expired');

const statsStart = computeLifeStats('2026-01-01', 80, new Date(2026, 0, 1).getTime());
assertEq(classifyWeekCell(0, statsStart), 'current', 'week 0 is current at birth');
assertEq(classifyWeekCell(1, statsStart), 'remaining', 'week 1 remaining at birth');

const cache = new GridSurfaceCache();
const s1 = cache.getOrRender(statsStart, geom.width, geom.height, 4, 2);
const s2 = cache.getOrRender(statsStart, geom.width, geom.height, 4, 2);
assertEq(s1 === s2, true, 'identical stats reuses cached Cairo surface');
assertEq(
    computeGridCacheKey(statsStart, geom.width, geom.height) !==
        computeGridCacheKey(statsEnd, geom.width, geom.height),
    true,
    'cache key distinguishes states'
);
cache.dispose();

print('TEST_GRIDRENDERER_OK');
