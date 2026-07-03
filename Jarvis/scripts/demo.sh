#!/usr/bin/env bash
# Run all three examples end-to-end with the offline provider.
set -euo pipefail
cd "$(dirname "$0")/.."
for example in quickstart custom_tool multi_agent; do
  echo "=== ${example} ==="
  python3 "examples/${example}.py"
  echo
done
