'use client'

import { getConfig, startAgent, stopAgent } from '@/services/api'
import {
  getCurrentInProgressMessage,
  getMessageList,
  mapAgentVisualizerState,
  normalizeTranscript,
} from '@/lib/conversation'
import { AgoraVoiceAI, AgoraVoiceAIEvents, type AgentState } from 'agora-agent-client-toolkit'
import type {
  AgentTranscription,
  TranscriptHelperItem,
  UserTranscription,
} from 'agora-agent-client-toolkit'
import {
  RemoteUser,
  useClientEvent,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRTCClient,
  useRemoteUsers,
} from 'agora-rtc-react'
import AgoraRTM, { type RTMClient } from 'agora-rtm'
import { setParameter } from 'agora-rtc-sdk-ng/esm'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface ConnectionConfig {
  appId: string
  channel: string
  token: string
  uid: number
  agentUid: number
}

export function useAgoraConnection() {
  const client = useRTCClient()
  const remoteUsers = useRemoteUsers()

  const [config, setConfig] = useState<ConnectionConfig | null>(null)
  const [shouldJoin, setShouldJoin] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [agentState, setAgentState] = useState<AgentState | null>(null)
  const [rawTranscript, setRawTranscript] = useState<
    TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]
  >([])
  const [connectionState, setConnectionState] = useState('DISCONNECTED')
  const [agentId, setAgentId] = useState<string | null>(null)

  const currentAgentIdRef = useRef<string | null>(null)
  const rtmClientRef = useRef<RTMClient | null>(null)
  const voiceAIRef = useRef<AgoraVoiceAI | null>(null)
  const initKeyRef = useRef<string | null>(null)

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

  useEffect(() => {
    if (!client) return

    try {
      setParameter('ENABLE_AUDIO_PTS', true)
    } catch {}
  }, [client])

  const { isConnected } = useJoin(
    config
      ? {
          appid: config.appId,
          channel: config.channel,
          token: config.token,
          uid: config.uid,
        }
      : { appid: '', channel: '', token: null, uid: 0 },
    isReady && shouldJoin && !!config,
  )

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady && shouldJoin)

  usePublish([localMicrophoneTrack])

  useClientEvent(client, 'user-published', async (user, mediaType) => {
    if (mediaType !== 'audio') return
    await client.subscribe(user, mediaType)
    user.audioTrack?.play()
  })

  useClientEvent(client, 'connection-state-change', (currentState) => {
    setConnectionState(currentState)
  })

  const cleanup = useCallback(async () => {
    initKeyRef.current = null

    if (voiceAIRef.current) {
      try {
        voiceAIRef.current.unsubscribe()
        voiceAIRef.current.destroy()
      } catch {}
      voiceAIRef.current = null
    }

    if (rtmClientRef.current) {
      try {
        await rtmClientRef.current.logout()
      } catch {}
      rtmClientRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isReady || !isConnected || !config || !client) return

    const initKey = `${config.channel}:${config.uid}`
    if (initKeyRef.current === initKey) return
    initKeyRef.current = initKey

    let cancelled = false

    const initializeSession = async () => {
      try {
        // RTM is already initialized in connect() — use the existing client.
        // This ensures presence events are captured from the start.
        const rtmClient = rtmClientRef.current
        if (!rtmClient) {
          throw new Error('RTM client not initialized')
        }

        const voiceAI = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmConfig: { rtmEngine: rtmClient },
          enableLog: true,
        })

        if (cancelled) {
          voiceAI.unsubscribe()
          voiceAI.destroy()
          return
        }

        voiceAI.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (transcript) => {
          setRawTranscript([...transcript])
        })
        voiceAI.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_agentUserId, event) => {
          setAgentState(event.state)
        })
        voiceAI.subscribeMessage(config.channel)
        voiceAIRef.current = voiceAI

        const nextAgentId = await startAgent(config.channel, config.agentUid, config.uid)
        currentAgentIdRef.current = nextAgentId
        setAgentId(nextAgentId)
        setError(null)
      } catch (nextError) {
        initKeyRef.current = null
        setError(nextError instanceof Error ? nextError.message : 'Failed to start conversation')
        setShouldJoin(false)
        await cleanup()
      } finally {
        setIsConnecting(false)
      }
    }

    initializeSession()

    return () => {
      cancelled = true
    }
  }, [cleanup, client, config, isConnected, isReady])

  const renewAgoraTokens = useCallback(async () => {
    if (!config || !client) return

    try {
      const rtcConfig = await getConfig({ channel: config.channel, uid: String(config.uid) })
      const rtmConfig = await getConfig({ channel: config.channel, uid: '0' })
      await client.renewToken(rtcConfig.token)
      await rtmClientRef.current?.renewToken(rtmConfig.token)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to renew Agora token')
    }
  }, [client, config])

  useClientEvent(client, 'token-privilege-will-expire', renewAgoraTokens)

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    setAgentState(null)
    setRawTranscript([])
    setAgentId(null)
    currentAgentIdRef.current = null
    setIsMicEnabled(true)

    try {
      const configData = await getConfig()
      const connectionConfig: ConnectionConfig = {
        appId: configData.app_id,
        channel: configData.channel_name,
        token: configData.token,
        uid: Number(configData.uid),
        agentUid: Number(configData.agent_uid),
      }

      // RTM must be ready BEFORE RTC join so presence events are not lost.
      // This matches the Next.js quickstart pattern where RTM is initialized
      // in LandingPage before ConversationComponent mounts.
      const rtmClient = new AgoraRTM.RTM(connectionConfig.appId, String(connectionConfig.uid))
      await rtmClient.login({ token: connectionConfig.token })
      await rtmClient.subscribe(connectionConfig.channel)
      rtmClientRef.current = rtmClient

      setConfig(connectionConfig)
      setShouldJoin(true)
    } catch (nextError) {
      setIsConnecting(false)
      setError(nextError instanceof Error ? nextError.message : 'Failed to initialize conversation')
    }
  }, [])

  const disconnect = useCallback(async () => {
    setIsConnecting(false)

    if (currentAgentIdRef.current) {
      try {
        await stopAgent(currentAgentIdRef.current)
      } catch {}
      currentAgentIdRef.current = null
    }

    await cleanup()

    if (localMicrophoneTrack) {
      localMicrophoneTrack.stop()
      localMicrophoneTrack.close()
    }

    setShouldJoin(false)
    setConfig(null)
    setRawTranscript([])
    setAgentState(null)
    setAgentId(null)
    setError(null)
    setConnectionState('DISCONNECTED')
  }, [cleanup, localMicrophoneTrack])

  const toggleMicrophone = useCallback(async () => {
    const nextEnabled = !isMicEnabled
    if (!localMicrophoneTrack) {
      setIsMicEnabled(nextEnabled)
      return
    }

    try {
      await localMicrophoneTrack.setEnabled(nextEnabled)
      setIsMicEnabled(nextEnabled)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to update microphone state')
    }
  }, [isMicEnabled, localMicrophoneTrack])

  const normalizedTranscript = useMemo(() => {
    if (!config || client.uid == null) return []
    return normalizeTranscript(rawTranscript, String(client.uid))
  }, [client.uid, config, rawTranscript])

  const messageList = useMemo(() => getMessageList(normalizedTranscript), [normalizedTranscript])
  const currentInProgressMessage = useMemo(
    () => getCurrentInProgressMessage(normalizedTranscript),
    [normalizedTranscript],
  )

  const isAgentConnected = useMemo(() => {
    if (!config) return false
    return remoteUsers.some((user) => String(user.uid) === String(config.agentUid))
  }, [config, remoteUsers])

  const visualizerState = useMemo(
    () => mapAgentVisualizerState(agentState, isAgentConnected, connectionState),
    [agentState, connectionState, isAgentConnected],
  )

  return {
    RemoteUser,
    agentId,
    agentUid: config ? String(config.agentUid) : null,
    channelName: config?.channel ?? '',
    connect,
    currentInProgressMessage,
    disconnect,
    error,
    isAgentConnected,
    isConnected,
    isConnecting,
    isMicEnabled,
    localMicrophoneTrack,
    messageList,
    remoteUsers,
    setMicEnabled: setIsMicEnabled,
    toggleMicrophone,
    visualizerState,
  }
}
