import { NextResponse } from 'next/server'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import {
  acceptChallenge,
  cancelChallenge,
  findBattleChallengeById,
  findBattleMatchByChallengeId,
  hasActiveBattle,
  isBattleProfileOnline,
} from '@/lib/server/battle-repository'

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
    const challenge = await findBattleChallengeById(challengeId)
    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.opponentProfileId !== profileId) {
      return NextResponse.json({ error: 'Only the challenged player can accept this challenge' }, { status: 403 })
    }

    if (challenge.status === 'accepted') {
      const match = await findBattleMatchByChallengeId(challenge.id)
      if (match) {
        return NextResponse.json({ match })
      }

      return NextResponse.json({ error: 'Challenge has already been accepted' }, { status: 409 })
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge is no longer available' }, { status: 409 })
    }

    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Challenge has expired' }, { status: 409 })
    }

    const [challengerBusy, opponentBusy, challengerOnline] = await Promise.all([
      hasActiveBattle(challenge.challengerProfileId, { ignoreChallengeId: challenge.id }),
      hasActiveBattle(challenge.opponentProfileId, { ignoreChallengeId: challenge.id }),
      isBattleProfileOnline(challenge.challengerProfileId),
    ])

    if (challengerBusy || opponentBusy) {
      return NextResponse.json({ error: 'One of the players already has an active battle' }, { status: 409 })
    }

    if (!challengerOnline) {
      await cancelChallenge(challenge.id)
      return NextResponse.json({ error: 'The challenger is no longer online' }, { status: 409 })
    }

    const match = await acceptChallenge(challenge)
    return NextResponse.json({ match })
  } catch (error) {
    console.error('Failed to accept battle challenge:', error)
    return NextResponse.json({ error: 'Failed to accept battle challenge' }, { status: 500 })
  }
}
