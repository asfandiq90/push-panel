#!/usr/bin/env bash
# Download the latest DB-IP City Lite MMDB (auto-updated monthly via jsDelivr CDN).
#
# Free, no signup, CC BY 4.0 license — see https://db-ip.com/
# Mirror: https://github.com/wp-statistics/DbIP-City-lite
#
# Run on the server once to install, and add to cron for monthly updates.
set -euo pipefail

DEST_DIR="${GEOIP_DIR:-/var/lib/push-panel}"
DEST="${DEST_DIR}/dbip-city-lite.mmdb"
TMP="${DEST}.tmp.$$"
URL="https://cdn.jsdelivr.net/gh/wp-statistics/DbIP-City-lite@master/dbip-city-lite.mmdb.gz"

mkdir -p "$DEST_DIR"

echo "[geo-update] downloading $URL"
curl -fsSL --retry 3 "$URL" -o "${TMP}.gz"
gunzip -f "${TMP}.gz"            # produces $TMP
mv "$TMP" "$DEST"

SIZE_MB=$(( $(stat -c%s "$DEST") / 1024 / 1024 ))
echo "[geo-update] installed $DEST (${SIZE_MB} MB)"

# Reload the app so it picks up the new file. PM2 is preferred; fall back
# silently if not present (e.g. running from a one-shot installer).
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart push-panel >/dev/null 2>&1 || true
  echo "[geo-update] restarted push-panel"
fi
