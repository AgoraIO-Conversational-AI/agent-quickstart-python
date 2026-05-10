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
| ASR Config Classes | Speech-to-text: Deepgram, Microsoft, Tencent, Fengming, Ares |
| LLM Config Classes | Language model: OpenAI (supports Azure OpenAI, any OpenAI-compatible API) |
| TTS Config Classes | Text-to-speech: ElevenLabs, Microsoft, OpenAI, Minimax, Tencent, Bytedance, Cartesia |

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

**Supported Vendors:**

**ASR (Speech-to-Text):**
- ✅ Deepgram - `DeepgramASRConfig` (Recommended for English)
- ✅ Microsoft - `MicrosoftASRConfig` (Azure Speech)
- ✅ Tencent - `TencentASRConfig`
- ✅ Fengming - `FengmingASRConfig`
- ✅ Ares - `AresASRConfig`

**LLM (Language Model):**
- ✅ OpenAI - `OpenAILLMConfig` (GPT-4, GPT-4o, GPT-3.5)
- ✅ Azure OpenAI - Use `OpenAILLMConfig` (OpenAI-compatible)
- ✅ Any OpenAI-compatible API - Use `OpenAILLMConfig`

**TTS (Text-to-Speech):**
- ✅ ElevenLabs - `ElevenLabsTTSConfig` (Recommended for quality)
- ✅ Microsoft - `MicrosoftTTSConfig` (Azure TTS)
- ✅ OpenAI - `OpenAITTSConfig`
- ✅ Minimax - `MinimaxTTSConfig`
- ✅ Tencent - `TencentTTSConfig`
- ✅ Bytedance - `BytedanceTTSConfig`
- ✅ Cartesia - `CartesiaTTSConfig`

**Option A: Using Built-in Config Classes (Recommended)**

```python
from agora_rest.agent import (
    DeepgramASRConfig,
    MicrosoftASRConfig,
    TencentASRConfig,
    OpenAILLMConfig,
    ElevenLabsTTSConfig,
    MicrosoftTTSConfig,
    OpenAITTSConfig
)

# ASR - Deepgram (English) - Only api_key required
asr = DeepgramASRConfig(api_key=os.getenv("ASR_DEEPGRAM_API_KEY"))
# Optional: customize
# asr.language = "zh-CN"
# asr.model = "nova-3"

# ASR - Microsoft (Chinese)
asr = MicrosoftASRConfig(
    key=os.getenv("AZURE_SPEECH_KEY"),
    language="zh-CN"
)

# ASR - Tencent
asr = TencentASRConfig(
    key=os.getenv("TENCENT_KEY"),
    app_id=os.getenv("TENCENT_APP_ID"),
    secret=os.getenv("TENCENT_SECRET")
)

# LLM - OpenAI (Only api_key required)
llm = OpenAILLMConfig(api_key=os.getenv("LLM_API_KEY"))
# Optional: customize
# llm.model = "gpt-4o"
# llm.system_message = "You are a helpful assistant."
# llm.max_tokens = 512

# TTS - ElevenLabs (Only api_key required)
tts = ElevenLabsTTSConfig(api_key=os.getenv("TTS_ELEVENLABS_API_KEY"))
# Optional: customize
# tts.voice_id = "custom_voice_id"
# tts.stability = 0.5

# TTS - Microsoft (Chinese voice)
tts = MicrosoftTTSConfig(
    key=os.getenv("AZURE_SPEECH_KEY"),
    voice_name="zh-CN-XiaoxiaoNeural"
)

# TTS - OpenAI
tts = OpenAITTSConfig(api_key=os.getenv("OPENAI_API_KEY"))
# Optional: customize
# tts.model = "tts-1-hd"
# tts.voice = "nova"
```

**Option B: Using Custom Dictionaries (For Unsupported Vendors)**

```python
# Custom ASR vendor
asr = {
    "vendor": "custom_asr",
    "params": {
        "api_key": "xxx",
        "custom_param": "value"
    }
}

# Custom LLM (OpenAI-compatible endpoint)
llm = {
    "api_key": "your_api_key",
    "url": "https://your-custom-endpoint.com/v1",
    "model": "your-model-name",
    "max_tokens": 1024,
    "system_message": "You are a helpful assistant."
}

# Custom TTS vendor
tts = {
    "vendor": "custom_tts",
    "params": {
        "api_key": "xxx",
        "custom_param": "value"
    }
}
```

### 3. Start Agent

**Simple Usage (Only Required Fields):**

