#!/usr/bin/env bash
# Nightly SQLite backup for push-panel.
# Uses sqlite3's .backup so it's safe to run while the app is live (WAL mode).
#
# Setup:
#   sudo apt install -y sqlite3
#   chmod +x scripts/backup.sh
#   crontab -e   →   0 3 * * * /var/www/push-panel/scripts/backup.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${APP_DIR}/data/push-panel.db"
BACKUP_DIR="${APP_DIR}/backups"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/push-panel-${STAMP}.db"

sqlite3 "$DB" ".backup '${OUT}'"
gzip "$OUT"

# Prune backups older than KEEP_DAYS.
find "$BACKUP_DIR" -name 'push-panel-*.db.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backed up to ${OUT}.gz"
