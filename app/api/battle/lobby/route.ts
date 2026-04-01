import { NextResponse } from 'next/server'
import { findBattleProfileById, mapBattleProfile } from '@/lib/server/battle-auth'
import { clearBattleSession, readBattleSessionProfileId } from '@/lib/server/battle-session'
import { getBattleLobbyState } from '@/lib/server/battle-repository'

export async function GET() {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  try {
    const profileRow = await findBattleProfileById(profileId)
    if (!profileRow) {
      clearBattleSession()
      return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
    }

    const lobbyState = await getBattleLobbyState(mapBattleProfile(profileRow))
    return NextResponse.json(lobbyState)
  } catch (error) {
    console.error('Failed to load battle lobby:', error)
    return NextResponse.json({ error: 'Failed to load battle lobby' }, { status: 500 })
  }
}
