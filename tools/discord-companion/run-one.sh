#!/usr/bin/env bash
set -euo pipefail

profile="${1:-}"
if [[ -z "$profile" ]]; then
  echo "Usage: ./run-one.sh yggdrasil|vee|faer|bluebird|vethrlauf"
  exit 2
fi

python discord_companion.py --profile "$profile"