```python
import uuid
import random

# Generate configuration
channel_name = f"channel_{uuid.uuid4().hex[:8]}"
user_uid = str(random.randint(100000, 999999))
agent_uid = str(random.randint(100000, 999999))

# Start agent with minimal config
result = client.start_agent(
    channel_name=channel_name,
    agent_uid=agent_uid,
    user_uid=user_uid,
    asr_config=DeepgramASRConfig(api_key="xxx"),  # Only api_key needed
    llm_config=OpenAILLMConfig(api_key="yyy"),    # Only api_key needed
    tts_config=ElevenLabsTTSConfig(api_key="zzz") # Only api_key needed
)

# Returns: {"agent_id": "...", "channel_name": "...", "status": "started"}
agent_id = result["agent_id"]
```

**Advanced Usage (Custom Configuration):**

```python
# Customize ASR
asr = DeepgramASRConfig(api_key="xxx")
asr.model = "nova-3"
asr.language = "en-US"

# Customize LLM
llm = OpenAILLMConfig(api_key="yyy")
llm.model = "gpt-4o"
llm.system_message = "You are a friendly AI assistant."
llm.max_tokens = 2048

# Customize TTS
tts = ElevenLabsTTSConfig(api_key="zzz")
tts.voice_id = "custom_voice_id"

# Start agent
result = client.start_agent(
    channel_name=channel_name,
    agent_uid=agent_uid,
    user_uid=user_uid,
    asr_config=asr,
    llm_config=llm,
    tts_config=tts
)
```

**Using Different Vendors:**

```python
# Microsoft ASR + OpenAI LLM + Microsoft TTS
result = client.start_agent(
    channel_name=channel_name,
    agent_uid=agent_uid,
    user_uid=user_uid,
    asr_config=MicrosoftASRConfig(key="xxx", language="en-US"),
    llm_config=OpenAILLMConfig(api_key="yyy"),
    tts_config=MicrosoftTTSConfig(key="zzz", voice_name="en-US-JennyNeural")
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

**Example 1: Simple Setup (Minimal Code)**

```python
import os
import uuid
import random
from agora_rest.agent import (
    AgentClient,
    TokenBuilder,
    DeepgramASRConfig,
    OpenAILLMConfig,
    ElevenLabsTTSConfig
)

# Initialize client
client = AgentClient(
    app_id=os.getenv("APP_ID"),
    app_certificate=os.getenv("APP_CERTIFICATE"),
    customer_id=os.getenv("API_KEY"),
    customer_secret=os.getenv("API_SECRET")
)

# Generate configuration
channel_name = f"channel_{uuid.uuid4().hex[:8]}"
user_uid = str(random.randint(100000, 999999))
agent_uid = str(random.randint(100000, 999999))

# Generate token
token = TokenBuilder.generate(
    app_id=os.getenv("APP_ID"),
    app_certificate=os.getenv("APP_CERTIFICATE"),
    channel_name=channel_name,
    uid=agent_uid
)

# Start agent - simple, only api_key required
result = client.start_agent(
    channel_name=channel_name,
    agent_uid=agent_uid,
    user_uid=user_uid,
    asr_config=DeepgramASRConfig(api_key=os.getenv("ASR_DEEPGRAM_API_KEY")),
    llm_config=OpenAILLMConfig(api_key=os.getenv("LLM_API_KEY")),
    tts_config=ElevenLabsTTSConfig(api_key=os.getenv("TTS_ELEVENLABS_API_KEY"))
)

print(f"Agent started: {result['agent_id']}")

# Stop agent
client.stop_agent(result['agent_id'])
print("Agent stopped")
```

**Example 2: Custom Configuration**

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
        self.client = AgentClient(
            app_id=os.getenv("APP_ID"),
            app_certificate=os.getenv("APP_CERTIFICATE"),
            customer_id=os.getenv("API_KEY"),
            customer_secret=os.getenv("API_SECRET")
        )
    
    def start(self, channel_name: str, agent_uid: str, user_uid: str):
        # Configure with customization
        asr = DeepgramASRConfig(api_key=os.getenv("ASR_DEEPGRAM_API_KEY"))
        asr.model = "nova-3"
        asr.language = "en-US"
        
        llm = OpenAILLMConfig(api_key=os.getenv("LLM_API_KEY"))
        llm.model = "gpt-4o"
        llm.system_message = "You are a helpful AI assistant."
        
        tts = ElevenLabsTTSConfig(api_key=os.getenv("TTS_ELEVENLABS_API_KEY"))
        tts.voice_id = "pNInz6obpgDQGcFmaJgB"
        
        return self.client.start_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            user_uid=user_uid,
            asr_config=asr,
            llm_config=llm,
            tts_config=tts
        )
    
    def stop(self, agent_id: str):
        self.client.stop_agent(agent_id)
```

