#!/usr/bin/bash
set -euo pipefail
state=/var/lib/wayglass
release=/usr/lib/wayglass/release
live="$state/live"
mkdir -p "$state/receipts" "$state/data"
if ! test -f "$live/.wayglass-source-sha" || ! cmp -s "$release/.wayglass-source-sha" "$live/.wayglass-source-sha"; then
  next="$state/.live-staged-$$"
  mkdir -p "$next"
  cp -a "$release/." "$next/"
  if test -d "$live"; then
    mv "$live" "$state/.live-prior-$(date -u +%Y%m%dT%H%M%SZ)"
  fi
  mv "$next" "$live"
fi
export HEARTHGATE_DATA_DIR="$state/data"
export WAYGLASS_SOURCE_ROOT="$live"
export WAYGLASS_RECEIPTS_DIR="$state/receipts"
/usr/libexec/wayglass/node /usr/libexec/wayglass/boot-wtl.cjs
cd "$live/apps/starwell-server"
exec /usr/libexec/wayglass/node "$live/apps/starwell-server/server-secure.js"
