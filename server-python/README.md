# Agora Agent Service

Agora Conversational AI Agent service built with FastAPI.

## Quick Start
Follow [Get started with Agora](https://docs.agora.io/en/conversational-ai/get-started/manage-agora-account#enable-conversational-ai) to get the **App ID** and **App Certificate** and enable the **Conversational AI** service.

Alternatively, use the [Agora CLI](https://www.npmjs.com/package/agoraio-cli) to get credentials directly from the terminal:

```bash
agora project show --json   # outputs app_id and app_certificate
```

### 1. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Agora credentials:
- `APP_ID` - Your Agora App ID (Required)
- `APP_CERTIFICATE` - Your Agora App Certificate (Required)
- Agora managed provider access should be enabled for this project

**Note**: The service uses Token007 authentication generated from `APP_ID` and `APP_CERTIFICATE`. Third-party vendor keys are not required in this default managed setup. The current default chain matches the Next.js quickstart: `DeepgramSTT` (`nova-3`) + `OpenAI` (`gpt-4o-mini`) + `MiniMaxTTS` (`speech_2_6_turbo` / `English_captivating_female1`).

### 2. Install Dependencies

**Option A: Using Virtual Environment (Recommended)**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Option B: Global Installation (Not Recommended)**
```bash
pip install -r requirements.txt
```

### 3. Start Service

```bash
# If using virtual environment, make sure it's activated first
python src/server.py
```

The service will start on port 8000 (or the port specified in `.env.local`).

### 4. Test API

```bash
# Test config generation
curl http://localhost:8000/get_config

# Test agent start
curl -X POST http://localhost:8000/v2/startAgent \
  -H "Content-Type: application/json" \
  -d '{"channelName": "test_channel", "rtcUid": "123456", "userUid": "789012"}'

# Test agent stop (use agent_id from start response)
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

This project uses `agora-agent-server-sdk`:
- Package: `agora_agent`
- Agent builder: `agora_agent.agentkit.Agent` with fluent `.with_llm()` / `.with_tts()` / `.with_stt()` API
- Default vendors: `DeepgramSTT`, `OpenAI`, `MiniMaxTTS` from `agora_agent.agentkit.vendors`
- Optional BYOK examples in `src/agent.py`: `DeepgramSTT`, `OpenAI(api_key=...)`, `ElevenLabsTTS`
- Token: `agora_agent.agentkit.token.generate_convo_ai_token`
