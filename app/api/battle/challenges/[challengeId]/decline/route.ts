import { NextResponse } from 'next/server'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import { declineChallenge, findPendingChallengeById } from '@/lib/server/battle-repository'

interface RouteContext {
  params: {
    challengeId: string
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  const challengeId = context.params.challengeId

  try {
    const challenge = await findPendingChallengeById(challengeId)
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.opponentProfileId !== profileId) {
      return NextResponse.json({ error: 'Only the challenged player can decline this challenge' }, { status: 403 })
    }

    await declineChallenge(challengeId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to decline battle challenge:', error)
    return NextResponse.json({ error: 'Failed to decline battle challenge' }, { status: 500 })
  }
}
