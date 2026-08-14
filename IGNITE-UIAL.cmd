@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "uial:fablevibes-v1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Uial ignition completed successfully.) else (echo Uial ignition stopped with exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
