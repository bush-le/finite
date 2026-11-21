import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    MAX_BAR_FONT_SIZE,
    MAX_REMINDER_LENGTH,
    MIN_BAR_FONT_SIZE,
    VALID_ACCENTS,
    VALID_FONTS,
    VALID_UNITS,
    parseLocalBirthDate,
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

        const clearPageSignals = () => {
            for (const id of activeSignals)
                settings.disconnect(id);
            activeSignals = [];
        };

        const renderPage = () => {
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
            if (initialBirth !== '' && parseLocalBirthDate(initialBirth) === null)
                birthRow.add_css_class('error');

            birthRow.connect('changed', () => {
                const raw = birthRow.get_text().trim();
                const parsed = parseLocalBirthDate(raw);
                const validFutureCheck = parsed !== null && parsed.getTime() <= Date.now();
                if (raw === '' || validFutureCheck) {
                    birthRow.remove_css_class('error');
                    if (settings.get_string('birth-date') !== raw)
                        settings.set_string('birth-date', raw);
                } else {
                    birthRow.add_css_class('error');
                }
            });
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
            const syncUnitFromSettings = () => {
                const current = settings.get_string('display-unit');
                const idx = VALID_UNITS.indexOf(current);
                const safeIdx = idx >= 0 ? idx : VALID_UNITS.indexOf('weeks');
                if (unitRow.get_selected() !== safeIdx)
                    unitRow.set_selected(safeIdx);
            };
            syncUnitFromSettings();
            unitRow.connect('notify::selected', () => {
                const key = VALID_UNITS[unitRow.get_selected()];
                if (key && settings.get_string('display-unit') !== key)
                    settings.set_string('display-unit', key);
            });
            activeSignals.push(
                settings.connect('changed::display-unit', syncUnitFromSettings)
            );
            displayGroup.add(unitRow);

            const fontRow = new Adw.ComboRow({
                title: t('fontTitle', lang),
                model: Gtk.StringList.new(t('fontLabels', lang)),
            });
            const currentFont = settings.get_string('font-preset');
            const fontIdx = VALID_FONTS.indexOf(currentFont);
            fontRow.set_selected(fontIdx >= 0 ? fontIdx : 0);
            fontRow.connect('notify::selected', () => {
                const key = VALID_FONTS[fontRow.get_selected()];
                if (key && settings.get_string('font-preset') !== key)
                    settings.set_string('font-preset', key);
            });
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
            const currentAccent = settings.get_string('accent-theme');
            const accentIdx = VALID_ACCENTS.indexOf(currentAccent);
            accentRow.set_selected(accentIdx >= 0 ? accentIdx : 0);
            accentRow.connect('notify::selected', () => {
                const key = VALID_ACCENTS[accentRow.get_selected()];
                if (key && settings.get_string('accent-theme') !== key)
                    settings.set_string('accent-theme', key);
            });
            displayGroup.add(accentRow);

            const posRow = new Adw.ComboRow({
                title: t('positionTitle', lang),
                model: Gtk.StringList.new(t('positionLabels', lang)),
            });
            const currentPos = settings.get_string('panel-position');
            const posIdx = POSITION_KEYS.indexOf(currentPos);
            posRow.set_selected(posIdx >= 0 ? posIdx : POSITION_KEYS.indexOf('center'));
            posRow.connect('notify::selected', () => {
                const key = POSITION_KEYS[posRow.get_selected()];
                if (key && settings.get_string('panel-position') !== key)
                    settings.set_string('panel-position', key);
            });
            displayGroup.add(posRow);

            const indexRow = Adw.SpinRow.new_with_range(0, 20, 1);
            indexRow.set_title(t('indexTitle', lang));
            settings.bind('panel-index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
            displayGroup.add(indexRow);

            const langRow = new Adw.ComboRow({
                title: t('languageTitle', lang),
                model: Gtk.StringList.new(t('languageLabels', lang)),
            });
            const currentLangPref = settings.get_string('language');
            const langIdx = VALID_LANGUAGES.indexOf(currentLangPref);
            langRow.set_selected(langIdx >= 0 ? langIdx : 0);
            langRow.connect('notify::selected', () => {
                const key = VALID_LANGUAGES[langRow.get_selected()];
                if (key && settings.get_string('language') !== key) {
                    settings.set_string('language', key);
                    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        renderPage();
                        return GLib.SOURCE_REMOVE;
                    });
                }
            });
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
            displayGroup.add(reminderRow);

            page.add(displayGroup);
            window.add(page);
            activePage = page;
        };

        renderPage();
        window.connect('close-request', () => {
            clearPageSignals();
            return false;
        });
    }
}
