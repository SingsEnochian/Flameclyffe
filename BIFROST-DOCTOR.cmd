@echo off
setlocal
cd /d "%~dp0apps\starwell-server"
echo Bifrost doctor - read-only ignition and security report.
node scripts\bifrost-doctor.js
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%
