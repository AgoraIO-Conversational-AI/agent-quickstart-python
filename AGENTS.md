# Agent Development Guide

This document guides AI agents working on the Agora Conversational AI demo project.

## Project Overview

A real-time voice conversation application with AI agents, built with:
- **Frontend**: Next.js + React + TypeScript + Agora Web SDK
- **Backend**: Python FastAPI + Agora Conversational AI API

## Project Structure

```
.
├── web-client/           # Frontend application (Next.js + React)
├── server-python/        # Backend service (FastAPI + Agora SDK)
└── recipes/              # Platform-specific examples (Android, iOS, Flutter, etc.)
```

## Quick Start

```bash
# Start both frontend and backend
bun run dev

# Frontend only (port 3000)
bun run frontend

# Backend only (port 8000)
bun run backend
```

## Module-Specific Guides

For detailed information about each module, refer to their specific documentation:

### Frontend (web-client/)
- **[web-client/AGENTS.md](./web-client/AGENTS.md)** - AI assistant guide for frontend development
- **[web-client/ARCHITECTURE.md](./web-client/ARCHITECTURE.md)** - Detailed frontend architecture
- **[web-client/.claude/](./web-client/.claude/)** - AI skill documents for specific modules

### Backend (server-python/)
- **[server-python/AGENTS.md](./server-python/AGENTS.md)** - AI assistant guide for backend development
- **[server-python/README.md](./server-python/README.md)** - Backend API documentation
- **[server-python/ARCHITECTURE.md](./server-python/ARCHITECTURE.md)** - Backend architecture details
- **[server-python/MIGRATION_TOKEN007.md](./server-python/MIGRATION_TOKEN007.md)** - Token007 migration guide

### System Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Overall system architecture and data flow

## Key Technologies

- **Frontend**: Next.js 16, React, TypeScript, Agora Web SDK, Zustand
- **Backend**: Python 3.8+, FastAPI, agora-agent-rest SDK, uvicorn
- **Authentication**: Token007 (AccessToken2) for Agora API
- **Real-time**: Agora RTC (audio) + RTM (messaging/transcription)

## Common Development Tasks

### Working on Frontend
See [web-client/AGENTS.md](./web-client/AGENTS.md) for:
- UI component development
- State management patterns
- Agora SDK integration
- API client usage

### Working on Backend
See [server-python/AGENTS.md](./server-python/AGENTS.md) for:
- API endpoint development
- Agent lifecycle management
- Token generation
- Configuration patterns

### Cross-Module Changes
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Check both module-specific AGENTS.md files
3. Test integration between frontend and backend
4. Verify token flow and API contracts

## Important Notes

- Never commit `.env.local` or credentials
- Frontend proxies `/api/*` requests to backend
- Agent lifecycle is managed by backend, not frontend
- All Agora SDK calls go through `useAgoraConnection.ts` hook
- Use Token007 authentication (API_KEY/API_SECRET no longer needed)

## Reference Documentation

- [Agora Docs](https://docs.agora.io/) - Official SDK documentation
- [Next.js Docs](https://nextjs.org/docs) - Frontend framework
- [FastAPI Docs](https://fastapi.tiangolo.com/) - Backend framework