**Example 3: Multi-Vendor Setup**

```python
from agora_rest.agent import (
    AgentClient,
    MicrosoftASRConfig,
    OpenAILLMConfig,
    OpenAITTSConfig
)

class MultiVendorAgent:
    def __init__(self):
        self.client = AgentClient(
            app_id=os.getenv("APP_ID"),
            app_certificate=os.getenv("APP_CERTIFICATE"),
            customer_id=os.getenv("API_KEY"),
            customer_secret=os.getenv("API_SECRET")
        )
    
    def start(self, channel_name: str, agent_uid: str, user_uid: str):
        # Microsoft ASR
        asr = MicrosoftASRConfig(
            key=os.getenv("AZURE_SPEECH_KEY"),
            language="en-US"
        )
        
        # OpenAI LLM
        llm = OpenAILLMConfig(api_key=os.getenv("LLM_API_KEY"))
        llm.model = "gpt-4o"
        llm.system_message = "You are a helpful assistant."
        
        # OpenAI TTS
        tts = OpenAITTSConfig(api_key=os.getenv("OPENAI_API_KEY"))
        tts.model = "tts-1-hd"
        tts.voice = "nova"
        
        return self.client.start_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            user_uid=user_uid,
            asr_config=asr,
            llm_config=llm,
            tts_config=tts
        )
```

**Example 4: Using Custom Vendors (Dictionary-Based)**

```python
import os
from agora_rest.agent import AgentClient

class CustomVendorAgent:
    def __init__(self):
        self.client = AgentClient(
            app_id=os.getenv("APP_ID"),
            app_certificate=os.getenv("APP_CERTIFICATE"),
            customer_id=os.getenv("API_KEY"),
            customer_secret=os.getenv("API_SECRET")
        )
    
    def start(self, channel_name: str, agent_uid: str, user_uid: str):
        # Use dictionaries for custom or unsupported vendors
        asr_config = {
            "vendor": "custom_asr_vendor",
            "params": {
                "api_key": os.getenv("CUSTOM_ASR_KEY"),
                "endpoint": "wss://custom-asr.example.com",
                "model": "custom-model",
                "language": "en-US"
            }
        }
        
        llm_config = {
            "api_key": os.getenv("CUSTOM_LLM_KEY"),
            "url": "https://custom-llm.example.com/v1",
            "model": "custom-model-name",
            "max_tokens": 2048,
            "system_message": "You are a helpful AI assistant."
        }
        
        tts_config = {
            "vendor": "custom_tts_vendor",
            "params": {
                "api_key": os.getenv("CUSTOM_TTS_KEY"),
                "voice_id": "custom_voice",
                "speed": 1.0,
                "pitch": 1.0
            }
        }
        
        # Start agent with custom vendor configurations
        return self.client.start_agent(
            channel_name=channel_name,
            agent_uid=agent_uid,
            user_uid=user_uid,
            asr_config=asr_config,
            llm_config=llm_config,
            tts_config=tts_config
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

1. **Simple Configuration**: Only `api_key` is required for most config classes, other parameters have sensible defaults
2. **Multiple Vendors**: SDK supports 7+ ASR vendors, OpenAI-compatible LLMs, and 7+ TTS vendors
3. **Customization**: Use attribute assignment to customize after creating config objects
4. **UID Format**: Must be strings, not integers
5. **Agent Lifecycle**: Always stop agents when done to avoid charges
6. **Channel Names**: Must match the RTC channel where user is connected

## Type Definitions

```python
# All available config classes
from agora_rest.agent import (
    AgentClient,
    TokenBuilder,
    # ASR
    DeepgramASRConfig,
    MicrosoftASRConfig,
    TencentASRConfig,
    FengmingASRConfig,
    AresASRConfig,
    # LLM
    OpenAILLMConfig,
    # TTS
    ElevenLabsTTSConfig,
    MicrosoftTTSConfig,
    OpenAITTSConfig,
    MinimaxTTSConfig,
    TencentTTSConfig,
    BytedanceTTSConfig,
    CartesiaTTSConfig
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

- `server/src/agent.py` - Complete implementation
- `server/src/server.py` - FastAPI integration example
- [agora-rest-client-python](https://pypi.org/project/agora-rest-client-python/) - SDK documentation
