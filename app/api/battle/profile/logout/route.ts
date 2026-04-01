import { NextResponse } from 'next/server'
import { clearBattleSession } from '@/lib/server/battle-session'

export async function POST() {
  clearBattleSession()
  return NextResponse.json({ ok: true })
}
