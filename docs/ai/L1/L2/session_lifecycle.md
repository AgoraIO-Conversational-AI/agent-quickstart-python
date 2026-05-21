# Session Lifecycle

> **When to Read This:** Load this document when you are touching `LandingPage.tsx`, `ConversationComponent.tsx`, RTM bootstrap, or token renewal — anything in the browser orchestration path.

## Why It Matters

The browser holds the only state that ties RTC, RTM, and the managed agent together. There is **no `useAgoraConnection` hook in this repo** — the lifecycle lives inline in `LandingPage.tsx` and `ConversationComponent.tsx`. Mistakes here surface as ghost audio sessions, missing transcripts, or silent token-expiry disconnects.

## End-to-End Sequence

```
User clicks "Start"
   │
   ▼
LandingPage.tsx
   │
   ├─▶ getConfig()                       (POST /api/get_config → GET /get_config)
   │     ◀── data: { app_id, token, uid, channel_name, agent_uid }
   │
   ├─▶ startAgent(channel_name, agent_uid, uid)    (POST /api/startAgent)
   │     ◀── data: { agent_id, channel_name, status }
   │
   ├─▶ new AgoraRTM.RTM(app_id, uid)
   │     .login({ token })
   │     waitForRtmConnected()
   │     .subscribe(channel_name)
   │
   └─▶ setAgoraData({ app_id, token, uid, channel, agentId })
         setRtmClient(rtmClient)
         render <ConversationComponent />

ConversationComponent.tsx
   │
   ├─▶ useJoin({ appid, token, channel, uid })
   │     (StrictMode-safe via useRef-held AgoraRTCProvider)
   │
   ├─▶ useLocalMicrophoneTrack()
   ├─▶ usePublish([track])
   │
   └─▶ new AgoraVoiceAI({
            rtcEngine,
            rtmConfig: { rtmEngine: rtmClient },
        }).subscribeMessage(channel_name)
         Listens: TRANSCRIPT_UPDATED, AGENT_STATE_CHANGED, AGENT_METRICS,
                  MESSAGE_ERROR, MESSAGE_SAL_STATUS, AGENT_ERROR
```

## Why `getConfig` and `startAgent` Run in Parallel

`startAgent` only needs `channel_name`, `agent_uid`, and `user_uid`. It does not need RTM to be live. Running it alongside RTM login shaves ~200ms off perceived start latency. If `startAgent` fails (e.g. backend transient), `LandingPage` logs but continues — the user can still see RTC join and may retry.

## RTM Bootstrap Details

`LandingPage` dynamically imports `agora-rtm` to avoid touching `window` during SSR. After `RTM` is constructed:

1. `await rtm.login({ token })` — uses the **same token string** as RTC (one token, both privileges).
2. Wait for the `CONNECTED` event (helper `waitForRtmConnected` resolves on a status change).
3. `await rtm.subscribe(channel_name)` — the channel name returned by `getConfig`.
4. Pass the client into `ConversationComponent` as `rtmClient`.

If RTM `login` fails, the whole call fails — there is no fallback path; transcripts cannot flow without RTM.

## Token Renewal Sequence

RTC fires `token-privilege-will-expire` ~30 seconds before expiry. `ConversationComponent` attaches a handler that calls `LandingPage.handleTokenWillExpire`:

```ts
async function handleTokenWillExpire(joinedUid: UID) {
  if (!joinedUid) return; // skip if RTC never reported a uid
  const [rtcConfig, rtmConfig] = await Promise.all([
    getConfig(agoraData.channel, joinedUid),
    getConfig(agoraData.channel, agoraData.uid),
  ]);
  await client.renewToken(rtcConfig.token);
  await rtmClient.renewToken(rtmConfig.token);
}
```

Why two `getConfig` calls?

- The RTC `client.uid` may differ from the original `agoraData.uid` if the SDK assigned one.
- RTM is logged in with `agoraData.uid` and rejects tokens issued for a different UID.

`ConversationComponent` only invokes the handler when `joinedUID` (RTC's reported UID) is truthy. If RTC has not yet reported, renewal is silently skipped — RTC will reconnect on its own when the channel is re-joined.

## Ending the Call

`stopConversation()` does:

1. Pause publishing (`track.setEnabled(false)`).
2. Call `stopAgent(agoraData.agentId)` if there is one. The handler tolerates `400`/`404` because the user may double-tap end.
3. Call `rtmClient.logout()`.
4. Reset state (`setAgoraData(null)`, `setRtmClient(null)`).

The order matters: stopping the agent before RTM logout means the user keeps receiving transcripts of any final agent words.

## StrictMode Considerations

- `web/next.config.ts` sets `reactStrictMode: true`.
- The `AgoraRTCProvider` is dynamically imported with `{ ssr: false }`.
- The RTC client lives in `useRef`. Switching to `useMemo` recreates the client during StrictMode's fake-unmount and breaks `useJoin`.
- `useJoin` and `useLocalMicrophoneTrack` must be gated until the dynamic import resolves.

## Failure Modes

| Symptom                                              | Cause                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `/api/get_config` 404                                | `AGENT_BACKEND_URL` not set → no rewrites registered.              |
| `422` from `/startAgent`                             | pydantic rejected the body — usually wrong field name (`channel_name` instead of `channelName`). |
| Transcript empty, agent state stuck                  | RTM not subscribed or `subscribeMessage(channel)` never ran.       |
| Agent disconnects exactly at 1 hour                  | Renewal skipped (likely `joinedUID` was 0); check RTC join logs.   |
| Microphone busy on second mount in dev               | RTC client was recreated (probably `useMemo` regression).          |
| RTM rejects renewal                                  | Renewal token was built for the wrong UID — verify two-fetch path. |

## See Also

- [Back to Architecture](../02_architecture.md)
- [Back to Gotchas](../07_gotchas.md)
- [Managed Agent Config](managed_agent_config.md)
