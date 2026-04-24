@echo off
echo ========================================
echo   Music Practice App - Quick Start
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo         Download: https://nodejs.org/
    pause
    exit /b 1
)

:: Show Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

:: Check node_modules
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

:: Type check
echo [INFO] Running type check...
call npm run type-check
if %errorlevel% neq 0 (
    echo [WARN] Type check failed, but continuing...
    echo.
) else (
    echo [OK] Type check passed
    echo.
)

:: Start dev server
echo [INFO] Starting development server...
echo.
echo ========================================
echo   Server: http://localhost:5174
echo   Press Ctrl+C to stop
echo ========================================
echo.

:: Open browser after delay
start "" cmd /c "ping 127.0.0.1 -n 4 >nul && start http://localhost:5174"

:: Start Vite
call npm run dev

pause