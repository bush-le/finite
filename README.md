# Finite

Minimalist Memento Mori countdown for the GNOME top bar (GNOME Shell 45–50).

## Features

- **Ultra-minimal top bar:** Displays a single plain number (`tabular-nums`) with no icon, no unit suffix, and no thousands separator.
- **Flexible units:** Switch between `seconds`, `minutes`, `hours`, `days`, `weeks`, and `percent` directly from the popover or Preferences.
- **Life in Weeks popover:** Click the number to view a cached Cairo `52 × N` life-week grid, live countdown, quick conversions, and a short plain-text reminder.
- **Zero-Idle-Wakeup design:** Adaptive timer cadence (daily for `days`/`weeks`/`percent`, hourly for `hours`, per-minute for `minutes`, 1s only when `seconds` is active or popover is open), paused when unmapped or fullscreen, and disabled automatically on the lock screen (`session-modes: ["user"]`).

## Privacy & Security

- **Offline-by-Design:** 0 network requests, 0 subprocesses, 0 telemetry, 0 file I/O outside local `GSettings`.
- See [SECURITY.md](SECURITY.md) for threat model and reporting.

## Installation & Testing

```bash
make test
make install
gnome-extensions enable finite@bush-le.github.io
```

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
