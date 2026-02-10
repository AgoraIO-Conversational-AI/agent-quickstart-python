---
name: "Agora REST Client Integration"
description: "Use Agora REST Client SDK to start/stop conversational AI agents with ASR, LLM, and TTS configuration; use when working with agent lifecycle management"
---

# Agora REST Client Integration

Integration guide for `agora-rest-client-python` SDK to manage Conversational AI Agents.

## Dependencies

```bash
pip install agora-rest-client-python
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| AgentClient | Main client for agent operations |
| DeepgramASRConfig | Speech-to-text configuration |
| OpenAILLMConfig | Language model configuration |
| ElevenLabsTTSConfig | Text-to-speech configuration |

## Standard Implementation Flow

### 1. Initialize AgentClient

```python
from agora_rest.agent import AgentClient
import os

# Get credentials from environment
app_id = os.getenv("APP_ID")
app_certificate = os.getenv("APP_CERTIFICATE")
api_key = os.getenv("API_KEY")
api_secret = os.getenv("API_SECRET")

# Create client
client = AgentClient(app_id, app_certificate, api_key, api_secret)
```

### 2. Configure Service Providers

**Option A: Using Built-in Config Classes (Recommended)**

```python
from agora_rest.agent import DeepgramASRConfig, OpenAILLMConfig, ElevenLabsTTSConfig

# ASR - Deepgram
asr = DeepgramASRConfig(
    api_key=os.getenv("ASR_DEEPGRAM_API_KEY"),
    model="nova-2",           # Optional: default is "nova-2"
    language="en-US"          # Optional: default is "en-US"
)

# LLM - OpenAI
llm = OpenAILLMConfig(
    api_key=os.getenv("LLM_API_KEY"),
    model="gpt-4",            # Optional: default is "gpt-4"
    max_tokens=1024,          # Optional: default is 1024
    max_history=64,           # Optional: default is 64
    system_message="You are a helpful assistant.",  # Optional
    greeting="Hello, how can I help you?"           # Optional
)

# TTS - ElevenLabs
tts = ElevenLabsTTSConfig(
    api_key=os.getenv("TTS_ELEVENLABS_API_KEY"),
    model_id="eleven_multilingual_v2",  # Optional
    voice_id="pNInz6obpgDQGcFmaJgB"     # Optional
)
```

**Option B: Using Custom Dictionaries (For Other Vendors)**

```python
# ASR - Custom vendor (e.g., Azure Speech)
asr = {
    "vendor": "deepgram",  # Currently only "deepgram" supported by PropertyBuilder
    "api_key": "your_api_key",
    "url": "wss://api.deepgram.com/v1/listen",
    "model": "nova-2",
    "language": "en-US"
}

# LLM - Custom vendor (e.g., Azure OpenAI, Claude, etc.)
llm = {
    "api_key": "your_api_key",
    "url": "https://your-custom-endpoint.com/v1",  # OpenAI-compatible endpoint
    "model": "your-model-name",
    "max_tokens": 1024,
    "max_history": 64,
    "system_message": "You are a helpful assistant.",
    "greeting": "Hello!"
}

# TTS - Custom vendor
tts = {
    "vendor": "elevenlabs",  # Currently only "elevenlabs" supported by PropertyBuilder
    "api_key": "your_api_key",
    "model_id": "eleven_multilingual_v2",
    "voice_id": "pNInz6obpgDQGcFmaJgB"
}
```

### 3. Start Agent

**Using Config Objects:**

```python
# Start agent with config objects
result = client.start_agent(
    channel_name="my_channel",
    agent_uid="12345678",      # Agent's RTC UID (recommend: 10000000-99999999)
    user_uid="1234",           # User's RTC UID (recommend: 1000-9999999)
    asr_config=asr,            # Config object or dict
    llm_config=llm,            # Config object or dict
    tts_config=tts             # Config object or dict
)

# Returns: {"agent_id": "...", "channel_name": "...", "status": "started"}
agent_id = result["agent_id"]
```

**Using Dictionaries (Custom Vendors):**

```python
# Start agent with custom dictionaries
result = client.start_agent(
    channel_name="my_channel",
    agent_uid="12345678",
    user_uid="1234",
    asr_config={
        "vendor": "deepgram",
        "api_key": "xxx",
        "model": "nova-2",
        "language": "zh-CN"  # Chinese
    },
    llm_config={
        "api_key": "yyy",
        "url": "https://api.openai.com/v1",
        "model": "gpt-4o",
        "max_tokens": 2048,
        "system_message": "You are a friendly AI assistant."
    },
    tts_config={
        "vendor": "elevenlabs",
        "api_key": "zzz",
        "voice_id": "custom_voice_id"
    }
)
```

### 4. Stop Agent

```python
# Stop agent by ID
client.stop_agent(agent_id)
```

## Environment Variables Required

```bash
# Agora Credentials
APP_ID=your_agora_app_id
APP_CERTIFICATE=your_agora_app_certificate
API_KEY=your_agora_api_key
API_SECRET=your_agora_api_secret

