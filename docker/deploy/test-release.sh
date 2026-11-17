#!/usr/bin/env bash
# No Docker daemon or network: exercise orchestration failures with a fake CLI.
set -Eeuo pipefail
bundle=$(cd -- "$(dirname -- "$0")/../.." && pwd)
workspace=$(mktemp -d /tmp/teamwork-release-test.XXXXXX)
cleanup() {
  [[ $workspace == /tmp/teamwork-release-test.* && -d $workspace ]]
  rm -rf -- "$workspace"
}
trap cleanup EXIT
mkdir -p "$workspace/bin"
cat >"$workspace/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >>"$TEAMWORK_DEPLOY_ROOT/commands"
if [[ $1 == inspect ]]; then
  if [[ $* == *Health.Status* ]]; then echo healthy; else echo "$MOCK_IMAGE"; fi
elif [[ $1 == compose ]]; then
  while [[ $# -gt 0 && $1 != config && $1 != ps && $1 != exec && $1 != up && $1 != run ]]; do shift; done
  case $1 in
    ps)
      if [[ $* != *'-aq'* ]]; then echo fake-container; fi ;;
    up)
      [[ $MOCK_FAIL != readiness || $* != *--force-recreate* ]] ;;
    run)
      [[ $MOCK_FAIL != migration ]] ;;
    exec)
      if [[ $* == *wget* && $MOCK_FAIL == smoke ]]; then exit 1; fi
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
export MOCK_IMAGE="ghcr.io/example/teamwork@sha256:$(printf 'a%.0s' {1..64})"

for scenario in first success migration readiness validation reload smoke rollback; do
  export TEAMWORK_DEPLOY_ROOT="$workspace/$scenario"
  export MOCK_FAIL=$scenario
  mkdir -p "$TEAMWORK_DEPLOY_ROOT/.deploy/caddy"
  touch "$TEAMWORK_DEPLOY_ROOT/.env.docker"
  if [[ $scenario != first ]]; then
    printf '# slot=blue\nold-config\n' >"$TEAMWORK_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
  fi
  mode=deploy
  [[ $scenario != rollback ]] || mode=rollback
  if bash "$bundle/docker/deploy/release.sh" "$MOCK_IMAGE" "$MOCK_IMAGE" "$mode" >"$TEAMWORK_DEPLOY_ROOT/output" 2>&1; then
    [[ $scenario == first || $scenario == success || $scenario == rollback ]]
    if [[ $scenario == first ]]; then
      grep -q '^# slot=blue$' "$TEAMWORK_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    else
      grep -q '^# slot=green$' "$TEAMWORK_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
    fi
  else
    if [[ $scenario == first || $scenario == success || $scenario == rollback ]]; then
      cat "$TEAMWORK_DEPLOY_ROOT/output" >&2
    fi
    [[ $scenario != first && $scenario != success && $scenario != rollback ]]
    grep -q '^# slot=blue$' "$TEAMWORK_DEPLOY_ROOT/.deploy/caddy/Caddyfile"
  fi
  log="$TEAMWORK_DEPLOY_ROOT/commands"
  if [[ $scenario != first ]] && grep -q -- '--force-recreate.*blue' "$log"; then
    echo 'FAIL: active container was replaced' >&2; exit 1
  fi
  if [[ $scenario == smoke || $scenario == reload ]]; then
    # One reconciliation reload and one rollback reload, both using committed config.
    [[ $(grep -c 'reload --config /etc/caddy/Caddyfile --adapter' "$log") == 2 ]]
  fi
  if [[ $scenario == rollback ]]; then
    if grep -q 'run --rm --no-deps migrate' "$log"; then exit 1; fi
  fi
  echo "PASS: $scenario"
done
