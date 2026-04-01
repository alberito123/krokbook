import { NextResponse } from 'next/server'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import { getCurrentBattleMatchState } from '@/lib/server/battle-repository'

export async function GET() {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  try {
    const matchState = await getCurrentBattleMatchState(profileId)
    if (!matchState) {
      return NextResponse.json({ error: 'Active battle match not found' }, { status: 404 })
    }

    return NextResponse.json(matchState)
  } catch (error) {
    console.error('Failed to load current battle match:', error)
    return NextResponse.json({ error: 'Failed to load current battle match' }, { status: 500 })
  }
}
