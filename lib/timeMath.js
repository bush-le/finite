export const VALID_UNITS = Object.freeze([
    'seconds',
    'minutes',
    'hours',
    'days',
    'weeks',
    'percent',
]);

export const VALID_FONTS = Object.freeze([
    'system',
    'inter',
    'jetbrains',
    'mono',
]);

export const VALID_ACCENTS = Object.freeze([
    'amber',
    'cyan',
    'emerald',
    'rose',
]);

export const VALID_CYCLES = Object.freeze([
    'day',
    'month',
    'year',
]);

export const MIN_BAR_FONT_SIZE = 10;
export const MAX_BAR_FONT_SIZE = 20;
export const MAX_MILESTONE_TITLE_LENGTH = 60;

export function normalizeFontPreset(preset) {
    return VALID_FONTS.includes(preset) ? preset : 'system';
}

export function normalizeAccentTheme(theme) {
    return VALID_ACCENTS.includes(theme) ? theme : 'amber';
}

export function clampBarFontSize(size) {
    const num = Math.trunc(Number(size));
    if (!Number.isFinite(num))
        return 15;
    return Math.min(MAX_BAR_FONT_SIZE, Math.max(MIN_BAR_FONT_SIZE, num));
}

export const MIN_EXPECTANCY_YEARS = 1;
export const MAX_EXPECTANCY_YEARS = 150;
export const MAX_REMINDER_LENGTH = 200;

export function clampExpectancyYears(years) {
    const num = Math.trunc(Number(years));
    if (!Number.isFinite(num))
        return 80;
    return Math.min(MAX_EXPECTANCY_YEARS, Math.max(MIN_EXPECTANCY_YEARS, num));
}

export function sanitizePlainText(text, maxLen) {
    if (typeof text !== 'string')
        return '';
    const singleLine = text.replace(/[\r\n\t\u0000-\u001F\u007F]+/g, ' ').trim();
    return Array.from(singleLine).slice(0, maxLen).join('');
}

export function sanitizeReminderText(text) {
    return sanitizePlainText(text, MAX_REMINDER_LENGTH);
}

export function sanitizeMilestoneTitle(text) {
    return sanitizePlainText(text, MAX_MILESTONE_TITLE_LENGTH);
}

export function normalizeCycleScope(scope) {
    return VALID_CYCLES.includes(scope) ? scope : 'day';
}

