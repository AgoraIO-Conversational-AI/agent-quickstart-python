'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { RTMClient } from 'agora-rtm'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { getConfig, startAgent, stopAgent } from '@/services/api'
import type { AgoraRenewalTokens, AgoraTokenData } from '@/types/conversation'

const ConversationComponent = dynamic(() => import('@/components/ConversationComponent'), {
  ssr: false,
})

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import('agora-rtc-react')

    return {
      default: function AgoraProviders({ children }: { children: React.ReactNode }) {
        const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null)
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        }
        return <AgoraRTCProvider client={clientRef.current}>{children}</AgoraRTCProvider>
      },
    }
  },
  { ssr: false },
)

export default function LandingPage() {
  const [showConversation, setShowConversation] = useState(false)
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null)
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentJoinError, setAgentJoinError] = useState(false)

  useEffect(() => {
    import('agora-rtc-react').catch(() => {})
    import('agora-rtm').catch(() => {})
  }, [])

  const handleStartConversation = async () => {
    setIsLoading(true)
    setError(null)
    setAgentJoinError(false)

    try {
      const config = await getConfig()
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? config.app_id

      const [agentIdResult, rtm] = await Promise.all([
        startAgent(config.channel_name, Number(config.agent_uid), Number(config.uid)).catch((err) => {
          console.error('Failed to start conversation with agent:', err)
          setAgentJoinError(true)
          return undefined
        }),
        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm')
          const nextRtm: RTMClient = new AgoraRTM.RTM(appId, config.uid)
          await nextRtm.login({ token: config.token })
          await nextRtm.subscribe(config.channel_name)
          return nextRtm
        })(),
      ])

      setRtmClient(rtm)
      setAgoraData({
        token: config.token,
        uid: config.uid,
        channel: config.channel_name,
        appId: config.app_id,
        agentUid: config.agent_uid,
        agentId: agentIdResult,
      })
      setShowConversation(true)
    } catch (nextError) {
      setError('Failed to start conversation. Please try again.')
      console.error('Error starting conversation:', nextError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      try {
        const channel = agoraData?.channel
        if (!channel) {
          throw new Error('Missing channel for token renewal')
        }

        // Python get_config issues RTM-capable tokens for the configured account,
        // so renew RTM with the same UID used by the RTM client login.
        const [rtcConfig, rtmConfig] = await Promise.all([
          getConfig({ channel, uid }),
          getConfig({ channel, uid: agoraData.uid }),
        ])

        return {
          rtcToken: rtcConfig.token,
          rtmToken: rtmConfig.token,
        }
      } catch (error) {
        console.error('Error renewing token:', error)
        throw error
      }
    },
    [agoraData],
  )

  const handleEndConversation = async () => {
    if (agoraData?.agentId) {
      try {
        await stopAgent(agoraData.agentId)
      } catch (nextError) {
        console.error('Failed to stop agent:', nextError)
      }
    }

    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err))
    setRtmClient(null)
    setAgoraData(null)
    setShowConversation(false)
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-background text-foreground'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, hsl(194 100% 50% / 0.04) 0%, transparent 72%)',
        }}
      />

      <div className='relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12'>
        <section className='flex w-full max-w-lg flex-col items-center gap-5 px-4 text-center'>
          <p className='animate-fade-up text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground'>
            Agora Conversational AI
          </p>
          <h1 className='animate-fade-up animate-fade-up-d1 text-3xl font-semibold tracking-tight sm:text-4xl'>
            Talk to a voice agent now
          </h1>

          {!showConversation && (
            <p className='animate-fade-up animate-fade-up-d2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base'>
              This Python + FastAPI quickstart streams real-time speech and a live transcript from
              the ConvoAI engine—sub-second latency, production-style pipeline, and a FastAPI
              service you can fork, extend, and ship from your own repo. No extra wiring to feel
              the product.
            </p>
          )}

          {!showConversation ? (
            <>
              <Button
                onClick={handleStartConversation}
                disabled={isLoading}
                className='animate-fade-up animate-fade-up-d3 w-56 border-2 border-primary bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:hover:bg-primary disabled:hover:text-primary-foreground'
                aria-label={
                  isLoading ? 'Starting conversation with AI agent' : 'Start conversation with AI agent'
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Starting...
                  </>
                ) : (
                  'Try it now!'
                )}
              </Button>
              {error ? (
                <p className='rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive'>
                  {error}
                </p>
              ) : null}
            </>
          ) : agoraData && rtmClient ? (
            <>
              {agentJoinError ? (
                <div className='mx-auto max-w-sm rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  Failed to connect with AI agent. The conversation may not work as expected.
                </div>
              ) : null}
              <Suspense fallback={<LoadingSkeleton />}>
                <ErrorBoundary>
                  <AgoraProvider>
                    <ConversationComponent
                      agoraData={agoraData}
                      rtmClient={rtmClient}
                      onTokenWillExpire={handleTokenWillExpire}
                      onEndConversation={handleEndConversation}
                    />
                  </AgoraProvider>
                </ErrorBoundary>
              </Suspense>
            </>
          ) : (
            <p className='text-sm text-muted-foreground'>Failed to load conversation data.</p>
          )}
        </section>
      </div>

      <footer className='fixed bottom-0 left-0 z-40 py-4 pl-4 md:py-6 md:pl-6'>
        <div className='flex items-center justify-start gap-2 text-muted-foreground'>
          <span className='text-xs font-medium uppercase tracking-wide'>Powered by</span>
          <a
            href='https://agora.io/en/'
            target='_blank'
            rel='noopener noreferrer'
            className='transition-colors hover:text-primary'
            aria-label="Visit Agora's website"
          >
            <img
              src='/agora-logo-rgb-blue.svg'
              alt='Agora'
              width={86}
              height={24}
              loading='eager'
              fetchPriority='high'
              className='agora-footer-logo h-6 w-auto translate-y-1 transition-opacity hover:opacity-80'
            />
            <span className='sr-only'>Agora</span>
          </a>
        </div>
      </footer>
    </main>
  )
}
