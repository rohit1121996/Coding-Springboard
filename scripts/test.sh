#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
else
  PYTHON_BIN=python
fi

"$PYTHON_BIN" "$ROOT_DIR/backend/manage.py" test submissions
npm --prefix "$ROOT_DIR/frontend" test
npm --prefix "$ROOT_DIR/frontend" run build
