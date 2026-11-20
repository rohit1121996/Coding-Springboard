#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/.venv/bin/python" "$ROOT_DIR/backend/manage.py" test submissions
npm --prefix "$ROOT_DIR/frontend" test
npm --prefix "$ROOT_DIR/frontend" run build
