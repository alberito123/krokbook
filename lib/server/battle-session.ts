import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getBattleEnv } from './battle-env'

const BATTLE_SESSION_COOKIE = 'krokbook-battle-session'
const BATTLE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

interface BattleSessionPayload {
  profileId: string
  expiresAt: number
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signBattleSessionPayload(value: string): string {
  const { sessionSecret } = getBattleEnv()
  return createHmac('sha256', sessionSecret).update(value).digest('base64url')
}

function encodeBattleSession(payload: BattleSessionPayload): string {
  const body = toBase64Url(JSON.stringify(payload))
  const signature = signBattleSessionPayload(body)
  return `${body}.${signature}`
}

function decodeBattleSession(token: string): BattleSessionPayload | null {
  const [body, signature] = token.split('.')

  if (!body || !signature) {
    return null
  }

  const expectedSignature = signBattleSessionPayload(body)
  const providedSignature = Buffer.from(signature, 'utf8')
  const actualSignature = Buffer.from(expectedSignature, 'utf8')

  if (providedSignature.length !== actualSignature.length) {
    return null
  }

  if (!timingSafeEqual(providedSignature, actualSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(body)) as BattleSessionPayload
    if (!payload.profileId || payload.expiresAt <= Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function setBattleSession(profileId: string): void {
  const payload: BattleSessionPayload = {
    profileId,
    expiresAt: Date.now() + BATTLE_SESSION_MAX_AGE_SECONDS * 1000,
  }

  cookies().set(BATTLE_SESSION_COOKIE, encodeBattleSession(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: BATTLE_SESSION_MAX_AGE_SECONDS,
  })
}

export function readBattleSessionProfileId(): string | null {
  const token = cookies().get(BATTLE_SESSION_COOKIE)?.value
  if (!token) return null

  return decodeBattleSession(token)?.profileId ?? null
}

export function clearBattleSession(): void {
  cookies().set(BATTLE_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}
