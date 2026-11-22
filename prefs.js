import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    MAX_BAR_FONT_SIZE,
    MAX_MILESTONE_TITLE_LENGTH,
    MAX_REMINDER_LENGTH,
    MIN_BAR_FONT_SIZE,
    VALID_ACCENTS,
    VALID_CYCLES,
    VALID_FONTS,
    VALID_UNITS,
    parseLocalBirthDate,
    parseLocalDeadline,
    sanitizeMilestoneTitle,
    sanitizeReminderText,
} from './lib/timeMath.js';
import {
    VALID_LANGUAGES,
    resolveLanguage,
    t,
} from './lib/i18n.js';

const POSITION_KEYS = Object.freeze(['left', 'center', 'right']);

export default class FinitePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        let activePage = null;
        let activeSignals = [];
        let pendingLangIdleId = 0;
        let isClosed = false;

        const clearPendingIdle = () => {
            if (pendingLangIdleId) {
                GLib.Source.remove(pendingLangIdleId);
                pendingLangIdleId = 0;
            }
        };

        const clearPageSignals = () => {
            for (const id of activeSignals)
                settings.disconnect(id);
            activeSignals = [];
        };

        const isValidBirth = str => {
            if (str === '')
                return true;
            const parsed = parseLocalBirthDate(str);
            return parsed !== null && parsed.getTime() <= Date.now();
        };

        const bindComboSync = (row, key, values, fallbackKey) => {
            const syncFromSettings = () => {
                const current = settings.get_string(key);
                const idx = values.indexOf(current);
                const fallbackIdx = fallbackKey ? values.indexOf(fallbackKey) : 0;
                const safeIdx = idx >= 0 ? idx : Math.max(0, fallbackIdx);
                if (row.get_selected() !== safeIdx)
                    row.set_selected(safeIdx);
            };
            syncFromSettings();
            row.connect('notify::selected', () => {
                const chosen = values[row.get_selected()];
                if (chosen && settings.get_string(key) !== chosen)
                    settings.set_string(key, chosen);
            });
            activeSignals.push(settings.connect(`changed::${key}`, syncFromSettings));
        };

        const renderPage = () => {
            if (isClosed)
                return;

            clearPageSignals();
            if (activePage) {
                window.remove(activePage);
                activePage = null;
            }

            const lang = resolveLanguage(
                settings.get_string('language'),
                GLib.get_language_names()
            );

            const page = new Adw.PreferencesPage({
                title: t('prefsTitle', lang),
                icon_name: 'preferences-system-time-symbolic',
            });

            const lifeGroup = new Adw.PreferencesGroup({
                title: t('lifeGroupTitle', lang),
                description: t('lifeGroupDesc', lang),
            });

            const initialBirth = settings.get_string('birth-date');
            const birthRow = new Adw.EntryRow({
                title: t('birthDateTitle', lang),
                text: initialBirth,
            });
            if (!isValidBirth(initialBirth))
                birthRow.add_css_class('error');

            birthRow.connect('changed', () => {
                const raw = birthRow.get_text().trim();
                if (isValidBirth(raw)) {
                    birthRow.remove_css_class('error');
                    if (settings.get_string('birth-date') !== raw)
                        settings.set_string('birth-date', raw);
                } else {
                    birthRow.add_css_class('error');
                }
            });
            activeSignals.push(
                settings.connect('changed::birth-date', () => {
                    const ext = settings.get_string('birth-date');
                    if (birthRow.get_text() !== ext)
                        birthRow.set_text(ext);
                })
            );
            lifeGroup.add(birthRow);

            const expectancyRow = Adw.SpinRow.new_with_range(1, 150, 1);
            expectancyRow.set_title(t('expectancyTitle', lang));
            settings.bind(
                'life-expectancy-years',
                expectancyRow,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            lifeGroup.add(expectancyRow);
            page.add(lifeGroup);

            const displayGroup = new Adw.PreferencesGroup({
                title: t('displayGroupTitle', lang),
            });

            const unitRow = new Adw.ComboRow({
                title: t('unitTitle', lang),
                model: Gtk.StringList.new(t('unitLabels', lang)),
            });
            bindComboSync(unitRow, 'display-unit', VALID_UNITS, 'weeks');
            displayGroup.add(unitRow);

            const fontRow = new Adw.ComboRow({
                title: t('fontTitle', lang),
                model: Gtk.StringList.new(t('fontLabels', lang)),
            });
            bindComboSync(fontRow, 'font-preset', VALID_FONTS, 'system');
            displayGroup.add(fontRow);

            const fontSizeRow = Adw.SpinRow.new_with_range(
                MIN_BAR_FONT_SIZE,
                MAX_BAR_FONT_SIZE,
                1
            );
            fontSizeRow.set_title(t('fontSizeTitle', lang));
            settings.bind(
                'bar-font-size',
                fontSizeRow,
                'value',
                Gio.SettingsBindFlags.DEFAULT
            );
            displayGroup.add(fontSizeRow);

            const accentRow = new Adw.ComboRow({
                title: t('accentThemeTitle', lang),
                model: Gtk.StringList.new(t('accentLabels', lang)),
            });
            bindComboSync(accentRow, 'accent-theme', VALID_ACCENTS, 'amber');
            displayGroup.add(accentRow);

            const posRow = new Adw.ComboRow({
                title: t('positionTitle', lang),
                model: Gtk.StringList.new(t('positionLabels', lang)),
            });
            bindComboSync(posRow, 'panel-position', POSITION_KEYS, 'center');
            displayGroup.add(posRow);

            const indexRow = Adw.SpinRow.new_with_range(0, 20, 1);
            indexRow.set_title(t('indexTitle', lang));
            settings.bind('panel-index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            displayGroup.add(indexRow);

            const langRow = new Adw.ComboRow({
                title: t('languageTitle', lang),
                model: Gtk.StringList.new(t('languageLabels', lang)),
            });
            bindComboSync(langRow, 'language', VALID_LANGUAGES, 'auto');
            activeSignals.push(
                settings.connect('changed::language', () => {
                    clearPendingIdle();
                    pendingLangIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        pendingLangIdleId = 0;
                        renderPage();
                        return GLib.SOURCE_REMOVE;
                    });
                })
            );
            displayGroup.add(langRow);

            const reminderRow = new Adw.EntryRow({
                title: t('reminderTitle', lang),
                text: settings.get_string('reminder-text'),
            });
            reminderRow.set_max_length(MAX_REMINDER_LENGTH);
            reminderRow.connect('changed', () => {
                const clean = sanitizeReminderText(reminderRow.get_text());
                if (settings.get_string('reminder-text') !== clean)
                    settings.set_string('reminder-text', clean);
            });
            activeSignals.push(
                settings.connect('changed::reminder-text', () => {
                    const ext = settings.get_string('reminder-text');
                    if (reminderRow.get_text() !== ext)
                        reminderRow.set_text(ext);
                })
            );
            displayGroup.add(reminderRow);

            page.add(displayGroup);

            const milestoneGroup = new Adw.PreferencesGroup({
                title: t('milestoneGroupTitle', lang),
                description: t('milestoneGroupDesc', lang),
            });

            const milestoneSwitch = new Adw.SwitchRow({
                title: t('milestoneEnabledTitle', lang),
            });
            settings.bind(
                'milestone-enabled',
                milestoneSwitch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
            milestoneGroup.add(milestoneSwitch);

            const milestoneTitleRow = new Adw.EntryRow({
                title: t('milestoneTitleLabel', lang),
                text: settings.get_string('milestone-title'),
            });
            milestoneTitleRow.set_max_length(MAX_MILESTONE_TITLE_LENGTH);
            milestoneTitleRow.connect('changed', () => {
                const clean = sanitizeMilestoneTitle(milestoneTitleRow.get_text());
                if (settings.get_string('milestone-title') !== clean)
                    settings.set_string('milestone-title', clean);
            });
            activeSignals.push(
                settings.connect('changed::milestone-title', () => {
                    const ext = settings.get_string('milestone-title');
                    if (milestoneTitleRow.get_text() !== ext)
                        milestoneTitleRow.set_text(ext);
                })
            );
            milestoneGroup.add(milestoneTitleRow);

            const initialDeadline = settings.get_string('milestone-deadline');
            const milestoneDeadlineRow = new Adw.EntryRow({
                title: t('milestoneDeadlineLabel', lang),
                text: initialDeadline,
            });
            if (initialDeadline !== '' && parseLocalDeadline(initialDeadline) === null)
                milestoneDeadlineRow.add_css_class('error');

            milestoneDeadlineRow.connect('changed', () => {
                const raw = milestoneDeadlineRow.get_text().trim();
                if (raw === '') {
                    milestoneDeadlineRow.remove_css_class('error');
                    if (settings.get_string('milestone-deadline') !== '') {
                        settings.set_string('milestone-deadline', '');
                        settings.set_int64('milestone-start-ms', 0);
                    }
                    return;
                }
                const parsed = parseLocalDeadline(raw);
                if (parsed !== null) {
                    milestoneDeadlineRow.remove_css_class('error');
                    if (settings.get_string('milestone-deadline') !== parsed.normalized) {
                        settings.set_int64('milestone-start-ms', Date.now());
                        settings.set_string('milestone-deadline', parsed.normalized);
                    }
                } else {
                    milestoneDeadlineRow.add_css_class('error');
                }
            });
            activeSignals.push(
                settings.connect('changed::milestone-deadline', () => {
                    const ext = settings.get_string('milestone-deadline');
                    if (milestoneDeadlineRow.get_text() !== ext)
                        milestoneDeadlineRow.set_text(ext);
                })
            );
            milestoneGroup.add(milestoneDeadlineRow);
            page.add(milestoneGroup);

            const cycleGroup = new Adw.PreferencesGroup({
                title: t('cycleGroupTitle', lang),
            });

            const cycleSwitch = new Adw.SwitchRow({
                title: t('cycleEnabledTitle', lang),
            });
            settings.bind(
                'cycle-enabled',
                cycleSwitch,
                'active',
                Gio.SettingsBindFlags.DEFAULT
            );
            cycleGroup.add(cycleSwitch);

            const cycleScopeRow = new Adw.ComboRow({
                title: t('cycleScopeTitle', lang),
                model: Gtk.StringList.new(t('cycleScopeLabels', lang)),
            });
            bindComboSync(cycleScopeRow, 'cycle-scope', VALID_CYCLES, 'day');
            cycleGroup.add(cycleScopeRow);
            page.add(cycleGroup);

            window.add(page);
            activePage = page;
        };

        renderPage();
        window.connect('close-request', () => {
            isClosed = true;
            clearPendingIdle();
            clearPageSignals();
            return false;
        });
    }
}
