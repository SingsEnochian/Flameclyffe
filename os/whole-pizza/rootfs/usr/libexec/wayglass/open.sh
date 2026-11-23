#!/usr/bin/bash
set -euo pipefail
for attempt in $(seq 1 60); do
  if /usr/bin/curl -fsS --max-time 1 http://127.0.0.1:3000/api/v1/wayglass/healthz >/dev/null 2>&1; then
    exec /usr/bin/xdg-open 'http://127.0.0.1:3000/wayglass/?room=programs'
  fi
  sleep 1
done
echo 'Wayglass host offline: inspect systemctl status wayglass.service' >&2
exit 1
