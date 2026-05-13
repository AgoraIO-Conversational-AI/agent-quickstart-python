# Skill: RTC Integration

Agora RTC SDK integration guide for real-time audio communication, using `agora-rtc-react` hooks.

## Dependencies

```bash
bun add agora-rtc-sdk-ng agora-rtc-react
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| AgoraRTCProvider | React context provider for RTC client |
| useRTCClient | Access the RTC client instance |
| useJoin | Declarative channel join hook |
| usePublish | Declarative track publish hook |
| useLocalMicrophoneTrack | Create local microphone track |
| useRemoteUsers | Access remote users |
| useClientEvent | Listen to RTC client events |
| useIsConnected | Check RTC connection status |

## Implementation with agora-rtc-react

### 1. Provider Setup (app/page.tsx)

```typescript
import AgoraRTC from 'agora-rtc-sdk-ng'
import { AgoraRTCProvider } from 'agora-rtc-react'

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

export default function Page() {
  return (
    <AgoraRTCProvider client={client}>
      <App />
    </AgoraRTCProvider>
  )
}
```

### 2. Hook-Based Connection (useAgoraConnection.ts)

```typescript
import {
  useRTCClient, useLocalMicrophoneTrack, useRemoteUsers,
  useClientEvent, useIsConnected, useJoin, usePublish,
} from 'agora-rtc-react'

// Local microphone track
const { localMicrophoneTrack } = useLocalMicrophoneTrack(micEnabled && shouldJoin, {
  AEC: true, ANS: false, AGC: true,
})

// Join channel (declarative — joins when shouldJoin && config are truthy)
const { isConnected } = useJoin(
  config ? { appid: config.appId, channel: config.channel, token: config.token, uid: config.uid }
         : { appid: '', channel: '', token: null, uid: 0 },
  shouldJoin && !!config
)

// Publish local track
usePublish([localMicrophoneTrack])
```

### 3. Event Listeners

```typescript
const client = useRTCClient()

// Subscribe to remote user audio
useClientEvent(client, 'user-published', async (user, mediaType) => {
  if (mediaType === 'audio') {
    await client.subscribe(user, mediaType)
    user.audioTrack?.play()
  }
})

useClientEvent(client, 'user-joined', (user) => {
  console.log(`User joined: ${user.uid}`)
})

useClientEvent(client, 'connection-state-change', (curState, _prevState, reason) => {
  // Handle connection state changes
})
```

### 4. Microphone Control

```typescript
// Mute/unmute via track
localMicrophoneTrack.setMuted(true)   // Mute
localMicrophoneTrack.setMuted(false)  // Unmute
```

### 5. Disconnect

```typescript
// Stop and close local track
localMicrophoneTrack.stop()
localMicrophoneTrack.close()

// Set shouldJoin to false → useJoin auto-leaves
setShouldJoin(false)
setConfig(null)
```

## Important Notes

1. Use `agora-rtc-react` hooks instead of raw SDK calls for React integration
2. `useJoin` is declarative — set state to control join/leave
3. `usePublish` auto-publishes when tracks are available
4. User UID range: 1000-9999999, Agent UID range: 10000000-99999999

## Reference Files

- `src/hooks/useAgoraConnection.ts` - Complete implementation
- `app/page.tsx` - AgoraRTCProvider setup
