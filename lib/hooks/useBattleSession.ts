'use client'

import * as React from 'react'
import type { BattleProfile } from '@/lib/battle/types'
import { STORAGE_KEYS } from '@/lib/constants'
import { getFromStorage, removeFromStorage, setToStorage } from '@/lib/storage'

interface BattleCredentials {
  nickname: string
  pin: string
}

interface BattleSessionState {
  profile: BattleProfile | null
  isLoading: boolean
  error: string | null
  rememberedNickname: string
  refreshSession: () => Promise<void>
  createProfile: (credentials: BattleCredentials) => Promise<void>
  login: (credentials: BattleCredentials) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Battle session request failed')
  }

  return payload as T
}

export function useBattleSession(): BattleSessionState {
  const [profile, setProfile] = React.useState<BattleProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [rememberedNickname, setRememberedNickname] = React.useState('')

  React.useEffect(() => {
    setRememberedNickname(
      getFromStorage<string>(STORAGE_KEYS.BATTLE_PROFILE_HINT, '')
    )
  }, [])

  const refreshSession = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await readJson<{ profile: BattleProfile }>(
        await fetch('/api/battle/profile/session', { credentials: 'include' })
      )
      setProfile(data.profile)
      setError(null)
    } catch (nextError) {
      setProfile(null)
      setError(nextError instanceof Error ? nextError.message : 'Failed to load battle session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const createProfile = React.useCallback(async ({ nickname, pin }: BattleCredentials) => {
    setIsLoading(true)
    try {
      const data = await readJson<{ profile: BattleProfile }>(
        await fetch('/api/battle/profile/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nickname, pin }),
        })
      )

      setProfile(data.profile)
      setRememberedNickname(nickname)
      setToStorage(STORAGE_KEYS.BATTLE_PROFILE_HINT, nickname)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create battle profile')
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = React.useCallback(async ({ nickname, pin }: BattleCredentials) => {
    setIsLoading(true)
    try {
      const data = await readJson<{ profile: BattleProfile }>(
        await fetch('/api/battle/profile/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nickname, pin }),
        })
      )

      setProfile(data.profile)
      setRememberedNickname(nickname)
      setToStorage(STORAGE_KEYS.BATTLE_PROFILE_HINT, nickname)
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to login battle profile')
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = React.useCallback(async () => {
    setIsLoading(true)
    try {
      await readJson<{ ok: true }>(
        await fetch('/api/battle/profile/logout', {
          method: 'POST',
          credentials: 'include',
        })
      )
      setProfile(null)
      removeFromStorage(STORAGE_KEYS.BATTLE_PROFILE_HINT)
      setRememberedNickname('')
      setError(null)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to logout battle profile')
      throw nextError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    profile,
    isLoading,
    error,
    rememberedNickname,
    refreshSession,
    createProfile,
    login,
    logout,
    clearError,
  }
}
