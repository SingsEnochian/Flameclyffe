@echo off
setlocal
cd /d "%~dp0apps\starwell-server"
echo Bifrost local fleet verification
echo Each installed local vessel is challenged sequentially and asked to unload after verification.
echo No model downloads. No remote provider calls. Optional instruments excluded.
set "BIFROST_KEEP_ALIVE=0"
set "BIFROST_LOCAL_MODEL_CONCURRENCY=1"
node scripts\bifrost-ignite-fleet.js
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (echo Fleet verification completed.) else (echo Fleet verification stopped with exit code %EXITCODE%.)
pause
exit /b %EXITCODE%
