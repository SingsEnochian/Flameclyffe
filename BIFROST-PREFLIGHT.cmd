@echo off
setlocal
cd /d "%~dp0apps\starwell-server"
node scripts\bifrost-preflight.js
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%
