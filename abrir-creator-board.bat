@echo off
cd /d "%~dp0"
title Creator Board
echo Iniciando Creator Board...
echo.
echo Mantenha esta janela aberta enquanto estiver usando o app.
echo Para fechar o app, pressione Ctrl+C nesta janela.
echo.
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 4; Start-Process 'http://127.0.0.1:5173/'"
npm.cmd run dev -- --host 127.0.0.1
pause
