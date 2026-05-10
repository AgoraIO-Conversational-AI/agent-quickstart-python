import { AgentState, type TurnStatus } from 'agora-agent-client-toolkit'
import { create } from 'zustand'

export type LogLevel = 'info' | 'success' | 'error' | 'warning'

export interface LogItem {
  id: string
  message: string
  level: LogLevel
  timestamp: Date
}

export interface TranscriptItem {
  id: string
  type: 'user' | 'agent'
  text: string
  status: TurnStatus
  timestamp: number
}

interface AppState {
  isConnected: boolean
  isConnecting: boolean
  channelName: string
  agentId: string | null
  agentState: AgentState
  isMicMuted: boolean
  transcripts: TranscriptItem[]
  logs: LogItem[]

  setChannelName: (name: string) => void
  setIsConnecting: (connecting: boolean) => void
  setIsConnected: (connected: boolean) => void
  setAgentId: (id: string | null) => void
  setAgentState: (state: AgentState) => void
  setIsMicMuted: (muted: boolean) => void
  setTranscripts: (transcripts: TranscriptItem[]) => void
  addLog: (message: string, level?: LogLevel) => void
  clearLogs: () => void
  reset: () => void
}

const initialState = {
  isConnected: false,
  isConnecting: false,
  channelName: '',
  agentId: null,
  agentState: AgentState.IDLE,
  isMicMuted: false,
  transcripts: [],
  logs: [],
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setChannelName: (name) => set({ channelName: name }),
  setIsConnecting: (connecting) => set({ isConnecting: connecting }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setAgentId: (id) => set({ agentId: id }),
  setAgentState: (state) => set({ agentState: state }),
  setIsMicMuted: (muted) => set({ isMicMuted: muted }),
  setTranscripts: (transcripts) => set({ transcripts }),

  addLog: (message, level = 'info') =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          message,
          level,
          timestamp: new Date(),
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),
  reset: () => set(initialState),
}))
