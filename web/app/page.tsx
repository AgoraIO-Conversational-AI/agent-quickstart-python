'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import('agora-rtc-react')

    try {
      // @ts-expect-error runtime API exists in the SDK
      AgoraRTC.setParameter('ENABLE_AUDIO_PTS', true)
    } catch {}

    return {
      default: ({ children }: { children: React.ReactNode }) => {
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

const App = dynamic(() => import('@/components/app'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(222_28%_8%)] text-[hsl(210_20%_94%)]">
      <div className="rounded-md border border-[hsl(217_18%_22%)] bg-[hsl(222_24%_11%)] px-4 py-2 text-sm">
        Loading quickstart...
      </div>
    </div>
  ),
})

export default function HomePage() {
  return (
    <AgoraProvider>
      <App />
    </AgoraProvider>
  )
}
