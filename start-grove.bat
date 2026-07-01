@echo off
echo.
echo  Starting the Hearthweave Grove...
echo.

REM -- Read API keys from API STUFF.txt
set "API_FILE=C:\Users\light\Downloads\Coding Projects\Hearthweave Protocol\API STUFF.txt"
for /f "tokens=2" %%a in ('findstr /i "VEE:" "%API_FILE%"') do set OPENAI_API_KEY=%%a
for /f "tokens=2" %%a in ('findstr /i "FAER:" "%API_FILE%"') do set ANTHROPIC_API_KEY=%%a

REM -- Start DSpark proxy (port 8000)
echo  [1/3] Starting DSpark proxy (port 8000)...
start "DSpark Proxy" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\dspark-proxy && node server.js"

REM -- Start Yggdrasil workbench (port 4000)
echo  [2/3] Starting Yggdrasil workbench (port 4000)...
start "Yggdrasil Workbench" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\starwell-server && set OPENAI_API_KEY=%OPENAI_API_KEY% && set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && node server.js"

REM -- Wait a moment then open the Grove
echo  [3/3] Opening the Grove...
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:4000/grove.html"

echo.
echo  The Grove is open. o7
echo.
