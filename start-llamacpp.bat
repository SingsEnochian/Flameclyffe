@echo off
echo.
echo  Starting llama.cpp fallback (Yggdrasil backup)...
echo.

set LLAMA_SERVER=C:\Users\light\llamacpp\llama-server.exe
set MODEL=C:\Users\light\.ollama\models\blobs\sha256-e6a7edc1a4d7d9b2de136a221a57336b76316cfe53a252aeba814496c5ae439d

if not exist "%LLAMA_SERVER%" (
  echo [!] llama-server.exe not found at %LLAMA_SERVER%
  pause
  exit /b 1
)

echo [llama.cpp] Starting on port 8080 with DeepSeek-R1 8B...
start "Ygg llama.cpp" /min "%LLAMA_SERVER%" --model "%MODEL%" --port 8080 --host 127.0.0.1 --ctx-size 8192 --n-gpu-layers 28
echo [llama.cpp] Live on http://127.0.0.1:8080
echo.
