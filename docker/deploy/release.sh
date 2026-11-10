#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Run only on the Linux VPS. The repository checkout is an immutable release bundle.
root=${TEAMWORK_DEPLOY_ROOT:-/opt/teamwork}
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
image=${1:?Expected runtime image digest}
migrations=${2:?Expected migration image digest}
mode=${3:-deploy}
[[ $image =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
[[ $migrations =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
[[ $mode == deploy || $mode == rollback ]]
test -f "$root/.env.docker"
mkdir -p "$root/.deploy/caddy" "$root/.deploy/public/assets"
exec 9>"$root/.deploy/release.lock"
flock -w 600 9
if [[ ! -f $root/.deploy/backup.sh ]]; then
  cp "$bundle/docker/backup.sh" "$root/.deploy/backup.sh"
fi

export BLUE_IMAGE=$image GREEN_IMAGE=$image MIGRATION_IMAGE=$migrations
compose=(docker compose --profile release --project-name teamwork --project-directory "$root"
  --env-file "$root/.env.docker" -f "$bundle/compose.yaml" -f "$bundle/compose.vps.yaml")
dc() { "${compose[@]}" "$@"; }
config="$root/.deploy/caddy/Caddyfile"
active=
if [[ -f $config ]]; then
  active=$(sed -n 's/^# slot=\(blue\|green\)$/\1/p' "$config")
  [[ $active == blue || $active == green ]]
fi
target=blue
[[ $active != blue ]] || target=green

dc config --quiet
if [[ -n $active ]]; then
  active_id=$(dc ps -q "$active")
  test -n "$active_id"
  [[ $(docker inspect -f '{{.State.Health.Status}}' "$active_id") == healthy ]]
  # Preserve the active image in the Compose model. Never recreate this service.
  active_image=$(docker inspect -f '{{.Config.Image}}' "$active_id")
  if [[ $active == blue ]]; then export BLUE_IMAGE=$active_image; else export GREEN_IMAGE=$active_image; fi
  test -n "$(dc ps -q edge)"
  # Reconcile an interrupted prior reload to the last committed configuration.
  dc exec -T edge caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  # Give requests on the retired slot at least the proxy's five-minute drain window.
  if [[ -n $(dc ps -aq "$target") ]]; then
    remaining=$((300 - $(date +%s) + $(stat -c %Y "$config")))
    # A pending file can indicate a switch interrupted before the atomic commit.
    if [[ -f $root/.deploy/caddy/Caddyfile.next ]]; then remaining=300; fi
    if (( remaining > 0 )); then sleep "$remaining"; fi
  fi
fi

docker pull "$image"
docker pull "$migrations"
if [[ $mode == deploy ]]; then
  dc up -d --no-recreate --wait --wait-timeout 120 db
  # Migrations must be additive and compatible with the active release.
  dc run --rm --no-deps migrate
fi

switched=false
committed=false
rollback() {
  local code=$?
  trap - EXIT INT TERM HUP
  if [[ $switched == true && $committed == false && -n $active ]]; then
    echo 'Release failed. Restoring the previous Caddy route.' >&2
    if ! dc exec -T edge caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
      echo 'CRITICAL: proxy rollback failed. Inspect the edge container immediately.' >&2
    fi
  fi
  # Leave both containers available for recovery; never stop the active release here.
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

dc up -d --no-deps --force-recreate --wait --wait-timeout 180 "$target"
candidate=$(dc ps -q "$target")
# Only immutable hashed assets are shared. HTML, service workers and private data are not.
docker cp "$candidate:/app/.output/public/assets/." "$root/.deploy/public/assets/"
chmod -R a+rX "$root/.deploy/public"

cat >"$root/.deploy/caddy/Caddyfile.next" <<EOF
# slot=$target
{\$APP_DOMAIN} {
  encode zstd gzip
  handle /assets/* {
    root * /srv/public
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
  }
  handle {
    reverse_proxy $target:3000 {
      flush_interval -1
      stream_close_delay 5m
    }
  }
}
EOF
chmod 644 "$root/.deploy/caddy/Caddyfile.next"

if [[ -n $active ]]; then
  dc exec -T edge caddy validate --config /etc/caddy/Caddyfile.next --adapter caddyfile
  switched=true
  dc exec -T edge caddy reload --config /etc/caddy/Caddyfile.next --adapter caddyfile
else
  # First installation has no existing traffic to preserve.
  cp "$root/.deploy/caddy/Caddyfile.next" "$config"
  dc up -d --no-deps edge
fi

# Exercise HTTPS, routing and database readiness through Caddy before committing.
dc exec -T edge sh -c 'wget -q -T 15 -O /dev/null "https://$APP_DOMAIN/api/health"' || {
  # The first certificate can take a little longer to provision.
  sleep 10
  dc exec -T edge sh -c 'wget -q -T 15 -O /dev/null "https://$APP_DOMAIN/api/health"'
}
mv "$root/.deploy/caddy/Caddyfile.next" "$config"
committed=true
trap - EXIT INT TERM HUP
dc --profile backups up -d --no-deps --no-recreate backup
echo "Release complete: $target serves $image"
echo 'The previous container is retained until the next release for draining and rollback.'
