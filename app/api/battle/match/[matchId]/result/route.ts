import { NextResponse } from 'next/server'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import { getBattleResult } from '@/lib/server/battle-repository'

interface RouteContext {
  params: {
    matchId: string
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  try {
    const result = await getBattleResult(context.params.matchId, profileId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load battle result'

    if (
      message === 'Battle match not found' ||
      message === 'Battle match players are inconsistent'
    ) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    console.error('Failed to load battle result:', error)
    return NextResponse.json({ error: 'Failed to load battle result' }, { status: 500 })
  }
}
