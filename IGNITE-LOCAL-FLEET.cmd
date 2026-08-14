@echo off
setlocal
cd /d "%~dp0apps\starwell-server"
echo BIFROST LOCAL FLEET IGNITION
echo Wakes installed local vessels only. No model downloads. No remote provider calls.
echo.
call npm run bifrost:ignite:fleet
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Installed local fleet ignition completed.) else (echo Fleet ignition completed with failures. Exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
