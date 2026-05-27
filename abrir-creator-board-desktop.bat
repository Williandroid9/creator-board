@echo off
cd /d "%~dp0"
title Creator Board Desktop

if exist "release\win-unpacked\Creator Board.exe" (
  start "" "%~dp0release\win-unpacked\Creator Board.exe"
  exit /b 0
)

if not exist node_modules\electron\dist\electron.exe (
  echo O modo desktop ainda nao esta instalado.
  echo.
  echo Rode primeiro:
  echo npm install
  echo.
  pause
  exit /b 1
)

npm.cmd run desktop
pause
