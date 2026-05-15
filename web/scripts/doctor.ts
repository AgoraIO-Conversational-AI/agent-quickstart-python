import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {}
  }

  const contents = readFileSync(filePath, 'utf8')
  const result: Record<string, string> = {}
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    result[key] = value
  }

  return result
}

const cwd = process.cwd()
const envPath = path.join(cwd, '.env.local')
const examplePath = path.join(cwd, '.env.local.example')

if (!existsSync(examplePath)) {
  fail('Missing .env.local.example. Restore the tracked template before continuing.')
}

const fileEnv = loadEnvFile(envPath)
const mergedEnv = {
  ...fileEnv,
  ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string')),
}

const backendUrl = mergedEnv.AGENT_BACKEND_URL
if (!backendUrl?.trim()) {
  fail(
    'Missing AGENT_BACKEND_URL. The web app proxies /api/* requests to the Python backend and cannot serve them in-process.',
  )
}

try {
  const parsed = new URL(backendUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('unsupported protocol')
  }
} catch {
  fail('AGENT_BACKEND_URL must be a valid http(s) URL.')
}

console.log(`Doctor checks passed for Python-backed web proxy mode (${backendUrl})`)
