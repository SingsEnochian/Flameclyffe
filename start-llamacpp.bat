@echo off
echo.
echo  Starting llama.cpp fallback server (Yggdrasil backup)...
echo.

REM -- Path to llama-server.exe — put llama.cpp here or change this line
set "LLAMA_SERVER=C:\Users\light\llamacpp\llama-server.exe"

REM -- Yggdrasil's GGUF (DeepSeek-R1 8B — already downloaded by Ollama)
set "MODEL=C:\Users\light\.ollama\models\blobs\sha256-e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d"

if not exist "%LLAMA_SERVER%" (
  echo  [!] llama-server.exe not found at %LLAMA_SERVER%
  echo.
  echo  To install:
  echo    1. Go to: https://github.com/ggerganov/llama.cpp/releases/latest
  echo    2. Download:  llama-*-bin-win-cuda-cu12.4-x64.zip  (or the cu12.2 build)
  echo    3. Extract to: C:\Users\light\llamacpp\
  echo    4. Run this bat again.
  echo.
  pause
  exit /b 1
)

echo  [llama.cpp] Starting on port 8080 with DeepSeek-R1 8B...
echo  [llama.cpp] Model: %MODEL%
echo.
start "Ygg llama.cpp fallback" /min "%LLAMA_SERVER%" --model "%MODEL%" --port 8080 --host 127.0.0.1 --ctx-size 8192 --n-gpu-layers 28

echo  [llama.cpp] Running. Ygg fallback is live on http://127.0.0.1:8080
echo.
