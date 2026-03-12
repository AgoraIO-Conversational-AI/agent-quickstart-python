'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    useRTCClient,
    useLocalMicrophoneTrack,
    useRemoteUsers,
    useClientEvent,
    useIsConnected,
    useJoin,
    usePublish,
} from 'agora-rtc-react'
import AgoraRTM, { type RTMClient } from 'agora-rtm'
import { AgoraVoiceAI, AgoraVoiceAIEvents } from 'agent-client-toolkit-ts'
import type { TranscriptHelperItem, UserTranscription, AgentTranscription } from 'agent-client-toolkit-ts'
import { getConfig, startAgent, stopAgent } from '@/services/api'
import { type TranscriptItem, useAppStore } from '@/stores/app-store'

interface ConnectionConfig {
    appId: string
    channel: string
    token: string
    uid: number
    agentUid: number
}

export function useAgoraConnection() {
    const client = useRTCClient()
    const isRtcConnected = useIsConnected()
    const remoteUsers = useRemoteUsers()

    const [config, setConfig] = useState<ConnectionConfig | null>(null)
    const [shouldJoin, setShouldJoin] = useState(false)
    const [micEnabled, setMicEnabled] = useState(true)

    const rtmClientRef = useRef<RTMClient | null>(null)
    const currentAgentIdRef = useRef<string | null>(null)
    const voiceAIRef = useRef<AgoraVoiceAI | null>(null)

    const addLog = useCallback((message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        useAppStore.getState().addLog(message, level)
    }, [])

    // Local microphone track
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(micEnabled && shouldJoin, {
        AEC: true,
        ANS: false,
        AGC: true,
    })

    // Join channel when config is ready
    const { isConnected: joinSuccess } = useJoin(
        config ? {
            appid: config.appId,
            channel: config.channel,
            token: config.token,
            uid: config.uid,
        } : { appid: '', channel: '', token: null, uid: 0 },
        shouldJoin && !!config
    )

    // Publish local track
    usePublish([localMicrophoneTrack])

    // Handle remote user audio
    useClientEvent(client, 'user-published', async (user, mediaType) => {
        if (mediaType === 'audio') {
            await client.subscribe(user, mediaType)
            user.audioTrack?.play()
        }
    })

    useClientEvent(client, 'user-joined', (user) => {
        addLog(`User joined: ${user.uid}`, 'info')
    })

    useClientEvent(client, 'connection-state-change', (curState, _prevState, reason) => {
        if (curState === 'CONNECTED') {
            addLog('RTC connected successfully', 'success')
        } else if (curState === 'DISCONNECTED') {
            addLog(`RTC disconnected: ${reason || 'Unknown reason'}`, 'warning')
        }
    })

    // Initialize RTM + AgoraVoiceAI + Agent after RTC join success
    useEffect(() => {
        if (!joinSuccess || !config || !client) return

        const initAll = async () => {
            try {
                // Initialize RTM
                addLog('Initializing RTM Client...', 'info')
                const rtmClient = new AgoraRTM.RTM(config.appId, String(config.uid))
                rtmClientRef.current = rtmClient
                addLog('RTM Client initialized successfully', 'success')

                // RTM Login
                addLog('Logging in to RTM...', 'info')
                try {
                    await rtmClient.login({ token: config.token })
                    addLog('RTM login successful', 'success')
                } catch (e: unknown) {
                    const error = e as { code?: number }
                    if (error.code === -10017) {
                        addLog('RTM already logged in', 'success')
                    } else throw e
                }

                // RTM Subscribe
                addLog('Subscribing to RTM channel...', 'info')
                await rtmClient.subscribe(config.channel)
                addLog('Subscribed to RTM channel successfully', 'success')

                // Initialize AgoraVoiceAI (imperative, no Provider needed)
                addLog('Initializing ConvoAI API...', 'info')
                const voiceAI = await AgoraVoiceAI.init({
                    rtcEngine: client as any,
                    rtmConfig: { rtmEngine: rtmClient },
                    enableLog: true,
                })
                voiceAIRef.current = voiceAI
                setupVoiceAIEvents(voiceAI)
                voiceAI.subscribeMessage(config.channel)
                addLog('ConvoAI API initialized successfully', 'success')

                // Start Agent
                addLog('Starting agent...', 'info')
                const agentId = await startAgent(config.channel, String(config.agentUid), String(config.uid))
                currentAgentIdRef.current = agentId
                useAppStore.getState().setAgentId(agentId)
                addLog(`Agent started successfully (ID: ${agentId})`, 'success')

                useAppStore.getState().setIsConnected(true)
                useAppStore.getState().setIsConnecting(false)
            } catch (error) {
                const err = error as Error
                addLog(`Connection failed: ${err.message}`, 'error')
                useAppStore.getState().setIsConnecting(false)
                await cleanup()
            }
        }

        initAll()
    }, [joinSuccess, config, client, addLog])

    const setupVoiceAIEvents = (ai: AgoraVoiceAI) => {
        ai.on(
            AgoraVoiceAIEvents.TRANSCRIPT_UPDATED,
            (chatHistory: TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]) => {
                const transcripts: TranscriptItem[] = chatHistory
                    .sort((a, b) => {
                        if (a.turn_id !== b.turn_id) return a.turn_id - b.turn_id
                        return Number(a.uid) - Number(b.uid)
                    })
                    .map((item) => ({
                        id: `${item.turn_id}-${item.uid}-${item._time}`,
                        type: Number(item.uid) !== 0 ? 'agent' : 'user',
                        text: item.text || '',
                        status: item.status,
                        timestamp: item._time || Date.now(),
                    }))
                useAppStore.getState().setTranscripts(transcripts)
            }
        )

        ai.on(
            AgoraVoiceAIEvents.AGENT_STATE_CHANGED,
            (_agentUserId: string, event) => {
                useAppStore.getState().setAgentState(event.state)
            }
        )

        ai.on(AgoraVoiceAIEvents.AGENT_ERROR, (_agentUserId: string, error) => {
            addLog(`Agent error: [${error.type}] ${error.message} (code: ${error.code})`, 'error')
        })

        ai.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (_agentUserId: string, error) => {
            addLog(`Message error: [${error.type}] ${error.message} (code: ${error.code})`, 'error')
        })
    }

    const cleanup = async () => {
        if (voiceAIRef.current) {
            try {
                voiceAIRef.current.unsubscribe()
                voiceAIRef.current.destroy()
            } catch { }
            voiceAIRef.current = null
        }

        if (rtmClientRef.current) {
            try {
                await rtmClientRef.current.logout()
            } catch { }
            rtmClientRef.current = null
        }
    }

    const connect = useCallback(async () => {
        const storeState = useAppStore.getState()
        storeState.setIsConnecting(true)
        storeState.clearLogs()

        try {
            addLog('Getting configuration...', 'info')
            const configData = await getConfig()

            const connectionConfig: ConnectionConfig = {
                appId: configData.app_id,
                channel: configData.channel_name,
                token: configData.token,
                uid: Number(configData.uid),
                agentUid: Number(configData.agent_uid),
            }

            storeState.setChannelName(connectionConfig.channel)
            addLog('Configuration retrieved successfully', 'success')

            addLog('Initializing RTC Engine...', 'info')
            setConfig(connectionConfig)
            setShouldJoin(true)
            setMicEnabled(true)
            addLog('RTC Engine initialized successfully', 'success')
            addLog('Joining RTC channel...', 'info')
        } catch (error) {
            const err = error as Error
            addLog(`Failed to get config: ${err.message}`, 'error')
            storeState.setIsConnecting(false)
        }
    }, [addLog])

    const disconnect = useCallback(async () => {
        if (currentAgentIdRef.current && config?.channel) {
            try {
                await stopAgent(config.channel, currentAgentIdRef.current)
                addLog('Agent stopped', 'success')
            } catch (e) {
                const err = e as Error
                addLog(`Failed to stop agent: ${err.message}`, 'error')
            }
            currentAgentIdRef.current = null
        }

        await cleanup()

        if (localMicrophoneTrack) {
            localMicrophoneTrack.stop()
            localMicrophoneTrack.close()
        }

        setShouldJoin(false)
        setConfig(null)

        useAppStore.getState().reset()
        addLog('Disconnected', 'info')
    }, [config, localMicrophoneTrack, addLog])

    const toggleMicrophone = useCallback(() => {
        const storeState = useAppStore.getState()
        const newMuted = !storeState.isMicMuted

        if (localMicrophoneTrack) {
            localMicrophoneTrack.setMuted(newMuted)
        }
        storeState.setIsMicMuted(newMuted)
        addLog(newMuted ? 'Microphone muted' : 'Microphone unmuted', 'info')
    }, [localMicrophoneTrack, addLog])

    return {
        connect,
        disconnect,
        toggleMicrophone,
        isConnected: isRtcConnected,
        remoteUsers,
    }
}
