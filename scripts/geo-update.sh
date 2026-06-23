#!/usr/bin/env bash
# Download the latest DB-IP City Lite MMDB directly from db-ip.com.
#
# Free, no signup, CC BY 4.0 license — https://db-ip.com/
# Files are published monthly around the 1st of each month at:
#   https://download.db-ip.com/free/dbip-city-lite-YYYY-MM.mmdb.gz
#
# Run on the server once to install, and add to cron for monthly updates.
set -euo pipefail

DEST_DIR="${GEOIP_DIR:-/var/lib/push-panel}"
DEST="${DEST_DIR}/dbip-city-lite.mmdb"
TMP="${DEST}.tmp.$$"

mkdir -p "$DEST_DIR"

# Try current month first, then fall back to previous month in case this
# month's release hasn't been published yet (db-ip publishes around the 1st).
MONTHS=("$(date +%Y-%m)" "$(date -d 'last month' +%Y-%m)")

downloaded=0
for M in "${MONTHS[@]}"; do
  URL="https://download.db-ip.com/free/dbip-city-lite-${M}.mmdb.gz"
  echo "[geo-update] trying $URL"
  if curl -fsSL --retry 3 -A "Mozilla/5.0 push-panel" "$URL" -o "${TMP}.gz"; then
    echo "[geo-update] downloaded ${M} release"
    downloaded=1
    break
  fi
done

if [ "$downloaded" -ne 1 ]; then
  echo "[geo-update] ERROR: could not download from any month" >&2
  rm -f "${TMP}.gz"
  exit 1
fi

gunzip -f "${TMP}.gz"            # produces $TMP
mv "$TMP" "$DEST"

SIZE_MB=$(( $(stat -c%s "$DEST") / 1024 / 1024 ))
echo "[geo-update] installed $DEST (${SIZE_MB} MB)"

# Reload the app so it picks up the new file.
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart push-panel >/dev/null 2>&1 || true
  echo "[geo-update] restarted push-panel"
fi
