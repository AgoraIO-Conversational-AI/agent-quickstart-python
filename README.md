# Agora Conversational AI Web Demo

Real-time voice conversation with AI agents, featuring the Agora UIKit transcript experience with two supported runtime modes:

- local Python-backed development
- single-target web deployment

## Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./.github/images/system-architecture-dark.svg">
  <img src="./.github/images/system-architecture.svg" alt="System architecture" />
</picture>

## Prerequisites

- [Python 3.8+](https://www.python.org/)
- [Bun](https://bun.sh/) (package manager & script runner)
- [Agora CLI](https://github.com/AgoraIO/cli)

## Quick Start

### Official CLI Flow

Use the Agora CLI when starting fresh. It clones the Python starter, binds an Agora project, and writes the env file.

```bash
curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh -s -- --add-to-path
agora login
agora init my-python-demo --template python
cd my-python-demo
bun install
bun run dev
```

Open http://localhost:3000 and click **Start conversation**.

If the agent does not join or transcripts do not appear, run `agora project doctor --deep` to check credentials, feature enablement, network reachability, and local env binding.

### Working from a Clone of This Repository

Use this path if you already cloned **this** repo:

```bash
bun run setup
agora project env write server/.env.local
bun run dev
```

`bun run setup` is run from the repo root and manages the Python virtual environment plus the `web` package through the root Bun workspace.

Services will be available at:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

In local development, the browser still calls `/api/*` on the Next app. Those route handlers proxy to the FastAPI backend through `AGENT_BACKEND_URL=http://localhost:8000`, which the root scripts set automatically.

## Deployment Env

Deploy `web` as a Next.js app. In this mode, the Next route handlers serve these endpoints directly:

- `/api/get_config`
- `/api/v2/startAgent`
- `/api/v2/stopAgent`

Set these env vars in the deployment target:

```bash
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
AGENT_GREETING=optional_custom_greeting
```

Do not set `AGENT_BACKEND_URL` in deployment unless you intentionally want the web app to proxy to an external Python service.

Authentication uses Token007 (AccessToken2), generated automatically from `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`. Vendor credentials are no longer required in local setup; the backend defaults to the same DeepgramSTT + OpenAI + MiniMaxTTS managed configuration used by the current Next.js quickstart.

Frontend deployment env vars live in the deployment target or `web/.env.local` when running the web app by itself. The browser does not need its own public Agora credentials in this sample.

## Commands

Recommended daily commands:

```bash
bun run setup       # install/refresh backend and frontend dependencies
bun run dev         # start both frontend and backend
```

Additional commands:

```bash
bun run doctor       # Shared repo checks for any mode
bun run doctor:local # Local Python-backed checks, including required env values
bun run backend      # Backend only (port 8000)
bun run frontend     # Frontend only (port 3000)
bun run build        # Build frontend for production
bun run verify       # Verify the single-target web deployment path
bun run verify:local # Verify backend compile + FastAPI app proxy smoke with the real route layer + web build
bun run verify:web   # Run web route contract checks + web build
bun run verify:local:fastapi # Smoke-test Next -> FastAPI app for get_config/start/stop
bun run verify:backend # Compile-check the Python backend
bun run clean        # Clean build artifacts and venvs
```

## Project Structure

```
.
├── web/       # Frontend — Next.js 16 + React 19 + TypeScript + Agora Web SDK
├── server/    # Backend — Python FastAPI + Agora Agent SDK
├── ARCHITECTURE.md   # System architecture and data flow
└── AGENTS.md         # AI agent development guide
```

## Troubleshooting

| Problem                                  | Check                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection issues                        | Backend running on port 8000?                                                                                                                                   |
| Agora credentials not written yet        | Run `agora project env write server/.env.local`.                                                                                                                |
| Auth errors                              | Run `agora project doctor --deep` and confirm `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are present in `server/.env.local`.                                    |
| Agent fails to start                     | Run `agora project doctor --deep`, then check logs at http://localhost:8000/docs.                                                                               |
| Frontend can't reach backend             | If running local Python mode, confirm `AGENT_BACKEND_URL=http://localhost:8000` is set via the root frontend scripts                                            |
| `bun install` did not update the web app | Run it from the repo root; this repo uses a Bun workspace rooted here                                                                                           |
| Deployed web app returns API auth errors | Confirm `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` are set in the deployment target and `AGENT_BACKEND_URL` is not pointing to localhost                        |
| Unsure which service owns `/api/*`       | Local dev: Next route handlers proxy to FastAPI. Deployment: Next route handlers handle requests directly unless `AGENT_BACKEND_URL` is set                     |

## Verification

Run the mode-appropriate command from the repo root after changes:

```bash
bun run verify:web
bun run verify:local
```

When working inside `web` as a standalone deployable app:

```bash
cd web
bun run doctor
bun run verify
```

Useful narrower checks:

```bash
bun run doctor
bun run doctor:local
bun run verify:web
bun run verify:local:fastapi
bun run verify:web:proxy
bun run verify:backend
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and data flow
- [AGENTS.md](./AGENTS.md) — AI agent development guide
- [web/](./web/) — Frontend details
- [server/](./server/) — Backend details

## License

See [LICENSE](./LICENSE).
