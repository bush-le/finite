import {
    VALID_UNITS,
    parseLocalBirthDate,
    computeTargetDate,
    computeLifeStats,
    formatBarValue,
    formatPopoverHero,
    computeNextDelaySeconds,
} from '../lib/timeMath.js';

function assertEq(actual, expected, label) {
    if (actual !== expected)
        throw new Error(`FAIL [${label}]: expected=${expected}, actual=${actual}`);
}

// 0. Valid units whitelist
assertEq(VALID_UNITS.join(','), 'seconds,minutes,hours,days,weeks,percent', 'valid units');

// 1. Invalid / empty / non-existent calendar dates -> null & "--"
assertEq(parseLocalBirthDate(''), null, 'empty date');
assertEq(parseLocalBirthDate('2026-02-30'), null, 'feb 30 invalid');
assertEq(parseLocalBirthDate('not-a-date'), null, 'garbage');
assertEq(parseLocalBirthDate('1800-01-01'), null, 'year before 1900 rejected');
assertEq(computeLifeStats('', 80, Date.now()), null, 'empty stats');
assertEq(formatBarValue(null, 'seconds'), '--', 'null bar fallback');
assertEq(formatPopoverHero(null, 'seconds'), 'Chưa đặt ngày sinh', 'null popover hero');

// 2. Leap-day birth with odd expectancy clamps to Feb 28 (no March rollover)
const leapTarget = computeTargetDate(parseLocalBirthDate('2000-02-29'), 81);
assertEq(leapTarget.getFullYear(), 2081, 'leap target year');
assertEq(leapTarget.getMonth(), 1, 'leap target month stays Feb');
assertEq(leapTarget.getDate(), 28, 'leap target clamps to Feb 28');

// 3. Future birthdate & exceeded expectancy clamp cleanly
const futureStats = computeLifeStats('2099-01-01', 80, new Date(2026, 10, 21, 6, 0, 0).getTime());
assertEq(futureStats, null, 'future birthdate returns null');

const pastTargetStats = computeLifeStats('1920-01-01', 80, new Date(2026, 10, 21, 6, 0, 0).getTime());
assertEq(pastTargetStats.remainingSeconds, 0, 'exceeded expectancy clamps seconds');
assertEq(pastTargetStats.livedWeeks, pastTargetStats.totalWeeks, 'livedWeeks clamps to totalWeeks');
assertEq(formatBarValue(pastTargetStats, 'percent'), '0.00', 'exceeded percent clamps');

// 4. OOM / invalid expectancy clamping (1..150)
const clampedHigh = computeLifeStats('1996-01-01', 999999, new Date(2026, 0, 1).getTime());
assertEq(clampedHigh.totalWeeks, 150 * 52, 'expectancy clamps to 150 years max');
const clampedLow = computeLifeStats('2026-01-01', 0, new Date(2026, 0, 1).getTime());
assertEq(clampedLow.totalWeeks, 1 * 52, 'expectancy clamps to 1 year min');

// 5. Plain raw output formatting (zero icon, zero suffix, zero commas)
const midNow = new Date(2026, 0, 1, 12, 0, 0).getTime();
const midStats = computeLifeStats('1996-01-01', 80, midNow);
assertEq(/^\d+$/.test(formatBarValue(midStats, 'seconds')), true, 'seconds plain digits only');
assertEq(/^\d+$/.test(formatBarValue(midStats, 'weeks')), true, 'weeks plain digits only');
assertEq(/^\d+\.\d{2}$/.test(formatBarValue(midStats, 'percent')), true, 'percent 2 decimals without %');
assertEq(formatPopoverHero(midStats, 'seconds').endsWith(' giây còn lại'), true, 'popover hero seconds label');
assertEq(formatPopoverHero(midStats, 'percent').endsWith('% còn lại'), true, 'popover hero percent label');

// 6. Adaptive timer delays & paused zero-wakeup
assertEq(computeNextDelaySeconds('seconds', midNow, false, true), null, 'paused yields null');
assertEq(computeNextDelaySeconds('weeks', midNow, true, false), 1, 'popover open ticks 1s');
assertEq(computeNextDelaySeconds('seconds', midNow, false, false), 1, 'seconds unit ticks 1s');
assertEq(computeNextDelaySeconds('minutes', new Date(2026, 0, 1, 12, 0, 15).getTime(), false, false), 45, 'minutes sleeps to next minute');
assertEq(computeNextDelaySeconds('hours', new Date(2026, 0, 1, 12, 10, 0).getTime(), false, false), 3000, 'hours sleeps to next hour');
assertEq(computeNextDelaySeconds('days', new Date(2026, 0, 1, 23, 59, 50).getTime(), false, false), 10, 'days sleeps to midnight');

print('TEST_TIMEMATH_OK');
