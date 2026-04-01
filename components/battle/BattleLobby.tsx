'use client'

import * as React from 'react'
import { ArrowLeft, Loader2, RefreshCcw, ShieldCheck, Swords, Users } from 'lucide-react'
import type { BattleChallenge, BattleLobbyState, BattleProfile } from '@/lib/battle/types'
import type { Folder } from '@/lib/types'
import { BattleChallengeDialog } from './BattleChallengeDialog'
import { BattleIncomingChallenges } from './BattleIncomingChallenges'
import { Button } from '@/components/ui/button'

interface BattleLobbyProps {
  profile: BattleProfile
  folders: Folder[]
  lobbyState: BattleLobbyState | null
  isLoading: boolean
  error: string | null
  onRefresh: () => Promise<void>
  onLogout: () => Promise<void>
  onBackToDashboard: () => void
  onCreateChallenge: (input: {
    opponentProfileId: string
    folderId: string
    questionCount: number
    timeLimitSeconds: number
  }) => Promise<BattleChallenge>
  onAcceptChallenge: (challengeId: string) => Promise<void>
  onDeclineChallenge: (challengeId: string) => Promise<void>
}

function formatMinutes(seconds: number) {
  const minutes = seconds / 60
  return Number.isInteger(minutes) ? `${minutes} min` : `${seconds} sec`
}

function getFolderName(folderId: string, folders: Folder[]) {
  return folders.find((folder) => folder.id === folderId)?.name ?? 'Unknown folder'
}

export function BattleLobby({
  profile,
  folders,
  lobbyState,
  isLoading,
  error,
  onRefresh,
  onLogout,
  onBackToDashboard,
  onCreateChallenge,
  onAcceptChallenge,
  onDeclineChallenge,
}: BattleLobbyProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedOpponentProfileId, setSelectedOpponentProfileId] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isCreatingChallenge, setIsCreatingChallenge] = React.useState(false)
  const [busyChallengeId, setBusyChallengeId] = React.useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const onlineProfiles = lobbyState?.onlineProfiles ?? []
  const incomingChallenges = lobbyState?.incomingChallenges ?? []
  const outgoingChallenges = lobbyState?.outgoingChallenges ?? []
  const activeMatch = lobbyState?.activeMatch ?? null

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  const handleCreateChallenge = React.useCallback(async (input: {
    opponentProfileId: string
    folderId: string
    questionCount: number
    timeLimitSeconds: number
  }) => {
    setIsCreatingChallenge(true)
    try {
      await onCreateChallenge(input)
      setIsDialogOpen(false)
      setSelectedOpponentProfileId(null)
    } finally {
      setIsCreatingChallenge(false)
    }
  }, [onCreateChallenge])

  const handleAcceptChallenge = React.useCallback(async (challengeId: string) => {
    setBusyChallengeId(challengeId)
    try {
      await onAcceptChallenge(challengeId)
    } finally {
      setBusyChallengeId(null)
    }
  }, [onAcceptChallenge])

  const handleDeclineChallenge = React.useCallback(async (challengeId: string) => {
    setBusyChallengeId(challengeId)
    try {
      await onDeclineChallenge(challengeId)
    } finally {
      setBusyChallengeId(null)
    }
  }, [onDeclineChallenge])

  const handleLogout = React.useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setIsLoggingOut(false)
    }
  }, [onLogout])

  return (
    <div className="min-h-[100dvh] bg-zinc-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                <Swords className="h-3.5 w-3.5" />
                Battle lobby
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 md:text-4xl">
                  Challenge online students without touching your study notes.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-500 md:text-base">
                  Battle uses the same folder bank as the main mode, but all live match state stays isolated.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Button variant="outline" onClick={onBackToDashboard}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950">{profile.nickname}</h2>
                    <p className="text-sm text-zinc-500">Battle identity is separate from notebook data.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Online now</p>
                    <p className="mt-2 font-medium text-zinc-950">{onlineProfiles.length}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Folders</p>
                    <p className="mt-2 font-medium text-zinc-950">{folders.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950">Ready to challenge</h2>
                    <p className="text-sm text-zinc-500">Pick one online student, one folder, one timer.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => {
                      setSelectedOpponentProfileId(null)
                      setIsDialogOpen(true)
                    }}
                    disabled={isLoading || onlineProfiles.length === 0 || folders.length === 0 || !!activeMatch}
                    className="sm:flex-1"
                  >
                    <Swords className="mr-2 h-4 w-4" />
                    Create challenge
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="sm:flex-1"
                  >
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                <p className="mt-3 text-xs text-zinc-500">
                  {onlineProfiles.length === 0
                    ? 'No students are online in Battle right now.'
                    : folders.length === 0
                      ? 'No folders are available yet from the main mode.'
                      : activeMatch
                        ? 'A live battle is already locked for this profile.'
                        : 'The server will freeze the same random question set for both players.'}
                </p>
              </div>
            </div>

            {activeMatch && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950">Live battle is syncing</h2>
                    <p className="text-sm text-zinc-500">
                      Folder: {getFolderName(activeMatch.folderId, folders)}. {activeMatch.questionCount} questions. {formatMinutes(activeMatch.timeLimitSeconds)} timer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">Online students</h2>
                  <p className="text-sm text-zinc-500">Only students with an active site heartbeat appear here.</p>
                </div>
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                  {onlineProfiles.length} online
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {onlineProfiles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                    Waiting for another student to come online.
                  </div>
                ) : (
                  onlineProfiles.map((onlineProfile) => (
                    <div
                      key={onlineProfile.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950">{onlineProfile.nickname}</p>
                        <p className="mt-1 text-xs text-zinc-500">Available for live challenge</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOpponentProfileId(onlineProfile.id)
                          setIsDialogOpen(true)
                        }}
                        disabled={!!activeMatch}
                      >
                        Challenge
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <BattleIncomingChallenges
              challenges={incomingChallenges}
              onlineProfiles={onlineProfiles}
              folders={folders}
              busyChallengeId={busyChallengeId}
              onAccept={handleAcceptChallenge}
              onDecline={handleDeclineChallenge}
            />

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-zinc-950">Outgoing challenges</h2>
              <p className="mt-1 text-sm text-zinc-500">Pending invites stay here until they are accepted, declined, or expire.</p>

              <div className="mt-4 space-y-3">
                {outgoingChallenges.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                    You have no outgoing challenges right now.
                  </div>
                ) : (
                  outgoingChallenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4"
                    >
                      <p className="text-sm font-medium text-zinc-950">
                        {challenge.questionCount} questions from {getFolderName(challenge.folderId, folders)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Timer: {formatMinutes(challenge.timeLimitSeconds)}. Waiting for the other student to accept.
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BattleChallengeDialog
        isOpen={isDialogOpen}
        initialOpponentProfileId={selectedOpponentProfileId}
        onlineProfiles={onlineProfiles}
        folders={folders}
        isSubmitting={isCreatingChallenge}
        onClose={() => {
          setIsDialogOpen(false)
          setSelectedOpponentProfileId(null)
        }}
        onSubmit={handleCreateChallenge}
      />
    </div>
  )
}
