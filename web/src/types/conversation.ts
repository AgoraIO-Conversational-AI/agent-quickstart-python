import type { RTMClient } from 'agora-rtm'

/** Session bootstrap from GET /api/get_config (channel + tokens + agent identity). */
export interface AgoraTokenData {
  token: string
  uid: string
  channel: string
  agentId?: string
  /** Echoed from config for RTC when `NEXT_PUBLIC_AGORA_APP_ID` is not set. */
  appId?: string
  /** Agent RTC uid from config; component also respects `NEXT_PUBLIC_AGENT_UID`. */
  agentUid?: string
}

export interface AgoraRenewalTokens {
  rtcToken: string
  rtmToken: string
}

export interface ConversationComponentProps {
  agoraData: AgoraTokenData
  rtmClient: RTMClient
  onTokenWillExpire: (uid: string) => Promise<AgoraRenewalTokens>
  onEndConversation: () => void
}
