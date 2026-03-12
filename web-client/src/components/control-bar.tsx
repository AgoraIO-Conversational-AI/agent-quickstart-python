'use client'

import { AgentState } from 'agent-client-toolkit-ts'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

interface ControlBarProps {
  onStartAgent: () => void
  onStopAgent: () => void
  onToggleMic: () => void
}

const stateLabels: Record<AgentState, string> = {
  [AgentState.IDLE]: 'Idle',
  [AgentState.LISTENING]: 'Listening',
  [AgentState.THINKING]: 'Thinking',
  [AgentState.SPEAKING]: 'Speaking',
  [AgentState.SILENT]: 'Silent',
}

const stateColors: Record<AgentState, string> = {
  [AgentState.IDLE]: 'bg-slate-500',
  [AgentState.LISTENING]: 'bg-emerald-500',
  [AgentState.THINKING]: 'bg-amber-500',
  [AgentState.SPEAKING]: 'bg-blue-500',
  [AgentState.SILENT]: 'bg-slate-600',
}

export function ControlBar({ onStartAgent, onStopAgent, onToggleMic }: ControlBarProps) {
  const isConnected = useAppStore((s) => s.isConnected)
  const isConnecting = useAppStore((s) => s.isConnecting)
  const isMicMuted = useAppStore((s) => s.isMicMuted)
  const agentState = useAppStore((s) => s.agentState)

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 rounded-xl border border-slate-700/50">
      <div className="flex items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full animate-pulse', stateColors[agentState])} />
            <span className="text-sm text-slate-400">Agent: {stateLabels[agentState]}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isConnected && (
          <button
            onClick={onToggleMic}
            className={cn(
              'p-3 rounded-full transition-all',
              isMicMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            )}
            title={isMicMuted ? 'Unmute' : 'Mute'}
          >
            {isMicMuted ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
        )}

        {!isConnected ? (
          <button
            onClick={onStartAgent}
            disabled={isConnecting}
            className={cn(
              'px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2',
              isConnecting
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95',
            )}
          >
            {isConnecting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Start Agent
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onStopAgent}
            className="px-6 py-2.5 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-500 active:scale-95 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
            Stop Agent
          </button>
        )}
      </div>
    </div>
  )
}
