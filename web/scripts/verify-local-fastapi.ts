import { existsSync } from 'node:fs'
import path from 'node:path'

import { NextRequest } from 'next/server'

import { GET as getConfig } from '../app/api/get_config/route'
import { POST as startAgent } from '../app/api/v2/startAgent/route'
import { POST as stopAgent } from '../app/api/v2/stopAgent/route'

type BunRuntime = typeof globalThis & {
  Bun: {
    sleep: (ms: number) => Promise<void>
    spawn: (options: {
      cmd: string[]
      cwd: string
      env: Record<string, string | undefined>
      stdout: 'ignore'
      stderr: 'pipe'
    }) => {
      kill: () => void
      exited: Promise<number>
      exitCode: number | null
      stderr: ReadableStream<Uint8Array> | null
    }
    spawnSync: (options: {
      cmd: string[]
      cwd: string
      stderr: 'pipe'
      stdout: 'ignore'
    }) => {
      exitCode: number
      stderr: { toString: () => string }
    }
  }
}

const bunRuntime = globalThis as BunRuntime

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function getJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

async function waitForHealthyBackend(baseUrl: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  let lastError = 'backend did not start'

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/get_config?uid=4321&channel=python-smoke`)
      if (response.ok) {
        return
      }
      lastError = `backend returned ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    await bunRuntime.Bun.sleep(250)
  }

  throw new Error(`Timed out waiting for FastAPI backend: ${lastError}`)
}

async function main() {
  const projectRoot = process.cwd()
  const serverRoot = path.resolve(projectRoot, '..', 'server')
  const venvPython = path.join(serverRoot, 'venv', 'bin', 'python')

  if (!existsSync(venvPython)) {
    throw new Error('Missing server/venv/bin/python. Run bun run setup:backend before verify:local.')
  }

  const dependencyCheck = bunRuntime.Bun.spawnSync({
    cmd: [venvPython, '-c', 'import dotenv, fastapi, uvicorn'],
    cwd: serverRoot,
    stderr: 'pipe',
    stdout: 'ignore',
  })
  if (dependencyCheck.exitCode !== 0) {
    const stderr = dependencyCheck.stderr.toString().trim()
    throw new Error(
      `The backend virtualenv is missing required packages. Run bun run setup:backend before verify:local.${stderr ? ` Python said: ${stderr}` : ''}`,
    )
  }

  const port = 43120 + Math.floor(Math.random() * 20)
  const backendUrl = `http://127.0.0.1:${port}`
  const originalBackendUrl = process.env.AGENT_BACKEND_URL

  const serverProcess = bunRuntime.Bun.spawn({
      cmd: [venvPython, 'scripts/run_fake_server.py'],
    cwd: serverRoot,
    env: {
      ...process.env,
      AGORA_APP_ID: '0123456789abcdef0123456789abcdef',
      AGORA_APP_CERTIFICATE: 'fedcba9876543210fedcba9876543210',
      PORT: String(port),
    },
    stdout: 'ignore',
    stderr: 'pipe',
  })

  try {
    await waitForHealthyBackend(backendUrl, 10_000)

    process.env.AGENT_BACKEND_URL = backendUrl

    const response = await getConfig(
      new NextRequest('http://localhost:3000/api/get_config?uid=4321&channel=python-smoke'),
    )
    const body = await getJson(response)

    assert(response.status === 200, 'GET /api/get_config should proxy to the FastAPI app')
    assert(body.code === 0, 'GET /api/get_config should preserve the FastAPI success payload')

    const data = body.data as Record<string, unknown> | undefined
    assert(data?.uid === '4321', 'GET /api/get_config should preserve the requested uid through FastAPI')
    assert(data?.channel_name === 'python-smoke', 'GET /api/get_config should preserve the requested channel through FastAPI')
    assert(typeof data?.token === 'string' && data.token.length > 0, 'GET /api/get_config should return a token from FastAPI')
    assert(typeof data?.agent_uid === 'string' && data.agent_uid.length > 0, 'GET /api/get_config should return an agent uid from FastAPI')

    const startResponse = await startAgent(
      new NextRequest('http://localhost:3000/api/v2/startAgent', {
        method: 'POST',
        body: JSON.stringify({
          channelName: 'python-smoke',
          rtcUid: 9999,
          userUid: 4321,
        }),
      }),
    )
    const startBody = await getJson(startResponse)
    assert(startResponse.status === 200, 'POST /api/v2/startAgent should proxy to the FastAPI app')
    assert(startBody.code === 0, 'POST /api/v2/startAgent should preserve the FastAPI success payload')
    assert(
      (startBody.data as Record<string, unknown> | undefined)?.agent_id === 'fake-agent-9999',
      'POST /api/v2/startAgent should return the agent id from FastAPI',
    )

    const stopResponse = await stopAgent(
      new NextRequest('http://localhost:3000/api/v2/stopAgent', {
        method: 'POST',
        body: JSON.stringify({ agentId: 'fake-agent-9999' }),
      }),
    )
    const stopBody = await getJson(stopResponse)
    assert(stopResponse.status === 200, 'POST /api/v2/stopAgent should proxy to the FastAPI app')
    assert(stopBody.code === 0, 'POST /api/v2/stopAgent should preserve the FastAPI success payload')

    console.log('Local FastAPI app proxy smoke check passed')
  } finally {
    if (originalBackendUrl) {
      process.env.AGENT_BACKEND_URL = originalBackendUrl
    } else {
      delete process.env.AGENT_BACKEND_URL
    }

    serverProcess.kill()
    await serverProcess.exited

    if (serverProcess.exitCode && serverProcess.exitCode !== 0) {
      const stderr = await new Response(serverProcess.stderr).text()
      if (stderr.trim()) {
        console.error(stderr.trim())
      }
    }
  }
}

await main()
