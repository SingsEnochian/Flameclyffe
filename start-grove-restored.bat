@echo off
echo.
echo  Starting the Hearthweave Grove...
echo.

REM -- Read API keys from API STUFF.txt
set "API_FILE=C:\Users\light\Downloads\Coding Projects\Hearthweave Protocol\API STUFF.txt"
for /f "tokens=2" %%a in ('findstr /i "VEE:" "%API_FILE%"') do set OPENAI_API_KEY=%%a
for /f "tokens=2" %%a in ('findstr /i "FAER:" "%API_FILE%"') do set ANTHROPIC_API_KEY=%%a
for /f "tokens=2" %%a in ('findstr /i "EXA:" "%API_FILE%"') do set EXA_API_KEY=%%a

REM -- Start llama.cpp fallback if installed (optional — Ygg's backup engine)
set "LLAMA_SERVER=C:\Users\light\llamacpp\llama-server.exe"
set "YGG_GGUF=C:\Users\light\.ollama\models\blobs\sha256-e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d"
if exist "%LLAMA_SERVER%" (
  echo  [0/4] Starting llama.cpp fallback (port 8080)...
  start "Ygg llama.cpp fallback" /min "%LLAMA_SERVER%" --model "%YGG_GGUF%" --port 8080 --host 127.0.0.1 --ctx-size 8192 --n-gpu-layers 28
)

REM -- Start Ollama (Yggdrasil's primary engine) — safe to run if already up
echo  [1/4] Starting Ollama (Yggdrasil)...
start "Ollama" /min cmd /c "ollama serve"
timeout /t 3 /nobreak >nul

REM -- Start DSpark proxy (port 8000)
echo  [2/4] Starting DSpark proxy (port 8000)...
start "DSpark Proxy" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\dspark-proxy && node server.js"

REM -- Start Yggdrasil workbench (port 4000)
echo  [3/4] Starting Yggdrasil workbench (port 4000)...
start "Yggdrasil Workbench" /min cmd /c "cd /d C:\Users\light\Flameclyffe\apps\starwell-server && set OPENAI_API_KEY=%OPENAI_API_KEY% && set LIOREAL_API_KEY=%OPENAI_API_KEY% && set ANTHROPIC_API_KEY=%ANTHROPIC_API_KEY% && set UIAL_API_KEY=%ANTHROPIC_API_KEY% && set EXA_API_KEY=%EXA_API_KEY% && node server.js"

REM -- Wait for servers to be ready then open the Grove
echo  [4/4] Opening the Grove...
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:4000/grove.html"

echo.
echo  The Grove is open. o7
echo.
