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

export const MIN_BAR_FONT_SIZE = 10;
export const MAX_BAR_FONT_SIZE = 24;

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

export function sanitizeReminderText(text) {
    if (typeof text !== 'string')
        return '';
    return text.trim().slice(0, MAX_REMINDER_LENGTH);
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
    const livedYears = Math.min(safeYears, Math.floor((elapsedMs / totalMs) * safeYears));

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

export function computeNextDelaySeconds(unit, nowMs, popoverOpen, isPaused) {
    if (isPaused)
        return null;

    const safeUnit = normalizeUnit(unit);
    if (popoverOpen || safeUnit === 'seconds')
        return 1;

    const now = new Date(nowMs);
    if (safeUnit === 'minutes') {
        const rem = 60 - now.getSeconds();
        return Math.max(1, rem);
    }

    if (safeUnit === 'hours') {
        const rem = 3600 - (now.getMinutes() * 60 + now.getSeconds());
        return Math.max(1, rem);
    }

    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
    );
    const secUntilMidnight = Math.ceil((nextMidnight.getTime() - nowMs) / 1000);
    return Math.max(1, secUntilMidnight);
}
