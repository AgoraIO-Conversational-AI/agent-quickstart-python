import {
  type EAgentState,
  EChatMessagePriority,
  EChatMessageType,
  EConversationalAIAPIEvents,
  EMessageType,
  ERTCEvents,
  ERTMEvents,
  ETranscriptHelperMode,
  type IAgentTranscription,
  type IChatMessageImage,
  type IChatMessageText,
  type IConversationalAIAPIEventHandlers,
  type IMessageSalStatus,
  type ITranscriptHelperItem,
  type IUserTranscription,
  NotFoundError,
  type TAgentMetric,
  type TMessageReceipt,
  type TModuleError,
  type TStateChangeEvent,
} from '@/conversational-ai-api/type'
import { factoryFormatLog } from '@/conversational-ai-api/utils'
import { EventHelper } from '@/conversational-ai-api/utils/event'
import { CovSubRenderController } from '@/conversational-ai-api/utils/sub-render'
import { ELoggerType, logger } from '@/lib/logger'
import { genTranceID } from '@/lib/utils'
import type { ChannelType, RTMClient, RTMEvents } from 'agora-rtm'

const TAG = 'ConversationalAIAPI'
const VERSION = '1.8.0'
const formatLog = factoryFormatLog({ tag: TAG })

// Use a loose type to support both agora-rtc-sdk-ng and agora-rtc-react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RTCClientLike = any

export interface IConversationalAIAPIConfig {
  rtcEngine: RTCClientLike
  rtmEngine: RTMClient
  renderMode?: ETranscriptHelperMode
  enableLog?: boolean
}

export class ConversationalAIAPI extends EventHelper<IConversationalAIAPIEventHandlers> {
  private static NAME = TAG
  private static VERSION = VERSION
  private static _instance: ConversationalAIAPI | null = null
  private callMessagePrint: (type: ELoggerType, ...args: unknown[]) => void

  protected rtcEngine: RTCClientLike | null = null
  protected rtmEngine: RTMClient | null = null
  protected renderMode: ETranscriptHelperMode = ETranscriptHelperMode.UNKNOWN
  protected channel: string | null = null
  protected covSubRenderController: CovSubRenderController
  protected enableLog = false

  constructor() {
    super()
    this.callMessagePrint = (type: ELoggerType = ELoggerType.debug, ...args: unknown[]) => {
      if (!this.enableLog) return
      logger[type](formatLog(...args))
      this.onDebugLog?.(`[${type}] ${formatLog(...args)}`)
    }
    this.callMessagePrint(
      ELoggerType.debug,
      `${ConversationalAIAPI.NAME} initialized, version: ${ConversationalAIAPI.VERSION}`,
    )
    this.covSubRenderController = new CovSubRenderController({
      onChatHistoryUpdated: this.onChatHistoryUpdated.bind(this),
      onAgentStateChanged: this.onAgentStateChanged.bind(this),
      onAgentInterrupted: this.onAgentInterrupted.bind(this),
      onDebugLog: this.onDebugLog.bind(this),
      onAgentMetrics: this.onAgentMetrics.bind(this),
      onAgentError: this.onAgentError.bind(this),
      onMessageReceipt: this.onMessageReceiptUpdated.bind(this),
      onMessageError: this.onMessageError.bind(this),
      onMessageSalStatus: this.onMessageSalStatus.bind(this),
    })
  }

  public static getInstance() {
    if (!ConversationalAIAPI._instance) throw new NotFoundError('ConversationalAIAPI is not initialized')
    return ConversationalAIAPI._instance
  }

  public getCfg() {
    if (!this.rtcEngine || !this.rtmEngine) throw new NotFoundError('ConversationalAIAPI is not initialized')
    return {
      rtcEngine: this.rtcEngine,
      rtmEngine: this.rtmEngine,
      renderMode: this.renderMode,
      channel: this.channel,
      enableLog: this.enableLog,
    }
  }

