import { NextRequest } from 'next/server'

import { GET as getConfig } from '../app/api/get_config/route'
import { POST as startAgent } from '../app/api/v2/startAgent/route'
import { POST as stopAgent } from '../app/api/v2/stopAgent/route'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function getJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

type LocalServer = {
  port: number
  stop: (closeActiveConnections?: boolean) => void
}

async function withStubBackend<T>(run: (baseUrl: string) => Promise<T>) {
  const bunRuntime = globalThis as typeof globalThis & {
    Bun: {
      serve: (options: {
        port: number
        fetch: (request: Request) => Promise<Response> | Response
      }) => LocalServer
    }
  }

  const handler = async (request: Request) => {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/get_config') {
      return Response.json({
        code: 0,
        data: {
          app_id: 'stub-app-id',
          token: 'stub-token',
          uid: '4321',
          channel_name: 'proxy-channel',
          agent_uid: '9999',
        },
        msg: 'success',
      })
    }

    if (request.method === 'POST' && url.pathname === '/v2/startAgent') {
      const parsedBody = await request.json() as { rtcUid?: number; userUid?: number }
      if (parsedBody.rtcUid !== 9999 || parsedBody.userUid !== 4321) {
        return Response.json({ detail: 'unexpected proxied payload' }, { status: 400 })
      }

      return Response.json({
        code: 0,
        data: {
          agent_id: 'agent-proxied',
          channel_name: 'proxy-channel',
          status: 'started',
        },
        msg: 'success',
      })
    }

    if (request.method === 'POST' && url.pathname === '/v2/stopAgent') {
      return Response.json({ code: 0, msg: 'success' })
    }

    return new Response('not found', { status: 404 })
  }

  let server: LocalServer | null = null
  const startPort = 43100
  for (let port = startPort; port < startPort + 20; port += 1) {
    try {
      server = bunRuntime.Bun.serve({ port, fetch: handler })
      break
    } catch {}
  }

  if (!server) {
    throw new Error('Failed to start stub backend on a local port')
  }

  try {
    return await run(`http://localhost:${server.port}`)
  } finally {
    server.stop(true)
  }
}

async function main() {
  const originalBackendUrl = process.env.AGENT_BACKEND_URL

  await withStubBackend(async (backendUrl) => {
    process.env.AGENT_BACKEND_URL = backendUrl

    const configResponse = await getConfig(
      new NextRequest('http://localhost:3000/api/get_config?uid=4321&channel=proxy-channel'),
    )
    const configBody = await getJson(configResponse)
    assert(configResponse.status === 200, 'GET /api/get_config should proxy successfully')
    assert(configBody.code === 0, 'GET /api/get_config should preserve proxied success payload')
    assert((configBody.data as Record<string, unknown>)?.token === 'stub-token', 'GET /api/get_config should return proxied token')

    const startResponse = await startAgent(
      new NextRequest('http://localhost:3000/api/v2/startAgent', {
        method: 'POST',
        body: JSON.stringify({
          channelName: 'proxy-channel',
          rtcUid: 9999,
          userUid: 4321,
        }),
      }),
    )
    const startBody = await getJson(startResponse)
    assert(startResponse.status === 200, 'POST /api/v2/startAgent should proxy successfully')
    assert((startBody.data as Record<string, unknown>)?.agent_id === 'agent-proxied', 'POST /api/v2/startAgent should return proxied agent id')

    const stopResponse = await stopAgent(
      new NextRequest('http://localhost:3000/api/v2/stopAgent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'agent-proxied' }),
      }),
    )
    const stopBody = await getJson(stopResponse)
    assert(stopResponse.status === 200, 'POST /api/v2/stopAgent should proxy successfully')
    assert(stopBody.code === 0, 'POST /api/v2/stopAgent should preserve proxied success payload')
  })

  if (originalBackendUrl) {
    process.env.AGENT_BACKEND_URL = originalBackendUrl
  } else {
    delete process.env.AGENT_BACKEND_URL
  }

  console.log('Local proxy checks passed')
}

await main()
