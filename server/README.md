# Agora Agent Service

Agora Conversational AI Agent service built with FastAPI.

## Quick Start

Use the repo-root [README.md](../README.md) for the normal full-stack local flow. This document is for working on the Python backend module directly.

Follow [Get started with Agora](https://docs.agora.io/en/conversational-ai/get-started/manage-agora-account#enable-conversational-ai) to get the **App ID** and **App Certificate** and enable the **Conversational AI** service.

From `server/`:

### 1. Configure Environment

Preferred:

```bash
agora login
agora project create my-first-voice-agent --feature rtc --feature convoai
agora project use my-first-voice-agent
agora project env write .env.local --with-secrets
```

Reference fallback:

```bash
cp .env.example .env.local
```

`.env.example` is the reference template. If you are not using the Agora CLI, edit `.env.local` and fill in your Agora credentials:
- `AGORA_APP_ID` - Your Agora App ID (Required)
- `AGORA_APP_CERTIFICATE` - Your Agora App Certificate (Required)
- Agora managed provider access should be enabled for this project

**Note**: The service uses Token007 authentication generated from `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`. Third-party vendor keys are not required in this default managed setup. The current default chain matches the Next.js quickstart: `DeepgramSTT` (`nova-3`) + `OpenAI` (`gpt-4o-mini`) + `MiniMaxTTS` (`speech_2_6_turbo` / `English_captivating_female1`). The FastAPI sample now uses `AsyncAgora` so the request path matches the local Agora guidance for async frameworks.

### 2. Install Dependencies

**Option A: Using Virtual Environment (Recommended)**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Option B: Global Installation (Not Recommended)**
```bash
pip install -r requirements.txt
```

### 3. Start Service

```bash
# If using virtual environment, make sure it's activated first
python src/server.py
```

The service will start on port 8000 (or the port specified in `.env.local`).

## How This Fits The Repo

- Full-stack local development: run `bun run dev` from the repo root. The browser still calls Next `/api/*`, and those route handlers proxy to this FastAPI service.
- Module-local backend work: use the commands in this README when you only need to run or inspect the Python service itself.
- Single-target web deployment: this Python service is not required unless you intentionally point `AGENT_BACKEND_URL` at an external backend.

### 4. Test API

```bash
# Test config generation
curl http://localhost:8000/get_config

# Test agent start
curl -X POST http://localhost:8000/v2/startAgent \
  -H "Content-Type: application/json" \
  -d '{"channelName": "test_channel", "rtcUid": 123456, "userUid": 789012}'

# Test agent stop (use agent_id from start response)
curl -X POST http://localhost:8000/v2/stopAgent \
  -H "Content-Type: application/json" \
  -d '{"agentId": "your_agent_id"}'
```

## API Endpoints

- `GET /get_config` - Generate connection configuration
- `POST /v2/startAgent` - Start an agent
- `POST /v2/stopAgent` - Stop an agent

`/get_config` now issues one-hour RTC plus RTM tokens. The web client renews both before expiry, matching the reference Next.js session model.

The repo-level `bun run verify:local:fastapi` check exercises this FastAPI app through the Next proxy path, but it swaps in a fake agent implementation so route wiring can be verified without depending on a live agent start.

## Requirements

- Python >= 3.8
- Dependencies listed in `requirements.txt`

## SDK

This project uses `agora-agent-server-sdk`:
- Package: `agora_agent`
- Agent builder: `agora_agent.agentkit.Agent` with fluent `.with_llm()` / `.with_tts()` / `.with_stt()` API
- Default vendors: `DeepgramSTT`, `OpenAI`, `MiniMaxTTS` from `agora_agent.agentkit.vendors`
- Optional BYOK examples in `src/agent.py`: `DeepgramSTT`, `OpenAI(api_key=...)`, `ElevenLabsTTS`
- Token: `agora_agent.agentkit.token.generate_convo_ai_token`
