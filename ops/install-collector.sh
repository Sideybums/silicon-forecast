#!/bin/bash
# Installs, removes or inspects the daily canonical collector launchd job.
# The job must run from a dedicated, clean, cached-origin-aligned main checkout.
# Installation validates everything before replacing a loaded job and never runs
# a collection.
set -euo pipefail

LABEL="uk.co.siliconforecast.collector"
AGENT_DIR="$HOME/Library/LaunchAgents"
TARGET="$AGENT_DIR/$LABEL.plist"
STATE_DIR="$HOME/Library/Application Support/Silicon Forecast Collector"
REPO_FILE="$STATE_DIR/repo-path"
LOCK_PATH="$STATE_DIR/collector.lock"
NODE_BIN="$(command -v node || printf '%s' /opt/homebrew/bin/node)"

read_repo() {
  [ -f "$REPO_FILE" ] || { echo "collector checkout is not configured" >&2; exit 1; }
  REPO="$(sed -n '1p' "$REPO_FILE")"
  git -C "$REPO" rev-parse --show-toplevel >/dev/null 2>&1 || { echo "configured collector checkout is missing: $REPO" >&2; exit 1; }
}

verify_checkout() {
  local repo="$1" head remote_head
  [ "${repo#/}" != "$repo" ] || { echo "collector checkout must be an absolute path" >&2; exit 2; }
  repo="$(cd "$repo" && pwd -P)"
  [ "$(git -C "$repo" rev-parse --show-toplevel)" = "$repo" ] || { echo "collector checkout must be a Git repository root" >&2; exit 2; }
  [ "$(git -C "$repo" symbolic-ref --quiet --short HEAD)" = "main" ] || { echo "collector checkout must be on main" >&2; exit 2; }
  git -C "$repo" remote get-url origin >/dev/null
  [ -z "$(git -C "$repo" status --porcelain=v1 --untracked-files=all)" ] || { echo "collector checkout must be clean" >&2; exit 2; }
  head="$(git -C "$repo" rev-parse HEAD)"
  remote_head="$(git -C "$repo" rev-parse origin/main)"
  [ "$head" = "$remote_head" ] || { echo "collector checkout must exactly match its cached origin/main before installation" >&2; exit 2; }
  [ -f "$repo/scripts/run-canonical-collector.mjs" ] || { echo "collector runner is missing" >&2; exit 2; }
  [ -f "$repo/lib/collector-runtime.mjs" ] || { echo "collector runtime controls are missing" >&2; exit 2; }
  [ -f "$repo/ops/$LABEL.plist" ] || { echo "collector plist template is missing from the target revision" >&2; exit 2; }
  printf '%s' "$repo"
}

render_plist() {
  local template="$1" output="$2" repo="$3"
  python3 - "$template" "$output" "$repo" "$LOCK_PATH" "$NODE_BIN" <<'PY'
import plistlib, sys
source, target, repo, lock, node = sys.argv[1:]
with open(source, "rb") as handle:
    value = plistlib.load(handle)
def replace(item):
    if isinstance(item, str):
        return item.replace("__REPO__", repo).replace("__LOCK__", lock).replace("/opt/homebrew/bin/node", node)
    if isinstance(item, list):
        return [replace(entry) for entry in item]
    if isinstance(item, dict):
        return {key: replace(entry) for key, entry in item.items()}
    return item
with open(target, "wb") as handle:
    plistlib.dump(replace(value), handle, sort_keys=False)
PY
}

