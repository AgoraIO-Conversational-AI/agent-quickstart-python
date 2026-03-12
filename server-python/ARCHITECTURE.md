# Agora Agent Service - Backend Architecture

## Overview

Python FastAPI service providing REST APIs for Agora Conversational AI Agent management and token generation.

**Core Responsibilities**:
- Generate RTC/RTM tokens for client connections
- Start/stop AI agents with ASR, LLM, and TTS configuration
- Proxy between frontend and Agora Conversational AI API

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | FastAPI |
| Language | Python 3.8+ |
| HTTP Server | Uvicorn |
| Agent SDK | agent-server-sdk-python |
| Config | python-dotenv |

## Project Structure

```
server-python/
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
- Wrap agent-server-sdk-python
- Configure ASR/LLM/TTS providers
- Manage agent lifecycle (start/stop via AgentSession)
- Parameter validation

**Key Components**:

```python
from agora_agent import Agora, Area
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import OpenAI, ElevenLabsTTS, DeepgramSTT

class Agent:
    def __init__(self):
        self.client = Agora(
            area=Area.CN,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
    
    def start(channel_name, agent_uid, user_uid):
        agora_agent = AgoraAgent(
            name=name,
            instructions="...",
            greeting="...",
            advanced_features={"enable_rtm": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        )
        agora_agent = (
            agora_agent
            .with_llm(OpenAI(...))
            .with_tts(ElevenLabsTTS(...))
            .with_stt(DeepgramSTT(...))
        )
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            enable_string_uid=True,
            idle_timeout=120,
        )
        return session.start()  # returns agent_id
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
3. Generate token via `generate_convo_ai_token()` (24h expiry)
4. Return configuration bundle

### POST /v2/startAgent

Start an AI agent in specified channel.

**Request**:
```json
{
  "channelName": "channel_1770199765",
  "rtcUid": "58888506",
  "userUid": "1234567"
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
APP_ID=your_app_id                    # Agora App ID
APP_CERTIFICATE=your_app_certificate  # Agora App Certificate
ASR_DEEPGRAM_API_KEY=your_key        # Speech-to-Text
LLM_API_KEY=your_key                 # Language Model
TTS_ELEVENLABS_API_KEY=your_key      # Text-to-Speech
PORT=8000                             # HTTP server port
```

**Note**: Uses Token007 authentication generated from `APP_ID` and `APP_CERTIFICATE`. No API_KEY/API_SECRET needed.

### Token Generation

```python
from agora_agent.agentkit.token import generate_convo_ai_token

token = generate_convo_ai_token(
    app_id=app_id,
    app_certificate=app_certificate,
    channel_name=channel_name,
    account=str(user_uid),
    token_expire=86400,
)
```

## Three-Tier AI Configuration

### ASR (Automatic Speech Recognition)
**Provider**: Deepgram
```python
DeepgramSTT(api_key=asr_api_key, language="en-US")
```

### LLM (Large Language Model)
**Provider**: OpenAI (configurable)
```python
OpenAI(api_key=llm_api_key, model="gpt-4o-mini")
```

### TTS (Text-to-Speech)
**Provider**: ElevenLabs
```python
ElevenLabsTTS(key=tts_api_key, voice_id=voice_id, model_id=model_id)
```

## Data Flow

```
Frontend Request
    ↓
FastAPI Router (server.py)
    ↓
Agent Class (agent.py)
    ↓
agent-server-sdk-python (AgentSession)
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

Frontend connects via Next.js proxy (`proxy.ts`):

```
/api/get_config    → http://localhost:8000/get_config
/api/v2/startAgent → http://localhost:8000/v2/startAgent
/api/v2/stopAgent  → http://localhost:8000/v2/stopAgent
```

## Error Handling

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| ValueError | 400 | Invalid parameters |
| RuntimeError | 500 | SDK/API errors |
| Agent not found | 404 | Invalid agent_id |

## Dependencies

```txt
fastapi>=0.100.0          # Web framework
uvicorn>=0.20.0           # ASGI server
python-dotenv>=1.0.0      # Environment variables
agent-server-sdk-python   # Agora Agent SDK
```

## Reference

- [Agora Conversational AI Docs](https://docs.agora.io/en/conversational-ai/overview)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
