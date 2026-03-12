# Skill: AgoraVoiceAI Integration (agent-client-toolkit-ts)

AgoraVoiceAI is the core module for subtitle rendering and Agent state management, provided by the `agent-client-toolkit-ts` package.

## Core Features

- Real-time subtitle rendering (transcript management)
- Agent state monitoring (idle/listening/thinking/speaking/silent)
- Error event handling with provider type info (llm/tts/mllm/context/unknown)

## Installation

```bash
bun add agent-client-toolkit-ts agent-client-toolkit-react
```

## Initialization (Imperative API)

```typescript
import { AgoraVoiceAI, AgoraVoiceAIEvents } from 'agent-client-toolkit-ts'

// Initialize after RTC client and RTM client are ready
const voiceAI = await AgoraVoiceAI.init({
  rtcEngine: rtcClient,        // IAgoraRTCClient from agora-rtc-sdk-ng
  rtmConfig: { rtmEngine: rtmClient },  // RTMClient from agora-rtm
  enableLog: true,
})

// Subscribe to channel messages
voiceAI.subscribeMessage(channelName)
```

> **Note**: We use the imperative API instead of `ConversationalAIProvider` because
> conditional rendering of the Provider causes RTC LEAVE disconnect issues.

## Event Listeners

### Transcript Updated

```typescript
import type {
  TranscriptHelperItem,
  UserTranscription,
  AgentTranscription,
} from 'agent-client-toolkit-ts'

voiceAI.on(
  AgoraVoiceAIEvents.TRANSCRIPT_UPDATED,
  (chatHistory: TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]) => {
    // chatHistory contains all conversation records
    const transcripts = chatHistory
      .sort((a, b) => {
        if (a.turn_id !== b.turn_id) return a.turn_id - b.turn_id
        return Number(a.uid) - Number(b.uid)
      })
      .map((item) => ({
        id: `${item.turn_id}-${item.uid}-${item._time}`,
        type: Number(item.uid) !== 0 ? 'agent' : 'user',
        text: item.text || '',
        status: item.status,   // TurnStatus enum
        timestamp: item._time || Date.now(),
      }))
  }
)
```

### Agent State Changed

```typescript
import { AgentState } from 'agent-client-toolkit-ts'

voiceAI.on(
  AgoraVoiceAIEvents.AGENT_STATE_CHANGED,
  (agentUserId: string, event: { state: AgentState }) => {
    // AgentState: IDLE | LISTENING | THINKING | SPEAKING | SILENT
    console.log(`Agent state: ${event.state}`)
  }
)
```

### Agent Error

```typescript
import type { ModuleError, ModuleType } from 'agent-client-toolkit-ts'

voiceAI.on(
  AgoraVoiceAIEvents.AGENT_ERROR,
  (agentUserId: string, error: ModuleError) => {
    // error.type: ModuleType (llm/tts/mllm/context/unknown)
    // error.code: number
    // error.message: string
    console.error(`[${error.type}] ${error.message} (code: ${error.code})`)
  }
)
```

### Message Error

```typescript
voiceAI.on(
  AgoraVoiceAIEvents.MESSAGE_ERROR,
  (agentUserId: string, error: ModuleError) => {
    console.error(`[${error.type}] ${error.message} (code: ${error.code})`)
  }
)
```

## Cleanup

```typescript
// Unsubscribe from messages
voiceAI.unsubscribe()

// Destroy instance
voiceAI.destroy()
```

## Key Types

```typescript
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  AgentState,          // IDLE | LISTENING | THINKING | SPEAKING | SILENT
  TurnStatus,          // IN_PROGRESS | END | INTERRUPTED
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
  type ModuleError,    // { type: ModuleType, code: number, message: string }
  type ModuleType,     // 'llm' | 'tts' | 'mllm' | 'context' | 'unknown'
} from 'agent-client-toolkit-ts'
```

## Important Notes

1. Must initialize RTC and RTM clients before calling `AgoraVoiceAI.init()`
2. Use imperative API (`AgoraVoiceAI.init()`) — do NOT use `ConversationalAIProvider`
3. Call `subscribeMessage(channel)` after init to start receiving events
4. When cleaning up, call `unsubscribe()` then `destroy()`

## Reference Files

- `src/hooks/useAgoraConnection.ts` - Full integration example
- `src/stores/app-store.ts` - State types using AgentState/TurnStatus
- `src/components/subtitle-panel.tsx` - Transcript rendering with TurnStatus
- `src/components/control-bar.tsx` - Agent state display with AgentState
