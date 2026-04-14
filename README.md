# Agora Conversational AI Quickstart

A browser-based voice chat demo backed by a Python FastAPI service that creates Agora ConvoAI agents. Frontend runs on port 3000, backend on port 8000. After setup you can speak to an AI agent in real time with live transcription.

- **Frontend:** Next.js 16 + React 19 + Agora Web SDK (RTC + RTM)
- **Backend:** Python FastAPI + Agora Conversational AI Agent SDK
- **Default AI pipeline:** DeepgramSTT (nova-3) → OpenAI (gpt-4o-mini) → MiniMaxTTS — no vendor API keys needed

> **Important:** Your Agora project must have Conversational AI with managed provider support enabled. Without this, the app will start locally but agent creation will fail. The Agora CLI can verify this for you (see step 1).

## Prerequisites

- [Bun](https://bun.sh/) (package manager & script runner)
- Python 3.8+
- [Agora CLI](https://www.npmjs.com/package/agoraio-cli) (`npm install -g agoraio-cli`)
- macOS or Linux recommended (scripts use bash semantics)

## 1. Get Your Credentials

```bash
agora login
agora project create my-convoai-demo --feature rtc --feature convoai
# or select an existing project: agora project use <project-name>
agora project doctor
agora project show
```

`project show` displays your `App ID` and `App Certificate` (sign key). You will need both in the next step.

`project doctor` confirms ConvoAI is enabled and the project is ready. If it reports issues, fix them before continuing.

## 2. Configure

```bash
bun install
cp server-python/.env.example server-python/.env.local
```

Edit `server-python/.env.local`:

```bash
APP_ID=<your_app_id>
APP_CERTIFICATE=<your_app_certificate>
PORT=8000
```

That is all you need. Authentication tokens are generated automatically. No vendor API keys required.

## 3. Run

```bash
bun run dev
```

This single command handles everything: creates a Python venv if needed, installs backend dependencies, installs frontend dependencies if missing, and starts both services concurrently.

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 4. Verify First Success

1. Open http://localhost:3000
2. Allow microphone access when prompted
3. Start a conversation session
4. Say something and wait for the agent to respond
5. Confirm you hear TTS audio back and see transcription in the UI

If the UI loads but the conversation never starts, check the backend terminal output and try these API calls directly:

```bash
# Verify backend is running and credentials are loaded
curl http://localhost:8000/get_config

# Manually start an agent to isolate the issue
curl -X POST http://localhost:8000/v2/startAgent \
  -H "Content-Type: application/json" \
  -d '{"channelName": "test", "rtcUid": "123456", "userUid": "789012"}'
```

## Commands

```bash
bun run dev          # Start both frontend and backend (with auto-setup)
bun run setup        # Run full setup without starting services
bun run backend      # Backend only (port 8000)
bun run frontend     # Frontend only (port 3000)
bun run build        # Build frontend for production
bun run clean        # Clean build artifacts and venvs
```

## Project Structure

```
.
├── web-client/       # Frontend — Next.js + React + Agora Web SDK
├── server-python/    # Backend — FastAPI + Agora Agent SDK
├── ARCHITECTURE.md   # System architecture and data flow
└── AGENTS.md         # AI coding agent development guide
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| UI loads but conversation never starts | Invalid credentials or ConvoAI not enabled | Run `agora project doctor` and `agora project show` to verify. Check `APP_ID` and `APP_CERTIFICATE` in `.env.local` |
| `curl /get_config` returns error | Backend not running or env not loaded | Check backend terminal output. Verify `server-python/.env.local` exists and has valid values |
| Agent starts but no audio | Microphone not granted or browser blocking | Check browser permissions. Try a different browser |
| Frontend can't reach backend | Proxy misconfiguration | Check `web-client/proxy.ts` — backend should be on port 8000 |
| Python dependency errors | venv not created or wrong Python version | Run `bun run clean` then `bun run dev` to recreate from scratch |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow
- [AGENTS.md](./AGENTS.md) — AI coding agent development guide
- [server-python/README.md](./server-python/README.md) — Backend API details

## License

See [LICENSE](./LICENSE).
