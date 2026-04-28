# Python Backend Agent Guide

Use this guide when changing files under `server/`.

## Current Role

This module is the local FastAPI backend for the quickstart. It remains the authoritative local backend when developing the full stack on one machine.

The deployed web app can also serve `/api/*` directly from Next route handlers, so do not assume Python owns production traffic in every environment.

## Current Stack

- Python 3.8+
- FastAPI
- `agora-agent-server-sdk`
- `python-dotenv`
- `uvicorn`

## Current Implementation Model

- `src/server.py` exposes `/get_config`, `/v2/startAgent`, and `/v2/stopAgent`
- `src/agent.py` wraps `AsyncAgora`
- agent sessions are scoped to the requesting user with `remote_uids=[user_uid]`
- stop is idempotent through a session stop first, then `client.stop_agent(...)` fallback
- token expiry is 1 hour
- default providers are the managed Deepgram STT, OpenAI LLM, and MiniMax TTS path used by the current quickstart

## Environment

Setup from the repo root:

```bash
cp server/.env.example server/.env.local
```

Required values:

```bash
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

Optional values:

```bash
PORT=8000
AGENT_GREETING=Custom greeting
```

Do not assume separate ASR, LLM, or TTS vendor secrets are required unless the code introduces a custom non-managed provider path.

## Important Files

- `src/server.py`: FastAPI routes and config generation
- `src/agent.py`: async agent lifecycle and provider configuration
- `.env.example`: local env template
- `README.md`: backend-specific setup and API examples

## Commands

From the repo root:

```bash
bun run backend
bun run doctor:local
bun run verify:backend
```

From `server/` directly:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.server:app --host 0.0.0.0 --port 8000 --reload
```

## Working Rules

- Keep the FastAPI handlers async-friendly.
- Keep token generation behavior aligned with the Next route handlers.
- If you change the request or response contract, update the web client and root README in the same change.
- If you change agent defaults, update both backend implementations or document the intended divergence clearly.
