import { ControlBar } from '@/components/control-bar'
import { LogPanel } from '@/components/log-panel'
import { SubtitlePanel } from '@/components/subtitle-panel'
import { cn } from '@/lib/utils'
import { useAgoraConnection } from '@/hooks/useAgoraConnection'
import { useAppStore } from '@/stores/app-store'

export default function App() {
  const isConnected = useAppStore((s) => s.isConnected)
  const isConnecting = useAppStore((s) => s.isConnecting)
  const { connect, disconnect, toggleMicrophone } = useAgoraConnection()

  const handleStartAgent = async () => {
    if (isConnecting) return
    try {
      await connect()
    } catch { }
  }

  const handleStopAgent = async () => {
    await disconnect()
  }

  const handleToggleMic = () => {
    toggleMicrophone()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="Chat"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Agora Conversational AI</h1>
              <p className="text-xs text-slate-400">Real-time Voice Conversation Demo</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* Subtitle Panel - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 h-[500px] lg:h-auto">
            <SubtitlePanel />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Log Panel */}
            <LogPanel />

            {/* Status Card */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Connection Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={cn(
                      'font-medium',
                      isConnected ? 'text-emerald-400' : isConnecting ? 'text-amber-400' : 'text-slate-400',
                    )}
                  >
                    {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
                {isConnected && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Channel</span>
                      <span className="text-slate-300 font-mono">{useAppStore.getState().channelName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agent ID</span>
                      <span className="text-slate-300 font-mono text-[10px] break-all">
                        {useAppStore.getState().agentId || 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <ControlBar onStartAgent={handleStartAgent} onStopAgent={handleStopAgent} onToggleMic={handleToggleMic} />
      </div>
    </div>
  )
}
