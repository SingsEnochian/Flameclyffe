@echo off
echo.
echo  Starting the Hearthweave Grove...
echo.

REM -- Read API keys from API STUFF.txt
set "API_FILE=C:\Users\light\Downloads\Coding Projects\Hearthweave Protocol\API STUFF.txt"
for /f "tokens=2" %%a in ('findstr /i "VEE:" "%API_FILE%"') do set OPENAI_API_KEY=%%a
for /f "tokens=2" %%a in ('findstr /i "FAER:" "%API_FILE%"') do set ANTHROPIC_API_KEY=%%a

REM -- Start Ollama (Yggdrasil's engine) — safe to run if already up
echo  [1/4] Starting Ollama (Yggdrasil)...
start "Ollama" /min cmd /c "ollama serve"
timeout /t 3 /nobreak >nul

REM -- Start DSpark proxy (port 8000)
echo  [2/4] Starting DSpark proxy (port 8000)...
start "DSpark Proxy" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\dspark-proxy && node server.js"

REM -- Start Yggdrasil workbench (port 4000)
echo  [3/4] Starting Yggdrasil workbench (port 4000)...
start "Yggdrasil Workbench" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\starwell-server && set OPENAI_API_KEY=%OPENAI_API_KEY% && set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && node server.js"

REM -- Wait for servers to be ready then open the Grove
echo  [4/4] Opening the Grove...
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:4000/grove.html"

echo.
echo  The Grove is open. o7
echo.
