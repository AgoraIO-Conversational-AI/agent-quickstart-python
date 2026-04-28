import type { Metadata } from 'next'
import '@/index.css'

export const metadata: Metadata = {
  title: 'Python Voice Agent Quickstart',
  description: 'Agora conversational AI quickstart with live transcript and runtime logs',
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
