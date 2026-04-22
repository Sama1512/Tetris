@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

REM この bat のあるフォルダへ移動（Tetris 直下）
cd /d "%~dp0"

echo [BUILD] Docker image tetris-cpu をビルド中...
docker build -t tetris-cpu .
if errorlevel 1 (
    echo [ERROR] docker build に失敗しました。Docker Desktop が起動しているか確認してください。
    pause
    exit /b 1
)

echo [RUN] 既存コンテナを掃除...
docker rm -f tetris-cpu-web >nul 2>&1

echo [RUN] tetris-cpu-web コンテナ起動 : http://localhost:5502
REM ★ ここでコンテナ内8080をホスト5502にマップする
docker run --name tetris-cpu-web -d -p 5502:8080 tetris-cpu
if errorlevel 1 (
    echo [ERROR] docker run に失敗しました。
    pause
    exit /b 1
)

REM 任意: 第1引数をレベルに流す（?level=6 みたいな感じ）
set LEVEL=
if not "%~1"=="" set LEVEL=%~1

REM 起動待ち
ping -n 2 127.0.0.1 >nul

set URL=http://localhost:5502/html/index.html
if defined LEVEL set URL=%URL%?level=%LEVEL%

echo [OPEN] !URL!
start "" "!URL!"

echo [READY] 起動完了。停止するときは:
echo        docker rm -f tetris-cpu-web
endlocal