@echo off
title BEAT PULSE
cd /d "%~dp0"

echo ===================================================
echo             BEAT PULSE - Game Launcher
echo ===================================================
echo.
echo Starting game server...
echo.

start http://localhost:3000/

call npm run dev
if errorlevel 1 (
    echo.
    echo Server stopped or encountered an error.
    pause
)
