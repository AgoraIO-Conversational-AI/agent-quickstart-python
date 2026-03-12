# Agent Development Guide

This document guides AI agents working on the Agora Conversational AI demo project.

## Project Overview

A real-time voice conversation application with AI agents, built with:
- **Frontend**: Next.js 16 + React 19 + TypeScript + Agora Web SDK
- **Backend**: Python FastAPI + Agora Conversational AI Agent SDK

## Project Structure

```
.
├── web-client/           # Frontend application (Next.js + React)
└── server-python/        # Backend service (FastAPI + Agora Agent SDK)
```

## Quick Start

```bash
# Install dependencies
bun install

# Start both frontend and backend
bun run dev

# Frontend only (port 3000)
bun run frontend

# Backend only (port 8000)
bun run backend
```

## Module-Specific Guides

### Frontend (web-client/)
- [web-client/AGENTS.md](./web-client/AGENTS.md) — AI assistant guide for frontend development
- [web-client/ARCHITECTURE.md](./web-client/ARCHITECTURE.md) — Detailed frontend architecture

### Backend (server-python/)
- [server-python/AGENTS.md](./server-python/AGENTS.md) — AI assistant guide for backend development
- [server-python/ARCHITECTURE.md](./server-python/ARCHITECTURE.md) — Backend architecture details
- [server-python/README.md](./server-python/README.md) — Backend API documentation

### System Architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Overall system architecture and data flow

## Key Technologies

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Agora Web SDK (RTC + RTM), agent-client-toolkit-ts, Zustand, Tailwind CSS |
| Backend | Python 3.8+, FastAPI, agent-server-sdk-python, uvicorn |
| Auth | Token007 (AccessToken2) — auto-generated from APP_ID + APP_CERTIFICATE |
| Real-time | Agora RTC (audio) + RTM (messaging/transcription) |
| AI Providers | Deepgram (ASR), OpenAI (LLM), ElevenLabs (TTS) |

## Common Development Tasks

### Working on Frontend
See [web-client/AGENTS.md](./web-client/AGENTS.md) for:
- UI component development
- State management patterns (Zustand)
- Agora SDK integration (RTC/RTM)
- API client usage

### Working on Backend
See [server-python/AGENTS.md](./server-python/AGENTS.md) for:
- API endpoint development
- Agent lifecycle management (start/stop via AgentSession)
- Token generation (`generate_convo_ai_token`)
- ASR/LLM/TTS provider configuration

### Cross-Module Changes
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview and data flow
2. Check both module-specific AGENTS.md files
3. Verify API contracts — frontend calls `/api/*`, proxied to backend on port 8000
4. Test token flow: backend generates Token007, frontend uses it for RTC/RTM

## Important Notes

- Never commit `.env.local` or credentials
- Frontend proxies `/api/*` requests to backend via `web-client/proxy.ts`
- Agent lifecycle is managed by backend (AgentSession), not frontend
- All Agora SDK calls go through `useAgoraConnection.ts` hook on the frontend
- Authentication uses Token007 (AccessToken2) — only `APP_ID` and `APP_CERTIFICATE` are needed
- Backend uses `Agora(area=Area.US, ...)` client with auto Token007 auth

## Reference Documentation

- [Agora Conversational AI Docs](https://docs.agora.io/en/conversational-ai/overview)
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
