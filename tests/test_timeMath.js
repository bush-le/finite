import {
    VALID_UNITS,
    VALID_FONTS,
    VALID_ACCENTS,
    VALID_CYCLES,
    MAX_MILESTONE_TITLE_LENGTH,
    clampBarFontSize,
    sanitizeReminderText,
    sanitizeMilestoneTitle,
    normalizeCycleScope,
    parseLocalBirthDate,
    parseLocalDeadline,
    computeTargetDate,
    computeLifeStats,
    computeMilestoneStats,
    computeCycleStats,
    computeDayAndYearProgress,
    computeYearDaysStats,
    buildTopBarSegments,
    formatBarValue,
    formatPopoverHero,
    computeNextDelaySeconds,
} from '../lib/timeMath.js';

function assertEq(actual, expected, label) {
    if (actual !== expected)
        throw new Error(`FAIL [${label}]: expected=${expected}, actual=${actual}`);
}

// 0. Valid units, fonts, accents & bar font size clamp
assertEq(VALID_UNITS.join(','), 'seconds,minutes,hours,days,weeks,percent', 'valid units');
assertEq(VALID_FONTS.join(','), 'system,inter,jetbrains,mono', 'valid fonts');
assertEq(VALID_ACCENTS.join(','), 'amber,cyan,emerald,rose', 'valid accents');
assertEq(clampBarFontSize(8), 10, 'font size min clamp');
assertEq(clampBarFontSize(40), 20, 'font size max clamp');
assertEq(clampBarFontSize(15), 15, 'font size valid');

// 0a. Reminder sanitization (control chars & UTF-16 safe slicing)
assertEq(sanitizeReminderText('  hello\nworld\t!  '), 'hello world !', 'strips newlines/tabs');
assertEq(Array.from(sanitizeReminderText('🔥'.repeat(210))).length, 200, 'slices by Unicode code points');

// 0b. Exact calendar livedYears on birthday boundary
const beforeBday = computeLifeStats('2003-01-01', 80, new Date(2003, 11, 31, 23, 59, 0).getTime());
assertEq(beforeBday.livedYears, 0, 'day before first birthday is 0 livedYears');
const onBday = computeLifeStats('2003-01-01', 80, new Date(2004, 0, 1, 0, 1, 0).getTime());
assertEq(onBday.livedYears, 1, 'on first birthday is 1 livedYears');

// 0b. Day & year progress helper
const midday = new Date(2026, 6, 2, 12, 0, 0, 0).getTime();
const dy = computeDayAndYearProgress(midday);
assertEq(Math.round(dy.todayElapsedPct), 50, 'midday is 50% of day');
assertEq(dy.year, 2026, 'year extracted');
assertEq(dy.yearElapsedPct > 49 && dy.yearElapsedPct < 52, true, 'mid-year ~50%');

// 0c. Year days stats for GitHub-style 365/366 grid
const jan1 = new Date(2026, 0, 1, 8, 0, 0).getTime();
const y2026Start = computeYearDaysStats(jan1);
assertEq(y2026Start.year, 2026, '2026 year');
assertEq(y2026Start.totalDays, 365, '2026 has 365 days');
assertEq(y2026Start.todayIndex, 0, 'Jan 1 is day index 0');
assertEq(y2026Start.daysLeft, 364, '364 days left after Jan 1');

const leapMar1 = new Date(2024, 2, 1, 8, 0, 0).getTime();
const y2024 = computeYearDaysStats(leapMar1);
assertEq(y2024.totalDays, 366, '2024 leap year has 366 days');
assertEq(y2024.todayIndex, 31 + 29, 'Mar 1 in leap year is index 60');

// 1. Invalid / empty / non-existent calendar dates -> null & "--"
assertEq(parseLocalBirthDate(''), null, 'empty date');
assertEq(parseLocalBirthDate('2026-02-30'), null, 'feb 30 invalid');
assertEq(parseLocalBirthDate('not-a-date'), null, 'garbage');
assertEq(parseLocalBirthDate('1800-01-01'), null, 'year before 1900 rejected');
assertEq(computeLifeStats('', 80, Date.now()), null, 'empty stats');
assertEq(formatBarValue(null, 'seconds'), '--', 'null bar fallback');
assertEq(formatPopoverHero(null, 'seconds', 'vi'), 'Chưa đặt ngày sinh', 'null popover hero vi');
assertEq(formatPopoverHero(null, 'seconds', 'en'), 'Set birth date in Settings', 'null popover hero en');

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
assertEq(formatPopoverHero(midStats, 'seconds', 'vi').endsWith(' giây còn lại'), true, 'popover hero seconds label vi');
assertEq(formatPopoverHero(midStats, 'percent', 'vi').endsWith('% còn lại'), true, 'popover hero percent label vi');
assertEq(formatPopoverHero(midStats, 'seconds', 'en').endsWith(' seconds left'), true, 'popover hero seconds label en');
assertEq(formatPopoverHero(midStats, 'percent', 'en').endsWith('% left'), true, 'popover hero percent label en');

