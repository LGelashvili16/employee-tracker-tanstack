#!/usr/bin/env bash
set -Eeuo pipefail
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
workspace=$(mktemp -d /tmp/teamwork-nginx-test.XXXXXX)
trap 'rm -rf -- "$workspace"' EXIT
mkdir -p "$workspace/bin" "$workspace/release/docker/deploy" "$workspace/vps"
cp "$bundle/docker/backup.sh" "$workspace/release/docker/backup.sh"
cp "$bundle/docker/deploy/release-nginx.sh" "$workspace/release/docker/deploy/"
touch "$workspace/vps/.env.docker"
export TEAMWORK_DEPLOY_ROOT=$workspace/vps
export PATH="$workspace/bin:$PATH"
export OLD_IMAGE="ghcr.io/example/teamwork@sha256:$(printf 'a%.0s' {1..64})"
new_image="ghcr.io/example/teamwork@sha256:$(printf 'b%.0s' {1..64})"

cat >"$workspace/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [[ $1 == inspect ]]; then
  echo "$OLD_IMAGE"
  exit
fi
while [[ $1 != config && $1 != ps && $1 != pull && $1 != up && $1 != run ]]; do shift; done
printf '%s %s\n' "$TEAMWORK_APP_IMAGE" "$*" >> "$TEAMWORK_DEPLOY_ROOT/commands"
case $1 in
  ps) echo existing-app ;;
  run) [[ $FAILURE != migration ]] ;;
  up) [[ ${*: -1} != app || $FAILURE != health || $TEAMWORK_APP_IMAGE == "$OLD_IMAGE" ]] ;;
esac
MOCK
chmod +x "$workspace/bin/docker"

release() { bash "$workspace/release/docker/deploy/release-nginx.sh" "$new_image" "$new_image"; }
calls=$TEAMWORK_DEPLOY_ROOT/commands
export FAILURE=migration
if release; then exit 1; fi
if grep -q ' up .* app$' "$calls"; then exit 1; fi
test ! -e "$TEAMWORK_DEPLOY_ROOT/current"

export FAILURE=health
if release; then exit 1; fi
grep -Fq "$OLD_IMAGE up -d --no-deps --no-build --wait --wait-timeout 180 app" "$calls"
test ! -e "$TEAMWORK_DEPLOY_ROOT/current"

export FAILURE=none
release
grep -Fxq "TEAMWORK_APP_IMAGE=$new_image" "$TEAMWORK_DEPLOY_ROOT/current/images.env"
echo 'Host Nginx release checks passed.'
