'use client'

import * as React from 'react'
import { ArrowLeft, Loader2, RefreshCcw, ShieldCheck, Swords } from 'lucide-react'
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
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              <Swords className="h-3.5 w-3.5" />
              Battle lobby
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">
                {profile.nickname}
              </h1>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Battle profile
              </div>
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              Choose an online opponent and start a timed match from any existing folder.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onBackToDashboard}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              onClick={() => {
                setSelectedOpponentProfileId(null)
                setIsDialogOpen(true)
              }}
              disabled={isLoading || onlineProfiles.length === 0 || folders.length === 0 || !!activeMatch}
            >
              <Swords className="mr-2 h-4 w-4" />
              New challenge
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
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

      {activeMatch && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-950">A live battle is already active</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {getFolderName(activeMatch.folderId, folders)}. {activeMatch.questionCount} questions. {formatMinutes(activeMatch.timeLimitSeconds)} timer.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-950">Online students</h2>
                <p className="text-sm text-zinc-500">Only active profiles with a recent heartbeat are listed.</p>
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
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">{onlineProfile.nickname}</p>
                      <p className="mt-1 text-xs text-zinc-500">Ready for a timed challenge</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOpponentProfileId(onlineProfile.id)
                        setIsDialogOpen(true)
                      }}
                      disabled={!!activeMatch}
                      className="w-full sm:w-auto"
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
            <p className="mt-1 text-sm text-zinc-500">Pending invites remain here until accepted, declined, or expired.</p>

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
                      Timer: {formatMinutes(challenge.timeLimitSeconds)}. Waiting for acceptance.
                    </p>
                  </div>
                ))
              )}
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
