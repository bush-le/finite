import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    MAX_REMINDER_LENGTH,
    VALID_UNITS,
    parseLocalBirthDate,
    sanitizeReminderText,
} from './lib/timeMath.js';

const UNIT_OPTIONS = [
    { key: 'seconds', label: 'Giây (đếm từng giây)' },
    { key: 'minutes', label: 'Phút' },
    { key: 'hours', label: 'Giờ' },
    { key: 'days', label: 'Ngày' },
    { key: 'weeks', label: 'Tuần' },
    { key: 'percent', label: 'Phần trăm (%)' },
];

const POSITION_OPTIONS = [
    { key: 'left', label: 'Trái' },
    { key: 'center', label: 'Giữa (cạnh đồng hồ)' },
    { key: 'right', label: 'Phải' },
];

export default class FinitePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'Finite',
            icon_name: 'preferences-system-time-symbolic',
        });

        const lifeGroup = new Adw.PreferencesGroup({
            title: 'Mốc thời gian',
            description: 'Dữ liệu chỉ lưu cục bộ trong GSettings, không gửi ra ngoài.',
        });

        const birthRow = new Adw.EntryRow({
            title: 'Ngày sinh (YYYY-MM-DD)',
            text: settings.get_string('birth-date'),
        });
        birthRow.connect('changed', () => {
            const raw = birthRow.get_text().trim();
            if (raw === '' || parseLocalBirthDate(raw) !== null) {
                birthRow.remove_css_class('error');
                if (settings.get_string('birth-date') !== raw)
                    settings.set_string('birth-date', raw);
            } else {
                birthRow.add_css_class('error');
            }
        });
        lifeGroup.add(birthRow);

        const expectancyRow = Adw.SpinRow.new_with_range(1, 150, 1);
        expectancyRow.set_title('Tuổi thọ kỳ vọng (năm)');
        settings.bind(
            'life-expectancy-years',
            expectancyRow,
            'value',
            Gio.SettingsBindFlags.DEFAULT
        );
        lifeGroup.add(expectancyRow);
        page.add(lifeGroup);

        const displayGroup = new Adw.PreferencesGroup({
            title: 'Hiển thị trên thanh GNOME',
        });

        const unitRow = new Adw.ComboRow({
            title: 'Đơn vị mặc định',
            model: Gtk.StringList.new(UNIT_OPTIONS.map(o => o.label)),
        });
        const syncUnitFromSettings = () => {
            const current = settings.get_string('display-unit');
            const idx = Math.max(0, VALID_UNITS.indexOf(current));
            if (unitRow.get_selected() !== idx)
                unitRow.set_selected(idx);
        };
        syncUnitFromSettings();
        unitRow.connect('notify::selected', () => {
            const opt = UNIT_OPTIONS[unitRow.get_selected()];
            if (opt && settings.get_string('display-unit') !== opt.key)
                settings.set_string('display-unit', opt.key);
        });
        const unitSig = settings.connect('changed::display-unit', syncUnitFromSettings);
        displayGroup.add(unitRow);

        const posRow = new Adw.ComboRow({
            title: 'Vị trí trên thanh bar',
            model: Gtk.StringList.new(POSITION_OPTIONS.map(o => o.label)),
        });
        const currentPos = settings.get_string('panel-position');
        const posIdx = Math.max(0, POSITION_OPTIONS.findIndex(o => o.key === currentPos));
        posRow.set_selected(posIdx);
        posRow.connect('notify::selected', () => {
            const opt = POSITION_OPTIONS[posRow.get_selected()];
            if (opt && settings.get_string('panel-position') !== opt.key)
                settings.set_string('panel-position', opt.key);
        });
        displayGroup.add(posRow);

        const indexRow = Adw.SpinRow.new_with_range(0, 20, 1);
        indexRow.set_title('Thứ tự trong vùng chọn');
        settings.bind('panel-index', indexRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        displayGroup.add(indexRow);

        const reminderRow = new Adw.EntryRow({
            title: `Câu nhắc trong Popover (tối đa ${MAX_REMINDER_LENGTH} ký tự)`,
            text: settings.get_string('reminder-text'),
        });
        reminderRow.connect('changed', () => {
            const clean = sanitizeReminderText(reminderRow.get_text());
            if (settings.get_string('reminder-text') !== clean)
                settings.set_string('reminder-text', clean);
        });
        displayGroup.add(reminderRow);

        page.add(displayGroup);
        window.add(page);

        window.connect('close-request', () => {
            settings.disconnect(unitSig);
            return false;
        });
    }
}
