'use client'

import * as React from 'react'
import { Clock3, Inbox } from 'lucide-react'
import type { BattleChallenge, BattleProfile } from '@/lib/battle/types'
import type { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface BattleIncomingChallengesProps {
  challenges: BattleChallenge[]
  onlineProfiles: BattleProfile[]
  folders: Folder[]
  busyChallengeId: string | null
  onAccept: (challengeId: string) => Promise<void>
  onDecline: (challengeId: string) => Promise<void>
}

function getChallengeLabel(
  challenge: BattleChallenge,
  onlineProfiles: BattleProfile[],
  folders: Folder[]
) {
  const challenger = onlineProfiles.find((profile) => profile.id === challenge.challengerProfileId)
  const folder = folders.find((entry) => entry.id === challenge.folderId)

  return {
    challengerName: challenger?.nickname ?? `Player ${challenge.challengerProfileId.slice(0, 8)}`,
    folderName: folder?.name ?? 'Unknown folder',
  }
}

export function BattleIncomingChallenges({
  challenges,
  onlineProfiles,
  folders,
  busyChallengeId,
  onAccept,
  onDecline,
}: BattleIncomingChallengesProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-950">Incoming challenges</h3>
          <p className="text-sm text-zinc-500">Accept only when you are ready to start immediately.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {challenges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No incoming challenges right now.
          </div>
        ) : (
          challenges.map((challenge) => {
            const { challengerName, folderName } = getChallengeLabel(challenge, onlineProfiles, folders)
            const isBusy = busyChallengeId === challenge.id

            return (
              <div
                key={challenge.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-950">{challengerName}</p>
                      <p className="text-sm text-zinc-500">
                        {challenge.questionCount} questions from {folderName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {Math.floor(challenge.timeLimitSeconds / 60)} min
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onDecline(challenge.id)}
                      disabled={isBusy}
                    >
                      Decline
                    </Button>
                    <Button onClick={() => onAccept(challenge.id)} disabled={isBusy}>
                      {isBusy ? 'Working...' : 'Accept'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
