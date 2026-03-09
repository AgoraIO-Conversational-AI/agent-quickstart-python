# Agora Conversational AI Web Demo - Architecture

## Overview

A web demo showcasing quick integration of Agora Conversational AI, featuring real-time voice conversation, subtitle rendering, and log monitoring.

> **Note**: For AI workflow rules and project specifications, see [AGENTS.md](./AGENTS.md)

## Tech Stack

### Frontend

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript |
| Build Tool | Turbopack |
| Styling | Tailwind CSS |
| State Management | Zustand |
| RTC SDK | agora-rtc-react |
| RTM SDK | agora-rtm |

### Backend

| Category | Technology |
|----------|------------|
| Framework | FastAPI |
| Language | Python 3 |
| HTTP Client | requests |
| Token Builder | agora-token (custom) |

## Project Structure

```
.
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page (loads AgoraProvider + App)
│   └── globals.css          # Global styles
├── src/                     # Frontend source
│   ├── components/          # UI components
│   │   ├── app.tsx          # Main application entry
│   │   ├── subtitle-panel.tsx   # Subtitle rendering module
│   │   ├── log-panel.tsx        # Log display module
│   │   └── control-bar.tsx      # Control buttons (start/stop/mic)
│   ├── hooks/               # React hooks
│   │   └── useAgoraConnection.ts # RTC/RTM connection hook
│   ├── stores/              # State management
│   │   └── app-store.ts     # Zustand store
│   ├── services/            # Service layer
│   │   └── api.ts           # Backend API calls (get_config, startAgent, stopAgent)
│   ├── conversational-ai-api/   # Subtitle rendering core module
│   │   ├── index.ts
│   │   ├── type.ts
│   │   └── utils/
│   ├── lib/                 # Utility libraries
│   │   ├── logger.ts        # Logger utility
│   │   └── utils.ts         # Common utility functions
│   └── config/
│       └── env.ts           # Environment configuration
│
├── proxy.ts                 # Next.js 16 API proxy (replaces middleware)
├── ../server-python/        # Backend service (project root level)
│   ├── src/
│   │   ├── server.py        # FastAPI entry, route definitions
│   │   └── agent.py         # Agent class using AgoraAgent wrapper
│   ├── requirements.txt     # Python dependencies
│   └── .env.local           # Backend environment variables
│
├── next.config.ts           # Next.js configuration
└── package.json             # Frontend dependencies + scripts
```

## Core Modules

### 1. SubtitlePanel (Subtitle Rendering)

- Real-time display of user and AI Agent conversation
- Distinct styling for user/agent messages
- Auto-scroll to latest message
- Message status display (in-progress/completed/interrupted)

### 2. LogPanel (Log Display)

- System runtime logs
- Log level support (info/success/error/warning)
- Timestamp display
- Collapsible/expandable

### 3. ControlBar (Control Bar)

- Start/Stop Agent button
- Microphone toggle button
- Connection status indicator

## Data Flow

```
User Action → useAgoraConnection hook → Agora SDK (agora-rtc-react)
                   ↓
              Zustand Store ← ConversationalAIAPI Events
                   ↓
              UI Components
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/get_config | GET | Generate connection config (token, channel, UIDs) |
| /api/v2/startAgent | POST | Start Conversational AI Agent |
| /api/v2/stopAgent | POST | Stop Agent |

### Request/Response Examples

#### GET /api/get_config
```json
// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "app_id": "your_app_id",
    "token": "007eJxT...",
    "uid": "123456",
    "channel_name": "channel_1234567890",
    "agent_uid": "12345678"
  }
}
```

#### POST /api/v2/startAgent
```json
// Request
{
  "channelName": "test-channel",
  "rtcUid": "12345678",
  "userUid": "123456"
}

// Response
{
  "code": 0,
  "msg": "success",
  "data": {
    "agent_id": "abc-123-def",
    "channel_name": "test-channel",
    "status": "started"
  }
}
```

#### POST /api/v2/stopAgent
```json
// Request
{
  "agentId": "abc-123-def"
}

// Response
{
  "code": 0,
  "msg": "success"
}
```

## Backend Architecture

### Python Service (FastAPI)

```
../server-python/
├── src/
│   ├── server.py        # FastAPI app, routes, CORS
│   └── agent.py         # Agent 启动/停止逻辑
└── requirements.txt     # Python 依赖
```

### Environment Variables

Backend reads configuration from `server-python/.env.local`:

| Variable | Description |
|----------|-------------|
| APP_ID | Agora App ID |
| APP_CERTIFICATE | Agora App Certificate |
| ASR_DEEPGRAM_API_KEY | Deepgram ASR API Key |
| LLM_API_KEY | OpenAI LLM API Key |
| TTS_ELEVENLABS_API_KEY | ElevenLabs TTS API Key |
| PORT | Backend server port (default: 8000) |

### Proxy Configuration

Next.js 16 uses `proxy.ts` to proxy `/api/*` requests to Python backend (port 8000):

```typescript
// proxy.ts
export function GET(request: NextRequest) {
  const url = new URL(request.url)
  const backendUrl = `http://localhost:8000${url.pathname.replace('/api', '')}`
  return fetch(backendUrl, { headers: request.headers })
}
```

## State Management (Zustand)

```typescript
interface AppState {
  // Connection
  isConnected: boolean
  isConnecting: boolean
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

## Event Flow

1. User clicks connect → Call `/api/get_config` to get configuration
2. AgoraRTCProvider creates RTC client
3. useAgoraConnection hook manages connection via useJoin, usePublish hooks
4. Use returned token to login RTM → Join RTC channel
5. Initialize ConversationalAIAPI
6. Call `/api/v2/startAgent` to start Agent
7. Listen to subtitle events → Update Zustand store → UI re-renders
8. User clicks stop → Call `/api/v2/stopAgent` → Cleanup resources