export function parseLocalDeadline(input) {
    if (typeof input !== 'string')
        return null;
    const trimmed = input.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/.exec(trimmed);
    if (!m)
        return null;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hasTime = m[4] !== undefined;
    const hour = hasTime ? Number(m[4]) : 23;
    const minute = hasTime ? Number(m[5]) : 59;
    const second = hasTime ? 0 : 59;
    const ms = hasTime ? 0 : 999;

    if (year < 1900 || year > 2100 || hour > 23 || minute > 59)
        return null;

    const date = new Date(year, month - 1, day, hour, minute, second, ms);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hour ||
        date.getMinutes() !== minute
    )
        return null;

    const normalized = hasTime
        ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`
        : `${m[1]}-${m[2]}-${m[3]}`;

    return {
        timestampMs: date.getTime(),
        normalized,
    };
}

export function parseLocalBirthDate(isoDate) {
    if (typeof isoDate !== 'string')
        return null;
    const trimmed = isoDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
        return null;

    const [yStr, mStr, dStr] = trimmed.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const day = Number(dStr);

    if (year < 1900 || year > 2100)
        return null;

    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    )
        return null;

    return date;
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function computeTargetDate(birthDate, expectancyYears) {
    const years = clampExpectancyYears(expectancyYears);
    const targetYear = birthDate.getFullYear() + years;
    const month = birthDate.getMonth();
    let day = birthDate.getDate();

    if (month === 1 && day === 29 && !isLeapYear(targetYear))
        day = 28;

    return new Date(targetYear, month, day, 0, 0, 0, 0);
}

export function computeLifeStats(birthIso, expectancyYears, nowMs = Date.now()) {
    const birthDate = parseLocalBirthDate(birthIso);
    if (!birthDate)
        return null;

    const safeYears = clampExpectancyYears(expectancyYears);
    const birthMs = birthDate.getTime();
    if (nowMs < birthMs)
        return null;

    const targetDate = computeTargetDate(birthDate, safeYears);
    const targetMs = targetDate.getTime();
    const totalMs = Math.max(1, targetMs - birthMs);
    const elapsedMs = Math.min(totalMs, Math.max(0, nowMs - birthMs));
    const remainingMs = Math.max(0, targetMs - nowMs);

    const totalWeeks = safeYears * 52;
    const livedWeeks = Math.min(totalWeeks, Math.floor((elapsedMs / totalMs) * totalWeeks));
    const currentWeekIndex = Math.min(totalWeeks - 1, livedWeeks);

    const nowDate = new Date(nowMs);
    let calendarYears = nowDate.getFullYear() - birthDate.getFullYear();
    if (
        nowDate.getMonth() < birthDate.getMonth() ||
        (nowDate.getMonth() === birthDate.getMonth() && nowDate.getDate() < birthDate.getDate())
    )
        calendarYears--;
    const livedYears = Math.min(safeYears, Math.max(0, calendarYears));

    const remainingSeconds = Math.floor(remainingMs / 1000);
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingHours = Math.floor(remainingMs / 3600000);
    const remainingDays = Math.floor(remainingMs / 86400000);
    const remainingWeeks = Math.floor(remainingMs / 604800000);
    const percentRemaining = (remainingMs / totalMs) * 100;
    const percentElapsed = (elapsedMs / totalMs) * 100;

    return {
        totalMs,
        elapsedMs,
        remainingMs,
        expectancyYears: safeYears,
        livedYears,
        totalWeeks,
        livedWeeks,
        currentWeekIndex,
        remainingSeconds,
        remainingMinutes,
        remainingHours,
        remainingDays,
        remainingWeeks,
        percentRemaining,
        percentElapsed,
    };
}

export function computeYearDaysStats(nowMs = Date.now()) {
    const now = new Date(nowMs);
    const year = now.getFullYear();
    const totalDays = isLeapYear(year) ? 366 : 365;
    const jan1Utc = Date.UTC(year, 0, 1);
    const todayUtc = Date.UTC(year, now.getMonth(), now.getDate());
    const todayIndex = Math.min(totalDays - 1, Math.max(0, Math.round((todayUtc - jan1Utc) / 86400000)));
    const daysLeft = Math.max(0, totalDays - 1 - todayIndex);
    const startWeekday = new Date(year, 0, 1).getDay();

    const monthCols = [];
    for (let m = 0; m < 12; m++) {
        const mStartUtc = Date.UTC(year, m, 1);
        const dayOffset = Math.round((mStartUtc - jan1Utc) / 86400000);
        monthCols.push(Math.floor((startWeekday + dayOffset) / 7));
    }

    return {
        year,
        totalDays,
        todayIndex,
        daysLeft,
        startWeekday,
        monthCols,
    };
}

export function computeDayAndYearProgress(nowMs = Date.now()) {
    const now = new Date(nowMs);
    const year = now.getFullYear();

    const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(year, now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime();
    const todayElapsedPct = Math.min(100, Math.max(0, ((nowMs - startOfDay) / (endOfDay - startOfDay)) * 100));

    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const endOfYear = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime();
    const yearElapsedPct = Math.min(100, Math.max(0, ((nowMs - startOfYear) / (endOfYear - startOfYear)) * 100));

    return {
        year,
        todayElapsedPct,
        yearElapsedPct,
    };
}

export function normalizeUnit(unit) {
    return VALID_UNITS.includes(unit) ? unit : 'weeks';
}

export function formatBarValue(stats, unit) {
    if (!stats)
        return '--';

    switch (normalizeUnit(unit)) {
    case 'seconds':
        return String(stats.remainingSeconds);
    case 'minutes':
        return String(stats.remainingMinutes);
    case 'hours':
        return String(stats.remainingHours);
    case 'days':
        return String(stats.remainingDays);
    case 'weeks':
        return String(stats.remainingWeeks);
    case 'percent':
        return stats.percentRemaining.toFixed(2);
    }
    return String(stats.remainingWeeks);
}

export function formatPopoverHero(stats, unit, lang = 'en') {
    const isVi = lang === 'vi';
    if (!stats)
        return isVi ? 'Chưa đặt ngày sinh' : 'Set birth date in Settings';

    switch (normalizeUnit(unit)) {
    case 'seconds':
        return isVi
            ? `${stats.remainingSeconds} giây còn lại`
            : `${stats.remainingSeconds} seconds left`;
    case 'minutes':
        return isVi
            ? `${stats.remainingMinutes} phút còn lại`
            : `${stats.remainingMinutes} minutes left`;
    case 'hours':
        return isVi
            ? `${stats.remainingHours} giờ còn lại`
            : `${stats.remainingHours} hours left`;
    case 'days':
        return isVi
            ? `${stats.remainingDays} ngày còn lại`
            : `${stats.remainingDays} days left`;
    case 'weeks':
        return isVi
            ? `${stats.remainingWeeks} tuần còn lại`
            : `${stats.remainingWeeks} weeks left`;
    case 'percent':
        return isVi
            ? `${stats.percentRemaining.toFixed(2)}% còn lại`
            : `${stats.percentRemaining.toFixed(2)}% left`;
    }
    return isVi
        ? `${stats.remainingWeeks} tuần còn lại`
        : `${stats.remainingWeeks} weeks left`;
}

export function computePeriodStats(remainingMs, totalMs) {
    const safeTotal = Math.max(1, totalMs);
    const safeRemaining = Math.min(safeTotal, Math.max(0, remainingMs));
    const safeElapsed = Math.max(0, safeTotal - safeRemaining);

    return {
        totalMs: safeTotal,
        elapsedMs: safeElapsed,
        remainingMs: safeRemaining,
        remainingSeconds: Math.floor(safeRemaining / 1000),
        remainingMinutes: Math.floor(safeRemaining / 60000),
        remainingHours: Math.floor(safeRemaining / 3600000),
        remainingDays: Math.floor(safeRemaining / 86400000),
        remainingWeeks: Math.floor(safeRemaining / 604800000),
        percentRemaining: (safeRemaining / safeTotal) * 100,
        percentElapsed: (safeElapsed / safeTotal) * 100,
    };
}

export function computeMilestoneStats(title, startMs, deadlineStr, nowMs = Date.now()) {
    const parsed = parseLocalDeadline(deadlineStr);
    if (!parsed)
        return null;

    const targetMs = parsed.timestampMs;
    const isExpired = nowMs >= targetMs;
    const effectiveStartMs =
        Number.isFinite(startMs) && startMs > 0 && startMs < targetMs
            ? startMs
            : Math.min(nowMs, targetMs - 1);

    const totalMs = Math.max(1, targetMs - effectiveStartMs);
    const remainingMs = Math.max(0, targetMs - nowMs);

    return {
        title: sanitizeMilestoneTitle(title),
        deadlineNormalized: parsed.normalized,
        startMs: effectiveStartMs,
        targetMs,
        isExpired,
        ...computePeriodStats(remainingMs, totalMs),
    };
}

export function computeCycleStats(scope, nowMs = Date.now()) {
    const safeScope = normalizeCycleScope(scope);
    const now = new Date(nowMs);
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let startMs;
    let endMs;

    if (safeScope === 'month') {
        startMs = new Date(year, month, 1, 0, 0, 0, 0).getTime();
        endMs = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime();
    } else if (safeScope === 'year') {
        startMs = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
        endMs = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime();
    } else {
        startMs = new Date(year, month, day, 0, 0, 0, 0).getTime();
        endMs = new Date(year, month, day + 1, 0, 0, 0, 0).getTime();
    }

    return {
        scope: safeScope,
        year,
        month,
        day,
        ...computePeriodStats(Math.max(0, endMs - nowMs), endMs - startMs),
    };
}

export function buildTopBarSegments(lifeText, milestoneText, cycleText) {
    const items = [];
    if (typeof lifeText === 'string' && lifeText.length > 0)
        items.push({ kind: 'life', text: lifeText });
    if (typeof milestoneText === 'string' && milestoneText.length > 0)
        items.push({ kind: 'milestone', text: milestoneText });
    if (typeof cycleText === 'string' && cycleText.length > 0)
        items.push({ kind: 'cycle', text: cycleText });

    if (items.length === 0)
        return [{ kind: 'life', text: '--' }];

    return items;
}

export function computeNextDelaySeconds(unit, nowMs, popoverOpen, isPaused, milestoneTargetMs = null) {
    if (isPaused)
        return null;

    const safeUnit = normalizeUnit(unit);
    if (popoverOpen || safeUnit === 'seconds')
        return 1;

    const now = new Date(nowMs);
    let delaySec;

    if (safeUnit === 'minutes') {
        delaySec = Math.max(1, 60 - now.getSeconds());
    } else if (safeUnit === 'hours') {
        delaySec = Math.max(1, 3600 - (now.getMinutes() * 60 + now.getSeconds()));
    } else {
        const nextMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0,
            0
        );
        delaySec = Math.max(1, Math.ceil((nextMidnight.getTime() - nowMs) / 1000));
    }

    if (Number.isFinite(milestoneTargetMs) && milestoneTargetMs > nowMs) {
        const untilMilestone = Math.max(1, Math.ceil((milestoneTargetMs - nowMs) / 1000));
        delaySec = Math.min(delaySec, untilMilestone);
    }

    return delaySec;
}
