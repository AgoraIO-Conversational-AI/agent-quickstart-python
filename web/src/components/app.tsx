'use client'

import { useAgoraConnection } from '@/hooks/useAgoraConnection'
import { cn } from '@/lib/utils'
import { AgentVisualizer, ConvoTextStream } from 'agora-agent-uikit'
import { MicButtonWithVisualizer } from 'agora-agent-uikit/rtc'
import { ShareButton } from './share-button'

const HERO_TITLE =
  process.env.NEXT_PUBLIC_HERO_TITLE || 'Python Voice AI Quickstart'
const HERO_SUBTITLE =
  process.env.NEXT_PUBLIC_HERO_SUBTITLE ||
  'The Python backend now mirrors the current Next.js quickstart contract: one requester, one agent, UIKit transcript UI, and renewed RTC plus RTM tokens.'

export default function App() {
  const {
    RemoteUser,
    agentId,
    agentUid,
    channelName,
    connect,
    currentInProgressMessage,
    disconnect,
    error,
    isConnected,
    isConnecting,
    isMicEnabled,
    localMicrophoneTrack,
    messageList,
    remoteUsers,
    setMicEnabled,
    toggleMicrophone,
    visualizerState,
  } = useAgoraConnection()

  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, hsl(194 100% 50% / 0.05) 0%, transparent 72%)',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ShareButton />
        </div>
        {!isConnected ? (
          <section className="flex w-full max-w-xl flex-col items-center gap-5 text-center">
            <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.28em] text-[hsl(var(--muted-foreground))]">
              Agora Conversational AI
            </p>
            <h1 className="animate-fade-up animate-fade-up-d1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {HERO_TITLE}
            </h1>
            <p className="animate-fade-up animate-fade-up-d2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
              {HERO_SUBTITLE}
            </p>

            <button
              className={cn(
                'animate-fade-up animate-fade-up-d3 inline-flex h-12 min-w-56 items-center justify-center rounded-full border-2 px-6 text-sm font-medium transition-colors',
                isConnecting
                  ? 'cursor-wait border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
                  : 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-transparent hover:text-[hsl(var(--primary))]',
              )}
              disabled={isConnecting}
              onClick={connect}
              type="button"
            >
              {isConnecting ? 'Starting...' : 'Try it now!'}
            </button>

            {error ? (
              <p className="rounded-full border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 px-4 py-2 text-sm text-[hsl(var(--destructive))]">
                {error}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="flex h-full w-full max-w-5xl flex-col items-center gap-8">
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col">
                <span className="text-xs uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">
                  Live Conversation
                </span>
                <span className="truncate text-sm text-[hsl(var(--muted-foreground))]">{channelName}</span>
              </div>

              <button
                className="inline-flex h-10 items-center justify-center rounded-full border-2 border-[hsl(var(--destructive))] px-4 text-sm font-medium text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))]"
                onClick={disconnect}
                type="button"
              >
                End
              </button>
            </div>

            <div className="relative flex h-64 w-full items-center justify-center">
              <AgentVisualizer state={visualizerState} size="lg" />
              {remoteUsers.map((user) => (
                <div key={user.uid} className="hidden">
                  <RemoteUser user={user} />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 px-4 py-2 backdrop-blur-md">
              <div className="conversation-mic-host flex items-center justify-center">
                <MicButtonWithVisualizer
                  aria-label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  className="overflow-visible"
                  disabledColor="hsl(var(--destructive))"
                  enabledColor="hsl(var(--primary))"
                  isEnabled={isMicEnabled}
                  onToggle={toggleMicrophone}
                  setIsEnabled={setMicEnabled}
                  track={localMicrophoneTrack}
                />
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {isMicEnabled ? 'Microphone on' : 'Microphone muted'}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  Agent ID {agentId ?? 'pending'}{agentUid ? ` • UID ${agentUid}` : ''}
                </span>
              </div>
            </div>

            <ConvoTextStream
              agentUID={agentUid ?? '0'}
              className="conversation-transcript"
              currentInProgressMessage={currentInProgressMessage}
              messageList={messageList}
            />
          </section>
        )}
      </div>
    </main>
  )
}
