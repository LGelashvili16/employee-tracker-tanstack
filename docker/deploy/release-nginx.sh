#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

export TEAMWORK_DEPLOY_ROOT=${TEAMWORK_DEPLOY_ROOT:-/var/www/team-adwings}
root=$TEAMWORK_DEPLOY_ROOT
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
image=${1:?Expected runtime image digest}
migrations=${2:?Expected migration image digest}
[[ $image =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
[[ $migrations =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]]
test -f "$root/.env.docker"
mkdir -p "$root/.deploy" "$root/backups"
exec 9>"$root/.deploy/release.lock"
flock -w 600 9
if [[ ! -f $root/.deploy/backup.sh ]]; then
  cp "$bundle/docker/backup.sh" "$root/.deploy/backup.sh"
fi

export TEAMWORK_APP_IMAGE=$image MIGRATION_IMAGE=$migrations
compose=(docker compose --project-name teamwork --profile production
  --project-directory "$root" --env-file "$root/.env.docker"
  -f "$bundle/compose.yaml" -f "$bundle/compose.prod.yaml" -f "$bundle/compose.nginx.yaml")
dc() { "${compose[@]}" "$@"; }

dc config --quiet
previous_id=$(dc ps -q app)
previous_image=
if [[ -n $previous_id ]]; then
  previous_image=$(docker inspect -f '{{.Config.Image}}' "$previous_id")
fi
dc pull app migrate
dc up -d --no-recreate --wait --wait-timeout 120 db
dc run --rm --no-deps migrate
dc --profile backups up -d --no-deps --no-recreate backup

start_app() { dc up -d --no-deps --no-build --wait --wait-timeout 180 app; }
if ! start_app; then
  if [[ -n $previous_image && $previous_image != "$image" ]]; then
    echo 'Release failed. Restoring the previous app image.' >&2
    TEAMWORK_APP_IMAGE=$previous_image start_app || echo 'App rollback failed.' >&2
  fi
  exit 1
fi

printf 'TEAMWORK_APP_IMAGE=%s\nMIGRATION_IMAGE=%s\n' "$image" "$migrations" >"$bundle/images.env"
ln -sfn -- "$bundle" "$root/.deploy/current.next"
mv -Tf -- "$root/.deploy/current.next" "$root/current"
echo "Release complete: $image"
