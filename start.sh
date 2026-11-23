#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v uv >/dev/null 2>&1; then
    printf '%s\n' '未找到 uv。请先安装 uv：https://docs.astral.sh/uv/getting-started/installation/' >&2
    exit 1
fi

exec uv run --locked main.py
