'use client'

import * as React from 'react'
import { applyOptimisticBattleAnswer, resolveBattleMatchRefreshState } from '@/lib/battle/runtime'
import type { BattleCurrentMatchState, BattleResultView } from '@/lib/battle/types'

const MATCH_POLL_INTERVAL_MS = 2_000

interface BattleMatchHookState {
  matchState: BattleCurrentMatchState | null
  result: BattleResultView | null
  isLoading: boolean
  isSubmittingAnswer: boolean
  error: string | null
  refreshMatch: () => Promise<void>
  refreshResult: (matchId: string) => Promise<void>
  submitAnswer: (matchId: string, questionId: string, selectedIndex: number) => Promise<void>
  clearResult: () => void
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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const lastActiveMatchIdRef = React.useRef<string | null>(null)

  const refreshResult = React.useCallback(async (matchId: string) => {
    const data = await readJson<BattleResultView>(
      await fetch(`/api/battle/match/${matchId}/result`, { credentials: 'include' })
    )
    setMatchState(null)
    setResult(data)
    setError(null)
  }, [])

  const refreshMatchInternal = React.useCallback(async (options?: { silent?: boolean }) => {
    if (!isEnabled) {
      setMatchState(null)
      setResult(null)
      lastActiveMatchIdRef.current = null
      setIsLoading(false)
      return
    }

    if (!options?.silent) {
      setIsLoading(true)
    }
    try {
      const data = await readJson<BattleCurrentMatchState>(
        await fetch('/api/battle/match/current', { credentials: 'include' })
      )
      lastActiveMatchIdRef.current = data.match.id
      setMatchState(data)
      setResult(null)
      setError(null)
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Failed to load battle match'
      const previousMatchId = lastActiveMatchIdRef.current
      const { errorMessage, shouldLoadResult } = resolveBattleMatchRefreshState(
        message,
        previousMatchId
      )

      setMatchState(null)

      if (shouldLoadResult && previousMatchId) {
        try {
          await refreshResult(previousMatchId)
          lastActiveMatchIdRef.current = null
          return
        } catch (resultError) {
          setError(
            resultError instanceof Error
              ? resultError.message
              : 'Failed to load battle result'
          )
          throw resultError
        }
      }

      lastActiveMatchIdRef.current = null
      setError(errorMessage)

      if (errorMessage !== null) {
        throw nextError
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [isEnabled, refreshResult])

  const refreshMatch = React.useCallback(async () => {
    await refreshMatchInternal()
  }, [refreshMatchInternal])

  React.useEffect(() => {
    if (!isEnabled) return

    refreshMatchInternal().catch(() => undefined)
    const intervalId = window.setInterval(() => {
      refreshMatchInternal({ silent: true }).catch(() => undefined)
    }, MATCH_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isEnabled, refreshMatchInternal])

  const submitAnswer = React.useCallback(async (
    matchId: string,
    questionId: string,
    selectedIndex: number
  ) => {
    setIsSubmittingAnswer(true)
    try {
      await readJson<{ ok: true }>(
        await fetch(`/api/battle/match/${matchId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ questionId, selectedIndex }),
        })
      )

      setMatchState(previousState => applyOptimisticBattleAnswer(previousState, questionId))
      setError(null)
      refreshMatchInternal({ silent: true }).catch(() => undefined)
    } finally {
      setIsSubmittingAnswer(false)
    }
  }, [refreshMatchInternal])

  const clearResult = React.useCallback(() => {
    lastActiveMatchIdRef.current = null
    setResult(null)
  }, [])

  return {
    matchState,
    result,
    isLoading,
    isSubmittingAnswer,
    error,
    refreshMatch,
    refreshResult,
    submitAnswer,
    clearResult,
  }
}
