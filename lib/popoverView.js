import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {
    VALID_UNITS,
    clampExpectancyYears,
    formatPopoverHero,
    normalizeUnit,
    sanitizeReminderText,
} from './timeMath.js';
import {
    GridSurfaceCache,
    computeGridCacheKey,
    computeGridGeometry,
} from './gridRenderer.js';
import {
    formatSummaryRow,
    t,
    unitShortLabel,
} from './i18n.js';

export class FinitePopoverView {
    constructor({ onSelectUnit, onOpenPrefs }) {
        this._onSelectUnit = onSelectUnit;
        this._onOpenPrefs = onOpenPrefs;
        this._cache = new GridSurfaceCache();
        this._lastStats = null;
        this._lastGeom = computeGridGeometry(80, 4, 2);
        this._lastGridKey = null;
        this._signals = [];

        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-popover-box',
        });

        const header = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-popover-header',
        });
        const titleLabel = new St.Label({
            text: 'Finite',
            style_class: 'finite-title',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._elapsedLabel = new St.Label({
            text: '',
            style_class: 'finite-subtitle',
            y_align: Clutter.ActorAlign.CENTER,
        });
        header.add_child(titleLabel);
        header.add_child(this._elapsedLabel);
        this._box.add_child(header);

        this._heroLabel = new St.Label({
            text: '--',
            style_class: 'finite-hero-count',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_child(this._heroLabel);

        this._drawingArea = new St.DrawingArea({
            style_class: 'finite-grid-area',
            width: this._lastGeom.width,
            height: this._lastGeom.height,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._signals.push([
            this._drawingArea,
            this._drawingArea.connect('repaint', area => this._onRepaint(area)),
        ]);

        const gridBox = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        gridBox.add_child(this._drawingArea);

        const gridScroll = new St.ScrollView({
            style_class: 'finite-grid-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            x_align: Clutter.ActorAlign.CENTER,
        });
        gridScroll.set_child(gridBox);
        this._box.add_child(gridScroll);

        const unitRow = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-unit-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._unitButtons = new Map();
        for (const unit of VALID_UNITS) {
            const btn = new St.Button({
                label: unitShortLabel(unit, 'en'),
                style_class: 'finite-unit-pill',
                can_focus: true,
            });
            this._signals.push([
                btn,
                btn.connect('clicked', () => this._onSelectUnit?.(unit)),
            ]);
            this._unitButtons.set(unit, btn);
            unitRow.add_child(btn);
        }
        this._box.add_child(unitRow);

        this._summaryLabel = new St.Label({
            text: '',
            style_class: 'finite-summary-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._box.add_child(this._summaryLabel);

        this._reminderLabel = new St.Label({
            text: '',
            style_class: 'finite-reminder',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._reminderLabel.clutter_text.line_wrap = true;
        this._box.add_child(this._reminderLabel);

        this._prefsBtn = new St.Button({
            label: t('settingsButton', 'en'),
            style_class: 'finite-prefs-btn',
            can_focus: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._signals.push([
            this._prefsBtn,
            this._prefsBtn.connect('clicked', () => this._onOpenPrefs?.()),
        ]);
        this._box.add_child(this._prefsBtn);
    }

    get actor() {
        return this._box;
    }

    update(stats, activeUnit, expectancyYears, reminderText, lang = 'en') {
        const safeUnit = normalizeUnit(activeUnit);
        const geom = computeGridGeometry(clampExpectancyYears(expectancyYears), 4, 2);

        if (geom.width !== this._lastGeom.width || geom.height !== this._lastGeom.height) {
            this._drawingArea.set_size(geom.width, geom.height);
            this._lastGeom = geom;
        }

        this._lastStats = stats;
        this._heroLabel.text = formatPopoverHero(stats, safeUnit, lang);

        if (stats) {
            this._elapsedLabel.text = `${stats.percentElapsed.toFixed(1)}${t('elapsedSuffix', lang)}`;
            this._summaryLabel.text = formatSummaryRow(stats, lang);
        } else {
            this._elapsedLabel.text = t('noBirthDateHint', lang);
            this._summaryLabel.text = '';
        }

        const safeReminder = sanitizeReminderText(reminderText);
        this._reminderLabel.text = safeReminder;
        this._reminderLabel.visible = safeReminder.length > 0;
        this._prefsBtn.label = t('settingsButton', lang);

        for (const [unit, btn] of this._unitButtons.entries()) {
            btn.label = unitShortLabel(unit, lang);
            if (unit === safeUnit)
                btn.add_style_class_name('finite-unit-pill-active');
            else
                btn.remove_style_class_name('finite-unit-pill-active');
        }

        const nextKey = computeGridCacheKey(stats, geom.width, geom.height);
        if (nextKey !== this._lastGridKey) {
            this._lastGridKey = nextKey;
            this._drawingArea.queue_repaint();
        }
    }

    _onRepaint(area) {
        const cr = area.get_context();
        try {
            const [width, height] = area.get_surface_size();
            const surface = this._cache.getOrRender(
                this._lastStats,
                width,
                height,
                this._lastGeom.cellSize,
                this._lastGeom.gap
            );
            cr.setSourceSurface(surface, 0, 0);
            cr.paint();
        } finally {
            cr.$dispose();
        }
    }

    destroy() {
        for (const [obj, id] of this._signals) {
            if (obj && id)
                obj.disconnect(id);
        }
        this._signals = [];
        this._cache.dispose();
        this._unitButtons.clear();
        this._box = null;
        this._drawingArea = null;
        this._prefsBtn = null;
        this._lastStats = null;
        this._onSelectUnit = null;
        this._onOpenPrefs = null;
    }
}
