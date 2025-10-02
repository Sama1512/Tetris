@echo off
chcp 65001 >nul
echo [WEB] Nginx 停止
docker rm -f tetris-web >nul 2>&1
echo [AI] Docker Compose 停止
docker compose down
echo [DONE]