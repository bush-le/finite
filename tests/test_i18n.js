import {
    VALID_LANGUAGES,
    normalizeLanguage,
    resolveLanguage,
    t,
    unitShortLabel,
    formatSummaryRow,
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
assertEq(t('settingsButton', 'en'), 'Settings', 'en settings button');
assertEq(t('settingsButton', 'vi'), 'Cài đặt', 'vi settings button');

assertEq(
    formatSummaryRow({ remainingWeeks: 10, remainingDays: 70, remainingHours: 1680 }, 'en'),
    '10w · 70d · 1680h',
    'en summary row'
);
assertEq(
    formatSummaryRow({ remainingWeeks: 10, remainingDays: 70, remainingHours: 1680 }, 'vi'),
    '10 tuần · 70 ngày · 1680 giờ',
    'vi summary row'
);

print('TEST_I18N_OK');
