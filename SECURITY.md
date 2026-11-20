# Security Policy

## Scope & Architecture Guarantees

`finite` runs inside the GNOME Shell process (`session-modes: ["user"]`) and adheres to strict minimalism:

- **No network access:** Zero HTTP/Socket/D-Bus network calls.
- **No subprocess execution:** Zero `GLib.spawn_*` or `Gio.Subprocess` calls; zero `eval()` / `Function()`.
- **No markup injection:** All user-configured strings (`reminder-text`, `birth-date`) are rendered strictly as plain `.text` (never `use_markup`).
- **Bounded inputs:** `life-expectancy-years` is clamped to `[1, 150]` in both `GSettings` and runtime code to prevent unbounded Cairo surface allocations; `reminder-text` is truncated to 200 characters.
- **Lock-screen privacy:** `session-modes` omits `unlock-dialog`, so GNOME Shell automatically disables the extension while the screen is locked.

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories on this repository rather than opening a public issue.
