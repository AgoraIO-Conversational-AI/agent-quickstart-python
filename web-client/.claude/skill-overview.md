# Agora Conversational AI Skills Overview

This project provides 3 core skills for implementing conversational AI features.

## Skills List

| Skill | File | Keywords | When to Use |
|-------|------|----------|-------------|
| RTC Integration | `skill-rtc-integration.md` | `RTC`, `audio`, `microphone`, `join channel`, `publish`, `agora-rtc-react` | User asks about audio connection, joining channels, or RTC client setup |
| RTM Integration | `skill-rtm-integration.md` | `RTM`, `message`, `subscribe`, `login`, `AgoraRTM` | User asks about messaging, subscribing to channels, or RTM client setup |
| AgoraVoiceAI API | `skill-conversational-ai-api.md` | `subtitle`, `transcript`, `agent state`, `AgoraVoiceAI`, `voice AI`, `error` | User asks about subtitle rendering, agent state monitoring, or error handling |

## Auto-Activation Rules

**When user message contains any keyword from a skill, automatically reference that skill document.**

Examples:
- "How to join RTC channel?" → Auto-load `skill-rtc-integration.md`
- "Show agent state" → Auto-load `skill-conversational-ai-api.md`
- "Subscribe to RTM messages" → Auto-load `skill-rtm-integration.md`

## Integration Order

```
1. Get Config (Backend API: /api/get_config)
2. RTC Integration → Join audio channel (useJoin + usePublish from agora-rtc-react)
3. RTM Integration → Login + Subscribe message channel
4. AgoraVoiceAI → Init + subscribeMessage (from agent-client-toolkit-ts)
5. Start Agent (Backend API: /api/v2/startAgent)
```

## Complete Connection Flow

```typescript
async function connect() {
  // 1. Get config from backend
  const config = await getConfig()  // { app_id, token, uid, channel_name, agent_uid }

  // 2. RTC Join (managed by agora-rtc-react hooks: useJoin, usePublish)
  // Set config state → triggers useJoin with appid/channel/token/uid

  // 3. RTM Login + Subscribe
  const rtmClient = new AgoraRTM.RTM(config.app_id, String(config.uid))
  await rtmClient.login({ token: config.token })
  await rtmClient.subscribe(config.channel_name)

  // 4. Initialize AgoraVoiceAI (imperative API)
  const voiceAI = await AgoraVoiceAI.init({
    rtcEngine: rtcClient,
    rtmConfig: { rtmEngine: rtmClient },
    enableLog: true,
  })
  voiceAI.subscribeMessage(config.channel_name)

  // 5. Start Agent
  const agentId = await startAgent(config.channel_name, String(config.agent_uid), String(config.uid))
}
```

## Disconnect Flow

```typescript
async function disconnect() {
  // 1. Stop Agent
  await stopAgent(channelName, agentId)

  // 2. Cleanup AgoraVoiceAI
  voiceAI.unsubscribe()
  voiceAI.destroy()

  // 3. RTM Logout
  await rtmClient.logout()

  // 4. RTC Leave (managed by agora-rtc-react: setShouldJoin(false))
  localMicrophoneTrack.stop()
  localMicrophoneTrack.close()
}
```

## Key Files

| File | Description |
|------|-------------|
| `src/hooks/useAgoraConnection.ts` | Complete RTC/RTM/VoiceAI integration |
| `src/services/api.ts` | Backend API wrapper |
| `src/stores/app-store.ts` | Zustand store with AgentState/TurnStatus types |
| `src/components/app.tsx` | Main application component |
| `src/components/subtitle-panel.tsx` | Transcript rendering |
| `src/components/control-bar.tsx` | Agent state display + controls |
