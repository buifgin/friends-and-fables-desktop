#!/usr/bin/env bash
set -euo pipefail
# Real focus and fullscreen require a window manager inside the CI X server.
openbox --sm-disable > "${RUNNER_TEMP:-/tmp}/fables-openbox-test.log" 2>&1 &
fables_test_wm_pid=$!
trap 'kill "$fables_test_wm_pid" 2>/dev/null || true' EXIT
for fables_test_attempt in {1..50}; do
  if xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q 'window id'; then break; fi
  sleep 0.1
done
"$@"
