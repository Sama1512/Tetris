@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

REM このbatのあるフォルダへ
cd /d "%~dp0"

echo [AI] Docker Compose up...
docker compose up -d --build
if errorlevel 1 (
    echo [ERROR] docker compose up に失敗。Docker Desktop が起動しているか確認してください。
    pause
    exit /b 1
)

echo [WEB] Caddy 起動 : http://localhost:5502
REM 既存を掃除してから起動
docker rm -f tetris-web >nul 2>&1
REM public/ を Caddy のドキュメントルートにマウント
docker run --name tetris-web -d -p 5502:80 -v "%~dp0public":/usr/share/caddy:ro caddy:latest

REM 任意：第一引数をレベルに流す（indexで段位選べるので省略可）
set LEVEL=
if not "%~1"=="" set LEVEL=%~1

REM Caddy起動を少し待ってからブラウザを開く
ping -n 2 127.0.0.1 >nul

set URL=http://localhost:5502/html/index.html
if defined LEVEL set URL=%URL%?level=%LEVEL%

echo [OPEN] !URL!
start "" "!URL!"

echo [READY] 起動完了。停止は stop_tetris.bat
endlocal