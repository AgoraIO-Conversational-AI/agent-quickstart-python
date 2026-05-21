# 04 Conventions

> How code is structured in this repo and what patterns to preserve when editing.

## Languages & Tooling

| Concern        | Toolchain                                                                              |
| -------------- | -------------------------------------------------------------------------------------- |
| Python format  | None enforced in-repo. Match existing style; `ruff`/`black` are not configured.        |
| Python verify  | `py_compile` over `server/src/*.py` (`bun run verify:backend`).                        |
| Python deps    | `pip install -r server/requirements.txt` inside `server/venv` (created by `bun run setup:backend`). |
| TypeScript     | `strict: true` in `web/tsconfig.json`; path alias `@/* → ./src/*`.                     |
| Linter         | Biome (`web/biome.json`); `noExplicitAny` off, `useExhaustiveDependencies` off.        |
| Format         | Biome (`bun run lint:fix` writes).                                                     |
| JS orchestration | bun (root `package.json` `concurrently`, `bun --filter web …`).                       |

There is **no ESLint config file** in `web/` — Biome is the only TS/JS linter.

## Python Patterns

- `Agent` is a class with `async def start(...)` and `async def stop(...)`. Routes call `await agent.start(...)` directly.
- The FastAPI `agent` instance is created once at module scope (`agent = Agent()`). `Agent.__init__` reads env via `os.environ`. Recreating `Agent` per request would be wasteful and is intentionally avoided.
- `Agent` is **not stateless**: it holds `self._sessions: Dict[str, Any]` keyed by `agent_id` for the lifetime of the worker. Per-request data still lives in pydantic models and locals; only cross-call session bookkeeping belongs on `self`.
- If `Agent()` fails at import (missing env, SDK import error), the module exports `agent = None` and route handlers return `500`. Always check imports during `verify:backend` before deploying.
- Errors are raised, not returned as tuples. `_to_http_error` in `server.py` maps `ValueError` → `400`, `RuntimeError` → `500`, anything else → `500`.
- Logging: `logging.getLogger("uvicorn.error")`. There is no custom logger.
- Type hints are used for pydantic models (`StartAgentRequest`, `StopAgentRequest`) and `Agent` method signatures.

## Pydantic Models

| Model                    | Lives in           | Fields                                        |
| ------------------------ | ------------------ | --------------------------------------------- |
| `StartAgentRequest`      | `server/src/server.py` | `channelName`, `rtcUid`, `userUid`, optional `parameters` |
| `StopAgentRequest`       | `server/src/server.py` | `agentId`                                    |

`StartAgentRequest.parameters` is optional — `server.py` only reads `output_audio_codec` from it.

## JSON Contract Style

- Browser sends camelCase (`channelName`, `rtcUid`, `userUid`, `agentId`).
- Server responses use the envelope `{ "code": 0, "msg": "success", "data": {...} }`.
- `data` payloads use snake_case (`app_id`, `channel_name`, `agent_uid`).

## TypeScript / React Patterns

- Components are PascalCase `.tsx` files under `web/src/components/`. Shared primitives live under `components/ui/` in lowercase files.
- The RTC client is held in a `useRef` inside a dynamically imported `AgoraRTCProvider` to survive React StrictMode double-mount.
- `useJoin`, `useLocalMicrophoneTrack`, `usePublish` from `agora-rtc-react` own their lifecycles — never call `.leave()`, `.close()`, or `unpublish` manually.
- `normalizeTranscript` in `web/src/lib/conversation.ts` remaps `uid === '0'` to the local UID. Keep this remap upstream of any side-of-screen heuristic.

## Hook Ownership Quick Reference

| Hook                       | Owns                          | Anti-pattern                                       |
| -------------------------- | ----------------------------- | -------------------------------------------------- |
| `useJoin`                  | `client.leave()`              | Manual `client.leave()` calls in cleanup            |
| `useLocalMicrophoneTrack`  | Track creation + `.close()`   | Manual `track.close()` after StrictMode unmount     |
| `usePublish`               | Publish state                 | Manually `unpublish` to mute (use `setEnabled`)     |

## Testing

- Python: no pytest harness today. `bun run verify:backend` runs `py_compile` so syntax/import regressions surface.
- TS: no Vitest harness. The verification suite has **four layers** (see `docs/ai/L1/L2/verification_scripts.md`): Python compile, contract harness (`verify-api-contracts.ts`), rewrite stub (`verify-local-proxy.ts`), and FakeAgent FastAPI smoke (`verify-local-fastapi.ts`). The `verify:web:build` step rounds them out.
- Add Python tests under `server/tests/` if you introduce them; nothing currently imports from such a path.

## File Naming

- Components: PascalCase `.tsx` (e.g. `ConversationComponent.tsx`).
- UI primitives: lowercase under `ui/` (e.g. `ui/button.tsx`).
- Scripts: kebab-case (`verify-api-contracts.ts`, `verify-local-fastapi.ts`).
- Python modules: snake_case (`server.py`, `agent.py`, `run_fake_server.py`).

## Module Discipline

- `server/src/agent.py` is the only place that imports `agora_agent.agentkit` / `agora_agent`.
- `web/src/services/api.ts` is the only place that hard-codes `/api/...` paths (apart from `next.config.ts`).
- `web/scripts/` must remain independent of `web/src/` — they run as standalone Node/bun scripts.

## Error Handling Shapes

- Python: raise `HTTPException(status_code=..., detail={"code": 1, "msg": str})` via `_to_http_error`. FastAPI serializes `detail` directly.
- TS: `api.ts` helpers throw on non-2xx HTTP; callers (`LandingPage`) catch with `try/catch` and surface a user-friendly message via the existing `ConnectionStatusPanel` issue list.

## Related Deep Dives

- [Verification Scripts](L2/verification_scripts.md) — Implementation details of the four verification harnesses.
