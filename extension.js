import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    VALID_ACCENTS,
    VALID_FONTS,
    buildTopBarSegments,
    clampBarFontSize,
    computeCycleStats,
    computeLifeStats,
    computeMilestoneStats,
    computeNextDelaySeconds,
    formatBarValue,
    normalizeAccentTheme,
    normalizeFontPreset,
} from './lib/timeMath.js';
import { resolveLanguage } from './lib/i18n.js';
import { FinitePopoverView } from './lib/popoverView.js';

function createBarLabel(extraClass = '') {
    const label = new St.Label({
        text: '',
        style_class: extraClass ? `finite-bar-label ${extraClass}` : 'finite-bar-label',
        y_align: Clutter.ActorAlign.CENTER,
    });
    label.clutter_text.y_align = Clutter.ActorAlign.CENTER;
    label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    return label;
}

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
        this._activeFontSize = null;
        this._activeAccentClass = null;

        this._barBox = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-bar-box',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._lifeLabel = createBarLabel();
        this._lifeLabel.text = '--';
        this._milestoneLabel = createBarLabel('finite-bar-theme-amber');
        this._milestoneLabel.visible = false;
        this._cycleLabel = createBarLabel('finite-bar-muted');
        this._cycleLabel.visible = false;

        this._allLabels = [
            this._lifeLabel,
            this._milestoneLabel,
            this._cycleLabel,
        ];
        for (const lbl of this._allLabels)
            this._barBox.add_child(lbl);

        this.add_child(this._barBox);
        this.label_actor = this._lifeLabel;

        // PopupMenu.open() skips opening when menu.isEmpty() is true, so register the menu item up front.
        this._ensurePopover();

        this._mappedSignalId = this._barBox.connect('notify::mapped', () => {
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
        return this._barBox ? this._barBox.mapped : false;
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

    _applyBarStyling(fontPreset, fontSize, accentTheme) {
        if (!this._barBox)
            return;

        const safePreset = normalizeFontPreset(fontPreset);
        const nextFontClass = `finite-font-${safePreset}`;
        if (this._activeFontClass !== nextFontClass) {
            for (const lbl of this._allLabels) {
                for (const preset of VALID_FONTS)
                    lbl.remove_style_class_name(`finite-font-${preset}`);
                lbl.add_style_class_name(nextFontClass);
            }
            this._activeFontClass = nextFontClass;
        }

        const safeSize = clampBarFontSize(fontSize);
        if (this._activeFontSize !== safeSize) {
            const sizeCss = `font-size: ${safeSize}px;`;
            for (const lbl of this._allLabels)
                lbl.style = sizeCss;
            this._activeFontSize = safeSize;
        }

        const safeAccent = normalizeAccentTheme(accentTheme);
        const nextAccentClass = `finite-bar-theme-${safeAccent}`;
        if (this._activeAccentClass !== nextAccentClass && this._milestoneLabel) {
            for (const theme of VALID_ACCENTS)
                this._milestoneLabel.remove_style_class_name(`finite-bar-theme-${theme}`);
            this._milestoneLabel.add_style_class_name(nextAccentClass);
            this._activeAccentClass = nextAccentClass;
        }
    }

    _applySegments(segments) {
        const byKind = new Map();
        for (const seg of segments)
            byKind.set(seg.kind, seg.text);

        const lifeText = byKind.get('life') ?? null;
        const milestoneText = byKind.get('milestone') ?? null;
        const cycleText = byKind.get('cycle') ?? null;

        this._lifeLabel.visible = lifeText !== null;
        if (lifeText !== null)
            this._lifeLabel.text = lifeText;

        this._milestoneLabel.visible = milestoneText !== null;
        if (milestoneText !== null)
            this._milestoneLabel.text = milestoneText;

        this._cycleLabel.visible = cycleText !== null;
        if (cycleText !== null)
            this._cycleLabel.text = cycleText;
    }

    updateView({
        lifeStats,
        milestoneStats,
        cycleStats,
        unit,
        expectancyYears,
        reminderText,
        lang,
        fontPreset,
        fontSize,
        accentTheme,
        nowMs,
        isLight,
    }) {
        if (this._barBox) {
            this._applyBarStyling(fontPreset, fontSize, accentTheme);
            const lifeText = lifeStats ? formatBarValue(lifeStats, unit) : null;
            const milestoneText = milestoneStats ? formatBarValue(milestoneStats, unit) : null;
            const cycleText = cycleStats ? formatBarValue(cycleStats, unit) : null;
            this._applySegments(buildTopBarSegments(lifeText, milestoneText, cycleText));
        }

        if (this._popoverView) {
            this._popoverView.update(
                lifeStats,
                unit,
                expectancyYears,
                reminderText,
                lang,
                accentTheme,
                nowMs,
                isLight,
                milestoneStats
            );
        }
    }

    _onDestroy() {
        if (this._barBox && this._mappedSignalId) {
            this._barBox.disconnect(this._mappedSignalId);
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
        this._barBox = null;
        this._lifeLabel = null;
        this._milestoneLabel = null;
        this._cycleLabel = null;
        this._allLabels = [];
        this._onSelectUnit = null;
        this._onOpenPrefs = null;
        this._onStateChange = null;
        super._onDestroy();
    }
});

export default class FiniteExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._timerId = 0;
        this._settingsSignals = [];
        this._sleepSignalId = 0;

        this._displaySignalId = global.display.connect('in-fullscreen-changed', () => {
            this._onWake();
        });

        try {
            this._sleepSignalId = Gio.DBus.system.signal_subscribe(
                'org.freedesktop.login1',
                'org.freedesktop.login1.Manager',
                'PrepareForSleep',
                '/org/freedesktop/login1',
                null,
                Gio.DBusSignalFlags.NONE,
                (_conn, _sender, _path, _iface, _signal, params) => {
                    const [sleeping] = params.deepUnpack();
                    if (!sleeping)
                        this._onWake();
                }
            );
        } catch {
            this._sleepSignalId = 0;
        }

        for (const key of [
            'birth-date',
            'life-expectancy-years',
            'display-unit',
            'font-preset',
            'bar-font-size',
            'accent-theme',
            'language',
            'reminder-text',
            'milestone-enabled',
            'milestone-title',
            'milestone-deadline',
            'milestone-start-ms',
            'cycle-enabled',
            'cycle-scope',
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

    _isShellLightMode() {
        try {
            const bg = Main.panel.statusArea.quickSettings?.menu?.box
                ?.get_theme_node()
                ?.get_background_color();
            if (!bg || bg.alpha === 0)
                return false;
            const lum = (0.299 * bg.red + 0.587 * bg.green + 0.114 * bg.blue) / 255;
            return lum > 0.5;
        } catch {
            return false;
        }
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
        const fontSize = this._settings.get_int('bar-font-size');
        const accentTheme = this._settings.get_string('accent-theme');
        const prefLang = this._settings.get_string('language');
        const lang = resolveLanguage(prefLang, GLib.get_language_names());
        const reminderText = this._settings.get_string('reminder-text');
        const isLight = this._isShellLightMode();

        const milestoneEnabled = this._settings.get_boolean('milestone-enabled');
        const milestoneTitle = this._settings.get_string('milestone-title');
        const milestoneDeadline = this._settings.get_string('milestone-deadline');
        const milestoneStartMs = this._settings.get_int64('milestone-start-ms');

        const cycleEnabled = this._settings.get_boolean('cycle-enabled');
        const cycleScope = this._settings.get_string('cycle-scope');

        const lifeStats = computeLifeStats(birthDate, expectancyYears, nowMs);
        const milestoneStats = milestoneEnabled
            ? computeMilestoneStats(milestoneTitle, milestoneStartMs, milestoneDeadline, nowMs)
            : null;
        const cycleStats = cycleEnabled
            ? computeCycleStats(cycleScope, nowMs)
            : null;

        this._indicator.updateView({
            lifeStats,
            milestoneStats,
            cycleStats,
            unit,
            expectancyYears,
            reminderText,
            lang,
            fontPreset,
            fontSize,
            accentTheme,
            nowMs,
            isLight,
        });

        const popoverOpen = this._indicator.isPopoverOpen;
        if (!lifeStats && !milestoneStats && !cycleStats && !popoverOpen)
            return;

        const delaySec = computeNextDelaySeconds(
            unit,
            nowMs,
            popoverOpen,
            this._isPaused(),
            milestoneStats ? milestoneStats.targetMs : null
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

        if (this._sleepSignalId) {
            Gio.DBus.system.signal_unsubscribe(this._sleepSignalId);
            this._sleepSignalId = 0;
        }

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
