import type { Metadata } from 'next'
import '@/index.css'

export const metadata: Metadata = {
    title: 'Agora Conversational AI Demo',
    description: 'Real-time voice conversation with AI agents powered by Agora',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
