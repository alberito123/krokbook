'use client'

import * as React from 'react'
import { BATTLE_HEARTBEAT_INTERVAL_MS } from '@/lib/battle/constants'
import type { BattleChallenge, BattleLobbyState } from '@/lib/battle/types'

const LOBBY_POLL_INTERVAL_MS = 5_000

interface CreateBattleChallengeInput {
  opponentProfileId: string
  folderId: string
  questionCount: number
  timeLimitSeconds: number
}

interface BattleLobbyHookState {
  lobbyState: BattleLobbyState | null
  isLoading: boolean
  error: string | null
  refreshLobby: () => Promise<void>
  createChallenge: (input: CreateBattleChallengeInput) => Promise<BattleChallenge>
  acceptChallenge: (challengeId: string) => Promise<void>
  declineChallenge: (challengeId: string) => Promise<void>
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Battle lobby request failed')
  }

  return payload as T
}

export function useBattleLobby(isEnabled = true): BattleLobbyHookState {
  const [lobbyState, setLobbyState] = React.useState<BattleLobbyState | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refreshLobby = React.useCallback(async () => {
    if (!isEnabled) {
      setLobbyState(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await readJson<BattleLobbyState>(
        await fetch('/api/battle/lobby', { credentials: 'include' })
      )
      setLobbyState(data)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to load battle lobby')
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [isEnabled])

  React.useEffect(() => {
    if (!isEnabled) return

    const heartbeat = async () => {
      await fetch('/api/battle/presence', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => undefined)
    }

    heartbeat()
    refreshLobby().catch(() => undefined)

    const heartbeatId = window.setInterval(() => {
      heartbeat()
    }, BATTLE_HEARTBEAT_INTERVAL_MS)

    const refreshId = window.setInterval(() => {
      refreshLobby().catch(() => undefined)
    }, LOBBY_POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(heartbeatId)
      window.clearInterval(refreshId)
    }
  }, [isEnabled, refreshLobby])

  const createChallenge = React.useCallback(async (input: CreateBattleChallengeInput) => {
    const data = await readJson<{ challenge: BattleChallenge }>(
      await fetch('/api/battle/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
    )

    await refreshLobby()
    return data.challenge
  }, [refreshLobby])

  const acceptChallenge = React.useCallback(async (challengeId: string) => {
    await readJson<{ ok?: true }>(
      await fetch(`/api/battle/challenges/${challengeId}/accept`, {
        method: 'POST',
        credentials: 'include',
      })
    )
    await refreshLobby()
  }, [refreshLobby])

  const declineChallenge = React.useCallback(async (challengeId: string) => {
    await readJson<{ ok: true }>(
      await fetch(`/api/battle/challenges/${challengeId}/decline`, {
        method: 'POST',
        credentials: 'include',
      })
    )
    await refreshLobby()
  }, [refreshLobby])

  return {
    lobbyState,
    isLoading,
    error,
    refreshLobby,
    createChallenge,
    acceptChallenge,
    declineChallenge,
  }
}
