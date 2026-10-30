# CYBER-AI — Ethical Hacker Bot (Vercel)

Full ethical-hacking assistant: 11,500+ knowledge sections (our books + PATT, HackTricks, GTFOBins, LOLBAS, OWASP WSTG, MITRE ATT&CK), conversation memory, 4 modes, troubleshooting engine, streaming, provider fallback.

## Modes
- **Mentor** — concept + commands + expected output + next move + defense + GitHub tools
- **Commands** — copy-ready command blocks only
- **Troubleshoot** — paste an error → diagnosis → ranked fixes → verify command
- **Report** — finding write-up (evidence/impact/remediation/retest)

## Deploy

```bash
cd chatbot
vercel
```

Set env vars (Project → Settings → Environment Variables):

| Var | Example |
|---|---|
| `AI_API_KEY` | provider key |
| `AI_BASE_URL` | `https://api.openai.com/v1` |
| `AI_MODEL` | `gpt-4o-mini` |

Or a fallback chain (tried in order):

```
AI_PROVIDERS=[{"base":"https://api.groq.com/openai/v1","model":"llama-3.3-70b-versatile","key":"gsk_..."},{"base":"https://openrouter.ai/api/v1","model":"meta-llama/llama-3.3-70b-instruct","key":"sk-or-..."}]
```

OpenAI-compatible endpoints: OpenAI, Groq (free), OpenRouter (free models), Gemini (`/v1beta/openai`), local Ollama (`http://localhost:11434/v1`) — see RAW LOCAL below.

## RAW LOCAL (closest to uncensored)

```bash
ollama pull qwen2.5:14b        # or dolphin-llama3, dolphin-mixtral community fine-tunes
ollama serve
```

`AI_BASE_URL=http://localhost:11434/v1`, `AI_API_KEY=ollama`, `AI_MODEL=qwen2.5:14b`

Local models answer with fewer refusals than hosted APIs — but the lab/authorized scope still applies because *you* are responsible for what you run. Vercel cannot reach localhost; for uncensored local inference, run this UI locally (`vercel dev`) or host on your own box.

## Rebuild the brain

```bash
python3 scripts/ingest_all.py   # clones knowledge repos, rebuilds index + troubleshoot.json
```

Knowledge repos live in `data/knowledge/` (gitignored).

## Honest note on "uncensored"

Hosted providers keep their own filters — no prompt removes them. This bot gives full kill-chain methods for lab/authorized targets (legitimate content). For fully local/unfiltered, run Ollama on your machine and point `AI_BASE_URL` at it.

## WebLLM mode — zero API, pure static (local.html)

`/local.html` runs the model **inside the visitor's browser** via WebLLM/WebGPU:

- No API key, no server AI, no disk space needed anywhere
- Vercel serves only static files — deploy the repo and `https://yourapp.vercel.app/local.html` works from any device
- First visit downloads a model (~2–5GB) into browser cache; needs WebGPU (Chrome/Edge desktop best, Safari 18+ mobile OK for small models)
- Retrieval (28k-section index) runs client-side too — nothing leaves the device
- This is the closest to truly uncensored on Vercel: it's a local-model fine-tune running client-side

**Trade-off vs API mode:** browser models are smaller/slower than GPT-4o-class. Use `/` (API mode) for speed+quality, `/local.html` for zero-API RAW.
