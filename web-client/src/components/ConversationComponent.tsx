'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ConnectionStatusPanel } from '@/components/ConnectionStatusPanel'
import {
  getConversationIssueSeverity,
  type ConnectionIssue,
} from '@/components/ConversationErrorCard'
import { MicrophoneSelector } from '@/components/MicrophoneSelector'
import { Button } from '@/components/ui/button'
import {
  getCurrentInProgressMessage,
  getMessageList,
  mapAgentVisualizerState,
  normalizeTimestampMs,
  normalizeTranscript,
} from '@/lib/conversation'
import {
  type AgentState,
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  MessageSalStatus,
  TranscriptHelperMode,
  type AgentTranscription,
  type TranscriptHelperItem,
  type UserTranscription,
} from 'agora-agent-client-toolkit'
import { AgentVisualizer, ConvoTextStream } from 'agora-agent-uikit'
import { MicButtonWithVisualizer } from 'agora-agent-uikit/rtc'
import {
  RemoteUser,
  type UID,
  useClientEvent,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRTCClient,
  useRemoteUsers,
} from 'agora-rtc-react'
import { setParameter } from 'agora-rtc-sdk-ng/esm'
import type { RTMClient } from 'agora-rtm'
import { X } from 'lucide-react'

export type AgoraSessionData = {
  appId: string
  token: string
  uid: string
  channel: string
  agentUid: string
  agentId?: string
}

export type AgoraRenewalTokens = {
  rtcToken: string
  rtmToken: string
}

type ConversationComponentProps = {
  sessionData: AgoraSessionData
  rtmClient: RTMClient
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>
  onEndConversation: () => void
}

type RtmMessageErrorPayload = {
  object: 'message.error'
  module?: string
  code?: number
  message?: string
  send_ts?: number
}

type RtmSalStatusPayload = {
  object: 'message.sal_status'
  status?: string
  timestamp?: number
}

const maxConnectionIssues = 6

function isRtmMessageErrorPayload(value: unknown): value is RtmMessageErrorPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.error'
  )
}

function isRtmSalStatusPayload(value: unknown): value is RtmSalStatusPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.sal_status'
  )
}

