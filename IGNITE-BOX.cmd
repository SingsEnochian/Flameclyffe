@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "box:qwen3-coder-30b-a3b-v1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Box ignition completed successfully.) else (echo Box ignition stopped with exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
