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
if (backendUrl) {
  try {
    const parsed = new URL(backendUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('unsupported protocol')
    }
  } catch {
    fail('AGENT_BACKEND_URL must be a valid http(s) URL.')
  }

  console.log(`Doctor checks passed for local proxy mode (${backendUrl})`)
  process.exit(0)
}

if (!existsSync(envPath) && !mergedEnv.AGORA_APP_ID && !mergedEnv.AGORA_APP_CERTIFICATE) {
  fail('Missing .env.local. Copy .env.local.example to .env.local or set AGORA_APP_ID and AGORA_APP_CERTIFICATE in the environment.')
}

for (const key of ['AGORA_APP_ID', 'AGORA_APP_CERTIFICATE']) {
  if (!mergedEnv[key]?.trim()) {
    fail(`Missing ${key}. Set it in .env.local or the environment before running the standalone web client.`)
  }
}

console.log('Doctor checks passed for standalone web mode')
