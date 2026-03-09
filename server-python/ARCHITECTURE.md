# Agora Agent Service - Backend Architecture

## Overview

Python FastAPI service providing REST APIs for Agora Conversational AI Agent management and RTC token generation.

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
| SDK | agora-agent-rest (Local) |
| Config | python-dotenv |

## Project Structure

```
server-python/
├── src/
│   ├── server.py           # FastAPI app, routes, CORS
│   ├── agent.py            # Agent lifecycle management
│   └── agora_token_builder/ # Token generation utils
├── agora-agent-rest/       # Local SDK source code
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
# Application initialization
app = FastAPI(title="Agora Agent & Token Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# Agent instance (singleton)
agent = Agent()

# Routes
@router.get("/get_config")           # Generate connection config
@router.post("/v2/startAgent")       # Start AI agent
@router.post("/v2/stopAgent")        # Stop AI agent
```

**Error Handling**:
- `ValueError` → 400 Bad Request
- `RuntimeError` → 500 Internal Server Error
- Agent not found → 404 Not Found

### 2. agent.py - Agent Management Layer

**Responsibilities**:
- Wrap Agora Agent REST SDK (local version)
- Configure ASR/LLM/TTS providers using `agoraio` models
- Manage agent lifecycle (start/stop)
- Parameter validation

**Key Components**:

```python
class Agent:
    def __init__(self):
        # Generate Token007 for API authentication
        token = generate_access_token(
            app_id=self.app_id,
            app_certificate=self.app_certificate,
            expiry_seconds=86400
        )
        
        # Pass token via Authorization header
        headers = {"Authorization": f"agora token={token}"}
        self.client = Agora(area=Area.CN, username="", password="", headers=headers)
    
    def start(channel_name, agent_uid, user_uid):
        # Configure agent using AgoraAgent wrapper
        agora_agent = AgoraAgent(...)
        agora_agent = (
            agora_agent
            .with_llm(OpenAI(...))
            .with_tts(ElevenLabsTTS(...))
            .with_stt(DeepgramSTT(...))
        )
        
        # Start agent via SDK
        session = agora_agent.create_session(...)
        return session.start()
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
    "app_id": "b7645d3dfe6b44759f2e18fa05be67fa",
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
3. Generate RTC token using TokenBuilder (24h expiry)
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

**Logic**:
1. Validate required parameters
2. Configure ASR (Deepgram), LLM (OpenAI), TTS (ElevenLabs)
3. Call Agora REST API to start agent
4. Return agent_id for future operations

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

**Logic**:
1. Validate agent_id
2. Call Agora REST API to stop agent
3. Return success status

## Configuration

### Environment Variables

Loaded from `.env.local` (priority) or `.env`:

**Agora Credentials**:
```bash
APP_ID=your_app_id                    # Agora App ID
APP_CERTIFICATE=your_app_certificate  # Agora App Certificate
```

**AI Service Providers**:
```bash
ASR_DEEPGRAM_API_KEY=your_key        # Speech-to-Text
LLM_API_KEY=your_openai_key          # Language Model
TTS_ELEVENLABS_API_KEY=your_key      # Text-to-Speech
```

**Server Configuration**:
```bash
PORT=8000                             # HTTP server port
```

**Note**: The service uses Token007 authentication generated from `APP_ID` and `APP_CERTIFICATE`. No API_KEY/API_SECRET needed.

### Token Generation

Uses `agora_token_builder.RtcTokenBuilder`:

```python
token = RtcTokenBuilder.build_token_with_rtm(
    app_id=app_id,
    app_certificate=app_certificate,
    channel_name=channel_name,
    account=str(user_uid),
    role=Role_Publisher,
    token_expire=86400,
    privilege_expire=86400
)
```

## Three-Tier AI Configuration

### ASR (Automatic Speech Recognition)

**Provider**: Deepgram

```python
asr = DeepgramASRConfig(api_key=asr_api_key)
```

**Features**:
- Real-time speech transcription
- Multi-language support
- Low latency

### LLM (Large Language Model)

**Provider**: OpenAI

```python
llm = OpenAILLMConfig(api_key=llm_api_key)
```

**Default Model**: gpt-4

**Features**:
- Natural conversation
- Context awareness
- Customizable prompts

### TTS (Text-to-Speech)

**Provider**: ElevenLabs

```python
tts = ElevenLabsTTSConfig(api_key=tts_api_key)
```

**Default Settings**:
- Model: eleven_multilingual_v2
- Voice: pNInz6obpgDQGcFmaJgB

**Features**:
- Natural voice synthesis
- Multiple voice options
- High quality audio

## Data Flow

```
Frontend Request
    ↓
FastAPI Router (server.py)
    ↓
Agent Class (agent.py)
    ↓
AgentClient (SDK)
    ↓
Agora REST API
    ↓
AI Agent (ASR + LLM + TTS)
    ↓
RTC/RTM Channel
    ↓
Frontend Client
```

## Error Handling

### Initialization Errors

If environment variables are missing:
```python
try:
    agent = Agent()
except ValueError as e:
    print(f"Warning: Failed to initialize SDK: {e}")
    agent = None
```

Service will start but fail on endpoint calls with:
```json
{
  "detail": "Service not properly configured. Please check environment variables."
}
```

### Runtime Errors

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| ValueError | 400 | Invalid parameters |
| RuntimeError | 500 | SDK/API errors |
| Agent not found | 404 | Invalid agent_id |

## Deployment

### Development Mode

```bash
# Activate virtual environment
source venv/bin/activate

# Start with auto-reload
python src/server.py
```

### Production Mode

```bash
# Using uvicorn directly
uvicorn src.server:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Security Considerations

1. **Never commit `.env.local`** - Contains sensitive API keys
2. **CORS Configuration** - Currently allows all origins (`*`), restrict in production
3. **Token Expiry** - Tokens expire after 24 hours
4. **API Key Rotation** - Regularly rotate service provider keys
5. **HTTPS** - Use HTTPS in production environments

## Dependencies

```txt
fastapi>=0.104.0          # Web framework
uvicorn>=0.24.0           # ASGI server
python-dotenv>=1.0.0      # Environment variables
agora-rest-client-python  # Agora SDK
pydantic>=2.0.0           # Data validation
```

## Integration with Frontend

Frontend connects via Vite proxy:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

**Frontend calls**:
- `/api/get_config` → `http://localhost:8000/get_config`
- `/api/v2/startAgent` → `http://localhost:8000/v2/startAgent`
- `/api/v2/stopAgent` → `http://localhost:8000/v2/stopAgent`

## Monitoring & Debugging

### Logs

Uvicorn logs include:
- Request method and path
- Response status code
- Request processing time

### Health Check

```bash
# Test service availability
curl http://localhost:8000/get_config

# Expected: JSON response with config data
```

### Common Issues

**Issue**: `Service not properly configured`
- **Cause**: Missing environment variables
- **Fix**: Check `.env.local` has all required keys

**Issue**: `Failed to start agent`
- **Cause**: Invalid API keys or network issues
- **Fix**: Verify API keys, check network connectivity

**Issue**: `Token generation failed`
- **Cause**: Invalid APP_ID or APP_CERTIFICATE
- **Fix**: Verify credentials in Agora Console

## Reference

- [Agora REST API Docs](https://docs.agora.io/en/conversational-ai/overview)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [agora-rest-client-python](https://pypi.org/project/agora-rest-client-python/)
