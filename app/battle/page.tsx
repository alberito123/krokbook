'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { BattleLobby, BattleMatchView, BattleProfileGate, BattleResultCard } from '@/components/battle'
import { useBattleLobby } from '@/lib/hooks/useBattleLobby'
import { useBattleMatch } from '@/lib/hooks/useBattleMatch'
import { useBattleSession } from '@/lib/hooks/useBattleSession'
import { useStore } from '@/lib/store'

export default function BattlePage() {
  const router = useRouter()
  const store = useStore()
  const battleSession = useBattleSession()
  const isBattleEnabled = Boolean(battleSession.profile)
  const battleLobby = useBattleLobby(isBattleEnabled)
  const battleMatch = useBattleMatch(isBattleEnabled)

  const handleBackToLobby = React.useCallback(async () => {
    battleMatch.clearResult()
    await battleLobby.refreshLobby().catch(() => undefined)
  }, [battleLobby, battleMatch])

  if (battleSession.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading battle session...</p>
      </div>
    )
  }

  if (!battleSession.profile) {
    return (
      <BattleProfileGate
        rememberedNickname={battleSession.rememberedNickname}
        error={battleSession.error}
        isLoading={battleSession.isLoading}
        onCreateProfile={battleSession.createProfile}
        onLogin={battleSession.login}
      />
    )
  }

  if (battleMatch.result) {
    return (
      <div className="min-h-[100dvh] bg-zinc-50">
        <BattleResultCard
          result={battleMatch.result}
          onBackToLobby={handleBackToLobby}
        />
      </div>
    )
  }

  if (battleMatch.matchState) {
    return (
      <BattleMatchView
        matchState={battleMatch.matchState}
        isSubmitting={battleMatch.isSubmittingAnswer}
        onSubmitAnswer={battleMatch.submitAnswer}
      />
    )
  }

  return (
    <BattleLobby
      profile={battleSession.profile}
      folders={store.folders}
      lobbyState={battleLobby.lobbyState}
      isLoading={battleLobby.isLoading || store.isLoading}
      error={battleMatch.error ?? battleLobby.error ?? battleSession.error}
      onRefresh={battleLobby.refreshLobby}
      onLogout={battleSession.logout}
      onBackToDashboard={() => router.push('/dashboard')}
      onCreateChallenge={battleLobby.createChallenge}
      onAcceptChallenge={battleLobby.acceptChallenge}
      onDeclineChallenge={battleLobby.declineChallenge}
    />
  )
}
