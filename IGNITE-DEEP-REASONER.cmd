@echo off
setlocal
cd /d "%~dp0"
echo This is the optional Bifrost Deep Reasoner instrument, not a Constellation presence.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "shared:qwen3.6-35b-a3b-deep-reasoner-v1" -OptIn
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Deep Reasoner ignition completed successfully.) else (echo Deep Reasoner ignition stopped with exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