case "${1:-status}" in
  install)
    [ -n "${2:-}" ] || { echo "usage: $0 install /absolute/path/to/dedicated-checkout" >&2; exit 2; }
    [ -x "$NODE_BIN" ] || { echo "Node executable is unavailable: $NODE_BIN" >&2; exit 2; }
    REPO="$(verify_checkout "$2")"
    mkdir -p "$AGENT_DIR" "$STATE_DIR" "$REPO/logs"
    TEMP_PLIST="$(mktemp "$STATE_DIR/$LABEL.plist.XXXXXX")"
    BACKUP_PLIST="$(mktemp "$STATE_DIR/$LABEL.previous.XXXXXX")"
    TEMP_REPO_FILE="$(mktemp "$STATE_DIR/$LABEL.repo.XXXXXX")"
    BACKUP_REPO_FILE="$(mktemp "$STATE_DIR/$LABEL.repo-previous.XXXXXX")"
    HAD_TARGET=false
    HAD_REPO_FILE=false
    HAD_LOADED=false
    ROLLBACK_NEEDED=false
    cleanup_install() {
      status=$?
      trap - EXIT
      if [ "$ROLLBACK_NEEDED" = true ]; then
        launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
        rm -f "$TARGET" "$REPO_FILE"
        if [ "$HAD_TARGET" = true ]; then cp "$BACKUP_PLIST" "$TARGET" || true; fi
        if [ "$HAD_REPO_FILE" = true ]; then cp "$BACKUP_REPO_FILE" "$REPO_FILE" || true; fi
        if [ "$HAD_LOADED" = true ] && [ -f "$TARGET" ]; then launchctl bootstrap "gui/$(id -u)" "$TARGET" || true; fi
        echo "collector installation failed; previous scheduler state was restored where possible" >&2
      fi
      rm -f "$TEMP_PLIST" "$BACKUP_PLIST" "$TEMP_REPO_FILE" "$BACKUP_REPO_FILE"
      exit "$status"
    }
    trap cleanup_install EXIT
    render_plist "$REPO/ops/$LABEL.plist" "$TEMP_PLIST" "$REPO"
    plutil -lint "$TEMP_PLIST" >/dev/null
    printf '%s\n' "$REPO" > "$TEMP_REPO_FILE"
    if [ -f "$TARGET" ]; then cp "$TARGET" "$BACKUP_PLIST"; HAD_TARGET=true; fi
    if [ -f "$REPO_FILE" ]; then cp "$REPO_FILE" "$BACKUP_REPO_FILE"; HAD_REPO_FILE=true; fi
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then HAD_LOADED=true; fi
    ROLLBACK_NEEDED=true
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    install -m 0644 "$TEMP_PLIST" "$TARGET"
    launchctl bootstrap "gui/$(id -u)" "$TARGET"
    mv "$TEMP_REPO_FILE" "$REPO_FILE"
    ROLLBACK_NEEDED=false
    echo "installed $LABEL"
    echo "  node:     $NODE_BIN"
    echo "  checkout: $REPO"
    echo "  revision: $(git -C "$REPO" rev-parse HEAD)"
    echo "  branch:   main"
    echo "  schedule: daily 11:30 local"
    echo "  logs:     $REPO/logs/collector.{out,err}.log"
    echo "  RunAtLoad is false; installation performed no collection."
    ;;

  uninstall)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$TARGET" "$REPO_FILE"
    echo "removed $LABEL; run ledger and collected data are untouched"
    ;;

  status)
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
      echo "job:      loaded"
      launchctl print "gui/$(id -u)/$LABEL" | grep -E "state|last exit code|runs" | sed 's/^/  /' || true
    else
      echo "job:      NOT loaded"
    fi
    if [ -f "$REPO_FILE" ]; then
      read_repo
      echo "checkout: $REPO"
      echo "branch:   $(git -C "$REPO" symbolic-ref --quiet --short HEAD || echo detached)"
      echo "clean:    $([ -z "$(git -C "$REPO" status --porcelain=v1 --untracked-files=all)" ] && echo yes || echo NO)"
      echo "HEAD:     $(git -C "$REPO" rev-parse HEAD)"
      echo "origin:   $(git -C "$REPO" rev-parse origin/main)"
      COUNTS="$(git -C "$REPO" rev-list --left-right --count HEAD...origin/main)"
      echo "ahead/behind: $COUNTS"
      LEDGER="$REPO/data/collection-runs/ledger.v1.json"
      if [ -f "$LEDGER" ]; then
        "$NODE_BIN" -e 'const l=require(process.argv[1]); const r=l.runs.at(-1); const acknowledged=new Set((l.acknowledgements||[]).map((a)=>a.slot)); console.log(`runs:     ${l.runs.length}${r ? `  last ${r.started_at} (${r.observations_retained} observations)` : ""}`); console.log(`gaps:     ${l.missed_slots.length} recorded; ${l.missed_slots.filter((g)=>!acknowledged.has(g.slot)).length} unacknowledged`);' "$LEDGER"
      fi
    else
      echo "checkout: not configured"
    fi
    if [ -d "$LOCK_PATH" ]; then
      echo "lock:     PRESENT — confirm no collector is running before manual removal"
      [ -f "$LOCK_PATH/owner.json" ] && sed 's/^/  /' "$LOCK_PATH/owner.json"
    else
      echo "lock:     absent"
    fi
    ;;

  run-now)
    read_repo
    shift
    export SF_COLLECTOR_CHECKOUT="$REPO" SF_COLLECTOR_BRANCH="main" SF_COLLECTOR_LOCK="$LOCK_PATH"
    cd "$REPO"
    "$NODE_BIN" scripts/run-canonical-collector.mjs "$@"
    ;;

  *)
    echo "usage: $0 {install /absolute/dedicated-checkout|uninstall|status|run-now}" >&2
    exit 2
    ;;
esac
