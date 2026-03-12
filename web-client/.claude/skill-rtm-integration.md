# Skill: RTM Integration

Agora RTM SDK integration guide for real-time messaging and subtitle data reception.

## Dependencies

```bash
bun add agora-rtm
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| RTMClient | RTM client instance |
| MessageEvent | Message event |
| PresenceEvent | Presence event (Agent state changes) |

## Implementation Flow

### 1. Initialize RTM Client

```typescript
import AgoraRTM, { type RTMClient } from 'agora-rtm'

const rtmClient = new AgoraRTM.RTM(appId, String(uid))
```

### 2. Login

```typescript
// token obtained from backend /api/get_config
try {
  await rtmClient.login({ token })
} catch (e) {
  const error = e as { code?: number }
  if (error.code === -10017) {
    // Already logged in, can ignore
  } else {
    throw e
  }
}
```

### 3. Subscribe Channel

```typescript
await rtmClient.subscribe(channelName)
```

### 4. Pass to AgoraVoiceAI

RTM message handling is managed by `AgoraVoiceAI` from `agent-client-toolkit-ts`.
After RTM login and subscribe, pass the RTM client to AgoraVoiceAI:

```typescript
import { AgoraVoiceAI } from 'agent-client-toolkit-ts'

const voiceAI = await AgoraVoiceAI.init({
  rtcEngine: rtcClient,
  rtmConfig: { rtmEngine: rtmClient },
  enableLog: true,
})
voiceAI.subscribeMessage(channelName)
```

AgoraVoiceAI handles all RTM message parsing (subtitles, agent state, errors)
and emits typed events via `AgoraVoiceAIEvents`.

### 5. Logout

```typescript
await rtmClient.logout()
```

## Message Types (handled by AgoraVoiceAI internally)

| Type | Description |
|------|-------------|
| `user.transcription` | User speech-to-text |
| `assistant.transcription` | Agent response text |
| `message.interrupt` | Interrupt message |
| `message.metrics` | Performance metrics |
| `message.error` | Error message |

## Agent States

| State | Description |
|-------|-------------|
| `idle` | Idle |
| `listening` | Listening |
| `thinking` | Thinking |
| `speaking` | Speaking |
| `silent` | Silent |

## Important Notes

1. RTM login may return error code -10017 indicating already logged in
2. RTM is used as the data channel (`"data_channel": "rtm"` in backend config)
3. All RTM message parsing is handled by `AgoraVoiceAI` — no manual parsing needed
4. RTM must be initialized before `AgoraVoiceAI.init()`

## Reference Files

- `src/hooks/useAgoraConnection.ts` - RTM init + AgoraVoiceAI integration
