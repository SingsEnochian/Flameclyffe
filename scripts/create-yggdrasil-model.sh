#!/usr/bin/env bash
set -euo pipefail

ollama pull deepseek-r1:8b
ollama create yggdrasil:v0.1 -f ollama/Modelfile.yggdrasil-v0.1
ollama run yggdrasil:v0.1
