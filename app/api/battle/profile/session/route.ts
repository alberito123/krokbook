import { NextResponse } from 'next/server'
import { findBattleProfileById, mapBattleProfile } from '@/lib/server/battle-auth'
import { clearBattleSession, readBattleSessionProfileId } from '@/lib/server/battle-session'

export async function GET() {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  try {
    const profile = await findBattleProfileById(profileId)
    if (!profile) {
      clearBattleSession()
      return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
    }

    return NextResponse.json({ profile: mapBattleProfile(profile) })
  } catch (error) {
    console.error('Failed to load battle session:', error)
    return NextResponse.json({ error: 'Failed to load battle session' }, { status: 500 })
  }
}
