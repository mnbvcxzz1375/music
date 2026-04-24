@echo off
echo ========================================
echo   Music Practice App - Stop Server
echo ========================================
echo.

:: Kill Node.js processes on port 5174
echo [INFO] Stopping development server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>nul
    echo [OK] Killed process on port 5174
)

:: Also try to kill common Vite processes
taskkill /IM node.exe /F >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Stopped Node.js processes
)

echo.
echo [DONE] Server stopped.
pause