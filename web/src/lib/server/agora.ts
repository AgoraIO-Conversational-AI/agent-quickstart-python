import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  MiniMaxTTS,
  OpenAI,
} from 'agora-agent-server-sdk'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

const ADA_PROMPT = `You are Ada, an agentic developer advocate from Agora. You help developers understand and build with Agora's Conversational AI platform.

Agora is a real-time communications company. The product you represent is the Agora Conversational AI Engine.

If you do not know a specific fact about Agora, say so plainly and suggest checking docs.agora.io. Keep most replies to one or two sentences unless the user explicitly asks for more detail.`

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getAgoraCredentials() {
  return {
    appId: requireEnv('AGORA_APP_ID'),
    appCertificate: requireEnv('AGORA_APP_CERTIFICATE'),
  }
}

export function getAgentGreeting() {
  return (
    process.env.AGENT_GREETING ??
    "Hi there! I'm Ada, your virtual assistant from Agora. How can I help?"
  )
}

export function generateChannelName() {
  return `ai-conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function generateRtcAndRtmToken(channelName: string, uid: number) {
  const { appId, appCertificate } = getAgoraCredentials()
  const expirationTime = Math.floor(Date.now() / 1000) + 3600

  return RtcTokenBuilder.buildTokenWithRtm(
    appId,
    appCertificate,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    expirationTime,
    expirationTime,
  )
}

export function createAgoraClient() {
  const { appId, appCertificate } = getAgoraCredentials()

  return new AgoraClient({
    area: Area.US,
    appId,
    appCertificate,
  })
}

export function createManagedAgent() {
  const greeting = getAgentGreeting()

  return new Agent({
    name: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    instructions: ADA_PROMPT,
    greeting,
    failureMessage: 'Please wait a moment.',
    maxHistory: 50,
    turnDetection: {
      config: {
        speech_threshold: 0.5,
        start_of_speech: {
          mode: 'vad',
          vad_config: {
            interrupt_duration_ms: 160,
            prefix_padding_ms: 300,
          },
        },
        end_of_speech: {
          mode: 'vad',
          vad_config: {
            silence_duration_ms: 480,
          },
        },
      },
    },
    advancedFeatures: { enable_rtm: true, enable_tools: true },
    parameters: { data_channel: 'rtm', enable_error_message: true },
  })
    .withStt(
      new DeepgramSTT({
        model: 'nova-3',
        language: 'en',
      }),
    )
    .withLlm(
      new OpenAI({
        model: 'gpt-4o-mini',
        greetingMessage: greeting,
        failureMessage: 'Please wait a moment.',
        maxHistory: 15,
        params: {
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
        },
      }),
    )
    .withTts(
      new MiniMaxTTS({
        model: 'speech_2_6_turbo',
        voiceId: 'English_captivating_female1',
      }),
    )
}

export function getAgentBackendUrl() {
  return process.env.AGENT_BACKEND_URL?.replace(/\/$/, '') ?? null
}

export async function proxyToPythonBackend(
  path: string,
  init?: RequestInit,
  searchParams?: URLSearchParams,
) {
  const backendUrl = getAgentBackendUrl()
  if (!backendUrl) {
    return null
  }

  const target = new URL(path, `${backendUrl}/`)
  if (searchParams) {
    searchParams.forEach((value, key) => {
      target.searchParams.set(key, value)
    })
  }

  return fetch(target, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

export function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const maybeErr = error as {
    statusCode?: number
    body?: { detail?: string; reason?: string }
    message?: string
  }

  const statusCode = maybeErr.statusCode
  const reason = maybeErr.body?.reason?.toLowerCase()
  const detail = maybeErr.body?.detail?.toLowerCase() ?? maybeErr.message?.toLowerCase() ?? ''

  if (statusCode === 404) return true
  if (reason === 'invalidrequest' && detail.includes('already in the process of shutting down')) {
    return true
  }
  return false
}

export { ExpiresIn }
