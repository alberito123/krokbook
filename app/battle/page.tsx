'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MobileHeader } from '@/components/MobileHeader'
import { Sidebar } from '@/components/Sidebar'
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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)

  const handleBackToLobby = React.useCallback(async () => {
    battleMatch.clearResult()
    await battleLobby.refreshLobby().catch(() => undefined)
  }, [battleLobby, battleMatch])

  let content: React.ReactNode

  if (battleSession.isLoading) {
    content = (
      <div className="flex min-h-[50dvh] items-center justify-center rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Loading battle session...</p>
      </div>
    )
  } else if (!battleSession.profile) {
    content = (
      <BattleProfileGate
        rememberedNickname={battleSession.rememberedNickname}
        error={battleSession.error}
        isLoading={battleSession.isLoading}
        onCreateProfile={battleSession.createProfile}
        onLogin={battleSession.login}
      />
    )
  } else if (battleMatch.result) {
    content = (
      <BattleResultCard
        result={battleMatch.result}
        onBackToLobby={handleBackToLobby}
      />
    )
  } else if (battleMatch.matchState) {
    content = (
      <BattleMatchView
        matchState={battleMatch.matchState}
        isSubmitting={battleMatch.isSubmittingAnswer}
        onSubmitAnswer={battleMatch.submitAnswer}
      />
    )
  } else {
    content = (
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-50 md:flex-row">
      <MobileHeader
        folderName="Battle"
        onMenuClick={() => setIsSidebarOpen(prev => !prev)}
        isSidebarOpen={isSidebarOpen}
        onBattleClick={() => router.push('/battle')}
        isBattleActive
      />

      <Sidebar
        folders={store.folders}
        selectedFolderId={null}
        onFolderSelect={(folderId) => router.push(`/dashboard?folder=${folderId}`)}
        onFolderDelete={async () => undefined}
        onUploadClick={() => router.push('/dashboard')}
        onErrorHubClick={() => router.push('/error-hub')}
        onBattleClick={() => router.push('/battle')}
        activeRoute="battle"
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        isAdmin={false}
      />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8">
          {content}
        </div>
      </main>
    </div>
  )
}
