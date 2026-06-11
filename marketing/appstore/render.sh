#!/usr/bin/env bash
# Renders every slide to png/ at App Store size (1290×2796, iPhone 6.7"/6.9").
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p png
for f in [0-9][0-9]-*.html; do
  out="png/${f%.html}.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1290,2796 \
    --virtual-time-budget=12000 --screenshot="$out" "file://$PWD/$f" 2>/dev/null
  echo "rendered $out"
done
