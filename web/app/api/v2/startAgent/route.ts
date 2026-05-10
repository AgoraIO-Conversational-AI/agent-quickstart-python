import { NextRequest, NextResponse } from 'next/server'
import {
  createAgoraClient,
  createManagedAgent,
  ExpiresIn,
  proxyToPythonBackend,
} from '@/lib/server/agora'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelName, rtcUid, userUid } = body as {
      channelName?: string
      rtcUid?: number
      userUid?: number
    }

    if (!channelName || !Number.isInteger(rtcUid) || !Number.isInteger(userUid)) {
      return NextResponse.json({ detail: 'channelName, rtcUid, and userUid are required' }, { status: 400 })
    }

    const proxiedResponse = await proxyToPythonBackend('v2/startAgent', {
      method: 'POST',
      body: JSON.stringify({ channelName, rtcUid, userUid }),
    })
    if (proxiedResponse) {
      const responseBody = await proxiedResponse.text()
      return new NextResponse(responseBody, {
        status: proxiedResponse.status,
        headers: { 'Content-Type': proxiedResponse.headers.get('Content-Type') ?? 'application/json' },
      })
    }

    const client = createAgoraClient()
    const agent = createManagedAgent()
    const session = agent.createSession(client, {
      channel: channelName,
      agentUid: String(rtcUid),
      remoteUids: [String(userUid)],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    })

    const agentId = await session.start()

    return NextResponse.json({
      code: 0,
      data: {
        agent_id: agentId,
        channel_name: channelName,
        status: 'started',
      },
      msg: 'success',
    })
  } catch (error) {
    console.error('Error starting agent:', error)
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Failed to start agent',
      },
      { status: 500 },
    )
  }
}
