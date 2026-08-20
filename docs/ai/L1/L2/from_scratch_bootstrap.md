> **When to Read This:** Load this when an agent needs to implement a baseline Python-backed Agora Conversational AI quickstart in a new repo from this recipe.

# From-Scratch Bootstrap

## Baseline Rule

This repo is the Python-backed Agora quickstart baseline for the recipe. Do not implement an Agora ConvoAI quickstart from memory. Start from this repo's source and docs, then adapt only after the token, FastAPI start/stop, RTC, RTM, and transcript flow is understood.

Why: provider schemas, SDK builder fields, token behavior, and RTM event details can drift. The source files in this repo are the implementation reference for this recipe version.

## Implementation Map

| Need | Read First | Deep Detail | Source Reference |
| --- | --- | --- | --- |
| Project setup, commands, env vars | [../01_setup.md](../01_setup.md) | none | `package.json`, `server/.env.example` |
| End-to-end architecture and data flow | [../02_architecture.md](../02_architecture.md) | [session_lifecycle.md](session_lifecycle.md) | `web/src/components/LandingPage.tsx`, `web/src/components/ConversationComponent.tsx`, `server/src/server.py` |
| File/module responsibilities | [../03_code_map.md](../03_code_map.md) | none | `web/`, `server/`, `web/scripts/` |
| API payloads and response shapes | [../06_interfaces.md](../06_interfaces.md) | [verification_scripts.md](verification_scripts.md) | `server/src/server.py`, `web/src/services/api.ts`, `web/next.config.ts` |
| Managed agent configuration | [../05_workflows.md](../05_workflows.md) | [managed_agent_config.md](managed_agent_config.md) | `server/src/agent.py` |
| Browser RTC/RTM/toolkit lifecycle | [../04_conventions.md](../04_conventions.md), [../07_gotchas.md](../07_gotchas.md) | [session_lifecycle.md](session_lifecycle.md) | `LandingPage.tsx`, `ConversationComponent.tsx`, `web/src/lib/conversation.ts` |
| Security and secret boundaries | [../08_security.md](../08_security.md) | none | `server/src/server.py`, `web/next.config.ts` |
| Validation expectations | [../05_workflows.md](../05_workflows.md) | [verification_scripts.md](verification_scripts.md) | `web/scripts/*.ts`, `server/scripts/run_fake_server.py` |

## Minimum Implementation Checklist

Implement these pieces in order:

1. Create a bun workspace with `web` as a workspace member and root scripts that orchestrate backend, frontend, setup, doctor, verify, and clean tasks.
2. Create `server/` with FastAPI, uvicorn, python-dotenv, and `agora-agents>=2.0.0` in `server/requirements.txt`.
3. Add `server/.env.example` with `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, and optional `PORT`.
4. Implement `server/src/agent.py` with an `Agent` class that reads env once, constructs `AsyncAgora`, builds `AgoraAgent` with managed `DeepgramSTT`, `OpenAI`, `MiniMaxTTS`, starts async sessions, stores sessions by `agent_id`, and stops by active session or `client.stop_agent`.
5. Implement `server/src/server.py` with `GET /get_config`, `POST /startAgent`, and `POST /stopAgent`; load `server/.env` relative to the source file.
6. In `GET /get_config`, replace missing, zero, or negative UIDs with a generated non-zero UID, generate a one-hour RTC+RTM token with `generate_convo_ai_token`, and return `{ app_id, token, uid, channel_name, agent_uid }`.
7. Create a Next.js App Router web app under `web/` with React, TypeScript, Tailwind, `agora-rtc-react`, `agora-rtm`, `agora-agent-client-toolkit`, and `agora-agent-uikit`.
8. Implement `web/next.config.ts` rewrites for `/api/get_config`, `/api/startAgent`, and `/api/stopAgent` to `${AGENT_BACKEND_URL}/...`; return no rewrites when the env var is missing.
9. Implement `web/src/services/api.ts` as the only browser API facade for `getConfig`, `startAgent`, and `stopAgent`.
10. Implement `LandingPage.tsx` to fetch config, start the agent, create/login/subscribe RTM, mount the conversation, renew RTC and RTM tokens with UID-specific `getConfig` calls, and log out RTM on end.
11. Implement `ConversationComponent.tsx` with StrictMode-safe RTC provider usage, `useJoin`, `useLocalMicrophoneTrack`, `usePublish`, `AgoraVoiceAI.init`, toolkit event subscriptions, raw RTM fallback parsing, token renewal, and explicit end-call media release.
12. Implement transcript helpers in `web/src/lib/conversation.ts` that remap toolkit `uid="0"` to the local UID before side-of-screen or speaker mapping logic.
13. Add verification scripts for no `web/app/api/**/route.ts`, rewrite/fetch contract checks, local rewrite stub checks, and FakeAgent-backed FastAPI smoke checks.

## Required Copy-Forward Invariants

- Browser code calls `/api/*`; FastAPI owns the real `/get_config`, `/startAgent`, and `/stopAgent` routes.
- Do not add Next Route Handlers or `web/proxy.ts` for agent/token logic.
- `AGORA_APP_CERTIFICATE` and BYOK provider keys never enter `web/`.
- `AGENT_BACKEND_URL` is a Next server-time env var, not a `NEXT_PUBLIC_*` value.
- Token generation produces a token usable for both RTC and RTM.
- RTM login identity must match the token subject; renewal uses separate RTC and RTM `getConfig` calls when UIDs differ.
- `Agent._sessions` is worker-local; production multi-worker deployments need external lifecycle state or a stateless stop strategy.
- `useJoin`, `useLocalMicrophoneTrack`, and `usePublish` own normal mount/unmount lifecycle cleanup.
- Transcript normalization remaps toolkit `uid="0"` before rendering.
- `advanced_features.enable_rtm`, `parameters.data_channel="rtm"`, `enable_error_message`, and `enable_metrics` stay enabled for transcript/state/metrics delivery.

## Official Reference Links

Use local source first for this recipe version. For current Agora details that can change, use these official references:

- Official Next.js quickstart baseline: `https://github.com/AgoraIO-Conversational-AI/agent-quickstart-nextjs`
- Python quickstart baseline: `https://github.com/AgoraIO-Conversational-AI/agent-quickstart-python`
- ConvoAI OpenAPI spec: `https://docs-md.agora.io/api/conversational-ai-api-v2.x.yaml`
- Current docs index: `https://docs.agora.io/en/llms.txt`

Fetch the OpenAPI spec or current docs before changing direct REST payloads, provider matrices, or vendor-specific config fields.

## Verification

Run narrow checks while building:

```bash
bun run verify:backend
bun run verify:web:api
bun run verify:web:proxy
bun run verify:local:fastapi
```

Before publishing a derivative baseline, run:

```bash
bun run verify:web
bun run verify:local
```

`verify:web:build` may need network access if `next/font` fetches Google Fonts during build.

## See Also

- [Back to Workflows](../05_workflows.md)
- [Back to Code Map](../03_code_map.md)
- [Managed Agent Config](managed_agent_config.md)
- [Session Lifecycle](session_lifecycle.md)
- [Verification Scripts](verification_scripts.md)
