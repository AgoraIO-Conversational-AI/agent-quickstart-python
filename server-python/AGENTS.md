# Agora Agent Service - AI Assistant Guide

This document is designed for AI programming assistants to understand and work with this project effectively.

## Project Overview

**Purpose:** FastAPI-based service for managing Agora Conversational AI Agents

**Tech Stack:**
- Python 3.8+
- FastAPI (web framework)
- agent-server-sdk-python (Agora Agent SDK)
- uvicorn (ASGI server)

**Architecture:**
```
HTTP Request → FastAPI (server.py) → Agent (agent.py) → agent-server-sdk-python → Agora API
```

**Key Components:**
- `src/server.py` - HTTP endpoints and request handling
- `src/agent.py` - Business logic wrapper around SDK
- SDK handles token generation, API calls, and configuration

## Build and Test Commands

### Setup
```bash
# First time setup
cp .env.example .env.local
# Edit .env.local with actual API keys

# Install dependencies
pip install -r requirements.txt
```

### Run
```bash
# Development (simple)
python src/server.py

# Development (auto-reload)
uvicorn src.server:app --host 0.0.0.0 --port 8000 --reload

# Production
gunicorn src.server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Test
```bash
# Test config generation
curl http://localhost:8000/get_config

# Test agent start
curl -X POST http://localhost:8000/v2/startAgent \
  -H "Content-Type: application/json" \
  -d '{"channelName": "test", "rtcUid": "123", "userUid": "456"}'

# Test agent stop
curl -X POST http://localhost:8000/v2/stopAgent \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent_id"}'
```

## Code Style Guidelines

### Python Conventions
- **Style:** PEP 8
- **Type hints:** Required for all function parameters and return values
- **Imports:** Absolute imports preferred, group by standard/third-party/local
- **Line length:** 100 characters max

### Naming
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: prefix with `_`

### Comments
- Keep docstrings concise and natural
- Avoid obvious comments
- Focus on "why" not "what"

## Security Considerations

### Environment Variables
- **Never commit** `.env.local` or actual API keys
- Use `.env.example` as template only
- All secrets must be loaded from environment

### API Keys Required
- `APP_ID`, `APP_CERTIFICATE` - Agora credentials (required)
- `LLM_API_KEY` - LLM API key (required)
- `TTS_ELEVENLABS_API_KEY` - ElevenLabs API key (required)
- `ASR_DEEPGRAM_API_KEY` - Deepgram API key (required)

## Project Structure

```
server-python/
├── src/
│   ├── server.py          # FastAPI app, HTTP endpoints
│   └── agent.py           # Agent lifecycle management
├── .env.example           # Environment template (safe to commit)
├── .env.local             # Actual secrets (never commit)
├── requirements.txt       # Python dependencies
├── README.md              # User documentation
└── AGENTS.md              # This file (AI assistant guide)
```

## Common Patterns

### Agent Configuration Pattern
```python
from agora_agent import Agora, Area
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import OpenAI, ElevenLabsTTS, DeepgramSTT

# Create Agora client (Token007 auth from APP_ID + APP_CERTIFICATE)
client = Agora(area=Area.CN, app_id=app_id, app_certificate=app_certificate)

# Create agent with fluent API
agora_agent = AgoraAgent(
    name="agent_name",
    instructions="System prompt",
    greeting="Hello message",
    advanced_features={"enable_rtm": True},
    parameters={"data_channel": "rtm", "enable_error_message": True},
)

agora_agent = (
    agora_agent
    .with_llm(OpenAI(api_key=key, model="gpt-4o-mini"))
    .with_tts(ElevenLabsTTS(key=key, voice_id=voice_id, model_id=model_id))
    .with_stt(DeepgramSTT(api_key=key, language="en-US"))
)

session = agora_agent.create_session(
    client=client,
    channel=channel,
    agent_uid=agent_uid,
    remote_uids=["*"],          # Subscribe all users
    enable_string_uid=True,
    idle_timeout=120,
)
agent_id = session.start()
```

### Error Handling Pattern
```python
try:
    result = agent.some_method()
    return {"code": 0, "msg": "success", "data": result}
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except RuntimeError as e:
    raise HTTPException(status_code=500, detail=str(e))
```

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

## Dependencies

### Core
- `fastapi>=0.100.0` - Web framework
- `uvicorn>=0.20.0` - ASGI server
- `agent-server-sdk-python` - Agora Agent SDK
- `python-dotenv>=1.0.0` - Environment management

## Troubleshooting

### Import Errors
**Symptom:** `ModuleNotFoundError: No module named 'agora_agent'`
**Solution:** Ensure `agent-server-sdk-python` is installed: `pip install -r requirements.txt`

### Configuration Errors
**Symptom:** Service fails to start with ValueError
**Solution:** Check `.env.local` exists and contains all required variables

### Port Conflicts
**Symptom:** `address already in use`
**Solution:** Change `PORT` in `.env.local` or kill existing process with `lsof -ti :8000 | xargs kill -9`
