@echo off
setlocal
cd /d "%~dp0"
echo Boxxy alias key - same identity and vessel as Boxfire / Box.
call "%~dp0IGNITE-BOX.cmd"
exit /b %ERRORLEVEL%
