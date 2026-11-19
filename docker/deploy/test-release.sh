#!/usr/bin/env bash
# No Docker daemon or network: exercise orchestration failures with a fake CLI.
set -Eeuo pipefail
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
workspace=$(mktemp -d /tmp/team-adwings-release-test.XXXXXX)
cleanup() {
  [[ $workspace == /tmp/team-adwings-release-test.* && -d $workspace ]]
  rm -rf -- "$workspace"
}
trap cleanup EXIT
mkdir -p "$workspace/bin"
cat >"$workspace/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >>"$TEAM_ADWINGS_DEPLOY_ROOT/commands"
if [[ $1 == inspect ]]; then
  if [[ $* == *Health.Status* ]]; then echo healthy; else echo "$MOCK_IMAGE"; fi
elif [[ $1 == volume ]]; then
  if [[ $MOCK_FAIL == legacy ]]; then echo teamwork_postgres_data; fi
elif [[ $1 == pull ]]; then
  [[ $MOCK_FAIL != pull ]]
elif [[ $1 == compose ]]; then
  while [[ $# -gt 0 && $1 != config && $1 != ps && $1 != exec && $1 != up && $1 != run && $1 != stop ]]; do shift; done
  case $1 in
    ps)
      if [[ $* != *'-aq'* ]]; then echo fake-container; fi ;;
    up)
      [[ $MOCK_FAIL != readiness || $* != *--force-recreate* ]] ;;
    run)
      [[ $MOCK_FAIL != migration ]] ;;
    exec)
      if [[ $* == *wget* && $MOCK_FAIL == *smoke* ]]; then exit 1; fi
      if [[ $* == *validate* && $MOCK_FAIL == validation ]]; then exit 1; fi
      if [[ $* == *reload* && $* == *Caddyfile.next* && $MOCK_FAIL == reload ]]; then exit 1; fi ;;
  esac
fi
MOCK
chmod +x "$workspace/bin/docker"
# Skip the deliberate smoke retry delay in the fake CLI tests.
printf '#!/usr/bin/env bash\nexit 0\n' >"$workspace/bin/sleep"
chmod +x "$workspace/bin/sleep"
export PATH="$workspace/bin:$PATH"
export MOCK_IMAGE="ghcr.io/example/team-adwings@sha256:$(printf 'a%.0s' {1..64})"

for scenario in first success legacy pull migration readiness validation reload smoke first-smoke rollback nginx; do
  export TEAM_ADWINGS_DEPLOY_ROOT="$workspace/$scenario"
  export TEAM_ADWINGS_DEPLOY_TARGET=caddy
  export MOCK_FAIL=$scenario
  release="$TEAM_ADWINGS_DEPLOY_ROOT/releases/candidate"
  mkdir -p "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy" "$release/docker/deploy"
  cp "$bundle/docker/deploy/release.sh" "$release/docker/deploy/"
  cp "$bundle/docker/backup.sh" "$release/docker/"
  touch "$TEAM_ADWINGS_DEPLOY_ROOT/.env.docker"
  if [[ $scenario != first* ]]; then
    printf '# slot=blue\nold-config\n' >"$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
  fi
  [[ $scenario != nginx ]] || export TEAM_ADWINGS_DEPLOY_TARGET=nginx
  mode=deploy
  [[ $scenario != rollback ]] || mode=rollback
  if bash "$release/docker/deploy/release.sh" "$MOCK_IMAGE" "$MOCK_IMAGE" "$mode" >"$TEAM_ADWINGS_DEPLOY_ROOT/output" 2>&1; then
    [[ $scenario == first || $scenario == success || $scenario == rollback || $scenario == nginx ]]
    test -f "$TEAM_ADWINGS_DEPLOY_ROOT/current/images.env"
    if [[ $scenario == first ]]; then
      grep -q '^# slot=blue$' "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    else
      grep -q '^# slot=green$' "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    fi
  else
    if [[ $scenario == first || $scenario == success || $scenario == rollback || $scenario == nginx ]]; then
      cat "$TEAM_ADWINGS_DEPLOY_ROOT/output" >&2
      exit 1
    fi
    test ! -e "$TEAM_ADWINGS_DEPLOY_ROOT/current"
    if [[ $scenario == first-smoke ]]; then
      test ! -f "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    else
      grep -q '^# slot=blue$' "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    fi
  fi
  log="$TEAM_ADWINGS_DEPLOY_ROOT/commands"
  if [[ $scenario != first* ]] && grep -q -- '--force-recreate.*blue' "$log"; then
    echo 'FAIL: active container was replaced' >&2; exit 1
  fi
  if [[ $scenario == smoke || $scenario == reload ]]; then
    # One reconciliation reload and one rollback reload, both using committed config.
    [[ $(grep -c 'reload --config /etc/caddy/Caddyfile --adapter' "$log") == 2 ]]
  fi
  if [[ $scenario == rollback ]]; then
    if grep -q 'run --rm --no-deps migrate' "$log"; then exit 1; fi
  fi
  if [[ $scenario == legacy || $scenario == pull || $scenario == migration || $scenario == readiness || $scenario == validation ]]; then
    if grep -q 'reload --config /etc/caddy/Caddyfile.next' "$log"; then exit 1; fi
  fi
  if [[ $scenario == nginx ]]; then
    grep -Fxq ':8080 {' "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    grep -Fq 'header_up X-Forwarded-Proto https' "$TEAM_ADWINGS_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    grep -Fq 'http://127.0.0.1:8080/api/health' "$log"
  fi
  echo "PASS: $scenario"
done
