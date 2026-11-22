import {
    VALID_LANGUAGES,
    normalizeLanguage,
    resolveLanguage,
    t,
    unitShortLabel,
    unitCaptionLabel,
    formatSummaryRow,
    formatCycleCardMeta,
    monthShortLabel,
} from '../lib/i18n.js';

function assertEq(actual, expected, label) {
    if (actual !== expected)
        throw new Error(`FAIL [${label}]: expected=${expected}, actual=${actual}`);
}

assertEq(VALID_LANGUAGES.join(','), 'auto,en,vi', 'valid languages');
assertEq(normalizeLanguage('vi'), 'vi', 'explicit vi');
assertEq(normalizeLanguage('en'), 'en', 'explicit en');
assertEq(normalizeLanguage('fr'), 'auto', 'unknown language falls back to auto');

assertEq(resolveLanguage('en', ['vi_VN.UTF-8']), 'en', 'explicit en overrides locale');
assertEq(resolveLanguage('vi', ['en_US.UTF-8']), 'vi', 'explicit vi overrides locale');
assertEq(resolveLanguage('auto', ['vi_VN.UTF-8', 'C']), 'vi', 'auto picks vi from locale');
assertEq(resolveLanguage('auto', ['en_US.UTF-8', 'C']), 'en', 'auto picks en from locale');

assertEq(unitShortLabel('seconds', 'en'), 'Sec', 'en seconds pill');
assertEq(unitShortLabel('seconds', 'vi'), 'Giây', 'vi seconds pill');
assertEq(unitCaptionLabel('seconds', 'en'), 'seconds remaining', 'en seconds caption');
assertEq(unitCaptionLabel('seconds', 'vi'), 'giây còn lại', 'vi seconds caption');
assertEq(t('settingsButton', 'en'), 'Settings', 'en settings button');
assertEq(t('settingsButton', 'vi'), 'Cài đặt', 'vi settings button');

assertEq(
    formatSummaryRow({ remainingWeeks: 10, remainingDays: 70, remainingHours: 1680 }, 'en'),
    '10w · 70d · 1,680h',
    'en summary row'
);
assertEq(
    formatSummaryRow({ remainingWeeks: 10, remainingDays: 70, remainingHours: 1680 }, 'vi'),
    '10 tuần · 70 ngày · 1,680 giờ',
    'vi summary row'
);

assertEq(t('milestoneGroupTitle', 'en'), 'Pinned Deadline', 'en milestone group');
assertEq(t('milestoneGroupTitle', 'vi'), 'Cột mốc Deadline', 'vi milestone group');
assertEq(t('cycleScopeTitle', 'en'), 'Top bar cycle', 'en cycle scope');
assertEq(t('cycleScopeTitle', 'vi'), 'Nhịp hiển thị trên bar', 'vi cycle scope');
assertEq(monthShortLabel(10, 'en'), 'Nov', 'en month short');
assertEq(monthShortLabel(10, 'vi'), 'Thg 11', 'vi month short');
assertEq(formatCycleCardMeta({ remainingSeconds: 120, percentElapsed: 50 }, 'seconds', 'en'), '50% · 120s', 'en cycle card meta');
assertEq(formatCycleCardMeta({ remainingSeconds: 120, percentElapsed: 50 }, 'seconds', 'vi'), '50% · 120s', 'vi cycle card meta');

print('TEST_I18N_OK');
