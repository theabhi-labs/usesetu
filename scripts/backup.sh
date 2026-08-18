#!/usr/bin/env bash
set -euo pipefail

# Usage: MONGO_URI=mongodb://localhost:27017/csc-os ./scripts/backup.sh
# Cron example (daily at 2 AM, keep 14 days):
#   0 2 * * * MONGO_URI=... RETENTION_DAYS=14 /opt/csc-os/scripts/backup.sh

MONGO_URI="${MONGO_URI:?Set MONGO_URI before running this script}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$DEST"

echo "Backing up $MONGO_URI -> $DEST ..."
mongodump --uri="$MONGO_URI" --out="$DEST" --gzip

echo "Backup complete: $DEST"

# Retention cleanup — delete backup folders older than RETENTION_DAYS.
echo "Pruning backups older than $RETENTION_DAYS days ..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} \;

echo "Done."
