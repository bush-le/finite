#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

for required in LICENSE README.md SECURITY.md metadata.json schemas/org.gnome.shell.extensions.finite.gschema.xml; do
  if [[ ! -f "$required" ]]; then
    echo "FAIL: Missing required file: $required" >&2
    exit 1
  fi
done

glib-compile-schemas --strict schemas/

python3 - <<'PY'
import json
with open("metadata.json", "r", encoding="utf-8") as fh:
    meta = json.load(fh)
assert meta["uuid"] == "finite@bush-le.github.io", f"Unexpected uuid: {meta.get('uuid')}"
modes = meta.get("session-modes", [])
assert modes == ["user"], f"session-modes must be ['user'], got {modes}"
PY

if grep -rnE "eval\(|new Function|Gio\.Subprocess|spawn_command_line|gi://Soup|use_markup|/home/" \
  extension.js prefs.js lib/ metadata.json schemas/ 2>/dev/null; then
  echo "FAIL: Forbidden insecure pattern or local path found" >&2
  exit 1
fi

gjs -m tests/test_timeMath.js
gjs -m tests/test_gridRenderer.js
gjs -m tests/test_i18n.js

if grep -q "font-variant-numeric" stylesheet.css; then
  echo "FAIL: St CSS ignores font-variant-numeric; use font-feature-settings: \"tnum\"" >&2
  exit 1
fi
if ! grep -q 'font-feature-settings: "tnum"' stylesheet.css; then
  echo "FAIL: stylesheet.css must use font-feature-settings: \"tnum\"" >&2
  exit 1
fi
if ! grep -q "St.ScrollView" lib/popoverView.js; then
  echo "FAIL: lib/popoverView.js must wrap the life grid in St.ScrollView" >&2
  exit 1
fi
if ! grep -q "this._ensurePopover()" extension.js; then
  echo "FAIL: extension.js must initialize menu item up front so PopupMenu is never empty" >&2
  exit 1
fi

BUNDLE="finite@bush-le.github.io.shell-extension.zip"
rm -f "$BUNDLE"
gnome-extensions pack --force --extra-source=lib --schema=schemas/org.gnome.shell.extensions.finite.gschema.xml .
if [[ ! -s "$BUNDLE" ]]; then
  echo "FAIL: Missing or empty extension bundle $BUNDLE" >&2
  exit 1
fi
rm -f "$BUNDLE"

echo "SMOKE_ALL_OK"
