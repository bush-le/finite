const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const VALID_LANGUAGES = Object.freeze(['auto', 'en', 'vi']);

const STRINGS = Object.freeze({
    en: {
        noBirthDateHero: 'Set birth date in Settings',
        noBirthDateHint: 'Open Settings to enter birth date',
        elapsedSuffix: '% lived',
        yearPrefix: 'Year',
        todayLabel: 'Today',
        lifeLabel: 'Life',
        legendLived: 'Past',
        legendNow: 'Today',
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
        displayGroupTitle: 'Top bar and Display',
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
            'System Bold (Match GNOME Clock)',
            'Inter Bold (Modern Sans)',
            'JetBrains Mono Bold (Crisp Digits)',
            'Adwaita Mono Bold (Minimalist)',
        ],
        fontSizeTitle: 'Top bar font size (px)',
        accentThemeTitle: 'Color theme',
        accentLabels: ['Amber Gold', 'Nordic Cyan', 'Calm Sage', 'Muted Coral'],
        positionTitle: 'Top bar position',
        positionLabels: ['Left', 'Center (beside clock)', 'Right'],
        indexTitle: 'Position index',
        languageTitle: 'Language',
        languageLabels: ['Auto (System Locale)', 'English', 'Tiếng Việt'],
        reminderTitle: 'Popover reminder (max 200 chars)',
        milestoneGroupTitle: 'Pinned Deadline',
        milestoneGroupDesc: 'Optional hard deadline shown beside the life counter.',
        milestoneEnabledTitle: 'Show pinned deadline on top bar',
        milestoneTitleLabel: 'Milestone name (max 60 chars)',
        milestoneDeadlineLabel: 'Deadline (YYYY-MM-DD or YYYY-MM-DD HH:MM)',
        milestoneDefaultTitle: 'Pinned Goal',
        milestoneExpired: 'Deadline reached',
        cycleGroupTitle: 'Short-Term Cycle',
        cycleEnabledTitle: 'Show Today / Month / Year on top bar',
        cycleScopeTitle: 'Top bar cycle',
        cycleScopeLabels: ['Today', 'This Month', 'This Year'],
    },
    vi: {
        noBirthDateHero: 'Chưa đặt ngày sinh',
        noBirthDateHint: 'Mở Cài đặt để nhập ngày sinh',
        elapsedSuffix: '% đã qua',
        yearPrefix: 'Năm',
        todayLabel: 'Hôm nay',
        lifeLabel: 'Cuộc đời',
        legendLived: 'Đã qua',
        legendNow: 'Hôm nay',
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
        displayGroupTitle: 'Thanh GNOME và Giao diện',
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
            'Mặc định hệ thống (Khớp đồng hồ GNOME)',
            'Inter In Đậm (Hiện đại)',
            'JetBrains Mono In Đậm (Số đều nét)',
            'Adwaita Mono In Đậm (Tối giản)',
        ],
        fontSizeTitle: 'Cỡ chữ trên thanh bar (px)',
        accentThemeTitle: 'Màu sắc chủ đạo',
        accentLabels: ['Vàng Hổ Phách', 'Xanh Bắc Âu', 'Xanh Ngọc Dịu', 'San Hô Nhẹ'],
        positionTitle: 'Vị trí trên thanh bar',
        positionLabels: ['Trái', 'Giữa (cạnh đồng hồ)', 'Phải'],
        indexTitle: 'Thứ tự trong vùng chọn',
        languageTitle: 'Ngôn ngữ (Language)',
        languageLabels: ['Tự động theo hệ thống', 'English', 'Tiếng Việt'],
        reminderTitle: 'Câu nhắc trong Popover (tối đa 200 ký tự)',
        milestoneGroupTitle: 'Cột mốc Deadline',
        milestoneGroupDesc: 'Ghim một hạn chót cứng chạy song song trên thanh bar.',
        milestoneEnabledTitle: 'Hiện cột mốc deadline trên thanh bar',
        milestoneTitleLabel: 'Tên cột mốc (tối đa 60 ký tự)',
        milestoneDeadlineLabel: 'Hạn chót (YYYY-MM-DD hoặc YYYY-MM-DD HH:MM)',
        milestoneDefaultTitle: 'Mục tiêu ghim',
        milestoneExpired: 'Đã tới hạn',
        cycleGroupTitle: 'Nhịp ngắn hạn',
        cycleEnabledTitle: 'Hiện bộ đếm Ngày / Tháng / Năm trên bar',
        cycleScopeTitle: 'Nhịp hiển thị trên bar',
        cycleScopeLabels: ['Hôm nay', 'Tháng này', 'Năm nay'],
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

export function monthShortLabel(monthIdx, lang = 'en') {
    const safeIdx = Math.min(11, Math.max(0, Math.trunc(Number(monthIdx) || 0)));
    if (lang === 'vi')
        return `Thg ${safeIdx + 1}`;
    return MONTHS_EN[safeIdx];
}

export function formatCycleCardMeta(cycleStats, unit = 'seconds', lang = 'en') {
    if (!cycleStats)
        return '0%';
    const pct = Math.min(100, Math.max(0, Number(cycleStats.percentElapsed) || 0)).toFixed(0);
    const isVi = lang === 'vi';
    let val;
    switch (unit) {
    case 'seconds':
        val = `${(cycleStats.remainingSeconds ?? 0).toLocaleString('en-US')}s`;
        break;
    case 'minutes':
        val = `${(cycleStats.remainingMinutes ?? 0).toLocaleString('en-US')}${isVi ? 'p' : 'm'}`;
        break;
    case 'hours':
        val = `${(cycleStats.remainingHours ?? 0).toLocaleString('en-US')}${isVi ? 'g' : 'h'}`;
        break;
    case 'days':
        val = `${(cycleStats.remainingDays ?? 0).toLocaleString('en-US')}${isVi ? 'n' : 'd'}`;
        break;
    case 'weeks':
        val = `${(cycleStats.remainingWeeks ?? 0).toLocaleString('en-US')}${isVi ? 't' : 'w'}`;
        break;
    case 'percent':
        val = `${Number(cycleStats.percentRemaining ?? 0).toFixed(1)}%`;
        break;
    default:
        val = `${(cycleStats.remainingSeconds ?? 0).toLocaleString('en-US')}s`;
    }
    return `${pct}% · ${val}`;
}
