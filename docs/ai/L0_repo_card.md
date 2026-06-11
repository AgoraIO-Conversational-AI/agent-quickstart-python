# agora-conversational-ai-demo (python) — Repo Card

> Next.js web client + Python FastAPI backend for an Agora Conversational AI voice agent with live transcript.

## Identity

| Field         | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| Repo          | `AgoraIO-Conversational-AI/agent-quickstart-python`                  |
| Type          | `distributed-system` (single repo, two co-located processes)         |
| Language      | Python 3.10+ (FastAPI + uvicorn) backend + Next.js 16 / React 19 web  |
| Deploy Target | `web/` as Next.js app, `server/` as a reachable FastAPI service      |
| Owner         | Agora Conversational AI DevEx                                        |
| Last Reviewed | 2026-06-11                                                           |
| Recipe Role   | `base`                                                               |
| Recipe Version | `1.0.0`                                                             |
| Recipe Status | `experimental`                                                       |

## L1 — Summaries

The Audience column helps agents prioritise: **Use** = consuming the quickstart's behavior, **Maintain** = modifying internals.

| File                                     | Purpose                                                                | Audience       |
| ---------------------------------------- | ---------------------------------------------------------------------- | -------------- |
| [01_setup](L1/01_setup.md)               | bun + venv + pip setup, env vars, doctor, all scripts                  | Use & Maintain |
| [02_architecture](L1/02_architecture.md) | Two-process topology, `/api/*` rewrite proxy, request lifecycle        | Maintain       |
| [03_code_map](L1/03_code_map.md)         | `web/` and `server/` trees with key file responsibilities              | Maintain       |
| [04_conventions](L1/04_conventions.md)   | Python async + FastAPI patterns, Biome, JSON contract, hook ownership  | Maintain       |
| [05_workflows](L1/05_workflows.md)       | Add a route, change managed agent config, verify, deploy each half     | Use            |
| [06_interfaces](L1/06_interfaces.md)     | FastAPI route contracts, rewrites, env vars, managed agent payload     | Use & Maintain |
| [07_gotchas](L1/07_gotchas.md)           | `AGENT_BACKEND_URL` dependency, doc drift, missing hook reference      | Maintain       |
| [08_security](L1/08_security.md)         | Cert handling, CORS wide-open default, token expiry, server-only env   | Maintain       |