export default function ConversationComponent({
  sessionData,
  rtmClient,
  onTokenWillExpire,
  onEndConversation,
}: ConversationComponentProps) {
  const client = useRTCClient()
  const remoteUsers = useRemoteUsers()

  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isConnectionDetailsOpen, setIsConnectionDetailsOpen] = useState(false)
  const [connectionState, setConnectionState] = useState('CONNECTING')
  const [joinedUid, setJoinedUid] = useState<UID>(0)
  const [rawTranscript, setRawTranscript] = useState<
    TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]
  >([])
  const [agentState, setAgentState] = useState<AgentState | null>(null)
  const [connectionIssues, setConnectionIssues] = useState<ConnectionIssue[]>([])
  const [isReady, setIsReady] = useState(false)

  const addConnectionIssue = useCallback((issue: ConnectionIssue) => {
    setConnectionIssues((previous) => {
      const isDuplicate = previous.some(
        (entry) =>
          entry.agentUserId === issue.agentUserId &&
          entry.code === issue.code &&
          entry.message === issue.message &&
          Math.abs(entry.timestamp - issue.timestamp) < 1500,
      )
      if (isDuplicate) return previous
      return [issue, ...previous].slice(0, maxConnectionIssues)
    })
  }, [])

  useEffect(() => {
    if (connectionIssues.length > 0) {
      setIsConnectionDetailsOpen(true)
    }
  }, [connectionIssues.length])

  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(() => {
      if (!cancelled) setIsReady(true)
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      setIsReady(false)
    }
  }, [])

  const { isConnected } = useJoin(
    {
      appid: sessionData.appId,
      channel: sessionData.channel,
      token: sessionData.token,
      uid: Number.parseInt(sessionData.uid, 10) || 0,
    },
    isReady,
  )

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady)
  usePublish([localMicrophoneTrack])

  useEffect(() => {
    if (!client) return
    try {
      setParameter('ENABLE_AUDIO_PTS', true)
    } catch {}
  }, [client])

  useEffect(() => {
    if (isConnected && client.uid != null) {
      setJoinedUid(client.uid)
    }
  }, [client, isConnected])

  useEffect(() => {
    if (!isReady || !isConnected) return

    let cancelled = false

    const initializeVoiceAI = async () => {
      try {
        const voiceAI = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtmClient },
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: true,
        })

        if (cancelled) {
          try {
            if (AgoraVoiceAI.getInstance() === voiceAI) {
              voiceAI.unsubscribe()
              voiceAI.destroy()
            }
          } catch {}
          return
        }

        voiceAI.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (transcript) => {
          setRawTranscript([...transcript])
        })
        voiceAI.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_agentUserId, event) => {
          setAgentState(event.state)
        })
        voiceAI.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-message-error-${error.code}`,
            source: 'rtm',
            agentUserId,
            code: error.code,
            message: error.message,
            timestamp: normalizeTimestampMs(error.timestamp),
          })
        })
        voiceAI.on(AgoraVoiceAIEvents.MESSAGE_SAL_STATUS, (agentUserId, salStatus) => {
          if (
            salStatus.status === MessageSalStatus.VP_REGISTER_FAIL ||
            salStatus.status === MessageSalStatus.VP_REGISTER_DUPLICATE
          ) {
            addConnectionIssue({
              id: `${Date.now()}-${agentUserId}-sal-${salStatus.status}`,
              source: 'rtm',
              agentUserId,
              code: salStatus.status,
              message: `SAL status: ${salStatus.status}`,
              timestamp: normalizeTimestampMs(salStatus.timestamp),
            })
          }
        })
        voiceAI.on(AgoraVoiceAIEvents.AGENT_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-agent-error-${error.code}`,
            source: 'agent',
            agentUserId,
            code: error.code,
            message: `${error.type}: ${error.message}`,
            timestamp: normalizeTimestampMs(error.timestamp),
          })
        })
        voiceAI.subscribeMessage(sessionData.channel)
      } catch (error) {
        if (!cancelled) {
          console.error('[AgoraVoiceAI] init failed:', error)
        }
      }
    }

    initializeVoiceAI()

    return () => {
      cancelled = true
      try {
        const voiceAI = AgoraVoiceAI.getInstance()
        if (voiceAI) {
          voiceAI.unsubscribe()
          voiceAI.destroy()
        }
      } catch {}
    }
  }, [addConnectionIssue, client, isConnected, isReady, rtmClient, sessionData.channel])

  useEffect(() => {
    const handleRtmMessage = (event: { message: string | Uint8Array; publisher: string }) => {
      const payloadText =
        typeof event.message === 'string' ? event.message : new TextDecoder().decode(event.message)

      let parsed: unknown
      try {
        parsed = JSON.parse(payloadText)
      } catch {
        return
      }

      if (isRtmMessageErrorPayload(parsed)) {
        addConnectionIssue({
          id: `${Date.now()}-${event.publisher}-rtm-msg-error-${parsed.code ?? 'unknown'}`,
          source: 'rtm-signaling',
          agentUserId: event.publisher,
          code: parsed.code ?? 'unknown',
          message: `${parsed.module ?? 'unknown'}: ${parsed.message ?? 'Unknown signaling error'}`,
          timestamp: normalizeTimestampMs(parsed.send_ts ?? Date.now()),
        })
        return
      }

      if (
        isRtmSalStatusPayload(parsed) &&
        (parsed.status === 'VP_REGISTER_FAIL' || parsed.status === 'VP_REGISTER_DUPLICATE')
      ) {
        addConnectionIssue({
          id: `${Date.now()}-${event.publisher}-rtm-sal-${parsed.status}`,
          source: 'rtm-signaling',
          agentUserId: event.publisher,
          code: parsed.status,
          message: `SAL status: ${parsed.status}`,
          timestamp: normalizeTimestampMs(parsed.timestamp ?? Date.now()),
        })
      }
    }

    rtmClient.addEventListener('message', handleRtmMessage)
    return () => {
      rtmClient.removeEventListener('message', handleRtmMessage)
    }
  }, [addConnectionIssue, rtmClient])

  useClientEvent(client, 'user-published', async (user, mediaType) => {
    if (mediaType !== 'audio') return
    await client.subscribe(user, mediaType)
    user.audioTrack?.play()
  })

  useClientEvent(client, 'connection-state-change', (currentState) => {
    setConnectionState(currentState)
  })

  const handleTokenWillExpire = useCallback(async () => {
    if (!joinedUid) return
    try {
      const { rtcToken, rtmToken } = await onTokenWillExpire(String(joinedUid))
      await client?.renewToken(rtcToken)
      await rtmClient.renewToken(rtmToken)
    } catch (error) {
      console.error('Failed to renew Agora token:', error)
    }
  }, [client, joinedUid, onTokenWillExpire, rtmClient])

  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire)

  const normalizedTranscript = useMemo(
    () => normalizeTranscript(rawTranscript, String(client.uid)),
    [client.uid, rawTranscript],
  )
  const messageList = useMemo(() => getMessageList(normalizedTranscript), [normalizedTranscript])
  const currentInProgressMessage = useMemo(
    () => getCurrentInProgressMessage(normalizedTranscript),
    [normalizedTranscript],
  )

  const isAgentConnected = useMemo(
    () => remoteUsers.some((user) => String(user.uid) === sessionData.agentUid),
    [remoteUsers, sessionData.agentUid],
  )

  const connectionSeverity = useMemo<'normal' | 'warning' | 'error'>(() => {
    if (connectionState === 'DISCONNECTED' || connectionState === 'DISCONNECTING') {
      return 'error'
    }
    if (connectionState === 'CONNECTING' || connectionState === 'RECONNECTING') {
      return 'warning'
    }
    if (connectionIssues.length === 0) {
      return 'normal'
    }
    return connectionIssues.some((issue) => getConversationIssueSeverity(issue) === 'error')
      ? 'error'
      : 'warning'
  }, [connectionIssues, connectionState])

  const visualizerState = useMemo(
    () => mapAgentVisualizerState(agentState, isAgentConnected, connectionState),
    [agentState, connectionState, isAgentConnected],
  )

  const handleMicToggle = useCallback(async () => {
    const nextEnabled = !isMicEnabled
    if (!localMicrophoneTrack) {
      setIsMicEnabled(nextEnabled)
      return
    }

    try {
      await localMicrophoneTrack.setEnabled(nextEnabled)
      setIsMicEnabled(nextEnabled)
    } catch (error) {
      console.error('Failed to toggle microphone:', error)
    }
  }, [isMicEnabled, localMicrophoneTrack])

  return (
    <div className='flex h-full flex-col gap-6 p-4 text-left'>
      <div className='absolute top-4 left-4'>
        <ConnectionStatusPanel
          connectionState={connectionState}
          connectionSeverity={connectionSeverity}
          connectionIssues={connectionIssues}
          isOpen={isConnectionDetailsOpen}
          onToggle={() => setIsConnectionDetailsOpen((open) => !open)}
        />
      </div>

      <div className='absolute top-4 right-4'>
        <Button
          variant='destructive'
          size='icon'
          className='h-9 w-9 rounded-full border-2 border-destructive bg-destructive text-destructive-foreground hover:bg-transparent hover:text-destructive'
          onClick={onEndConversation}
          aria-label='End conversation with AI agent'
          title='End conversation'
        >
          <X />
        </Button>
      </div>

      <section
        className='relative flex h-56 w-full items-center justify-center'
        aria-label='AI agent status visualization'
      >
        <AgentVisualizer state={visualizerState} size='lg' />
        {remoteUsers.map((user) => (
          <div key={user.uid} className='hidden'>
            <RemoteUser user={user} />
          </div>
        ))}
      </section>

      <fieldset
        className='fixed bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/80 px-4 py-2 backdrop-blur-md md:bottom-8'
        aria-label='Audio controls'
      >
        <div className='conversation-mic-host flex items-center justify-center'>
          <MicButtonWithVisualizer
            isEnabled={isMicEnabled}
            setIsEnabled={setIsMicEnabled}
            track={localMicrophoneTrack}
            onToggle={handleMicToggle}
            className='overflow-visible'
            aria-label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            enabledColor='hsl(var(--primary))'
            disabledColor='hsl(var(--destructive))'
          />
        </div>
        <MicrophoneSelector localMicrophoneTrack={localMicrophoneTrack} />
      </fieldset>

      <ConvoTextStream
        agentUID={sessionData.agentUid}
        className='conversation-transcript'
        currentInProgressMessage={currentInProgressMessage}
        messageList={messageList}
      />
    </div>
  )
}
