'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

// Dynamically import AgoraRTC and AgoraRTCProvider to avoid SSR issues
const AgoraProvider = dynamic(
    async () => {
        const { AgoraRTCProvider, default: AgoraRTC } = await import('agora-rtc-react')

        // Enable audio PTS for timing synchronization
        try {
            // @ts-expect-error - setParameter is not in official types but exists in SDK
            AgoraRTC.setParameter('ENABLE_AUDIO_PTS', true)
        } catch { }

        return {
            default: ({ children }: { children: React.ReactNode }) => {
                const client = useMemo(
                    () => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }),
                    []
                )
                return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>
            },
        }
    },
    { ssr: false }
)

// Disable SSR for App component because it uses browser-only APIs (Agora SDK)
const App = dynamic(() => import('@/components/app'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-white text-lg">Loading...</div>
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