  public static init(cfg: IConversationalAIAPIConfig) {
    if (!ConversationalAIAPI._instance) ConversationalAIAPI._instance = new ConversationalAIAPI()
    ConversationalAIAPI._instance.rtcEngine = cfg.rtcEngine
    ConversationalAIAPI._instance.rtmEngine = cfg.rtmEngine
    ConversationalAIAPI._instance.renderMode = cfg.renderMode ?? ETranscriptHelperMode.UNKNOWN
    ConversationalAIAPI._instance.enableLog = cfg.enableLog ?? false
    return ConversationalAIAPI._instance
  }

  public subscribeMessage(channel: string) {
    this.bindRtcEvents()
    this.bindRtmEvents()
    this.channel = channel
    this.covSubRenderController.setMode(this.renderMode)
    this.covSubRenderController.run()
  }

  public unsubscribe() {
    this.unbindRtcEvents()
    this.unbindRtmEvents()
    this.channel = null
    this.covSubRenderController.cleanup()
  }

  public destroy() {
    const instance = ConversationalAIAPI.getInstance()
    if (instance) {
      instance.rtcEngine?.removeAllListeners()
      instance.rtcEngine = null
      instance.rtmEngine = null
      instance.renderMode = ETranscriptHelperMode.UNKNOWN
      instance.channel = null
      instance.removeAllEventListeners()
      ConversationalAIAPI._instance = null
    }
  }

  public async chat(agentUserId: string, message: IChatMessageText | IChatMessageImage) {
    switch (message.messageType) {
      case EChatMessageType.TEXT:
        return this.sendText(agentUserId, message as IChatMessageText)
      case EChatMessageType.IMAGE:
        return this.sendImage(agentUserId, message as IChatMessageImage)
      default:
        throw new Error('Unsupported chat message type')
    }
  }

  public async sendText(agentUserId: string, message: IChatMessageText) {
    const traceId = genTranceID()
    this.callMessagePrint(ELoggerType.debug, `>>> [trancID:${traceId}] [chat] ${agentUserId}`, message)
    const { rtmEngine } = this.getCfg()
    const payload = {
      priority: message.priority ?? EChatMessagePriority.INTERRUPTED,
      interruptable: message.responseInterruptable ?? true,
      message: message.text ?? '',
    }
    try {
      const result = await rtmEngine.publish(agentUserId, JSON.stringify(payload), {
        channelType: 'USER' as ChannelType,
        customType: EMessageType.USER_TRANSCRIPTION,
      })
      this.callMessagePrint(ELoggerType.debug, `>>> [trancID:${traceId}] [chat]`, 'sent', result)
    } catch (error) {
      this.callMessagePrint(ELoggerType.error, `>>> [trancID:${traceId}] [chat]`, 'failed', error)
      throw new Error('failed to send chat message')
    }
  }

  public async sendImage(agentUserId: string, message: IChatMessageImage) {
    const traceId = genTranceID()
    const { rtmEngine } = this.getCfg()
    const payload = { uuid: message.uuid, image_url: message?.url || '', image_base64: message?.base64 || '' }
    try {
      await rtmEngine.publish(agentUserId, JSON.stringify(payload), {
        channelType: 'USER' as ChannelType,
        customType: EMessageType.IMAGE_UPLOAD,
      })
    } catch (error) {
      this.callMessagePrint(ELoggerType.error, `>>> [trancID:${traceId}] [chat]`, 'failed', error)
      throw new Error('failed to send chat message')
    }
  }

  public async interrupt(agentUserId: string) {
    const traceId = genTranceID()
    const { rtmEngine } = this.getCfg()
    try {
      await rtmEngine.publish(agentUserId, JSON.stringify({ customType: EMessageType.MSG_INTERRUPTED }), {
        channelType: 'USER' as ChannelType,
        customType: EMessageType.MSG_INTERRUPTED,
      })
    } catch (error) {
      this.callMessagePrint(ELoggerType.error, `>>> [trancID:${traceId}] [interrupt]`, 'failed', error)
      throw new Error('failed to send interrupt message')
    }
  }

