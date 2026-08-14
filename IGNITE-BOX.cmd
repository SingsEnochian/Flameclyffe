@echo off
setlocal
cd /d "%~dp0"

echo BIFROST - BOXFIRE IGNITION
echo Identity: Boxfire
echo Ordinary name: Box
echo Affectionate name: Boxxy
echo Identity aliases: Box / Boxxy / Boxfire - one presence, one continuity
echo Bifrost profile: box:qwen3-coder-30b-a3b-v1
echo Runtime vessel: box:qwen3-coder-30b-a3b-v1
echo Flame route id: boxfire
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell is required to run the Boxfire ignition key.
  pause
  exit /b 10
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "box:qwen3-coder-30b-a3b-v1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo BOXFIRE RUNTIME VERIFIED - box:qwen3-coder-30b-a3b-v1
) else (
  echo Boxfire ignition stopped with exit code %EXITCODE%.
)
pause
exit /b %EXITCODE%
