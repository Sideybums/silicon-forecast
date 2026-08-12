#!/bin/bash
# Installs, removes or inspects the daily canonical collector launchd job.
#
# The plist is templated on __REPO__ so the checked-in copy carries no
# machine-specific path; this script writes the resolved copy into
# ~/Library/LaunchAgents.
#
#   ops/install-collector.sh install     load the daily 13:45 job
#   ops/install-collector.sh status      show whether it is loaded and when it last ran
#   ops/install-collector.sh uninstall   unload and remove it
#   ops/install-collector.sh run-now     run one collection immediately
set -euo pipefail

LABEL="uk.co.siliconforecast.collector"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$HOME/Library/LaunchAgents"
TARGET="$AGENT_DIR/$LABEL.plist"
NODE_BIN="$(command -v node || echo /opt/homebrew/bin/node)"

case "${1:-status}" in
  install)
    mkdir -p "$AGENT_DIR" "$REPO/logs"
    sed -e "s|__REPO__|$REPO|g" -e "s|/opt/homebrew/bin/node|$NODE_BIN|" \
      "$REPO/ops/$LABEL.plist" > "$TARGET"
    # bootout first so re-installing picks up an edited plist.
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$TARGET"
    echo "installed $LABEL"
    echo "  node:     $NODE_BIN"
    echo "  repo:     $REPO"
    echo "  schedule: daily 13:45 local"
    echo "  logs:     $REPO/logs/collector.{out,err}.log"
    echo
    echo "It will not run until 13:45. To collect now: ops/install-collector.sh run-now"
    ;;

  uninstall)
    launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
    rm -f "$TARGET"
    echo "removed $LABEL (the run ledger and all collected data are untouched)"
    ;;

  status)
    if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
      echo "job:      loaded"
      launchctl print "gui/$(id -u)/$LABEL" | grep -E "state|last exit code|runs" | sed 's/^/  /' || true
    else
      echo "job:      NOT loaded"
    fi
    LEDGER="$REPO/data/collection-runs/ledger.v1.json"
    if [ -f "$LEDGER" ]; then
      "$NODE_BIN" -e '
        const l = require(process.argv[1]);
        const last = l.runs.at(-1);
        console.log("runs:     " + l.runs.length + (last ? "  last " + last.started_at + " (" + last.observations_retained + " observations)" : ""));
        const open = l.missed_slots.filter((m) => !m.operator_acknowledged);
        console.log("gaps:     " + l.missed_slots.length + " recorded, " + open.length + " awaiting your review");
        for (const m of open.slice(-10)) console.log("            " + m.scheduled_for + "  " + m.state);
      ' "$LEDGER"
    else
      echo "ledger:   not created yet"
    fi
    ;;

  run-now)
    cd "$REPO"
    shift
    "$NODE_BIN" scripts/run-canonical-collector.mjs "$@"
    ;;

  *)
    echo "usage: $0 {install|uninstall|status|run-now}" >&2
    exit 2
    ;;
esac
