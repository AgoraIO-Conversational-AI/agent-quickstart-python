# Agora Agent Service - Backend Architecture

## Overview

Python FastAPI service providing the local backend path for token generation and Agora agent management.

**Core Responsibilities in local development**:
- Generate RTC/RTM tokens for client connections
- Start/stop AI agents with ASR, LLM, and TTS configuration
- Provide a stateless-safe FastAPI bridge between the frontend and Agora Conversational AI APIs

In deployed web mode, the Next app can serve the same API contract directly. This module is therefore the local development backend, not the only backend implementation in the repo.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.8+ |
| HTTP Server | Uvicorn |
| Agent SDK | agora-agent-server-sdk |
| Config | python-dotenv |

## Project Structure

```
server/
├── src/
│   ├── server.py           # FastAPI app, routes, CORS
│   └── agent.py            # Agent lifecycle management
├── .env.example            # Environment template
└── requirements.txt        # Python dependencies
```

## Module Architecture

### 1. server.py - HTTP API Layer

**Responsibilities**:
- Define FastAPI application and routes
- Handle HTTP request/response
- CORS configuration
- Error handling and status codes
- Environment variable loading

**Key Components**:

```python
app = FastAPI(title="Agora Agent & Token Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

agent = Agent()  # Singleton

@router.get("/get_config")           # Generate connection config
@router.post("/v2/startAgent")       # Start AI agent
@router.post("/v2/stopAgent")        # Stop AI agent
```

### 2. agent.py - Agent Management Layer

**Responsibilities**:
- Wrap agora-agent-server-sdk
- Configure ASR/LLM/TTS providers
- Manage agent lifecycle with async session start and stateless-safe stop fallback
- Parameter validation

**Key Components**:

```python
from agora_agent import Area, AsyncAgora
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import DeepgramSTT, MiniMaxTTS, OpenAI

class Agent:
    def __init__(self):
        self.client = AsyncAgora(
            area=Area.US,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
    
    async def start(channel_name, agent_uid, user_uid):
        agora_agent = AgoraAgent(
            name=name,
            instructions="Ada persona prompt...",
            greeting="Hi there! I'm Ada, your virtual assistant from Agora. How can I help?",
            max_history=50,
            turn_detection={...},
            advanced_features={"enable_rtm": True, "enable_tools": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        )
        agora_agent = (
            agora_agent
            .with_llm(OpenAI(...))
            .with_tts(MiniMaxTTS(...))
            .with_stt(DeepgramSTT(...))
        )
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=[str(user_uid)],
            enable_string_uid=True,
            idle_timeout=30,
            expires_in=3600,
        )
        return await session.start()  # returns agent_id
```

## API Endpoints

### GET /get_config

Generate connection configuration for frontend client.

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "app_id": "your_app_id",
    "token": "007eJxT...",
    "uid": "1234567",
    "channel_name": "channel_1770199765",
    "agent_uid": "58888506"
  }
}
```

**Logic**:
1. Generate random UIDs for user and agent
2. Create channel name with timestamp
3. Generate token via `generate_convo_ai_token()` (1h expiry)
4. Return configuration bundle

### POST /v2/startAgent

Start an AI agent in specified channel.

**Request**:
```json
{
  "channelName": "channel_1770199765",
  "rtcUid": 58888506,
  "userUid": 1234567
}
```

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "agent_id": "abc-123-def-456",
    "channel_name": "channel_1770199765",
    "status": "started"
  }
}
```

### POST /v2/stopAgent

Stop a running agent.

**Request**:
```json
{
  "agentId": "abc-123-def-456"
}
```

**Response**:
```json
{
  "code": 0,
  "msg": "success"
}
```

## Configuration

### Environment Variables

Loaded from `.env.local` (priority) or `.env`:

```bash
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_app_certificate
AGENT_GREETING=Hi there! I'm Ada, your virtual assistant from Agora. How can I help?
PORT=8000
```

**Note**: Uses Token007 authentication generated from `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE`. No third-party vendor keys are required in the default managed setup.

### Token Generation

```python
from agora_agent.agentkit.token import generate_convo_ai_token

token = generate_convo_ai_token(
    app_id=app_id,
    app_certificate=app_certificate,
    channel_name=channel_name,
    account=str(user_uid),
    token_expire=3600,
)
```

## Three-Tier AI Configuration

### ASR (Automatic Speech Recognition)
**Provider**: DeepgramSTT
```python
DeepgramSTT(model="nova-3", language="en")
```

### LLM (Large Language Model)
**Provider**: OpenAI
```python
OpenAI(model="gpt-4o-mini")
```

### TTS (Text-to-Speech)
**Provider**: MiniMaxTTS
```python
MiniMaxTTS(model="speech_2_6_turbo", voice_id="English_captivating_female1")
```

## Data Flow

```
Frontend Request
    ↓
FastAPI Router (server.py)
    ↓
Agent Class (agent.py)
    ↓
agora-agent-server-sdk (AsyncAgora + AgentSession)
    ↓
Agora REST API
    ↓
AI Agent (ASR + LLM + TTS)
    ↓
RTC/RTM Channel
    ↓
Frontend Client
```

## Integration with Frontend

Frontend connects through Next route handlers in `web/app/api`. In local Python mode, those handlers forward to the FastAPI service through `AGENT_BACKEND_URL`:

```
/api/get_config    → Next route handler → http://localhost:8000/get_config
/api/v2/startAgent → Next route handler → http://localhost:8000/v2/startAgent
/api/v2/stopAgent  → Next route handler → http://localhost:8000/v2/stopAgent
```

## Error Handling

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| ValueError | 400 | Invalid parameters |
| RuntimeError | 500 | SDK/API errors |
| Agent not found | 200 | Stop is treated as idempotent when the platform session is already gone |

## Dependencies

```txt
fastapi>=0.100.0          # Web framework
uvicorn>=0.20.0           # ASGI server
python-dotenv>=1.0.0      # Environment variables
agora-agent-server-sdk   # Agora Agent SDK
```

## Reference

- [Agora Conversational AI Docs](https://docs.agora.io/en/conversational-ai/overview)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
