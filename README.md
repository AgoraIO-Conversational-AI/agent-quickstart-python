# Agora Conversational AI Web Demo

Real-time voice conversation with AI agents, featuring live transcription and log monitoring.

## Prerequisites

- [Bun](https://bun.sh/) (package manager & script runner)
- Python 3.8+
- [Agora Account](https://console.agora.io/) with App ID & App Certificate
- Agora project with Conversational AI managed provider support enabled

## Get Credentials via Agora CLI

The fastest way to get your App ID and App Certificate is through the [Agora CLI](https://www.npmjs.com/package/agoraio-cli). This also works for AI coding agents that can run shell commands.

```bash
# Install the CLI
npm install -g agoraio-cli

# Log in (opens browser for OAuth)
agora login

# Create a project with ConvoAI enabled, or select an existing one
agora project create my-convoai-demo --feature rtc --feature convoai
# or: agora project use <existing-project>

# Verify readiness
agora project doctor

# Get App ID and App Certificate from project details
agora project show --json
```

The `project show --json` output contains `app_id` and the App Certificate (sign key). Copy these values into `server-python/.env.local`.

If you already have an Agora project but ConvoAI is not enabled:

```bash
agora project feature enable convoai
```

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure backend
cd server-python
cp .env.example .env.local
# Fill in APP_ID and APP_CERTIFICATE (from `agora project show --json` or Agora Console)

# 3. Start services
cd ..
bun run dev
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Configuration

Edit `server-python/.env.local`:

```bash
# Agora Credentials (required — get from `agora project show --json` or Agora Console)
APP_ID=your_agora_app_id
APP_CERTIFICATE=your_agora_app_certificate

PORT=8000
```

Authentication uses Token007 (AccessToken2), generated automatically from `APP_ID` and `APP_CERTIFICATE`. Vendor credentials are no longer required in local setup; the backend defaults to the same DeepgramSTT + OpenAI + MiniMaxTTS managed configuration used by the current Next.js quickstart.

Frontend gets all configuration from the backend API — no environment variables required on the frontend side.

## Commands

```bash
bun run dev          # Start both frontend and backend
bun run backend      # Backend only (port 8000)
bun run frontend     # Frontend only (port 3000)
bun run build        # Build frontend for production
bun run clean        # Clean build artifacts and venvs
```

## Project Structure

```
.
├── web-client/       # Frontend — Next.js 16 + React 19 + TypeScript + Agora Web SDK
├── server-python/    # Backend — Python FastAPI + Agora Agent SDK
├── ARCHITECTURE.md   # System architecture and data flow
└── AGENTS.md         # AI agent development guide
```

## Troubleshooting

| Problem | Check |
|---------|-------|
| Connection issues | Backend running on port 8000? |
| Auth errors | `APP_ID` and `APP_CERTIFICATE` correct in `.env.local`? |
| Agent fails to start | Confirm Agora managed provider access is enabled for this project, then check logs at http://localhost:8000/docs |
| Frontend can't reach backend | Proxy config in `web-client/proxy.ts` |

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [web-client/](./web-client/) — Frontend details
- [server-python/](./server-python/) — Backend details

## License

See [LICENSE](./LICENSE).
