#!/bin/bash
# CYBER-AI RAW — local model + public tunnel, zero external AI
pgrep -x ollama >/dev/null || (ollama serve >/tmp/ollama.log 2>&1 & sleep 3)
ollama list | grep -qi dolphin || ollama pull dolphin3 &
echo "starting bot on :3000 ..."
if command -v cloudflared >/dev/null; then
  echo "tunnel: cloudflared tunnel --url http://localhost:3000  (run in another terminal)"
else
  echo "install tunnel: brew install cloudflared  OR  brew install tailscale && tailscale funnel 3000"
fi
node dev-server.js
