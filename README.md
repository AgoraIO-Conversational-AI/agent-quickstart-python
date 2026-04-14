# Agora Conversational AI Web Demo

Real-time voice conversation with AI agents, featuring live transcription and log monitoring.

## Prerequisites

- [Bun](https://bun.sh/) (package manager & script runner)
- Python 3.8+
- [Agora CLI](https://www.npmjs.com/package/agoraio-cli) (`npm install -g agoraio-cli`)

## Quick Start

### 1. Get Agora Credentials

```bash
# Log in (opens browser for OAuth)
agora login

# Create a project with ConvoAI enabled, or select an existing one
agora project create my-convoai-demo --feature rtc --feature convoai
# or: agora project use <existing-project>

# Verify readiness
agora project doctor

# Get App ID and App Certificate
agora project show
```

The output shows your `app_id` and `app_certificate` (sign key) — you will need them in the next step.

### 2. Configure and Run

```bash
# Install dependencies
bun install

# Set up backend env
cd server-python
cp .env.example .env.local
```

Edit `server-python/.env.local` with the values from step 1:

```bash
APP_ID=<your_app_id>
APP_CERTIFICATE=<your_app_certificate>
PORT=8000
```

```bash
# Start both frontend and backend
cd ..
bun run dev
```

### 3. Verify

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

Open the frontend, start a conversation, and confirm the agent joins and responds with voice. That is your first success baseline.

## Project Structure

```
.
├── web-client/       # Frontend — Next.js 16 + React 19 + TypeScript + Agora Web SDK
├── server-python/    # Backend — Python FastAPI + Agora Agent SDK
├── ARCHITECTURE.md   # System architecture and data flow
└── AGENTS.md         # AI agent development guide
```

## Commands

```bash
bun run dev          # Start both frontend and backend
bun run backend      # Backend only (port 8000)
bun run frontend     # Frontend only (port 3000)
bun run build        # Build frontend for production
bun run clean        # Clean build artifacts and venvs
```

## Configuration Details

Authentication uses Token007 (AccessToken2), generated automatically from `APP_ID` and `APP_CERTIFICATE`. No vendor API keys are required — the backend defaults to the managed pipeline: DeepgramSTT (nova-3) + OpenAI (gpt-4o-mini) + MiniMaxTTS (speech_2_6_turbo).

Frontend gets all configuration from the backend API — no environment variables required on the frontend side.

## Troubleshooting

| Problem | Check |
|---------|-------|
| Connection issues | Backend running on port 8000? |
| Auth errors | `APP_ID` and `APP_CERTIFICATE` correct in `.env.local`? Run `agora project show` to verify. |
| Agent fails to start | Run `agora project doctor` to check ConvoAI is enabled. Check logs at http://localhost:8000/docs |
| Frontend can't reach backend | Proxy config in `web-client/proxy.ts` |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [web-client/](./web-client/) — Frontend details
- [server-python/](./server-python/) — Backend details

## License

See [LICENSE](./LICENSE).
