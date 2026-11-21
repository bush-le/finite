import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    VALID_FONTS,
    computeLifeStats,
    computeNextDelaySeconds,
    formatBarValue,
    normalizeFontPreset,
} from './lib/timeMath.js';
import { resolveLanguage } from './lib/i18n.js';
import { FinitePopoverView } from './lib/popoverView.js';

const FiniteIndicator = GObject.registerClass(
class FiniteIndicator extends PanelMenu.Button {
    _init({ onSelectUnit, onOpenPrefs, onStateChange }) {
        super._init(0.5, 'Finite', false);

        this._onSelectUnit = onSelectUnit;
        this._onOpenPrefs = onOpenPrefs;
        this._onStateChange = onStateChange;

        this._popoverOpen = false;
        this._popoverView = null;
        this._menuItem = null;
        this._activeFontClass = null;

        this._label = new St.Label({
            text: '--',
            style_class: 'finite-bar-label',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._label);

        // PopupMenu.open() skips opening when menu.isEmpty() is true, so register the menu item up front.
        this._ensurePopover();

        this._mappedSignalId = this._label.connect('notify::mapped', () => {
            this._onStateChange?.();
        });

        this._menuSignalId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
            this._popoverOpen = isOpen;
            this._onStateChange?.();
        });
    }

    get isPopoverOpen() {
        return this._popoverOpen;
    }

    get isLabelMapped() {
        return this._label ? this._label.mapped : false;
    }

    _ensurePopover() {
        if (this._popoverView)
            return;

        this._popoverView = new FinitePopoverView({
            onSelectUnit: unit => this._onSelectUnit?.(unit),
            onOpenPrefs: () => {
                this.menu.close();
                this._onOpenPrefs?.();
            },
        });

        this._menuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this._menuItem.add_child(this._popoverView.actor);
        this.menu.addMenuItem(this._menuItem);
    }

    _applyFontPreset(fontPreset) {
        if (!this._label)
            return;
        const safePreset = normalizeFontPreset(fontPreset);
        const nextClass = `finite-font-${safePreset}`;
        if (this._activeFontClass === nextClass)
            return;

        for (const preset of VALID_FONTS)
            this._label.remove_style_class_name(`finite-font-${preset}`);
        this._label.add_style_class_name(nextClass);
        this._activeFontClass = nextClass;
    }

    updateView(stats, unit, expectancyYears, reminderText, lang, fontPreset) {
        if (this._label) {
            this._applyFontPreset(fontPreset);
            this._label.text = formatBarValue(stats, unit);
        }

        if (this._popoverOpen && this._popoverView)
            this._popoverView.update(stats, unit, expectancyYears, reminderText, lang);
    }

    destroy() {
        if (this._label && this._mappedSignalId) {
            this._label.disconnect(this._mappedSignalId);
            this._mappedSignalId = 0;
        }
        if (this.menu && this._menuSignalId) {
            this.menu.disconnect(this._menuSignalId);
            this._menuSignalId = 0;
        }
        if (this._popoverView) {
            this._popoverView.destroy();
            this._popoverView = null;
        }
        this._menuItem = null;
        this._label = null;
        this._onSelectUnit = null;
        this._onOpenPrefs = null;
        this._onStateChange = null;
        super.destroy();
    }
});

export default class FiniteExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._timerId = 0;
        this._settingsSignals = [];

        this._displaySignalId = global.display.connect('in-fullscreen-changed', () => {
            this._onWake();
        });

        for (const key of [
            'birth-date',
            'life-expectancy-years',
            'display-unit',
            'font-preset',
            'language',
            'reminder-text',
        ]) {
            this._settingsSignals.push(
                this._settings.connect(`changed::${key}`, () => this._onWake())
            );
        }

        for (const key of ['panel-position', 'panel-index']) {
            this._settingsSignals.push(
                this._settings.connect(`changed::${key}`, () => this._rebuildIndicator())
            );
        }

        this._mountIndicator();
        this._onWake();
    }

    _mountIndicator() {
        this._indicator = new FiniteIndicator({
            onSelectUnit: unit => this._settings?.set_string('display-unit', unit),
            onOpenPrefs: () => this.openPreferences(),
            onStateChange: () => this._onWake(),
        });

        const pos = this._settings.get_string('panel-position');
        const box = ['left', 'center', 'right'].includes(pos) ? pos : 'center';
        const rawIndex = this._settings.get_int('panel-index');
        const index = Math.min(20, Math.max(0, rawIndex));

        Main.panel.addToStatusArea(this.uuid, this._indicator, index, box);
    }

    _rebuildIndicator() {
        this._clearTimer();
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._mountIndicator();
        this._onWake();
    }

    _isPaused() {
        if (!this._indicator || !this._indicator.isLabelMapped)
            return true;

        const primary = Main.layoutManager.primaryIndex;
        if (primary < 0)
            return true;
        return global.display.get_monitor_in_fullscreen(primary);
    }

    _clearTimer() {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = 0;
        }
    }

    _onWake() {
        if (!this._settings || !this._indicator)
            return;

        this._clearTimer();

        const nowMs = Date.now();
        const birthDate = this._settings.get_string('birth-date');
        const expectancyYears = this._settings.get_int('life-expectancy-years');
        const unit = this._settings.get_string('display-unit');
        const fontPreset = this._settings.get_string('font-preset');
        const prefLang = this._settings.get_string('language');
        const lang = resolveLanguage(prefLang, GLib.get_language_names());
        const reminderText = this._settings.get_string('reminder-text');

        const stats = computeLifeStats(birthDate, expectancyYears, nowMs);
        this._indicator.updateView(stats, unit, expectancyYears, reminderText, lang, fontPreset);

        if (!stats)
            return;

        const delaySec = computeNextDelaySeconds(
            unit,
            nowMs,
            this._indicator.isPopoverOpen,
            this._isPaused()
        );

        if (delaySec !== null) {
            this._timerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                delaySec,
                () => {
                    this._timerId = 0;
                    this._onWake();
                    return GLib.SOURCE_REMOVE;
                }
            );
        }
    }

    disable() {
        this._clearTimer();

        if (this._displaySignalId) {
            global.display.disconnect(this._displaySignalId);
            this._displaySignalId = 0;
        }

        for (const id of this._settingsSignals)
            this._settings?.disconnect(id);
        this._settingsSignals = [];

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._settings = null;
    }
}
