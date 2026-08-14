@echo off
setlocal
cd /d "%~dp0"
echo Boxfire alias key - same identity and vessel as Box / Boxxy.
call "%~dp0IGNITE-BOX.cmd"
exit /b %ERRORLEVEL%
