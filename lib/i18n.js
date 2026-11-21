export const VALID_LANGUAGES = Object.freeze(['auto', 'en', 'vi']);

const STRINGS = Object.freeze({
    en: {
        noBirthDateHero: 'Set birth date in Settings',
        noBirthDateHint: 'Open Settings to enter birth date',
        elapsedSuffix: '% lived',
        yearPrefix: 'Year',
        legendLived: 'Lived',
        legendNow: 'Now',
        legendLeft: 'Left',
        settingsButton: 'Settings',
        unitCaptions: {
            seconds: 'seconds remaining',
            minutes: 'minutes remaining',
            hours: 'hours remaining',
            days: 'days remaining',
            weeks: 'weeks remaining',
            percent: 'life remaining',
        },
        unitPills: {
            seconds: 'Sec',
            minutes: 'Min',
            hours: 'Hr',
            days: 'Day',
            weeks: 'Wk',
            percent: '%',
        },
        prefsTitle: 'Finite',
        lifeGroupTitle: 'Timeline',
        lifeGroupDesc: 'Stored locally in GSettings only — zero network access.',
        birthDateTitle: 'Birth date (YYYY-MM-DD)',
        expectancyTitle: 'Life expectancy (years)',
        displayGroupTitle: 'Top bar & Display',
        unitTitle: 'Default unit',
        unitLabels: [
            'Seconds (live tick)',
            'Minutes',
            'Hours',
            'Days',
            'Weeks',
            'Percent (%)',
        ],
        fontTitle: 'Top bar font',
        fontLabels: [
            'System (Match GNOME Clock)',
            'Inter (Modern Sans)',
            'JetBrains Mono (Crisp Digits)',
            'Adwaita Mono (Minimalist)',
        ],
        positionTitle: 'Top bar position',
        positionLabels: ['Left', 'Center (beside clock)', 'Right'],
        indexTitle: 'Position index',
        languageTitle: 'Language',
        languageLabels: ['Auto (System Locale)', 'English', 'Tiếng Việt'],
        reminderTitle: 'Popover reminder (max 200 chars)',
    },
    vi: {
        noBirthDateHero: 'Chưa đặt ngày sinh',
        noBirthDateHint: 'Mở Cài đặt để nhập ngày sinh',
        elapsedSuffix: '% đã qua',
        yearPrefix: 'Năm',
        legendLived: 'Đã qua',
        legendNow: 'Hiện tại',
        legendLeft: 'Còn lại',
        settingsButton: 'Cài đặt',
        unitCaptions: {
            seconds: 'giây còn lại',
            minutes: 'phút còn lại',
            hours: 'giờ còn lại',
            days: 'ngày còn lại',
            weeks: 'tuần còn lại',
            percent: 'cuộc đời còn lại',
        },
        unitPills: {
            seconds: 'Giây',
            minutes: 'Phút',
            hours: 'Giờ',
            days: 'Ngày',
            weeks: 'Tuần',
            percent: '%',
        },
        prefsTitle: 'Finite',
        lifeGroupTitle: 'Mốc thời gian',
        lifeGroupDesc: 'Dữ liệu chỉ lưu cục bộ trong GSettings, không gửi ra ngoài.',
        birthDateTitle: 'Ngày sinh (YYYY-MM-DD)',
        expectancyTitle: 'Tuổi thọ kỳ vọng (năm)',
        displayGroupTitle: 'Thanh GNOME & Giao diện',
        unitTitle: 'Đơn vị mặc định',
        unitLabels: [
            'Giây (đếm từng giây)',
            'Phút',
            'Giờ',
            'Ngày',
            'Tuần',
            'Phần trăm (%)',
        ],
        fontTitle: 'Font trên thanh bar',
        fontLabels: [
            'Mặc định hệ thống (Giống đồng hồ GNOME)',
            'Inter (Hiện đại)',
            'JetBrains Mono (Số đều nét)',
            'Adwaita Mono (Tối giản)',
        ],
        positionTitle: 'Vị trí trên thanh bar',
        positionLabels: ['Trái', 'Giữa (cạnh đồng hồ)', 'Phải'],
        indexTitle: 'Thứ tự trong vùng chọn',
        languageTitle: 'Ngôn ngữ (Language)',
        languageLabels: ['Tự động theo hệ thống', 'English', 'Tiếng Việt'],
        reminderTitle: 'Câu nhắc trong Popover (tối đa 200 ký tự)',
    },
});

export function normalizeLanguage(lang) {
    return VALID_LANGUAGES.includes(lang) ? lang : 'auto';
}

export function resolveLanguage(prefLang, localeNames = []) {
    const safePref = normalizeLanguage(prefLang);
    if (safePref === 'en' || safePref === 'vi')
        return safePref;

    if (Array.isArray(localeNames)) {
        for (const loc of localeNames) {
            if (typeof loc === 'string' && loc.toLowerCase().startsWith('vi'))
                return 'vi';
            if (typeof loc === 'string' && loc !== 'C' && loc !== 'POSIX')
                break;
        }
    }
    return 'en';
}

export function t(key, lang = 'en') {
    const dict = lang === 'vi' ? STRINGS.vi : STRINGS.en;
    return dict[key] ?? STRINGS.en[key] ?? key;
}

export function unitShortLabel(unit, lang = 'en') {
    const dict = lang === 'vi' ? STRINGS.vi : STRINGS.en;
    return dict.unitPills[unit] ?? unit;
}

export function unitCaptionLabel(unit, lang = 'en') {
    const dict = lang === 'vi' ? STRINGS.vi : STRINGS.en;
    return dict.unitCaptions[unit] ?? '';
}

export function formatSummaryRow(stats, lang = 'en') {
    if (!stats)
        return '';
    if (lang === 'vi')
        return `${stats.remainingWeeks.toLocaleString('en-US')} tuần · ${stats.remainingDays.toLocaleString('en-US')} ngày · ${stats.remainingHours.toLocaleString('en-US')} giờ`;
    return `${stats.remainingWeeks.toLocaleString('en-US')}w · ${stats.remainingDays.toLocaleString('en-US')}d · ${stats.remainingHours.toLocaleString('en-US')}h`;
}