// 6. Adaptive timer delays & paused zero-wakeup
assertEq(computeNextDelaySeconds('seconds', midNow, false, true), null, 'paused yields null');
assertEq(computeNextDelaySeconds('weeks', midNow, true, false), 1, 'popover open ticks 1s');
assertEq(computeNextDelaySeconds('seconds', midNow, false, false), 1, 'seconds unit ticks 1s');
assertEq(computeNextDelaySeconds('minutes', new Date(2026, 0, 1, 12, 0, 15).getTime(), false, false), 45, 'minutes sleeps to next minute');
assertEq(computeNextDelaySeconds('hours', new Date(2026, 0, 1, 12, 10, 0).getTime(), false, false), 3000, 'hours sleeps to next hour');
assertEq(computeNextDelaySeconds('days', new Date(2026, 0, 1, 23, 59, 50).getTime(), false, false), 10, 'days sleeps to midnight');

// 7. Milestone & cycle math (Phase 2)
assertEq(VALID_CYCLES.join(','), 'day,month,year', 'valid cycles');
assertEq(MAX_MILESTONE_TITLE_LENGTH, 60, 'max milestone title length');
assertEq(normalizeCycleScope('invalid'), 'day', 'cycle fallback');
assertEq(parseLocalDeadline(''), null, 'empty deadline');
assertEq(parseLocalDeadline('2026-02-30'), null, 'invalid calendar deadline');
assertEq(parseLocalDeadline('2026-12-20 25:00'), null, 'invalid hour deadline');
const dDate = parseLocalDeadline('2026-12-20');
assertEq(dDate.normalized, '2026-12-20', 'date-only normalized');
assertEq(new Date(dDate.timestampMs).getHours(), 23, 'date-only resolves end of day');
const dTime = parseLocalDeadline('2026-12-20 08:30');
assertEq(dTime.normalized, '2026-12-20 08:30', 'datetime normalized');

const nowRef = new Date(2026, 10, 22, 16, 0, 0).getTime();
assertEq(computeMilestoneStats('TOEIC', 0, 'bad-date', nowRef), null, 'invalid deadline returns null');
const expiredM = computeMilestoneStats('TOEIC', 0, '2026-11-20', nowRef);
assertEq(expiredM.isExpired, true, 'past deadline is expired');
assertEq(expiredM.remainingSeconds, 0, 'expired clamps to 0');
assertEq(expiredM.percentElapsed, 100, 'expired progress is 100%');

const badStartM = computeMilestoneStats('TOEIC\nExam', nowRef + 99999999, '2026-12-20', nowRef);
assertEq(badStartM.title, 'TOEIC Exam', 'milestone title strips newline');
assertEq(badStartM.percentElapsed >= 0 && badStartM.percentElapsed <= 100, true, 'clamped percent on bad startMs');

const leapFeb = computeCycleStats('month', new Date(2024, 1, 29, 12, 0, 0).getTime());
assertEq(leapFeb.remainingHours, 12, 'leap feb 29 midday has 12h left in month');
const yearEnd = computeCycleStats('year', new Date(2026, 11, 31, 23, 59, 0).getTime());
assertEq(yearEnd.remainingSeconds, 60, 'dec 31 23:59 has 60s left in year');

assertEq(buildTopBarSegments('100', null, null).map(s => s.text).join(''), '100', 'life only');
assertEq(buildTopBarSegments('100', '28', null).map(s => s.text).join(''), '100 · 28', 'life + milestone');
assertEq(buildTopBarSegments('100', null, '28742').map(s => s.text).join(''), '100 · 28742', 'life + cycle');
assertEq(buildTopBarSegments('100', '28', '28742').map(s => s.text).join(''), '100 · 28 · 28742', 'all 3 counters');
assertEq(buildTopBarSegments(null, '28', null).map(s => s.text).join(''), '28', 'milestone when birth-date unset');
assertEq(buildTopBarSegments(null, null, null).map(s => s.text).join(''), '--', 'fallback when nothing active');

const tenSecBefore = new Date(2026, 10, 22, 16, 0, 0).getTime();
assertEq(computeNextDelaySeconds('days', tenSecBefore, false, false, tenSecBefore + 10000), 10, 'wakes at exact milestone target');

print('TEST_TIMEMATH_OK');
