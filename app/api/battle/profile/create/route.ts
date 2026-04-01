import { NextResponse } from 'next/server'
import {
  createBattleProfile,
  findBattleProfileByNickname,
  normalizeBattleNickname,
  validateBattleNickname,
  validateBattlePin,
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
    const existingProfile = await findBattleProfileByNickname(nickname)
    if (existingProfile) {
      return NextResponse.json({ error: 'Nickname is already taken' }, { status: 409 })
    }

    const profile = await createBattleProfile(nickname, pin)
    setBattleSession(profile.id)

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('Failed to create battle profile:', error)
    return NextResponse.json({ error: 'Failed to create battle profile' }, { status: 500 })
  }
}
