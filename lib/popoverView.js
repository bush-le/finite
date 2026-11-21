import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {
    VALID_UNITS,
    clampExpectancyYears,
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
    unitCaptionLabel,
    unitShortLabel,
} from './i18n.js';

export class FinitePopoverView {
    constructor({ onSelectUnit, onOpenPrefs }) {
        this._onSelectUnit = onSelectUnit;
        this._onOpenPrefs = onOpenPrefs;
        this._cache = new GridSurfaceCache();
        this._lastStats = null;
        this._lastGeom = computeGridGeometry(80);
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
        this._elapsedBadge = new St.Label({
            text: '',
            style_class: 'finite-elapsed-badge',
            y_align: Clutter.ActorAlign.CENTER,
        });
        header.add_child(titleLabel);
        header.add_child(this._elapsedBadge);
        this._box.add_child(header);

        const heroBox = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-hero-box',
        });
        this._heroNumberLabel = new St.Label({
            text: '--',
            style_class: 'finite-hero-count',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._heroCaptionLabel = new St.Label({
            text: '',
            style_class: 'finite-hero-caption',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._progressTrack = new St.Widget({
            style_class: 'finite-progress-track',
            width: this._lastGeom.width + 20,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._progressFill = new St.Widget({
            style_class: 'finite-progress-fill',
            width: 0,
            height: 4,
        });
        this._progressTrack.add_child(this._progressFill);

        heroBox.add_child(this._heroNumberLabel);
        heroBox.add_child(this._heroCaptionLabel);
        heroBox.add_child(this._progressTrack);
        this._box.add_child(heroBox);

        const gridCard = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-grid-card',
            x_align: Clutter.ActorAlign.CENTER,
        });

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
        gridCard.add_child(this._drawingArea);

        const legendRow = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-legend-row',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._livedLegend = this._createLegendChip('finite-dot-lived', 'Lived');
        this._nowLegend = this._createLegendChip('finite-dot-now', 'Now');
        this._leftLegend = this._createLegendChip('finite-dot-left', 'Left');
        legendRow.add_child(this._livedLegend.box);
        legendRow.add_child(this._nowLegend.box);
        legendRow.add_child(this._leftLegend.box);
        gridCard.add_child(legendRow);

        this._box.add_child(gridCard);

        const unitRow = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-unit-segment',
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

        const footer = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-footer-row',
        });
        this._reminderLabel = new St.Label({
            text: '',
            style_class: 'finite-reminder',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._reminderLabel.clutter_text.line_wrap = true;

        this._prefsBtn = new St.Button({
            label: t('settingsButton', 'en'),
            style_class: 'finite-prefs-btn',
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._signals.push([
            this._prefsBtn,
            this._prefsBtn.connect('clicked', () => this._onOpenPrefs?.()),
        ]);

        footer.add_child(this._reminderLabel);
        footer.add_child(this._prefsBtn);
        this._box.add_child(footer);
    }

    _createLegendChip(dotClass, initialText) {
        const box = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-legend-chip',
        });
        const dot = new St.Widget({
            style_class: `finite-legend-dot ${dotClass}`,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const label = new St.Label({
            text: initialText,
            style_class: 'finite-legend-text',
            y_align: Clutter.ActorAlign.CENTER,
        });
        box.add_child(dot);
        box.add_child(label);
        return { box, label };
    }

    get actor() {
        return this._box;
    }

    _formatHeroNumber(stats, unit) {
        if (!stats)
            return '--';
        switch (unit) {
        case 'seconds':
            return stats.remainingSeconds.toLocaleString('en-US');
        case 'minutes':
            return stats.remainingMinutes.toLocaleString('en-US');
        case 'hours':
            return stats.remainingHours.toLocaleString('en-US');
        case 'days':
            return stats.remainingDays.toLocaleString('en-US');
        case 'weeks':
            return stats.remainingWeeks.toLocaleString('en-US');
        case 'percent':
            return `${stats.percentRemaining.toFixed(2)}%`;
        }
        return stats.remainingWeeks.toLocaleString('en-US');
    }

    update(stats, activeUnit, expectancyYears, reminderText, lang = 'en') {
        const safeUnit = normalizeUnit(activeUnit);
        const geom = computeGridGeometry(clampExpectancyYears(expectancyYears));

        if (geom.width !== this._lastGeom.width || geom.height !== this._lastGeom.height) {
            this._drawingArea.set_size(geom.width, geom.height);
            this._lastGeom = geom;
        }

        this._lastStats = stats;

        if (stats) {
            const currentYear = Math.min(geom.rows, Math.floor(stats.livedWeeks / 52) + 1);
            this._elapsedBadge.text = `${t('yearPrefix', lang)} ${currentYear}/${geom.rows} · ${stats.percentElapsed.toFixed(1)}${t('elapsedSuffix', lang)}`;
            this._heroNumberLabel.text = this._formatHeroNumber(stats, safeUnit);
            this._heroCaptionLabel.text = unitCaptionLabel(safeUnit, lang).toUpperCase();

            const trackWidth = geom.width + 20;
            this._progressTrack.set_width(trackWidth);
            const fillWidth = Math.max(2, Math.round((stats.percentElapsed / 100) * trackWidth));
            this._progressFill.set_size(fillWidth, 4);

            this._livedLegend.label.text = `${t('legendLived', lang)} (${stats.livedWeeks.toLocaleString('en-US')})`;
            this._nowLegend.label.text = t('legendNow', lang);
            this._leftLegend.label.text = `${t('legendLeft', lang)} (${Math.max(0, stats.totalWeeks - stats.livedWeeks).toLocaleString('en-US')})`;

            this._summaryLabel.text = formatSummaryRow(stats, lang);
        } else {
            this._elapsedBadge.text = t('noBirthDateHint', lang);
            this._heroNumberLabel.text = '--';
            this._heroCaptionLabel.text = t('noBirthDateHero', lang).toUpperCase();
            this._progressFill.set_size(0, 4);
            this._livedLegend.label.text = t('legendLived', lang);
            this._nowLegend.label.text = t('legendNow', lang);
            this._leftLegend.label.text = t('legendLeft', lang);
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

        const nextKey = computeGridCacheKey(stats, geom);
        if (nextKey !== this._lastGridKey) {
            this._lastGridKey = nextKey;
            this._drawingArea.queue_repaint();
        }
    }

    _onRepaint(area) {
        const cr = area.get_context();
        try {
            const surface = this._cache.getOrRender(this._lastStats, this._lastGeom);
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
