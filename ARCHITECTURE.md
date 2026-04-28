# Agora Conversational AI Demo — Architecture

This quickstart supports two runtime environments. The UI is the same in both modes, but the owner of `/api/*` changes by environment.

## Local Python-Backed Development

```
Browser
  ↓
Next.js app on :3000
  ↓
/api/* route handlers proxy through AGENT_BACKEND_URL
  ↓
FastAPI service on :8000
  ↓
Agora Cloud Services
```

- `web` owns the browser UI and the `/api/*` entrypoints
- `server` owns the actual token generation and agent start/stop logic
- this is the mode used by `bun run dev`

## Single-Target Web Deployment

```
Browser
  ↓
Next.js app
  ↓
/api/* route handlers run in-process
  ↓
Agora Cloud Services
```

- `web` owns both the UI and the deployed `/api/*` implementation
- `server` is not required for this deployment path

## Shared Conversation Flow

### 1. Connection

```
Frontend: GET /api/get_config
  → Generate Token007 config for a user UID, agent UID, and channel
  → Frontend joins RTC and logs into RTM
```

### 2. Agent Start

```
Frontend: POST /api/v2/startAgent { channelName, rtcUid, userUid }
  → Build agent session
  → Scope remote_uids to the requesting user
  → Start session and return agent_id
```

### 3. Conversation

```
User audio → RTC
  → Managed ASR, LLM, and TTS pipeline
  → Agent audio + RTM transcript events
  → UIKit transcript and visualizer in the web app
```

### 4. Agent Stop

```
Frontend: POST /api/v2/stopAgent { agentId }
  → Stop session directly or through stateless fallback
  → Client cleans up RTC and RTM state
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_config` | GET | Generate connection config (Token007, channel, UIDs) |
| `/v2/startAgent` | POST | Start the agent session |
| `/v2/stopAgent` | POST | Stop the agent by `agent_id` |

Frontend calls these as `/api/*`. In local Python mode, the Next handlers proxy to `AGENT_BACKEND_URL`; in Vercel they run in-process inside the Next app.

## Authentication

Token007 (AccessToken2) — generated from `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` only. No API_KEY/API_SECRET needed. The SDK handles token generation and API auth internally.

## Detailed Documentation

- [web/ARCHITECTURE.md](./web/ARCHITECTURE.md) — Frontend architecture, components, state management
- [server/ARCHITECTURE.md](./server/ARCHITECTURE.md) — Backend architecture, endpoints, AI provider config
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [README.md](./README.md) — Quick start, configuration, deployment
