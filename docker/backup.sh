#!/bin/sh
set -eu
umask 077

interval="${BACKUP_INTERVAL_SECONDS:-86400}"
retention="${BACKUP_RETENTION_DAYS:-7}"
case "$interval" in ''|*[!0-9]*|0) echo 'Invalid backup interval' >&2; exit 1 ;; esac
case "$retention" in ''|*[!0-9]*|0) echo 'Invalid backup retention' >&2; exit 1 ;; esac

mkdir -p /backups
trap 'exit 0' INT TERM

while :; do
  stamp=$(date -u +%Y-%m-%dT%H-%M-%SZ)
  dump="/backups/database-${stamp}.dump"
  if pg_dump --format=custom --no-owner --no-acl --file="${dump}.partial" &&
    pg_restore --list "${dump}.partial" >/dev/null; then
    mv "${dump}.partial" "$dump"
    echo "Created $dump"
    # Retention applies only to completed archives after a successful backup.
    find /backups -type f -name 'database-*.dump' -mtime "+${retention}" -delete
  else
    rm -f "${dump}.partial"
    echo 'Database backup failed' >&2
    exit 1
  fi
  sleep "$interval" &
  wait $! || true
done
