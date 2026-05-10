import { NextRequest, NextResponse } from 'next/server'
import {
  generateChannelName,
  generateRtcAndRtmToken,
  getAgoraCredentials,
  proxyToPythonBackend,
} from '@/lib/server/agora'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const proxiedResponse = await proxyToPythonBackend('get_config', undefined, request.nextUrl.searchParams)
    if (proxiedResponse) {
      const body = await proxiedResponse.text()
      return new NextResponse(body, {
        status: proxiedResponse.status,
        headers: { 'Content-Type': proxiedResponse.headers.get('Content-Type') ?? 'application/json' },
      })
    }

    const { appId } = getAgoraCredentials()
    const uid = request.nextUrl.searchParams.get('uid') ?? `${Math.floor(Math.random() * 9_999_000) + 1000}`
    const parsedUid = Number.parseInt(uid, 10)
    const rtcUid = Number.isNaN(parsedUid) ? 0 : parsedUid
    const channelName = request.nextUrl.searchParams.get('channel') ?? generateChannelName()
    const agentUid = `${Math.floor(Math.random() * 89_999_999) + 10_000_000}`
    const token = generateRtcAndRtmToken(channelName, rtcUid)

    return NextResponse.json({
      code: 0,
      data: {
        app_id: appId,
        token,
        uid: uid.toString(),
        channel_name: channelName,
        agent_uid: agentUid,
      },
      msg: 'success',
    })
  } catch (error) {
    console.error('Error generating config:', error)
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : 'Failed to generate config',
      },
      { status: 500 },
    )
  }
}
