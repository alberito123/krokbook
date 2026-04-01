import { NextResponse } from 'next/server'
import {
  findBattleProfileByNickname,
  mapBattleProfile,
  normalizeBattleNickname,
  updateBattleLastLogin,
  validateBattleNickname,
  validateBattlePin,
  verifyBattlePin,
} from '@/lib/server/battle-auth'
import { setBattleSession } from '@/lib/server/battle-session'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const nickname = normalizeBattleNickname(body?.nickname ?? '')
  const pin = String(body?.pin ?? '')

  const nicknameError = validateBattleNickname(nickname)
  if (nicknameError) {
    return NextResponse.json({ error: nicknameError }, { status: 400 })
  }

  const pinError = validateBattlePin(pin)
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 400 })
  }

  try {
    const profile = await findBattleProfileByNickname(nickname)
    if (!profile || !verifyBattlePin(pin, profile.pin_hash)) {
      return NextResponse.json({ error: 'Invalid nickname or PIN' }, { status: 401 })
    }

    await updateBattleLastLogin(profile.id)
    setBattleSession(profile.id)

    return NextResponse.json({ profile: mapBattleProfile(profile) })
  } catch (error) {
    console.error('Failed to login battle profile:', error)
    return NextResponse.json({ error: 'Failed to login battle profile' }, { status: 500 })
  }
}
