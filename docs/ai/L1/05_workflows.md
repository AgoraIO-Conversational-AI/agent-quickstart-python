# 05 Workflows

> Step-by-step recipes for the tasks contributors actually do in this repo.

## Add a New Backend Endpoint

1. Add a route in `server/src/server.py` (`@router.get("/path")` or `@router.post(...)`).
2. Implement the handler `async def`. Use existing pydantic models or add a new one. Validate via FastAPI's automatic validation; for cross-field rules, raise `HTTPException` directly.
3. If the endpoint needs new service logic, add a method to `Agent` in `server/src/agent.py`.
4. Add the corresponding rewrite in `web/next.config.ts`:
   ```ts
   { source: '/api/<name>', destination: `${backendUrl}/<name>` }
   ```
5. Add a fetch helper in `web/src/services/api.ts`.
6. Extend `web/scripts/verify-api-contracts.ts` with at least one happy-path and one validation case.
7. Run `bun run verify:backend && bun run verify:web:api`. Extend `verify-local-proxy.ts` / `verify-local-fastapi.ts` if the route belongs in the smoke flow.

## Change Agent Prompt, VAD, Model, or Voice

Edit `server/src/agent.py`:

- **Prompt:** modify the `ADA_PROMPT` constant.
- **Greeting:** set `AGENT_GREETING` in `server/.env.local`, or change the default in the constructor.
- **VAD:** edit `turn_detection` dict (start/end mode, speech threshold, silence/interrupt durations).
- **LLM:** change the `OpenAI(...)` constructor (model, history, BYOK key, base URL).
- **STT:** change the `DeepgramSTT(...)` constructor.
- **TTS:** change the `MiniMaxTTS(...)` constructor (`model`, `voice_id`).
- **Agent parameters:** edit `AgoraAgent(parameters=...)` and `advanced_features` for server-side RTM data channel, error messages, metrics, and tool flags.
- **Session:** edit `create_async_session(...)` parameters (`idle_timeout`, `expires_in`, `enable_string_uid`).

After editing, run `bun run verify:backend && bun run verify:web:api`.

## Deploy the Web and Backend Separately

- **Web (Next.js):** build via `cd web && bun run build`. Configure `AGENT_BACKEND_URL` on the deploy target to the public URL of your FastAPI service. Serve with `bun run start` or any Node hosting platform.
- **Backend (FastAPI):** install deps from `server/requirements.txt`, set `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, optional `AGENT_GREETING`/`PORT`, and run `python3 server/src/server.py` or `uvicorn server.src.server:app --host 0.0.0.0 --port $PORT`.
- The two deploys never share env vars. The browser only ever needs `/api/*` to resolve via the rewrite layer.

## Verify Locally

```bash
bun run doctor              # quick gate
bun run doctor:local        # adds python3 + env checks
bun run verify:backend      # py_compile sanity
bun run verify:web:api      # contract harness on the rewrite shape
bun run verify:web:proxy    # static fake-server smoke
bun run verify:local:fastapi # spawns FakeAgent inside FastAPI
bun run verify:web:build    # production build
bun run verify              # alias for production-bound web checks
bun run verify:local        # full chain including backend + fastapi + proxy + build
```

## Run `bun run dev`

```bash
bun run dev
# concurrently {
#   dev:backend  → python3 server/src/server.py
#   dev:frontend → cd web && AGENT_BACKEND_URL=http://localhost:8000 bun run dev
# }
```

`concurrently` propagates Ctrl-C to both processes. If one crashes, both exit.

## Token Renewal

The browser receives `token-privilege-will-expire` from RTC and calls `getConfig()` twice — once with the RTC `client.uid`, once with the stored `agoraData.uid`. The Python backend re-issues RTM-capable RTC tokens via `generate_convo_ai_token`. If a request passes `uid=0`, the backend generates a non-zero UID because Agora RTC treats `0` as auto-assign but RTM token subjects cannot use `0`.

## Update Module Guides After Behavior Changes

If you change runtime behavior, also update:

- `README.md`
- Repo-root `ARCHITECTURE.md` and `AGENTS.md`
- The relevant file in `docs/ai/L1/` (often `02_architecture.md` and `03_code_map.md`) and `Last Reviewed` in `docs/ai/L0_repo_card.md`

## Roll Back a Bad Deploy

- **Web:** redeploy the previous Next build on the host platform.
- **Backend:** redeploy the previous Python source tarball or container. FastAPI is a single-process service — restart with the older artifact.

## Related Deep Dives

- [Managed Agent Config](L2/managed_agent_config.md) — Every tunable field on the agent.
- [Session Lifecycle](L2/session_lifecycle.md) — Renewal sequence in detail.
