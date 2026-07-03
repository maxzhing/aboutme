#!/usr/bin/env bash
# Run the full test suite. No dependencies required.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m unittest discover -s tests -v
