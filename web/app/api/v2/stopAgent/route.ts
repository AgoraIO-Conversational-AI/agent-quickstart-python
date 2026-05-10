import { NextRequest, NextResponse } from 'next/server'
import {
  createAgoraClient,
  isAgentAlreadyStoppingOrStopped,
  proxyToPythonBackend,
} from '@/lib/server/agora'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId } = body as { agentId?: string }

    if (!agentId) {
      return NextResponse.json({ detail: 'agentId is required' }, { status: 400 })
    }

    const proxiedResponse = await proxyToPythonBackend('v2/stopAgent', {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    })
    if (proxiedResponse) {
      const responseBody = await proxiedResponse.text()
      return new NextResponse(responseBody, {
        status: proxiedResponse.status,
        headers: { 'Content-Type': proxiedResponse.headers.get('Content-Type') ?? 'application/json' },
      })
    }

    const client = createAgoraClient()
    try {
      await client.stopAgent(agentId)
    } catch (error) {
      if (!isAgentAlreadyStoppingOrStopped(error)) {
        throw error
      }
    }

    return NextResponse.json({ code: 0, msg: 'success' })
  } catch (error) {
    console.error('Error stopping agent:', error)
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Failed to stop agent',
      },
      { status: 500 },
    )
  }
}
