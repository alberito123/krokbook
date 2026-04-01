'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import type { BattleProfile } from '@/lib/battle/types'
import type { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BattleChallengeDialogProps {
  isOpen: boolean
  initialOpponentProfileId?: string | null
  onlineProfiles: BattleProfile[]
  folders: Folder[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: {
    opponentProfileId: string
    folderId: string
    questionCount: number
    timeLimitSeconds: number
  }) => Promise<void>
}

const TIME_LIMIT_OPTIONS = [
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
]

export function BattleChallengeDialog({
  isOpen,
  initialOpponentProfileId = null,
  onlineProfiles,
  folders,
  isSubmitting,
  onClose,
  onSubmit,
}: BattleChallengeDialogProps) {
  const [opponentProfileId, setOpponentProfileId] = React.useState('')
  const [folderId, setFolderId] = React.useState('')
  const [questionCount, setQuestionCount] = React.useState('20')
  const [timeLimitSeconds, setTimeLimitSeconds] = React.useState('300')

  React.useEffect(() => {
    if (!isOpen) {
      setOpponentProfileId('')
      setFolderId('')
      setQuestionCount('20')
      setTimeLimitSeconds('300')
    }
  }, [isOpen])

  React.useEffect(() => {
    if (isOpen) {
      setOpponentProfileId(initialOpponentProfileId ?? '')
    }
  }, [initialOpponentProfileId, isOpen])

  if (!isOpen) {
    return null
  }

  const submit = async () => {
    await onSubmit({
      opponentProfileId,
      folderId,
      questionCount: Number(questionCount),
      timeLimitSeconds: Number(timeLimitSeconds),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Create challenge</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pick one online student, one folder, one timed format.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="battle-opponent">Opponent</Label>
            <select
              id="battle-opponent"
              value={opponentProfileId}
              onChange={(event) => setOpponentProfileId(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
            >
              <option value="">Choose an online student...</option>
              {onlineProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nickname}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="battle-folder">Folder</Label>
            <select
              id="battle-folder"
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
            >
              <option value="">Choose a folder...</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="battle-question-count">Questions</Label>
              <Input
                id="battle-question-count"
                type="number"
                min={1}
                value={questionCount}
                onChange={(event) => setQuestionCount(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battle-time-limit">Time limit</Label>
              <select
                id="battle-time-limit"
                value={timeLimitSeconds}
                onChange={(event) => setTimeLimitSeconds(event.target.value)}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
              >
                {TIME_LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              isSubmitting ||
              !opponentProfileId ||
              !folderId ||
              Number(questionCount) <= 0 ||
              Number(timeLimitSeconds) <= 0
            }
          >
            {isSubmitting ? 'Sending...' : 'Send challenge'}
          </Button>
        </div>
      </div>
    </div>
  )
}
