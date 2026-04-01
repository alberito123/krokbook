import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { BattleProfile } from '@/lib/battle/types'
import { createSupabaseAdminClient } from './supabase-admin'

interface BattleProfileRow {
  id: string
  nickname: string
  pin_hash: string
  created_at: string
  last_login_at: string | null
}

const MIN_NICKNAME_LENGTH = 3
const MAX_NICKNAME_LENGTH = 24
const MIN_PIN_LENGTH = 4
const MAX_PIN_LENGTH = 64
const BATTLE_NICKNAME_PATTERN = /^[\p{L}\p{N}_ -]+$/u

export function normalizeBattleNickname(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

export function validateBattleNickname(nickname: string): string | null {
  if (!nickname) return 'Nickname is required'
  if (nickname.length < MIN_NICKNAME_LENGTH) {
    return `Nickname must be at least ${MIN_NICKNAME_LENGTH} characters`
  }
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return `Nickname must be at most ${MAX_NICKNAME_LENGTH} characters`
  }
  if (!BATTLE_NICKNAME_PATTERN.test(nickname)) {
    return 'Nickname can only contain letters, numbers, spaces, dashes, and underscores'
  }
  return null
}

export function validateBattlePin(pin: string): string | null {
  if (!pin) return 'PIN is required'
  if (pin.length < MIN_PIN_LENGTH) {
    return `PIN must be at least ${MIN_PIN_LENGTH} characters`
  }
  if (pin.length > MAX_PIN_LENGTH) {
    return `PIN must be at most ${MAX_PIN_LENGTH} characters`
  }
  return null
}

export function hashBattlePin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyBattlePin(pin: string, pinHash: string): boolean {
  const [salt, storedHash] = pinHash.split(':')
  if (!salt || !storedHash) return false

  const calculatedHash = scryptSync(pin, salt, 64)
  const expectedHash = Buffer.from(storedHash, 'hex')

  if (calculatedHash.length !== expectedHash.length) {
    return false
  }

  return timingSafeEqual(calculatedHash, expectedHash)
}

export function mapBattleProfile(row: Pick<BattleProfileRow, 'id' | 'nickname' | 'created_at' | 'last_login_at'>): BattleProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

export async function findBattleProfileByNickname(
  nickname: string
): Promise<BattleProfileRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_profiles')
    .select('id,nickname,pin_hash,created_at,last_login_at')
    .eq('nickname', nickname)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as BattleProfileRow | null
}

export async function findBattleProfileById(profileId: string): Promise<BattleProfileRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_profiles')
    .select('id,nickname,pin_hash,created_at,last_login_at')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as BattleProfileRow | null
}

export async function createBattleProfile(
  nickname: string,
  pin: string
): Promise<BattleProfile> {
  const supabase = createSupabaseAdminClient()
  const pinHash = hashBattlePin(pin)

  const { data, error } = await supabase
    .from('battle_profiles')
    .insert({
      nickname,
      pin_hash: pinHash,
      last_login_at: new Date().toISOString(),
    })
    .select('id,nickname,created_at,last_login_at')
    .single()

  if (error) {
    throw error
  }

  return mapBattleProfile(data as Pick<BattleProfileRow, 'id' | 'nickname' | 'created_at' | 'last_login_at'>)
}

export async function updateBattleLastLogin(profileId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('battle_profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profileId)

  if (error) {
    throw error
  }
}
