import { NextResponse } from 'next/server'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import { submitBattleAnswer } from '@/lib/server/battle-repository'

interface RouteContext {
  params: {
    matchId: string
  }
}

export async function POST(request: Request, context: RouteContext) {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const questionId = String(body?.questionId ?? '')
  const selectedIndex = body?.selectedIndex

  if (!questionId || typeof selectedIndex !== 'number' || !Number.isInteger(selectedIndex)) {
    return NextResponse.json({ error: 'Invalid answer payload' }, { status: 400 })
  }

  try {
    await submitBattleAnswer({
      matchId: context.params.matchId,
      profileId,
      questionId,
      selectedIndex,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit battle answer'

    if (
      message === 'Battle match not found' ||
      message === 'Battle question not found' ||
      message === 'Battle player not found'
    ) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (
      message === 'Battle match has not started yet' ||
      message === 'Battle match has already ended' ||
      message === 'Battle answer already submitted' ||
      message === 'Battle match is not active'
    ) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    console.error('Failed to submit battle answer:', error)
    return NextResponse.json({ error: 'Failed to submit battle answer' }, { status: 500 })
  }
}
