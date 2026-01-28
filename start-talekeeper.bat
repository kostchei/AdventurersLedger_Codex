@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Starting Tale-Keeper Services
echo ========================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if PocketBase is already running
tasklist /FI "IMAGENAME eq pocketbase.exe" 2>NUL | find /I /N "pocketbase.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] PocketBase is already running
) else (
    echo [*] Starting PocketBase...
    if not exist "pocketbase\bin\pocketbase.exe" (
        echo [ERROR] PocketBase executable not found at: pocketbase\bin\pocketbase.exe
        pause
        exit /b 1
    )
    start "PocketBase Server" /D "%SCRIPT_DIR%pocketbase" cmd /c "bin\pocketbase.exe serve"
    timeout /t 3 /nobreak >nul

    REM Verify it started
    tasklist /FI "IMAGENAME eq pocketbase.exe" 2>NUL | find /I /N "pocketbase.exe">NUL
    if "%ERRORLEVEL%"=="0" (
        echo [OK] PocketBase started on http://127.0.0.1:8090
    ) else (
        echo [ERROR] PocketBase failed to start
    )
)

echo.

REM Check if Cloudflare Tunnel is already running
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] Cloudflare Tunnel is already running
) else (
    echo [*] Starting Cloudflare Tunnel...
    if not exist "pocketbase\cloudflared\cloudflared.exe" (
        echo [ERROR] Cloudflared executable not found at: pocketbase\cloudflared\cloudflared.exe
        pause
        exit /b 1
    )
    start "Cloudflare Tunnel" /D "%SCRIPT_DIR%pocketbase\cloudflared" cmd /c "cloudflared.exe tunnel --config config.yml run"
    timeout /t 4 /nobreak >nul

    REM Verify it started
    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe">NUL
    if "%ERRORLEVEL%"=="0" (
        echo [OK] Cloudflare Tunnel started for api.talekeeper.org
    ) else (
        echo [ERROR] Cloudflare Tunnel failed to start
    )
)

echo.
echo ========================================
echo   Tale-Keeper Services Status
echo ========================================
echo.

REM Check final status
set "SERVICES_OK=1"

tasklist /FI "IMAGENAME eq pocketbase.exe" 2>NUL | find /I /N "pocketbase.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo   [32m✓[0m PocketBase:       RUNNING
) else (
    echo   [31m✗[0m PocketBase:       NOT RUNNING
    set "SERVICES_OK=0"
)

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo   [32m✓[0m Cloudflare Tunnel: RUNNING
) else (
    echo   [31m✗[0m Cloudflare Tunnel: NOT RUNNING
    set "SERVICES_OK=0"
)

echo.
echo ========================================
echo.
if "%SERVICES_OK%"=="1" (
    echo   [32mAll services running![0m
    echo.
    REM echo   API (local):  http://127.0.0.1:8090
    echo   API (public): https://api.talekeeper.org
    REM echo   Admin UI:     http://127.0.0.1:8090/_/
    REM echo   Frontend:     http://localhost:5173
    echo.
    echo Press any key to open Admin UI...
    pause >nul
    REM start http://127.0.0.1:8090/_/
    start https://api.talekeeper.org/_/
) else (
    echo   [31mSome services failed to start![0m
    echo   Check the error messages above.
    echo.
    pause
)

endlocal
