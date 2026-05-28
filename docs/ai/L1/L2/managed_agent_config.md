# Managed Agent Config

> **When to Read This:** Load this document when you are changing the agent's prompt, voice, VAD behavior, model selection, session options, or wiring a bring-your-own-key (BYOK) provider on the Python side.

## Where It Lives

All managed agent configuration is in `server/src/agent.py`. The browser sends `{ channelName, rtcUid, userUid }` to `POST /startAgent`, which the FastAPI handler forwards to `agent.start(...)`. That method builds an SDK-driven agent and creates an async session.

## The Agent Builder Chain

`AsyncAgora` is constructed once at `Agent.__init__` time and held as `self.client`. All provider options (`turn_detection`, `advanced_features`, `parameters`) live on `AgoraAgent`, not on `create_async_session`.

```python
from agora_agent import Area, AsyncAgora
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import OpenAI, DeepgramSTT, MiniMaxTTS

# --- at __init__ time ---
self.client = AsyncAgora(
    area=Area.US,
    app_id=self.app_id,
    app_certificate=self.app_certificate,
)

# --- at start() time ---
agora_agent = AgoraAgent(
    name=f"agent_{channel_name}_{agent_uid}_{int(time.time())}",
    instructions=ADA_PROMPT,
    greeting=self.greeting,
    failure_message="Please wait a moment.",
    max_history=50,
    turn_detection={
        "config": {
            "speech_threshold": 0.5,
            "start_of_speech": { /* VAD on-start params */ },
            "end_of_speech":   { /* VAD on-end params */ },
        },
    },
    advanced_features={"enable_rtm": True, "enable_tools": True},
    parameters={
        "data_channel": "rtm",
        "enable_error_message": True,
        "enable_metrics": True,
    },
).with_stt(DeepgramSTT(model="nova-3", language="en")
).with_llm(OpenAI(
    model="gpt-4o-mini",
    greeting_message=self.greeting,
    failure_message="Please wait a moment.",
    max_history=15,
    max_tokens=1024,
    temperature=0.7,
    top_p=0.95,
)).with_tts(MiniMaxTTS(model="speech_2_6_turbo", voice_id="English_captivating_female1"))

# create_async_session is synchronous; start() is async
session = agora_agent.create_async_session(
    client=self.client,
    channel=channel_name,
    agent_uid=str(agent_uid),
    remote_uids=[str(user_uid)],
    enable_string_uid=False,
    idle_timeout=30,
    expires_in=3600,
)
agent_id = await session.start()
return {"agent_id": agent_id, "channel_name": channel_name, "status": "started"}
```

The exact field names track `agora-agents`. The requirement is unpinned in `server/requirements.txt`, so re-verify field names after upgrades.

## Editing Each Surface

### Change the prompt

Edit the `ADA_PROMPT` string constant at the top of `agent.py`. Keep it concise — long prompts amplify LLM latency.

### Change the greeting

Set `AGENT_GREETING` in `server/.env.local`, or change `DEFAULT_GREETING` in `agent.py`.

### Change VAD

Edit the `turn_detection` dict on `AgoraAgent`. The shape uses a `"config"` wrapper key with nested `start_of_speech` and `end_of_speech` blocks — do **not** use the deprecated flat `"start"`/`"end"` keys. Tuning notes:

- `speech_threshold` — VAD activation sensitivity (0.0–1.0). Lower values trigger on quieter audio.
- `interrupt_duration_ms` — minimum user speech before the agent yields. Lower = more responsive interruptions.
- `prefix_padding_ms` — audio captured before VAD triggers; raise if early phonemes are clipped.
- `silence_duration_ms` — silence after speech before VAD ends the turn. Raise for slow speakers.

### Swap STT / LLM / TTS

Replace the corresponding constructor:

```python
.with_stt(DeepgramSTT(model="...", language="...", api_key=os.environ.get("DEEPGRAM_API_KEY")))
.with_llm(OpenAI(model="...", api_key=os.environ.get("OPENAI_API_KEY"), base_url=os.environ.get("OPENAI_BASE_URL")))
.with_tts(MiniMaxTTS(model="...", voice_id="...", api_key=os.environ.get("MINIMAX_API_KEY")))
```

For a BYOK provider, document the new env var in `server/.env.example`.

### Session-Level Tuning

- `idle_timeout` (seconds) — drop to 15 for short demos.
- `expires_in` (seconds) — keep aligned with `token_expire` in `get_config`.
- `agent_uid` — the UID the agent occupies in the channel; must match the value the browser expects.
- `enable_string_uid` — `False` keeps UIDs numeric for both RTC and RTM. Flipping to `True` requires matching changes in the browser join path.

`data_channel`, `enable_error_message`, and `enable_metrics` are session-level parameters but live in the `parameters=` dict on `AgoraAgent`, not in `create_async_session`.

## Async Lifetime

`Agent` is constructed once at module import (`agent = Agent()` in `server.py`). Every request reuses the same instance. `Agent.start` returns the new session metadata; `Agent.stop(agent_id)` ends the corresponding session.

Do not hold per-request state on `Agent`. If you need correlation, use the returned `agent_id` and pass it through subsequent calls.

## Response Contract

`startAgent` returns:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "agent_id": "string",
    "channel_name": "string",
    "status": "started"
  }
}
```

The client stores `agent_id` in `agoraData` and later passes it to `/api/stopAgent`.

Stop is idempotent: `Agent.stop` tries `session.stop()` on the in-memory session first, and falls back to `self.client.stop_agent(agent_id)` if the session is stale or already gone. Both paths succeed without error.

## Verification

`bun run verify:backend` runs `py_compile` so syntax errors surface, but it does not exercise behavior. `bun run verify:local:fastapi` runs the FastAPI app with `FakeAgent` patched in to ensure routes match expected shapes without touching the real Agora cloud.

After editing `agent.py`, run:

```bash
bun run verify:backend
bun run verify:local:fastapi
bun run verify:web:api
```

## Failure Modes

| Symptom                                                | Cause                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Routes return `500 Service not properly configured`    | Missing `AGORA_APP_ID` or `AGORA_APP_CERTIFICATE`; `Agent()` raises `ValueError` at import and `agent` stays `None`. |
| `400` from `/startAgent` on a valid request            | `Agent.start` raised `ValueError` — usually missing UID fields.         |
| Agent joins but never speaks                           | TTS BYOK key missing or wrong `voice_id`.                                |
| Agent state stuck in `IDLE`                            | `enable_rtm` missing from `advanced_features` or RTM not subscribed yet. |
| Transcript fragments arrive but no metrics             | `parameters.enable_metrics` not set.                                     |
| Import error on `from agora_agent.agentkit import ...` | SDK version mismatch; `pip install -r server/requirements.txt`.          |

## See Also

- [Back to Architecture](../02_architecture.md)
- [Back to Workflows](../05_workflows.md)
- [Session Lifecycle](session_lifecycle.md)
