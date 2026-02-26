# Agent Development Guide

This document guides AI agents working on the Agora Conversational AI demo project.

## Project Overview

A real-time voice conversation application with AI agents, built with:
- **Frontend**: Next.js + React + TypeScript + Agora Web SDK
- **Backend**: Python FastAPI + Agora Conversational AI API

## Architecture

### Module Structure

```
.
├── web-client/                    # Frontend application
│   ├── src/
│   │   ├── components/           # React UI components
│   │   │   ├── App.tsx           # Main app container
│   │   │   ├── ControlBar.tsx    # Call controls (start/stop)
│   │   │   ├── SubtitlePanel.tsx # Live transcription display
│   │   │   └── LogPanel.tsx      # Event log viewer
│   │   ├── services/             # Core business logic
│   │   │   ├── agora-service.ts  # Agora SDK integration
│   │   │   └── api.ts            # Backend API client
│   │   ├── conversational-ai-api/ # AI agent SDK wrapper
│   │   │   ├── index.ts          # Main API interface
│   │   │   ├── type.ts           # TypeScript types
│   │   │   └── utils/            # Event handling & rendering
│   │   ├── stores/               # State management
│   │   │   └── app-store.ts      # Zustand store
│   │   └── lib/                  # Utilities
│   │       ├── logger.ts         # Logging utility
│   │       └── utils.ts          # Helper functions
│   └── .claude/                  # AI skill documents
│
├── server-python/                 # Backend service
│   └── src/
│       ├── server.py             # FastAPI app & endpoints
│       └── agent.py              # Agora AI agent management
│
└── recipes/                       # Platform-specific examples
    └── Conversational-AI-Starter/
        ├── android-kotlin/
        ├── ios-swift/
        ├── flutter/
        ├── reactnative/
        └── ...
```

### Key Components

**Frontend (`web-client/`)**:
- `agora-service.ts`: Manages RTC/RTM connections, audio streaming
- `conversational-ai-api/`: Wraps Agora Conversational AI SDK
- `app-store.ts`: Global state (connection status, logs, subtitles)
- Components: UI layer, subscribes to store updates

**Backend (`server-python/`)**:
- `server.py`: REST API for token generation and agent control
- `agent.py`: Manages AI agent lifecycle (start/stop/update)

### Data Flow

1. User clicks "Start" → Frontend requests token from backend
2. Backend generates RTC/RTM tokens → Returns to frontend
3. Frontend joins Agora channel with tokens
4. Frontend starts AI agent via backend API
5. Agent joins channel, begins conversation
6. Audio/transcription flows through Agora RTM
7. Frontend displays live subtitles and logs

## Development Guidelines

### When Modifying Frontend

- **UI changes**: Edit components in `src/components/`
- **SDK integration**: Modify `src/services/agora-service.ts`
- **State management**: Update `src/stores/app-store.ts`
- **API calls**: Extend `src/services/api.ts`
- **Types**: Add to `src/conversational-ai-api/type.ts`

### When Modifying Backend

- **Endpoints**: Add routes in `src/server.py`
- **Agent logic**: Update `src/agent.py`
- **Configuration**: Modify `.env.local` (never commit this file)

### Testing Changes

```bash
# Start dev environment
bun run dev

# Frontend only (faster iteration)
bun run frontend

# Backend only
bun run backend

# Build production
bun run build
```

### Common Tasks

**Add new agent configuration**:
1. Update `agent.py` with new parameters
2. Add endpoint in `server.py`
3. Update frontend API client in `api.ts`
4. Add UI controls in `ControlBar.tsx`

**Add new UI feature**:
1. Create component in `src/components/`
2. Add state to `app-store.ts` if needed
3. Subscribe to store in component
4. Update types in `type.ts`

**Debug connection issues**:
1. Check logs in `LogPanel` component
2. Verify tokens in backend logs
3. Inspect network tab for API calls
4. Check Agora console for channel activity

## Important Notes

- Never commit `.env.local` or credentials
- Frontend uses Next.js dev server (port 3000)
- Backend uses uvicorn (port 8000)
- API requests are proxied from `/api/*` to backend via Next.js rewrites
- All Agora SDK calls go through `agora-service.ts`
- State updates trigger React re-renders automatically
- Agent lifecycle is managed by backend, not frontend

## Reference Documentation

- [web-client/ARCHITECTURE.md](./web-client/ARCHITECTURE.md) - Detailed frontend architecture
- [web-client/.claude/](./web-client/.claude/) - AI skill documents for specific modules
- [server-python/README.md](./server-python/README.md) - Backend API documentation
- [Agora Docs](https://docs.agora.io/) - Official SDK documentation
