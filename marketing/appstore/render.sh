#!/usr/bin/env bash
# Renders every slide to png/ at App Store size (1290×2796, iPhone 6.7"/6.9").
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p png
mkdir -p png/upload
for f in [0-9][0-9]-*.html; do
  out="png/${f%.html}.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1290,2796 \
    --virtual-time-budget=12000 --screenshot="$out" "file://$PWD/$f" 2>/dev/null
  # App Store Connect upload size (6.5" display): 1284×2778
  up="png/upload/$(basename "$out")"
  sips --resampleWidth 1284 "$out" --out "$up" >/dev/null
  sips --cropToHeightWidth 2778 1284 "$up" >/dev/null
  echo "rendered $out (+ upload/ at 1284x2778)"
done

# iPad 13" (2064×2752): same slide bodies regenerated against ipad.css.
mkdir -p ipad png/ipad
for f in [0-9][0-9]-*.html; do
  sed -e 's|href="shared.css"|href="../shared.css"><link rel="stylesheet" href="../ipad.css"|' \
      -e "s|url('assets/|url('../assets/|g" "$f" > "ipad/$f"
  out="png/ipad/${f%.html}.png"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=2064,2752 \
    --virtual-time-budget=12000 --screenshot="$out" "file://$PWD/ipad/$f" 2>/dev/null
  echo "rendered $out (iPad 2064x2752)"
done

# Apple Watch (410×502): pure-UI screens. Headless Chrome clips paint at small
# window heights, so render with vertical slack and top-crop with ffmpeg.
mkdir -p png/watch
for f in watch/w[0-9]-*.html; do
  name="$(basename "${f%.html}")"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=410,640 \
    --virtual-time-budget=10000 --screenshot="/tmp/$name-raw.png" "file://$PWD/$f" 2>/dev/null
  ffmpeg -y -loglevel error -i "/tmp/$name-raw.png" -vf "crop=410:502:0:0" "png/watch/$name.png"
  echo "rendered png/watch/$name.png (watch 410x502)"
done