# Service Provider Keys
ASR_DEEPGRAM_API_KEY=your_deepgram_api_key
LLM_API_KEY=your_openai_api_key
TTS_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## Complete Example

**Example 1: Using Built-in Config Classes**

```python
import os
from agora_rest.agent import (
    AgentClient,
    DeepgramASRConfig,
    OpenAILLMConfig,
    ElevenLabsTTSConfig
)

class Agent:
    def __init__(self):
        app_id = os.getenv("APP_ID")
        app_certificate = os.getenv("APP_CERTIFICATE")
        api_key = os.getenv("API_KEY")
        api_secret = os.getenv("API_SECRET")
        self.client = AgentClient(app_id, app_certificate, api_key, api_secret)
    
    def start(self, channel_name: str, agent_uid: str, user_uid: str):
        # Configure services with built-in classes
        asr = DeepgramASRConfig(api_key=os.getenv("ASR_DEEPGRAM_API_KEY"))
        llm = OpenAILLMConfig(api_key=os.getenv("LLM_API_KEY"))
        tts = ElevenLabsTTSConfig(api_key=os.getenv("TTS_ELEVENLABS_API_KEY"))
        
        # Start agent (SDK auto-converts config objects to dicts)
        return self.client.start_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            user_uid=user_uid,
            asr_config=asr,  # Can pass object directly
            llm_config=llm,
            tts_config=tts
        )
    
    def stop(self, agent_id: str):
        self.client.stop_agent(agent_id)
```

**Example 2: Using Custom Dictionaries**

```python
import os
from agora_rest.agent import AgentClient

class Agent:
    def __init__(self):
        self.client = AgentClient(
            app_id=os.getenv("APP_ID"),
            app_certificate=os.getenv("APP_CERTIFICATE"),
            customer_id=os.getenv("API_KEY"),
            customer_secret=os.getenv("API_SECRET")
        )
    
    def start_with_custom_config(self, channel_name: str, agent_uid: str, user_uid: str):
        # Use dictionaries for full control
        return self.client.start_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            user_uid=user_uid,
            asr_config={
                "vendor": "deepgram",
                "api_key": os.getenv("ASR_DEEPGRAM_API_KEY"),
                "url": "wss://api.deepgram.com/v1/listen",
                "model": "nova-2",
                "language": "en-US"
            },
            llm_config={
                "api_key": os.getenv("LLM_API_KEY"),
                "url": "https://api.openai.com/v1",
                "model": "gpt-4o",
                "max_tokens": 2048,
                "max_history": 100,
                "system_message": "You are a helpful AI assistant.",
                "greeting": "Hi! How can I assist you today?"
            },
            tts_config={
                "vendor": "elevenlabs",
                "api_key": os.getenv("TTS_ELEVENLABS_API_KEY"),
                "model_id": "eleven_multilingual_v2",
                "voice_id": "pNInz6obpgDQGcFmaJgB"
            }
        )
    
    def stop(self, agent_id: str):
        self.client.stop_agent(agent_id)
```

## UID Ranges

| Type | Range | Example |
|------|-------|---------|
| User UID | 1000 - 9999999 | 1234 |
| Agent UID | 10000000 - 99999999 | 12345678 |

## Error Handling

```python
try:
    result = client.start_agent(...)
except ValueError as e:
    # Invalid parameters (empty channel_name, etc.)
    print(f"Validation error: {e}")
except RuntimeError as e:
    # API call failed
    print(f"API error: {e}")
```

## Important Notes

1. **Credentials**: All API keys must be set in environment variables
2. **UID Format**: Must be strings, not integers
3. **Config Format**: Use `.to_dict()` to convert config objects
4. **Agent Lifecycle**: Always stop agents when done to avoid charges
5. **Channel Names**: Must match the RTC channel where user is connected

## Type Definitions

```python
from agora_rest.agent import (
    AgentClient,
    DeepgramASRConfig,
    OpenAILLMConfig,
    ElevenLabsTTSConfig,
    TokenBuilder  # For generating RTC/RTM tokens
)
```

## Token Generation

```python
from agora_rest.agent import TokenBuilder

# Generate RTC token
token = TokenBuilder.generate(
    app_id=app_id,
    app_certificate=app_certificate,
    channel_name="my_channel",
    uid="1234",
    expire=86400  # 24 hours in seconds
)
```

## Reference Files

- `server-python/src/agent.py` - Complete implementation
- `server-python/src/server.py` - FastAPI integration example
- [agora-rest-client-python](https://pypi.org/project/agora-rest-client-python/) - SDK documentation
