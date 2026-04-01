import { NextResponse } from 'next/server'
import { findBattleProfileById } from '@/lib/server/battle-auth'
import { readBattleSessionProfileId } from '@/lib/server/battle-session'
import { upsertBattlePresence } from '@/lib/server/battle-repository'

export async function POST() {
  const profileId = readBattleSessionProfileId()
  if (!profileId) {
    return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
  }

  try {
    const profile = await findBattleProfileById(profileId)
    if (!profile) {
      return NextResponse.json({ error: 'Battle session not found' }, { status: 401 })
    }

    await upsertBattlePresence(profile.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update battle presence:', error)
    return NextResponse.json({ error: 'Failed to update battle presence' }, { status: 500 })
  }
}
