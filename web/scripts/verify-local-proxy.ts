import { createServer } from 'node:http'
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
  const httpServer = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (req.method === 'GET' && url.pathname === '/get_config') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        code: 0,
        data: {
          app_id: 'stub-app-id',
          token: 'stub-token',
          uid: '4321',
          channel_name: 'proxy-channel',
          agent_uid: '9999',
        },
        msg: 'success',
      }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/v2/startAgent') {
      const chunks: Buffer[] = []
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      req.on('end', () => {
        const parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { rtcUid?: number; userUid?: number }
        if (parsedBody.rtcUid !== 9999 || parsedBody.userUid !== 4321) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ detail: 'unexpected proxied payload' }))
          return
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          code: 0,
          data: {
            agent_id: 'agent-proxied',
            channel_name: 'proxy-channel',
            status: 'started',
          },
          msg: 'success',
        }))
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/v2/stopAgent') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ code: 0, msg: 'success' }))
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(0, '127.0.0.1', () => {
      httpServer.off('error', reject)
      resolve()
    })
  })

  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start stub backend on a local port')
  }

  const server: LocalServer = {
    port: address.port,
    stop: () => {
      httpServer.close()
    },
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
