# 07 Gotchas

> Concrete pitfalls that have been hit before. Read this before refactoring across the proxy boundary.

## `AGENT_BACKEND_URL` Is Mandatory for the Web Client

`web/next.config.ts` only registers `/api/*` rewrites when `AGENT_BACKEND_URL` is a non-empty trimmed string. If it is unset:

- `web/scripts/doctor.ts` exits with an error.
- `bun run dev` for the web alone returns 404 on every `/api/*` call.
- The browser surfaces "failed to start agent" with no obvious cause.

`bun run dev` always exports `AGENT_BACKEND_URL=http://localhost:8000`. Deploy hosts must set it manually.

## No `web/app/api/**/route.ts`

`web/scripts/verify-api-contracts.ts` asserts that no `app/api` route handlers exist. The web client must be rewrite-only. Adding a Next route handler would:

- Shadow the rewrite path (Next matches local routes before applying rewrites).
- Diverge behavior between local dev and deployed environments.
- Fail `bun run verify:web:api` immediately.

## Doc / Code Drift

- Per-module `AGENTS.md` / `ARCHITECTURE.md` under `web/` and `server/` were removed. Use repo-root `ARCHITECTURE.md`, `AGENTS.md`, and `docs/ai/L1/` as the maintained entry points.
- `web/docs/ARCHITECTURE.md` is a generic Vite + Zustand template; it does not describe this Next app.
- When reconciling older notes with the code, watch for: no `useAgoraConnection` hook (lifecycle is inline in `LandingPage.tsx` / `ConversationComponent.tsx`), Turbopack mentions vs `web/package.json` using `next dev --webpack`, and FastAPI session APIs (`create_async_session`, error mapping via `_to_http_error`) vs outdated snippets.

Until stale copies reappear elsewhere, prefer code + `docs/ai/` as the source of truth.

## StrictMode + RTC

- `web/next.config.ts` sets `reactStrictMode: true`. RTC client creation must stay inside the dynamically imported `AgoraRTCProvider` with a `useRef`-held instance.
- `useJoin`, `useLocalMicrophoneTrack`, `usePublish` own their lifecycles; do not call `.leave()`, `.close()`, or `unpublish` manually.

## `uid="0"` Sentinel

`normalizeTranscript` in `web/src/lib/conversation.ts` maps `uid === '0'` to the local UID before rendering. New transcript renderers must use the normalized turn list — bypassing the helper puts the user on the wrong side.

## Token Renewal Uses Two `getConfig` Calls

`handleTokenWillExpire` in `LandingPage.tsx` issues two `getConfig()` requests:

- One with the RTC `client.uid` for the RTC renewal.
- One with the stored `agoraData.uid` for the RTM renewal.

`ConversationComponent` skips renewal entirely if `joinedUID` is `0`. If you change UID handling, walk this path end-to-end before merging.

## FastAPI Agent Is a Module-Level Singleton (and Holds Sessions)

`server.py` runs `agent = Agent()` at import time. Every request reuses the same instance. Important consequences:

- `Agent.__init__` is the only place env vars are read. If `AGORA_APP_ID` is missing at import and the constructor raises, `agent` stays `None` and route handlers return `500`.
- `Agent._sessions: Dict[str, Any]` holds active sessions keyed by `agent_id` across requests. `Agent.start` writes; `Agent.stop` pops. Treat `_sessions` as the source of truth for live sessions on this worker.
- Per-request data (validated body, query params) lives in pydantic models or local variables. Do not stash arbitrary request state on `Agent` — only cross-call session bookkeeping belongs there.
- Reloading via `uvicorn --reload` re-runs `Agent()`. In production, the singleton lives for the life of the worker, so a process restart resets `_sessions`.

## CORS Is Wide Open

`server/src/server.py` uses `CORSMiddleware(allow_origins=["*"], allow_credentials=True)`. This is fine for a local quickstart but is **not** appropriate for production. Tighten this before exposing the FastAPI service publicly.

## `loadEnvFiles` Is CWD-Sensitive

`server.py` calls `load_dotenv` for `.env.local` then `.env` from the current working directory. Running `python3 src/server.py` from inside `server/` (which is what `bun run dev:backend` does) finds them. Running from the repo root would silently skip them.

## Missing Static Assets

`web/app/layout.tsx` references favicon PNGs that are not in `web/public/`. Add the files or remove the references; do not silence the resulting 404s.

## `server/scripts/run_fake_server.py` Is for Tests Only

The fake server replaces `Agent` with `FakeAgent` and is started by `verify:local:fastapi`. Do not deploy it — it skips all real Agora calls and accepts any input.

## No `Co-Authored-By` in Commit Messages

The repo's git history is human-authored. Keep it that way — see `AGENTS.md` "Git Conventions."

## Related Deep Dives

- [Managed Agent Config](L2/managed_agent_config.md) — Backend defaults.
- [Verification Scripts](L2/verification_scripts.md) — Each verify script in detail.
