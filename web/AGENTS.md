# Web Client Agent Guide

Use this guide when changing files under `web/`.

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- `agora-rtc-react`
- `agora-rtm`
- `agora-agent-client-toolkit`
- `agora-agent-uikit`

## What This Module Owns

- The landing screen and live conversation UI
- RTC client setup and channel join lifecycle
- RTM login, transcript handling, and token renewal
- Web-facing `/api/*` route handlers for quick deployment
- Optional local proxy fallback to the Python backend through `AGENT_BACKEND_URL`

## Important Files

- `app/page.tsx`: root page and Agora provider setup
- `app/api/**/route.ts`: server-side API handlers used in deployment and local proxy mode
- `src/components/app.tsx`: user-facing conversation experience
- `src/hooks/useAgoraConnection.ts`: RTC/RTM/agent lifecycle
- `src/lib/conversation.ts`: transcript helpers
- `src/lib/server/agora.ts`: server-side token and agent helpers
- `src/services/api.ts`: browser API client
- `next.config.ts`: Turbopack root configuration for the nested app

## Request Flow

### Local Development

- Run `bun run dev` from the repo root
- The Next route handlers stay in the request path
- They proxy to `http://localhost:8000` when `AGENT_BACKEND_URL` is set by the root scripts

### Deployment

- Deploy `web` as the app root
- The same route handlers run in-process and generate config or start/stop agents directly

## Working Rules

- Keep the route handlers usable in both local proxy mode and deployed in-app mode.
- Do not add a global rewrite-based proxy.
- Keep RTC client creation StrictMode-safe.
- Keep transcript speaker mapping based on actual UIDs, not heuristics.
- When adding new env requirements for deployed mode, update `.env.local.example` and the root README.

## Commands

From the repo root:

```bash
bun run frontend
bun run verify:web
```

Useful narrower check:

```bash
bun run verify:web:api
bun run verify:local:fastapi
```

`bun run verify:local:fastapi` boots the FastAPI app and checks the Next proxy path against its real routes, but swaps in a fake agent implementation so the smoke test stays fast and deterministic.

From `web/` directly:

```bash
bun run doctor
bun run verify
```
