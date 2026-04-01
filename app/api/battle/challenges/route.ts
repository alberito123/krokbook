import { NextResponse } from 'next/server'
import { findBattleProfileById } from '@/lib/server/battle-auth'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import {
  createChallenge,
  findFolder,
  hasActiveBattle,
  isBattleProfileOnline,
  listQuestionsForFolder,
} from '@/lib/server/battle-repository'

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null
  }

  return value
}

export async function POST(request: Request) {
  const challengerProfileId = readBattleSessionProfileId()
  if (!challengerProfileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const opponentProfileId = String(body?.opponentProfileId ?? '')
  const folderId = String(body?.folderId ?? '')
  const questionCount = parsePositiveInteger(body?.questionCount)
  const timeLimitSeconds = parsePositiveInteger(body?.timeLimitSeconds)

  if (!opponentProfileId || !folderId || !questionCount || !timeLimitSeconds) {
    return NextResponse.json({ error: 'Invalid challenge payload' }, { status: 400 })
  }

  if (challengerProfileId === opponentProfileId) {
    return NextResponse.json({ error: 'You cannot challenge yourself' }, { status: 400 })
  }

  try {
    const [challenger, opponent, folder, challengerBusy, opponentBusy, opponentOnline] = await Promise.all([
      findBattleProfileById(challengerProfileId),
      findBattleProfileById(opponentProfileId),
      findFolder(folderId),
      hasActiveBattle(challengerProfileId),
      hasActiveBattle(opponentProfileId),
      isBattleProfileOnline(opponentProfileId),
    ])

    if (!challenger || !opponent) {
      return NextResponse.json({ error: 'Battle profile not found' }, { status: 404 })
    }

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    if (challengerBusy || opponentBusy) {
      return NextResponse.json({ error: 'One of the players already has an active battle' }, { status: 409 })
    }

    if (!opponentOnline) {
      return NextResponse.json({ error: 'The selected player is no longer online' }, { status: 409 })
    }

    const questions = await listQuestionsForFolder(folderId)
    if (questions.length < questionCount) {
      return NextResponse.json({ error: 'Not enough questions in the selected folder' }, { status: 400 })
    }

    const challenge = await createChallenge({
      challengerProfileId,
      opponentProfileId,
      folderId,
      questionCount,
      timeLimitSeconds,
    })

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error) {
    console.error('Failed to create battle challenge:', error)
    return NextResponse.json({ error: 'Failed to create battle challenge' }, { status: 500 })
  }
}
