#!/bin/sh
set -eu
umask 077

export TZ=Asia/Tbilisi
retention="${BACKUP_RETENTION_DAYS:-7}"
case "$retention" in ''|*[!0-9]*|0) echo 'Invalid backup retention' >&2; exit 1 ;; esac

mkdir -p /backups
trap 'exit 0' INT TERM

archive_path() {
  stamp=$(date -u -d "@$1" +%Y-%m-%dT%H-%M-%SZ)
  printf '/backups/database-%s.dump\n' "$stamp"
}

while :; do
  day=$(date +%F)
  scheduled=$(date -d "$day 05:00" +%s)
  dump=$(archive_path "$scheduled")
  # A completed archive identifies a scheduled run across container restarts.
  if [ -f "$dump" ]; then
    scheduled=$(date -d "$day 05:00 tomorrow" +%s)
    dump=$(archive_path "$scheduled")
  fi
  now=$(date +%s)
  if [ "$scheduled" -gt "$now" ]; then
    echo "Next database backup: $(date -d "@$scheduled" '+%F %T %Z (%z)')"
    sleep "$((scheduled - now))" &
    wait "$!"
  fi

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
done
