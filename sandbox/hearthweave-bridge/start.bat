@echo off
:: ✦ Hearthweave Bridge — Windows Launcher
:: Double-click this to start everything.
setlocal enabledelayedexpansion

if not exist ".env" (
    echo.
    echo  ✦ First-time setup:
    echo    1. Copy .env.example  to  .env
    echo    2. Open .env and fill in your API keys
    echo    3. Run this file again
    echo.
    pause
    exit /b 1
)

for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if "%%a"=="ANTHROPIC_API_KEY" set ANTHROPIC_API_KEY=%%b
    if "%%a"=="OPENAI_API_KEY"    set OPENAI_API_KEY=%%b
)

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Node.js not found.
    echo  Download it from https://nodejs.org (LTS version)
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  Installing dependencies (one-time only)...
    call npm install
    if errorlevel 1 (
        echo  npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

echo.
echo  ✦ Hearthweave Bridge starting...
echo  Open index.html in your browser once the proxy is ready.
echo  Close this window to shut down.
echo.

node server.js
pause
