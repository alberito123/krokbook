'use client'

import * as React from 'react'
import type { BattleCurrentMatchState, BattleResultView } from '@/lib/battle/types'

const MATCH_POLL_INTERVAL_MS = 2_000

interface BattleMatchHookState {
  matchState: BattleCurrentMatchState | null
  result: BattleResultView | null
  isLoading: boolean
  error: string | null
  refreshMatch: () => Promise<void>
  refreshResult: (matchId: string) => Promise<void>
  submitAnswer: (matchId: string, questionId: string, selectedIndex: number) => Promise<void>
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Battle match request failed')
  }

  return payload as T
}

export function useBattleMatch(isEnabled = true): BattleMatchHookState {
  const [matchState, setMatchState] = React.useState<BattleCurrentMatchState | null>(null)
  const [result, setResult] = React.useState<BattleResultView | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refreshMatch = React.useCallback(async () => {
    if (!isEnabled) {
      setMatchState(null)
      setResult(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await readJson<BattleCurrentMatchState>(
        await fetch('/api/battle/match/current', { credentials: 'include' })
      )
      setMatchState(data)
      setError(null)
    } catch (nextError) {
      setMatchState(null)
      const message = nextError instanceof Error ? nextError.message : 'Failed to load battle match'
      setError(message === 'Active battle match not found' ? null : message)
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [isEnabled])

  React.useEffect(() => {
    if (!isEnabled) return

    refreshMatch().catch(() => undefined)
    const intervalId = window.setInterval(() => {
      refreshMatch().catch(() => undefined)
    }, MATCH_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isEnabled, refreshMatch])

  const refreshResult = React.useCallback(async (matchId: string) => {
    const data = await readJson<BattleResultView>(
      await fetch(`/api/battle/match/${matchId}/result`, { credentials: 'include' })
    )
    setResult(data)
    setError(null)
  }, [])

  const submitAnswer = React.useCallback(async (
    matchId: string,
    questionId: string,
    selectedIndex: number
  ) => {
    await readJson<{ ok: true }>(
      await fetch(`/api/battle/match/${matchId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId, selectedIndex }),
      })
    )

    await refreshMatch()
  }, [refreshMatch])

  return {
    matchState,
    result,
    isLoading,
    error,
    refreshMatch,
    refreshResult,
    submitAnswer,
  }
}
