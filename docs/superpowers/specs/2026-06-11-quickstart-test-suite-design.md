# agent-quickstart-python — Standalone Test Suite Design

**Date:** 2026-06-11
**Status:** Approved
**Repo:** `agent-quickstart-python`
**Branch:** `test/add-suite` off `main`
**Ported from:** the `recipe-agent-custom-llm` test suite (same design, adapted for this repo's single managed backend).

## Goal

Add a **standalone, multi-platform** automated test suite to the quickstart — pytest for `server/` and `bun test` for `web/` — plus GitHub Actions CI across `{ubuntu, macos, windows} × Python {3.10, 3.13}`. This is **sub-project 1 of 3**; the Docker image and the nightly build follow as separate cycles.

## Context (how this repo differs from custom-llm)

- **Single `server/` backend** with **managed vendors**: `OpenAI(model="gpt-4o-mini")` + `DeepgramSTT` + `MiniMaxTTS`. There is **no `llm/`** dir and no custom LLM endpoint.
- `Agent.__init__` requires only `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` (no `CUSTOM_LLM_*`).
- `web/src/services/api.ts` and `web/src/lib/conversation.ts` are **byte-identical** to the custom-llm repo, so the web tests port verbatim.
- No existing CI, tests, or Docker.

## Definitions

- **Standalone:** no Agora cloud / ngrok / real credentials / running stack. `pip install` deps + `pytest`, or `bun test`. The single cloud-facing call (`AgoraAgent.create_async_session`) is **mocked**; everything else runs for real (FastAPI `TestClient`, pure web functions). Tests are self-contained.
- **Multi-platform:** the same `pytest`/`bun test` commands run on Linux/macOS/Windows; CI proves it across the matrix.

## Locked Decisions

1. **Frameworks:** `pytest` for `server/`; `bun test` for `web/`.
2. **Coverage:** `server/` (FastAPI routes + `Agent` wiring), `web/` (`api.ts` client + `conversation.ts` helpers). No `llm/` (none exists).
3. **Cloud mocked:** `server/tests` never hit Agora cloud; `AgoraAgent.create_async_session` is monkeypatched.
4. **CI matrix:** `{ubuntu-latest, macos-latest, windows-latest} × Python {3.10, 3.13}` (pytest job) + a Bun job (web). On push + PR. `workflow_call` is **not** added here (that's the nightly cycle).
5. **Python floor bump:** raise the documented floor **3.8 → 3.10** (the latest fastapi/uvicorn/pydantic already require ≥3.10).
6. **No production-code changes** beyond what testability strictly requires (the code is already test-friendly; `server.agent` is module-level and swappable, and `server/scripts/run_fake_server.py` already proves the fake-agent pattern).

## Layout

```
server/
  requirements-dev.txt        # pytest>=7.4, httpx>=0.24
  tests/
    __init__.py               # empty
    conftest.py               # fake env, dotenv-neutralize, FakeAgent, TestClient fixtures
    test_agent.py             # Agent env validation + managed-OpenAI wiring (session mocked)
    test_server.py            # FastAPI routes via TestClient + FakeAgent
web/
  src/services/api.test.ts        # getConfig/startAgent/stopAgent (fetch mocked) — verbatim from custom-llm
  src/lib/conversation.test.ts    # transcript normalization helpers — verbatim from custom-llm
.github/workflows/ci.yml      # backend matrix (server only) + bun web job
```

## Test Coverage Detail

### `server/tests/conftest.py`
- `fake_env` fixture: monkeypatch `dotenv.load_dotenv` to a no-op (server.py loads `.env.local` with `override=True`, which would clobber the test env), then set **`AGORA_APP_ID` + `AGORA_APP_CERTIFICATE`** to 32-hex fakes. (No `CUSTOM_LLM_*` — this repo has none.)
- `server_module` fixture: pop `server`/`agent` from `sys.modules`, import `server` fresh under the fake env.
- `client` fixture: `fastapi.testclient.TestClient(server.app)` with `server.agent` swapped for a `FakeAgent` (mirrors `server/scripts/run_fake_server.py`); expose `client.fake_agent`.
- `FakeAgent.start(channel_name, agent_uid, user_uid, output_audio_codec=None)` returns `{"agent_id": f"fake-agent-{agent_uid}", "channel_name", "status": "started"}`; `.stop(agent_id)` records the id.

### `server/tests/test_agent.py` (cloud mocked)
- `Agent()` raises `ValueError` when `AGORA_APP_ID` **or** `AGORA_APP_CERTIFICATE` is missing (parametrized over those two — the only required vars).
- With full env, `Agent()` constructs without network.
- **Managed-vendor wiring:** monkeypatch `agora_agent.agentkit.Agent.create_async_session` to capture `self.llm` and return a fake session whose `start()` returns `"test-agent-id"`. Assert `start(...)` returns `{"agent_id": "test-agent-id", "channel_name": "ch", "status": "started"}`, and the captured LLM config is the **managed OpenAI** vendor:
  - `captured["llm"]["url"] == "https://api.openai.com/v1/chat/completions"`
  - `captured["llm"]["params"]["model"] == "gpt-4o-mini"`
  - `captured["llm"]["style"] == "openai"`
  - (Managed `OpenAI` has **no** `vendor:"custom"` key — that was CustomLLM-only.)
- `stop()` uses the active session's `stop()`, then falls back to `client.stop_agent()` for an unknown id (both mocked).

### `server/tests/test_server.py` (TestClient + FakeAgent)
- `GET /get_config`: returns `{code:0, msg:"success", data:{app_id, token, uid, channel_name, agent_uid}}`; `token` is a non-empty locally-signed string; `uid=0`/missing is remapped to a concrete non-zero uid; `channel_name` starts with **`ai-conversation-`**.
- `POST /startAgent {channelName, rtcUid, userUid}`: calls `agent.start` with those args; returns `{code:0, msg, data:{agent_id, channel_name, status}}`; forwards `parameters.output_audio_codec` when present.
- `POST /stopAgent {agentId}`: returns `{code:0, msg:"success"}`.
- Error mapping: a fake agent raising `ValueError` → 400; `RuntimeError` → 500; `agent=None` (misconfigured) → 500 on each route.

### `web/src/services/api.test.ts` + `web/src/lib/conversation.test.ts` (`bun test`)
Copied **verbatim** from the custom-llm repo (the `api.ts` and `conversation.ts` modules are byte-identical):
- `api.test.ts`: mock `fetch`; assert `getConfig` GETs `/api/get_config` with query and returns `data`; `startAgent` POSTs `{channelName, rtcUid, userUid}` → `agent_id`; `stopAgent` POSTs `{agentId}`; error response throws.
- `conversation.test.ts`: `normalizeTranscriptSpacing` (`"Hello.World,now  ok"` → `"Hello. World, now ok"`); `normalizeTranscript` remaps `uid "0"` → local uid and normalizes text.

## CI (`.github/workflows/ci.yml`)

Two jobs on `push` + `pull_request`:
- **`backend`** — `matrix.os: [ubuntu-latest, macos-latest, windows-latest]`, `python-version: ["3.10", "3.13"]`, `fail-fast: false`. Steps: checkout → `actions/setup-python` → `cd server`, `pip install -r requirements.txt -r requirements-dev.txt`, `pytest tests -v`. (One package, no `llm` step.)
- **`web`** — `ubuntu-latest`: `oven-sh/setup-bun` → `bun install` → `cd web && bun test`.

## Doc update (Python floor 3.8 → 3.10)

Update the README prerequisite `Python 3.8+` → `Python 3.10+`, and add a one-line tests note (`pytest` in `server/`, `bun test` in `web/`; CI on Linux/macOS/Windows × Python 3.10 & 3.13). Check `server/README.md`, `AGENTS.md`, and `docs/ai/` for any other `3.8` mention and bump them too. `requirements.txt` pins are unchanged.

## Testing / Verification (of this work)

- `cd server && pip install -r requirements.txt -r requirements-dev.txt && pytest tests` passes.
- `cd web && bun install && bun test` passes.
- The existing `bun run verify:*` scripts still pass (no regression).
- CI green across the matrix on the PR.

## Risks / Notes

- **Mock seam** = `agora_agent.agentkit.Agent.create_async_session`; the captured `self.llm` is the real `OpenAI.to_config()` (managed). Verified shape: `{url, params:{model,...}, style:"openai", input_modalities:["text"], ...}` — **no `vendor` key**.
- **dotenv neutralization** is load-bearing: without it, a developer's real `server/.env.local` (loaded `override=True`) would clobber the deterministic test env.
- **Tests must pass against existing code.** A failure is a real finding (e.g., the quickstart's `agent.py` env defaults) — surface it, don't weaken the test. (Note: unlike custom-llm, this repo's `Agent` has no custom-key default, so the dead-guard bug we fixed there is not expected here.)
- **3.8/3.9 intentionally dropped** so all users get the modern fastapi/pydantic stack.
- **Next cycles:** Docker image (sub-project 2) and nightly (sub-project 3) reuse this repo's `ci.yml` and a `docker.yml`; this cycle deliberately does **not** add `workflow_call` (that lands with the nightly).
