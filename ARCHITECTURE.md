# Agora Conversational AI Demo - Architecture

## Overview

A full-stack real-time voice conversation application demonstrating Agora Conversational AI integration.

**Key Features**:
- Real-time voice conversation with AI agents
- Live subtitle rendering
- System log monitoring
- Token-based authentication (Token007)

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 16 + React 19 + TypeScript + Agora Web SDK        │
│  (Port 3000)                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/WebSocket
                   │ /api/* → proxy
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│  Python FastAPI + Agora Agent REST SDK                      │
│  (Port 8000)                                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agora Cloud Services                      │
│  • RTC (Real-Time Communication)                            │
│  • RTM (Real-Time Messaging)                                │
│  • Conversational AI (ASR + LLM + TTS)                      │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend (`web-client/`)

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Build Tool | Turbopack |
| Styling | Tailwind CSS |
| State | Zustand |
| RTC SDK | agora-rtc-react |
| RTM SDK | agora-rtm |

### Backend (`server-python/`)

| Category | Technology |
|----------|------------|
| Framework | FastAPI |
| Language | Python 3.8+ |
| Server | Uvicorn |
| SDK | agora-agent-rest (Local) |
| Auth | Token007 (AccessToken2) |

## Project Structure

```
.
├── web-client/              # Frontend application
│   ├── app/                 # Next.js App Router
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React hooks
│   │   ├── stores/          # Zustand state
│   │   ├── services/        # API client
│   │   └── conversational-ai-api/  # Subtitle rendering
│   ├── proxy.ts             # API proxy (Next.js 16)
│   └── package.json
│
├── server-python/           # Backend service
│   ├── src/
│   │   ├── server.py        # FastAPI routes
│   │   └── agent.py         # Agent management
│   ├── agora-agent-rest/    # Local SDK
│   ├── requirements.txt
│   └── .env.local           # Configuration (not committed)
│
└── recipes/                 # Platform examples
    └── Conversational-AI-Starter/
```

## Data Flow

### 1. Connection Flow

```
User clicks "Start"
    ↓
Frontend: GET /api/get_config
    ↓
Backend: Generate RTC token + channel info
    ↓
Frontend: Join RTC channel with token
    ↓
Frontend: Login RTM with token
    ↓
Frontend: Initialize ConversationalAI API
```

### 2. Agent Start Flow

```
Frontend: POST /api/v2/startAgent
    ↓
Backend: Generate Token007 for API auth
    ↓
Backend: Configure ASR (Deepgram) + LLM (OpenAI) + TTS (ElevenLabs)
    ↓
Backend: Call Agora Agent API
    ↓
Agent joins RTC channel
    ↓
Frontend: Receive agent audio + subtitles via RTM
```

### 3. Conversation Flow

```
User speaks → RTC audio stream
    ↓
Agent ASR (Deepgram) → Text
    ↓
Agent LLM (OpenAI) → Response
    ↓
Agent TTS (ElevenLabs) → Audio
    ↓
RTC audio stream + RTM subtitles → Frontend
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/get_config` | GET | Generate connection config (token, channel, UIDs) |
| `/api/v2/startAgent` | POST | Start AI agent with ASR/LLM/TTS config |
| `/api/v2/stopAgent` | POST | Stop running agent |

## Authentication

### Token007 (AccessToken2)

Backend uses Token007 for Agora Agent API authentication:

```python
from agoraio.wrapper.token import generate_access_token

# Generate token from APP_ID and APP_CERTIFICATE
token = generate_access_token(
    app_id=app_id,
    app_certificate=app_certificate,
    expiry_seconds=86400  # 24 hours
)

# Pass via Authorization header
headers = {"Authorization": f"agora token={token}"}
client = Agora(area=Area.CN, username="", password="", headers=headers)
```

**Benefits**:
- No need for API_KEY/API_SECRET
- Token has expiration time
- Follows Agora best practices (rtm-infinity-auth)

## Configuration

### Backend Environment Variables

Required in `server-python/.env.local`:

```bash
# Agora Credentials
APP_ID=your_app_id
APP_CERTIFICATE=your_app_certificate

# AI Service Providers
LLM_API_KEY=your_openai_key
TTS_ELEVENLABS_API_KEY=your_elevenlabs_key
ASR_DEEPGRAM_API_KEY=your_deepgram_key

# Server
PORT=8000
```

### Frontend Configuration

Frontend gets all configuration from backend API - no environment variables needed.

## State Management

### Frontend (Zustand)

```typescript
interface AppState {
  // Connection
  isConnected: boolean
  channelName: string
  
  // Agent
  agentId: string | null
  agentState: EAgentState
  
  // Audio
  isMicMuted: boolean
  
  // Transcripts
  transcripts: TranscriptItem[]
  
  // Logs
  logs: LogItem[]
}
```

## Key Components

### Frontend

1. **useAgoraConnection** - RTC/RTM connection management
2. **ConversationalAIAPI** - Subtitle event handling
3. **SubtitlePanel** - Real-time transcript display
4. **LogPanel** - System log monitoring
5. **ControlBar** - Start/stop/mic controls

### Backend

1. **Agent** - Lifecycle management using AgoraAgent wrapper
2. **Token Generation** - RTC token + Token007 generation
3. **API Routes** - FastAPI endpoints with CORS

## Deployment

### Development

```bash
# Install dependencies
bun install

# Start both services
bun run dev

# Or separately
bun run frontend  # Port 3000
bun run backend   # Port 8000
```

### Production

```bash
# Build frontend
cd web-client
bun run build

# Start backend
cd server-python
uvicorn src.server:app --host 0.0.0.0 --port 8000 --workers 4
```

## Security

1. **Token Expiry**: RTC tokens expire after 24 hours
2. **No Credentials in Frontend**: All secrets in backend
3. **CORS**: Configure allowed origins in production
4. **HTTPS**: Use HTTPS in production
5. **Token007**: Automatic token generation, no long-term credentials

## Monitoring

### Frontend Logs

- Connection status
- Agent state changes
- API call results
- Error messages

### Backend Logs

- HTTP requests/responses
- Agent lifecycle events
- API call errors
- Token generation

## Reference Documentation

- [AGENTS.md](./AGENTS.md) - AI workflow rules
- [web-client/ARCHITECTURE.md](./web-client/ARCHITECTURE.md) - Frontend details
- [server-python/ARCHITECTURE.md](./server-python/ARCHITECTURE.md) - Backend details
- [Agora Docs](https://docs.agora.io/) - Official documentation
