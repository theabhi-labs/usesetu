#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   MONGO_URI=mongodb://localhost:27017/csc-os ./scripts/restore.sh              # most recent backup
#   MONGO_URI=mongodb://localhost:27017/csc-os ./scripts/restore.sh 20260815_020000  # specific one

MONGO_URI="${MONGO_URI:?Set MONGO_URI before running this script}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  TARGET=$(ls -1 "$BACKUP_DIR" | sort -r | head -n 1)
  echo "No timestamp given — using most recent backup: $TARGET"
fi

SOURCE="$BACKUP_DIR/$TARGET"
if [ ! -d "$SOURCE" ]; then
  echo "Backup not found: $SOURCE" >&2
  exit 1
fi

# The dump directory contains one subfolder per database — find it rather
# than hardcoding the database name, since it's already encoded in MONGO_URI.
DB_DUMP_DIR=$(find "$SOURCE" -maxdepth 1 -mindepth 1 -type d | head -n 1)

echo "Restoring $DB_DUMP_DIR -> $MONGO_URI ..."
echo "WARNING: this will overwrite existing collections. Ctrl+C within 5s to abort."
sleep 5

mongorestore --uri="$MONGO_URI" --gzip --drop "$DB_DUMP_DIR"

echo "Restore complete."
