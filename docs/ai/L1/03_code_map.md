# 03 Code Map

> Where to find things. Paths are relative to the repo root.

## Top-Level Tree (curated)

```
package.json              # JS workspace (web/); bun-driven orchestration scripts
bun.lock
README.md                 # Setup + commands
ARCHITECTURE.md           # Top-level environment model
AGENTS.md                 # Contributor entry point
CLAUDE.md                 # Pointer to AGENTS.md
LICENSE

web/                      # Next.js 16 app (workspace member)
  app/
    layout.tsx            # Fonts, metadata, viewport, imports @/index.css
    page.tsx              # Renders <LandingPage />
  src/
    components/
      LandingPage.tsx
      ConversationComponent.tsx
      QuickstartConversationLayout.tsx
      QuickstartTranscriptPanel.tsx
      QuickstartPipelineMetrics.tsx
      QuickstartPreCallCard.tsx
      ConnectionStatusPanel.tsx
      ConversationErrorCard.tsx
      MicrophoneSelector.tsx
      ErrorBoundary.tsx
      LoadingSkeleton.tsx
      share-button.tsx
      ui/
        button.tsx
        dropdown-menu.tsx
    lib/
      agora.ts            # DEFAULT_AGENT_UID = 123456
      conversation.ts     # Transcript normalization + visualizer mapping
      utils.ts            # cn() (clsx + tailwind-merge)
    services/
      api.ts              # getConfig / startAgent / stopAgent fetch helpers
    types/
      conversation.ts     # AgoraTokenData, AgoraRenewalTokens, ConversationComponentProps
    index.css             # Tailwind layers + theme variables
  public/                 # favicon.svg, agora logos, site.webmanifest
  scripts/
    doctor.ts             # Requires AGENT_BACKEND_URL
    verify-api-contracts.ts
    verify-local-proxy.ts
    verify-local-fastapi.ts
  biome.json
  next.config.ts          # rewrites() (see 02_architecture)
  tsconfig.json
  docs/                   # Workflow + review + project state templates

server/                   # Python FastAPI backend
  requirements.txt        # fastapi, uvicorn, requests, dotenv, agora-agents
  .env.example
  README.md
  src/
    __init__.py
    server.py             # FastAPI app + APIRouter routes
    agent.py              # Agent class: start, stop, vendor chain
  scripts/
    run_fake_server.py    # Patches Agent to a FakeAgent for smoke tests
```

## Core Files Table

| File                                                | Purpose                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `package.json` (root)                               | `concurrently`-driven dev orchestration; every workflow script.          |
| `web/next.config.ts`                                | Rewrites `/api/*` to `${AGENT_BACKEND_URL}/...` when env is set.         |
| `web/src/services/api.ts`                           | Browser API client: `getConfig`, `startAgent`, `stopAgent`.              |
| `web/src/components/LandingPage.tsx`                | Session bootstrap, RTM login, renewal handler, provider wiring.          |
| `web/src/components/ConversationComponent.tsx`      | RTC join, `AgoraVoiceAI` init, transcript/state/metrics, mic UI.         |
| `web/src/lib/conversation.ts`                       | `normalizeTranscript` (uid `"0"` remap), visualizer state mapping.       |
| `web/scripts/verify-api-contracts.ts`               | Asserts no `app/api` route handlers + browser-side fetch shapes.         |
| `web/scripts/verify-local-proxy.ts`                 | Smoke test: fake server + Next rewrites round-trip.                      |
| `web/scripts/verify-local-fastapi.ts`               | Spawns `server/scripts/run_fake_server.py`, exercises full path.         |
| `server/src/server.py`                              | FastAPI app, env loading, three routes, response envelope, error mapping.|
| `server/src/agent.py`                               | `Agent` class — vendor chain + async session lifecycle.                  |
| `server/scripts/run_fake_server.py`                 | Patches `server.agent` to `FakeAgent` for verification.                  |

## Module Boundaries

- `web/` owns React UI, RTC/RTM lifecycle, and the proxy contract.
- `server/src/` owns FastAPI handlers and all Agora SDK calls; secrets stay here.
- `web/scripts/` owns verification harnesses that gate `bun run verify`.
- Module-specific `AGENTS.md` / `ARCHITECTURE.md` under `web/` and `server/` were removed — use repo-root `ARCHITECTURE.md`, `AGENTS.md`, and this L1 tree.

## What's Not in the Repo

- **No `web/src/hooks/`** and **no `useAgoraConnection.ts`** — RTC/RTM orchestration lives in `LandingPage.tsx` and `ConversationComponent.tsx`.
- **No `pyproject.toml`** — Python deps are pip + `requirements.txt`.
- **No `tests/` directory** — Python verification is `py_compile` plus the bun-spawned smoke scripts.
- **No `Makefile`** — `bun run …` is the canonical entry point.
- **No `app/api/**/route.ts`** under `web/` — `verify-api-contracts.ts` enforces this.

## Related Deep Dives

- [Session Lifecycle](L2/session_lifecycle.md) — Concrete walk through `LandingPage` + `ConversationComponent`.