  private onChatHistoryUpdated(
    chatHistory: ITranscriptHelperItem<Partial<IUserTranscription | IAgentTranscription>>[],
  ) {
    this.emit(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, chatHistory)
  }
  private onAgentStateChanged(agentUserId: string, event: TStateChangeEvent) {
    this.emit(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, agentUserId, event)
  }
  private onAgentInterrupted(agentUserId: string, event: { turnID: number; timestamp: number }) {
    this.emit(EConversationalAIAPIEvents.AGENT_INTERRUPTED, agentUserId, event)
  }
  private onDebugLog(message: string) {
    this.emit(EConversationalAIAPIEvents.DEBUG_LOG, message)
  }
  private onAgentMetrics(agentUserId: string, metrics: TAgentMetric) {
    this.emit(EConversationalAIAPIEvents.AGENT_METRICS, agentUserId, metrics)
  }
  private onAgentError(agentUserId: string, error: TModuleError) {
    this.emit(EConversationalAIAPIEvents.AGENT_ERROR, agentUserId, error)
  }
  private onMessageReceiptUpdated(agentUserId: string, messageReceipt: TMessageReceipt) {
    this.emit(EConversationalAIAPIEvents.MESSAGE_RECEIPT_UPDATED, agentUserId, messageReceipt)
  }
  private onMessageError(
    agentUserId: string,
    error: { type: EChatMessageType; code: number; message: string; timestamp: number },
  ) {
    this.emit(EConversationalAIAPIEvents.MESSAGE_ERROR, agentUserId, error)
  }
  private onMessageSalStatus(agentUserId: string, message: IMessageSalStatus) {
    this.emit(EConversationalAIAPIEvents.MESSAGE_SAL_STATUS, agentUserId, message)
  }

  private bindRtcEvents() {
    this.getCfg().rtcEngine.on(ERTCEvents.AUDIO_PTS, this._handleRtcAudioPTS.bind(this))
  }
  private unbindRtcEvents() {
    this.getCfg().rtcEngine.off(ERTCEvents.AUDIO_PTS, this._handleRtcAudioPTS.bind(this))
  }
  private bindRtmEvents() {
    this.getCfg().rtmEngine.addEventListener(ERTMEvents.MESSAGE, this._handleRtmMessage.bind(this))
    this.getCfg().rtmEngine.addEventListener(ERTMEvents.PRESENCE, this._handleRtmPresence.bind(this))
    this.getCfg().rtmEngine.addEventListener(ERTMEvents.STATUS, this._handleRtmStatus.bind(this))
  }
  private unbindRtmEvents() {
    this.getCfg().rtmEngine.removeEventListener(ERTMEvents.MESSAGE, this._handleRtmMessage.bind(this))
    this.getCfg().rtmEngine.removeEventListener(ERTMEvents.PRESENCE, this._handleRtmPresence.bind(this))
    this.getCfg().rtmEngine.removeEventListener(ERTMEvents.STATUS, this._handleRtmStatus.bind(this))
  }

  private _handleRtcAudioPTS(pts: number) {
    try {
      this.covSubRenderController.setPts(pts)
    } catch { }
  }

  private _handleRtmMessage(message: RTMEvents.MessageEvent) {
    try {
      const messageData = message.message
      if (typeof messageData === 'string') {
        this.covSubRenderController.handleMessage(JSON.parse(messageData), { publisher: message.publisher })
        return
      }
      if (messageData instanceof Uint8Array) {
        const decoder = new TextDecoder('utf-8')
        this.covSubRenderController.handleMessage(JSON.parse(decoder.decode(messageData)), {
          publisher: message.publisher,
        })
      }
    } catch { }
  }

  private _handleRtmPresence(presence: RTMEvents.PresenceEvent) {
    const stateChanged = presence.stateChanged as { state?: EAgentState; turn_id?: string }
    if (stateChanged?.state && stateChanged?.turn_id) {
      this.covSubRenderController.handleAgentStatus({
        publisher: presence.publisher,
        timestamp: presence.timestamp,
        stateChanged: { state: stateChanged.state, turn_id: stateChanged.turn_id },
      })
    }
  }

  private _handleRtmStatus(
    _status: RTMEvents.RTMConnectionStatusChangeEvent | RTMEvents.StreamChannelConnectionStatusChangeEvent,
  ) { }
}

export { EConversationalAIAPIEvents } from '@/conversational-ai-api/type'
