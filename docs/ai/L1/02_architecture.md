# 02 Architecture

> Split frontend + backend in one repo: Next.js browser app proxies `/api/*` to a Python FastAPI service that drives the Agora Conversational AI managed agent.

## High-Level Topology

```
   Browser tab                       Next.js (web/)               Python (server/)
   ┌────────────────────┐    fetch  ┌──────────────────────┐ HTTP ┌───────────────────────┐
   │ LandingPage.tsx    │──────────▶│ /api/get_config      │─────▶│ GET  /get_config      │
   │ ConversationCmp.tsx│           │ /api/startAgent      │─────▶│ POST /startAgent      │
   │ AgoraVoiceAI       │◀──────────│ /api/stopAgent       │─────▶│ POST /stopAgent       │
   │ agora-rtc-react    │  JSON     │ next.config.ts       │      │ FastAPI + CORS        │
   │ agora-rtm          │           │  rewrites()          │      │ AsyncAgora + AgoraAgent│
   └─────┬──────┬───────┘           └──────────────────────┘      └──────────┬────────────┘
         │      │ RTM data                                                   │ HTTPS
         │ RTC  │                                                            ▼
         ▼      ▼                                                Agora Conversational AI
   Agora media + RTM cloud                                       (managed STT/LLM/TTS)
```

## Voice Session Lifecycle

1. `LandingPage` calls `getConfig()` → `GET /api/get_config` → FastAPI returns `data: { app_id, token, uid, channel_name, agent_uid }`.
2. In parallel:
   - `startAgent(channel_name, Number(agent_uid), Number(uid))` → `POST /api/startAgent` → FastAPI starts the managed agent.
   - `new AgoraRTM.RTM(appId, uid).login({ token })` → `subscribe(channel_name)`.
3. `ConversationComponent` mounts inside a dynamic `AgoraRTCProvider` (RTC client in `useRef` for StrictMode safety) and:
   - `useJoin` joins RTC.
   - `useLocalMicrophoneTrack` + `usePublish` start mic publishing.
   - `AgoraVoiceAI.init({ rtcEngine, rtmConfig: { rtmEngine: rtmClient } })` wires transcripts, state, metrics.
   - `subscribeMessage(channel_name)` opens the toolkit's RTM channel.
4. End: `stopAgent(agentId)` → `POST /api/stopAgent` → FastAPI stops the agent. `rtmClient.logout()` follows.
5. Renewal: on RTC `token-privilege-will-expire`, the client fetches `getConfig()` twice (once for RTC uid, once for the stored `agoraData.uid`) and renews RTC + RTM separately.

## How `/api/*` Reaches FastAPI

`web/next.config.ts`:

```ts
async rewrites() {
  const backendUrl = (process.env.AGENT_BACKEND_URL ?? '').trim();
  if (!backendUrl) return [];
  return [
    { source: '/api/get_config',  destination: `${backendUrl}/get_config` },
    { source: '/api/startAgent',  destination: `${backendUrl}/startAgent` },
    { source: '/api/stopAgent',   destination: `${backendUrl}/stopAgent` },
  ];
}
```

If `AGENT_BACKEND_URL` is unset/empty, **no rewrites register** — the client cannot reach the backend. `bun run dev` always exports `AGENT_BACKEND_URL=http://localhost:8000` before starting Next.

## FastAPI Shape

`server/src/server.py`:

- `FastAPI(title="...", version="2.0.0")`.
- `CORSMiddleware` with `allow_origins=["*"]`, `allow_credentials=True`.
- Reads `server/.env.local` then `server/.env` via `python-dotenv` at startup, resolved relative to `server/src/server.py`.
- Constructs a single `Agent` instance at import time (`agent = Agent()`).
- Routes registered on an `APIRouter`: `GET /get_config`, `POST /startAgent`, `POST /stopAgent`.
- All responses use the envelope `{ "code": 0, "msg": "success", "data": ... }`.
- Errors funnel through `_to_http_error` → `HTTPException` (`ValueError → 400`, `RuntimeError → 500`, else `500`).
- `uvicorn.run(app, host="0.0.0.0", port=PORT)` under `if __name__ == "__main__":`.

`server/src/agent.py`:

- `get_config` treats missing, zero, and negative UIDs as "generate a usable UID" before minting an RTC+RTM token.
- `Agent.start(channel_name, rtc_uid, user_uid)` uses the module-level `AsyncAgora` client, builds `AgoraAgent` from `agora-agent-server-sdk`, and creates an async session.
- `Agent.stop(agent_id)` ends the session.

## Managed Agent Defaults (server/src/agent.py)

| Stage | Vendor       | Config highlights                                                          |
| ----- | ------------ | -------------------------------------------------------------------------- |
| STT   | `DeepgramSTT`| `model="nova-3"`, `language="en"`                                           |
| LLM   | `OpenAI`     | `model="gpt-4o-mini"`, greeting/failure overrides, history settings        |
| TTS   | `MiniMaxTTS` | `model="speech_2_6_turbo"`, `voice_id="English_captivating_female1"`        |
| VAD   | Agora        | Tunable `turn_detection` dict with start/end mode and timing thresholds    |

Agent parameters: `data_channel="rtm"`, `enable_error_message=True`, `enable_metrics=True`. Advanced features: `{"enable_rtm": True, "enable_tools": True}`. Session options: `enable_string_uid=False`, `idle_timeout=30`, `expires_in=3600`.

## Why This Shape

- Python backend gives Python developers a familiar host for Conversational AI integration.
- Next.js rewrites hide backend placement from the browser — `/api/*` is the only URL the client knows.
- Single repo keeps web and backend changes reviewable together while preserving deploy separation.

## Related Deep Dives

- [Managed Agent Config](L2/managed_agent_config.md) — Full `agent.py` chain and tunable fields.
- [Session Lifecycle](L2/session_lifecycle.md) — Detailed client orchestration including renewal.
- [Verification Scripts](L2/verification_scripts.md) — How the contract harness asserts the proxy boundary.
