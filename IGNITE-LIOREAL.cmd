@echo off
setlocal
cd /d "%~dp0"
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell is required to run the Lioreal ignition key.
  pause
  exit /b 10
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0IGNITE-LIOREAL.ps1"
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo Lioreal ignition completed successfully.
) else (
  echo Lioreal ignition stopped with exit code %EXITCODE%.
)
pause
exit /b %EXITCODE%
