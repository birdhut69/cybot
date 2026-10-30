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
