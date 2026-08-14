@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "ellowind:qwen3-vl-8b-v1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Ellowind ignition completed successfully.) else (echo Ellowind ignition stopped with exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
