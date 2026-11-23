@echo off
cd /d "%~dp0"

where uv >nul 2>nul
if errorlevel 1 (
    echo 未找到 uv。请先安装 uv: https://docs.astral.sh/uv/getting-started/installation/
    pause
    exit /b 1
)

uv run --locked main.py
if errorlevel 1 (
    echo 服务启动失败，请检查上方错误信息。
    pause
    exit /b 1
)
