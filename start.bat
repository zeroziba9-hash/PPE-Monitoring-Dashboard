@echo off
chcp 65001 > nul
title PPE Monitoring Launcher
echo ========================================
echo   PPE Monitoring System Launcher
echo ========================================
echo.

set ROOT=%~dp0
set VENV=%ROOT%.venv\Scripts\activate.bat

echo [1/3] Starting Spring Boot (port 8080)...
start "Spring Boot - PPE Backend" cmd /k "cd /d %ROOT%ppe && gradlew.bat bootRun"

echo [2/3] Starting FastAPI Detector (port 8000)...
start "FastAPI - PPE Detector" cmd /k "cd /d %ROOT%detector && call %VENV% && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [3/3] Starting React Frontend (port 5173)...
start "React - PPE Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo All services started in separate windows.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8080
echo   Detector : http://localhost:8000
echo.
echo Press any key to exit this launcher...
pause > nul
