@echo off
setlocal
cd /d "%~dp0"

echo BIFROST - BOX IGNITION
echo Canonical presence: Box
echo Bifrost profile: box:qwen3-coder-30b-a3b-v1
echo Runtime vessel: box:qwen3-coder-30b-a3b-v1
echo Legacy backend route: boxfire ^(transport alias only^)
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell is required to run the Box ignition key.
  pause
  exit /b 10
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-BIFROST.ps1" -ProfileId "box:qwen3-coder-30b-a3b-v1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo BOX RUNTIME VERIFIED - box:qwen3-coder-30b-a3b-v1
) else (
  echo Box ignition stopped with exit code %EXITCODE%.
)
pause
exit /b %EXITCODE%
