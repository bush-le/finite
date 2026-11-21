import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import St from 'gi://St';

import {
    VALID_ACCENTS,
    VALID_UNITS,
    clampExpectancyYears,
    computeDayAndYearProgress,
    computeYearDaysStats,
    normalizeAccentTheme,
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
        this._lastYearStats = computeYearDaysStats(Date.now());
        this._lastGeom = computeGridGeometry(80, this._lastYearStats);
        this._lastGridKey = null;
        this._lastTheme = 'amber';
        this._lastLang = 'en';
        this._lastIsLight = false;
        this._signals = [];

        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-popover-box finite-theme-amber',
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
        this._elapsedBadge.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
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
        this._heroNumberLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        this._heroCaptionLabel = new St.Label({
            text: '',
            style_class: 'finite-hero-caption',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._heroCaptionLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        heroBox.add_child(this._heroNumberLabel);
        heroBox.add_child(this._heroCaptionLabel);
        this._box.add_child(heroBox);

        const barsRow = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-mini-bars-row',
        });
        this._todayBar = this._createMiniBar('Today');
        this._yearBar = this._createMiniBar('Year');
        this._lifeBar = this._createMiniBar('Life');
        barsRow.add_child(this._todayBar.box);
        barsRow.add_child(this._yearBar.box);
        barsRow.add_child(this._lifeBar.box);
        this._box.add_child(barsRow);

        const gridCard = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-grid-card',
            x_align: Clutter.ActorAlign.CENTER,
        });

        this._drawingArea = new St.DrawingArea({
            style_class: 'finite-grid-area',
            style: `width: ${this._lastGeom.width}px; height: ${this._lastGeom.height}px;`,
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
        this._livedLegend = this._createLegendChip('finite-dot-lived', 'Past');
        this._nowLegend = this._createLegendChip('finite-dot-now', 'Today');
        this._leftLegend = this._createLegendChip('finite-dot-left', 'Left');
        legendRow.add_child(this._livedLegend.box);
        legendRow.add_child(this._nowLegend.box);
        legendRow.add_child(this._leftLegend.box);
        gridCard.add_child(legendRow);

        this._box.add_child(gridCard);

        const controlsRow = new St.BoxLayout({
            vertical: false,
            style_class: 'finite-controls-row',
        });

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

        this._summaryLabel = new St.Label({
            text: '',
            style_class: 'finite-summary-row',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._summaryLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        controlsRow.add_child(unitRow);
        controlsRow.add_child(this._summaryLabel);
        this._box.add_child(controlsRow);

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
        this._reminderLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
        this._reminderLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        this._footerSpacer = new St.Widget({
            x_expand: true,
            visible: false,
        });

        this._prefsBtn = new St.Button({
            label: t('settingsButton', 'en'),
            style_class: 'finite-prefs-btn',
            can_focus: true,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._signals.push([
            this._prefsBtn,
            this._prefsBtn.connect('clicked', () => this._onOpenPrefs?.()),
        ]);

        footer.add_child(this._reminderLabel);
        footer.add_child(this._footerSpacer);
        footer.add_child(this._prefsBtn);
        this._box.add_child(footer);
    }

    _createMiniBar(initialLabel) {
        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'finite-mini-bar-card',
            x_expand: true,
        });
        const top = new St.BoxLayout({
            vertical: false,
        });
        const nameLabel = new St.Label({
            text: initialLabel,
            style_class: 'finite-mini-bar-name',
            x_expand: true,
        });
        const pctLabel = new St.Label({
            text: '0%',
            style_class: 'finite-mini-bar-pct',
        });
        top.add_child(nameLabel);
        top.add_child(pctLabel);

        const track = new St.Widget({
            style_class: 'finite-progress-track',
            style: 'width: 164px; height: 4px;',
        });
        const fill = new St.Widget({
            style_class: 'finite-progress-fill',
            style: 'width: 0px; height: 4px;',
            visible: false,
        });
        track.add_child(fill);

        box.add_child(top);
        box.add_child(track);
        return { box, nameLabel, pctLabel, fill, trackWidth: 164 };
    }

    _updateMiniBar(bar, label, pct) {
        bar.nameLabel.text = label;
        const clamped = Math.min(100, Math.max(0, pct));
        bar.pctLabel.text = `${clamped.toFixed(0)}%`;
        if (clamped <= 0) {
            bar.fill.visible = false;
            bar.fill.style = 'width: 0px; height: 4px;';
            return;
        }
        const fillWidth = Math.max(2, Math.round((clamped / 100) * bar.trackWidth));
        bar.fill.visible = true;
        bar.fill.style = `width: ${fillWidth}px; height: 4px;`;
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
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        box.add_child(dot);
        box.add_child(label);
        return { box, label };
    }

    get actor() {
        return this._box;
    }

    _applyAccentTheme(accentTheme, isLight) {
        const safeTheme = normalizeAccentTheme(accentTheme);
        if (this._lastTheme !== safeTheme) {
            for (const theme of VALID_ACCENTS)
                this._box.remove_style_class_name(`finite-theme-${theme}`);
            this._box.add_style_class_name(`finite-theme-${safeTheme}`);
            this._lastTheme = safeTheme;
        }
        if (this._lastIsLight !== isLight) {
            if (isLight)
                this._box.add_style_class_name('finite-mode-light');
            else
                this._box.remove_style_class_name('finite-mode-light');
            this._lastIsLight = isLight;
        }
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

    update(stats, activeUnit, expectancyYears, reminderText, lang = 'en', accentTheme = 'amber', nowMs = Date.now(), isLight = false) {
        const safeUnit = normalizeUnit(activeUnit);
        const safeTheme = normalizeAccentTheme(accentTheme);
        const yearStats = computeYearDaysStats(nowMs);
        const geom = computeGridGeometry(clampExpectancyYears(expectancyYears), yearStats);

        this._applyAccentTheme(safeTheme, isLight);
        this._lastLang = lang;

        if (geom.width !== this._lastGeom.width || geom.height !== this._lastGeom.height)
            this._drawingArea.style = `width: ${geom.width}px; height: ${geom.height}px;`;
        this._lastGeom = geom;

        this._lastStats = stats;
        this._lastYearStats = yearStats;

        const dy = computeDayAndYearProgress(nowMs);
        this._updateMiniBar(this._todayBar, t('todayLabel', lang), dy.todayElapsedPct);
        this._updateMiniBar(this._yearBar, String(dy.year), dy.yearElapsedPct);

        const dayUnit = lang === 'vi' ? 'n' : 'd';
        this._livedLegend.label.text = `${t('legendLived', lang)} (${yearStats.todayIndex}${dayUnit})`;
        this._nowLegend.label.text = `${t('legendNow', lang)} (${yearStats.year})`;
        this._leftLegend.label.text = `${t('legendLeft', lang)} (${yearStats.daysLeft}${dayUnit})`;

        if (stats) {
            const currentYear = Math.min(geom.years, stats.livedYears + 1);
            this._elapsedBadge.text = `${t('yearPrefix', lang)} ${currentYear}/${geom.years} · ${stats.percentElapsed.toFixed(1)}${t('elapsedSuffix', lang)}`;
            this._heroNumberLabel.text = this._formatHeroNumber(stats, safeUnit);
            this._heroCaptionLabel.text = unitCaptionLabel(safeUnit, lang).toUpperCase();

            this._updateMiniBar(this._lifeBar, t('lifeLabel', lang), stats.percentElapsed);
            this._summaryLabel.text = formatSummaryRow(stats, lang);
        } else {
            this._elapsedBadge.text = t('noBirthDateHint', lang);
            this._heroNumberLabel.text = '--';
            this._heroCaptionLabel.text = t('noBirthDateHero', lang).toUpperCase();
            this._updateMiniBar(this._lifeBar, t('lifeLabel', lang), 0);
            this._summaryLabel.text = '';
        }

        const safeReminder = sanitizeReminderText(reminderText);
        this._reminderLabel.text = safeReminder;
        const hasReminder = safeReminder.length > 0;
        this._reminderLabel.visible = hasReminder;
        this._footerSpacer.visible = !hasReminder;
        this._prefsBtn.label = t('settingsButton', lang);

        for (const [unit, btn] of this._unitButtons.entries()) {
            btn.label = unitShortLabel(unit, lang);
            if (unit === safeUnit)
                btn.add_style_class_name('finite-unit-pill-active');
            else
                btn.remove_style_class_name('finite-unit-pill-active');
        }

        const nextKey = computeGridCacheKey(stats, yearStats, geom, safeTheme, lang, isLight, 1);
        if (nextKey !== this._lastGridKey) {
            this._lastGridKey = nextKey;
            this._drawingArea.queue_repaint();
        }
    }

    _onRepaint(area) {
        const cr = area.get_context();
        try {
            const resourceScale = area.get_resource_scale?.() ?? 1;
            const surface = this._cache.getOrRender(
                this._lastStats,
                this._lastYearStats,
                this._lastGeom,
                this._lastTheme || 'amber',
                this._lastLang || 'en',
                this._lastIsLight,
                resourceScale
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
        this._footerSpacer = null;
        this._lastStats = null;
        this._lastYearStats = null;
        this._onSelectUnit = null;
        this._onOpenPrefs = null;
    }
}
