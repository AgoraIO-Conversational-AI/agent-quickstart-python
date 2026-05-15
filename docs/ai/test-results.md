# PD Documentation Test Results

Tested: 2026-05-15
Agent: Cursor agent (Anthropic Claude family) with delegated `explore` sub-agents
Repo: `agent-quickstart-python`

## Summary

- Total questions: 8
- Passed: 5
- L1 gaps: 3 (venv path, Agent state, verification layer count)
- L2 gaps: 1 (`verify-local-proxy.ts` accuracy)
- Cross-ref issues: 1 ("four scripts" vs "four layers")

All findings were addressed in the docs and retested.

## Results

### Setup & Build

| #   | Question                                                                | Answer Correct? | Files Read                                                                                          | Level Loaded     | Result |
| --- | ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 1   | How do I install and run dev for web + server?                          | Partial → Pass after fix | `AGENTS.md`, `L0`, `L1/01_setup.md`, `package.json`, `server/src/server.py`                       | L0+L1 sufficient | L1 gap → Pass |
| 2   | Which env vars are required, where do `NEXT_PUBLIC_*` belong, and how does the proxy choose where to send `/api/*`? | Yes | `L0`, `L1/01_setup.md`, `L1/02_architecture.md`, `L1/06_interfaces.md`, `web/next.config.ts`     | L0+L1 sufficient | Pass   |

### Test & Run

| #   | Question                                                                | Answer Correct? | Files Read                                                                                          | Level Loaded     | Result |
| --- | ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 3   | What does the verification suite cover and how do I run the whole chain offline? | Partial → Pass after fix | `L1/04_conventions.md`, `L1/05_workflows.md`, `L2/verification_scripts.md`, `package.json` | L2 needed        | Cross-ref gap → Pass |
| 4   | What's the boundary between `web/` and `server/`, and where would I add a new `/api/foo` endpoint? | Yes | `L1/03_code_map.md`, `L1/04_conventions.md`, `L1/05_workflows.md`, `L1/06_interfaces.md`, `server/src/server.py`, `web/next.config.ts` | L0+L1 sufficient | Pass   |

### Conventions

| #   | Question                                                                | Answer Correct? | Files Read                                                                                          | Level Loaded     | Result |
| --- | ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 5   | Is the FastAPI `Agent` stateless? Where does session state live, and what's the risk under multi-worker deploy? | Partial → Pass after fix | `L1/04_conventions.md`, `L1/07_gotchas.md`, `L2/managed_agent_config.md`, `server/src/agent.py` | L1 + L2 | L1 gap → Pass |
| 6   | Where does the agent prompt / voice / VAD config live? How do I change it? | Yes (parity confirmed) | `L1/05_workflows.md`, `L2/managed_agent_config.md`, `server/src/agent.py` | L2 needed        | Pass   |

### Development

| #   | Question                                                                | Answer Correct? | Files Read                                                                                          | Level Loaded     | Result |
| --- | ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 7   | How does `verify-local-proxy.ts` actually work? Does it spawn Next dev? | Partial → Pass after fix | `L2/verification_scripts.md`, `web/scripts/verify-local-proxy.ts`                          | L2 needed        | L2 accuracy gap → Pass |

### Deep Dive

| #   | Question                                                                | Answer Correct? | Files Read                                                                                          | Level Loaded     | Result |
| --- | ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| 8   | Why does the client replace `uid=0` before RTM login, and how does renewal stay consistent? | Yes | `L1/07_gotchas.md`, `L2/session_lifecycle.md`, `web/src/components/ConversationComponent.tsx`, `server/src/agent.py` | L2 needed        | Pass   |

## Recommended Fixes (Applied)

- [x] **L1/01_setup.md (Finding 1)**: switch to `server/venv` everywhere to match `package.json` `dev:backend`, `setup:backend`, `backend`, and `clean:backend`; add explicit note that scripts assume `server/venv/` (no leading dot).
- [x] **L1/04_conventions.md (Finding 5 + venv drift)**: rewrite the Agent description as a module-level singleton holding `self._sessions: Dict[str, Any]` keyed by `agent_id`; fix Python deps row to reference `server/venv`.
- [x] **L1/07_gotchas.md (Finding 5)**: align singleton gotcha with the same `_sessions` framing so it matches `server/src/agent.py` exactly.
- [x] **L1/04_conventions.md + L2/verification_scripts.md (Finding 3)**: reconcile to "four layers": `py_compile` (`verify:backend`), `verify-api-contracts.ts`, `verify-local-proxy.ts`, `verify-local-fastapi.ts`, plus the `verify:web:build` step; cross-link from L1 Testing into the L2 table.
- [x] **L2/verification_scripts.md (Finding 7)**: rewrite the `verify-local-proxy.ts` row of the summary table to match the dedicated section ("Imports `next.config.ts`, resolves rewrites, fetches an in-process stub directly").

## Review Fix Retest

Retested: 2026-05-15

| Finding                                                | Source checked                                                                                          | Docs changed                                                          | Result | Notes |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ | ----- |
| Venv canonical path                                    | `package.json` (`dev:backend`, `setup:backend`, `backend`, `clean:backend`)                              | `L1/01_setup.md`, `L1/04_conventions.md`                                | Pass   | All docs now use `server/venv`. |
| Agent singleton + `_sessions`                          | `server/src/agent.py`                                                                                   | `L1/04_conventions.md`, `L1/07_gotchas.md`                              | Pass   | `Dict[str, Any]` keyed by `agent_id` documented, with start/stop lifecycle. |
| "Four scripts" vs "four layers"                        | `package.json`, `L2/verification_scripts.md`                                                             | `L1/04_conventions.md`                                                   | Pass   | L1 Testing aligned to the four-layer wording used in L2. |
| `verify-local-proxy.ts` accuracy (summary + body)      | `web/scripts/verify-local-proxy.ts`, `web/next.config.ts`                                                | `L2/verification_scripts.md`                                            | Pass   | Summary and dedicated section both describe in-process stub + direct rewrite fetch. |
