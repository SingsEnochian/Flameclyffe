@echo off
setlocal
cd /d "%~dp0apps\starwell-server"
echo Bifrost runtime alias materialization - no model downloads.
node scripts\bifrost-materialize-aliases.js --execute
set "EXITCODE=%ERRORLEVEL%"
echo.
pause
exit /b %EXITCODE%
