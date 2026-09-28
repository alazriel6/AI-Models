@echo off
title Models Guide - Development

echo ==================================
echo       MODELS GUIDE DEV SERVER
echo ==================================
echo.

echo Starting Backend...
start /b "" cmd /c "cd /d E:\AI\Models-guide\be && go run ./cmd/server"

timeout /t 2 /nobreak >nul

echo Starting Frontend...
start /b "" cmd /c "cd /d E:\AI\Models-guide\fe && npm run dev"

echo.
echo ==================================
echo   Backend : http://localhost:8080
echo   Frontend: http://localhost:5173
echo ==================================
echo.
echo Press Ctrl+C to stop.
echo.

cmd /k