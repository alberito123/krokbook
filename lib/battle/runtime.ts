import { BATTLE_PRESENCE_TTL_MS } from './constants'

export function normalizeBattleSessionErrorMessage(
  message: string | null | undefined
): string | null {
  if (message === 'Battle session not found') {
    return null
  }

  return message ?? 'Failed to load battle session'
}

export function resolveBattleMatchRefreshState(
  message: string | null | undefined,
  previousMatchId: string | null
): { errorMessage: string | null; shouldLoadResult: boolean } {
  const resolvedMessage = message ?? 'Failed to load battle match'
  const isIdleState = resolvedMessage === 'Active battle match not found'

  return {
    errorMessage: isIdleState ? null : resolvedMessage,
    shouldLoadResult: isIdleState && previousMatchId !== null,
  }
}

export function isBattlePresenceActive(
  status: 'online' | 'offline' | null | undefined,
  lastSeenAt: string | null | undefined,
  now = new Date()
): boolean {
  if (status !== 'online' || !lastSeenAt) {
    return false
  }

  return new Date(lastSeenAt).getTime() >= now.getTime() - BATTLE_PRESENCE_TTL_MS
}

export function isBattleMatchExpiredAt(
  startAt: string,
  timeLimitSeconds: number,
  now = new Date()
): boolean {
  return now.getTime() >= new Date(startAt).getTime() + timeLimitSeconds * 1000
}
