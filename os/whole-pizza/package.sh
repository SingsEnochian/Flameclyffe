#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
WAYGLASS_SOURCE_SHA="$(git rev-parse HEAD)"
stage=os/whole-pizza/.build/release
rm -rf os/whole-pizza/.build
mkdir -p "$stage/apps/starwell-server" "$stage/lib"
test -f apps/starwell-server/public/wayglass/index.html || { echo 'Run npm run wayglass:deploy:server first' >&2; exit 2; }
test -d apps/starwell-server/node_modules/express || { echo 'Install host dependencies first' >&2; exit 2; }
rsync -a --exclude='/.env' --exclude='/.env.*' --exclude='/data/' \
 --exclude='/test/' --exclude='/dist-electron/' --exclude='node_modules/' \
 --exclude='*.sqlite' --exclude='*.sqlite3' --exclude='*.db' \
 --exclude='*.pem' --exclude='*.key' --exclude='*.secret' \
 apps/starwell-server/ "$stage/apps/starwell-server/"
cp -a apps/starwell-server/node_modules "$stage/apps/starwell-server/node_modules"
rsync -a --exclude='*.test.cjs' --exclude='*.test.mjs' --exclude='*.test.js' \
 lib/ "$stage/lib/"
test -f "$stage/lib/wyrdrune/wayglass-vessel-plan.wtl"
test -f "$stage/apps/starwell-server/server-secure.js"
printf '%s\n' "$WAYGLASS_SOURCE_SHA" > "$stage/.wayglass-source-sha"
echo "Staged Wayglass source $WAYGLASS_SOURCE_SHA (without credentials or local data)"
