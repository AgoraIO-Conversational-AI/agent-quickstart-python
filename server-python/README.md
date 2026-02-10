# Agora Agent Service

Agora Conversational AI Agent service built with FastAPI.

## Quick Start
Follow [Get started with Agora](https://docs.agora.io/en/conversational-ai/get-started/manage-agora-account#enable-conversational-ai) to get the **App ID** and **App Certificate** and enable the **Conversational AI** service.

### 1. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your API keys:
- `APP_ID` - Your Agora App ID
- `APP_CERTIFICATE` - Your Agora App Certificate
- `API_KEY` - Your Agora API Key
- `API_SECRET` - Your Agora API Secret
- `LLM_API_KEY` - Your OpenAI API Key
- `TTS_ELEVENLABS_API_KEY` - Your ElevenLabs API Key
- `ASR_DEEPGRAM_API_KEY` - Your Deepgram API Key

### 2. Install Dependencies

**Option A: Using Virtual Environment (Recommended)**
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Option B: Global Installation (Not Recommended)**
```bash
# Install dependencies globally
pip install -r requirements.txt
```

### 3. Start Service

```bash
# If using virtual environment, make sure it's activated first
# source venv/bin/activate

# Start the service
python src/server.py
```

The service will:
- Automatically load environment variables from `.env.local`
- Start on port 8000 (or the port specified in `.env.local`)
- Be ready to accept API requests

### 4. Test API

```bash
# Test config generation
curl http://localhost:8000/get_config

# Test agent start (optional)
curl -X POST http://localhost:8000/v2/startAgent \
  -H "Content-Type: application/json" \
  -d '{"channelName": "test_channel", "rtcUid": "123456", "userUid": "789012"}'

# Test agent stop (optional, use agent_id from start response)
curl -X POST http://localhost:8000/v2/stopAgent \
  -H "Content-Type: application/json" \
  -d '{"agentId": "your_agent_id"}'
```

## API Endpoints

- `GET /get_config` - Generate connection configuration
- `POST /v2/startAgent` - Start an agent
- `POST /v2/stopAgent` - Stop an agent

## Requirements

- Python >= 3.8
- Dependencies listed in `requirements.txt`

## SDK

This project uses the `agora-rest-client-python` SDK:
- PyPI: https://pypi.org/project/agora-rest-client-python/
- Install: `pip install agora-rest-client-python`
