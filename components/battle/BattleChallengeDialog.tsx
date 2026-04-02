'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import type { BattleProfile } from '@/lib/battle/types'
import type { Folder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Create challenge</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pick one opponent, one folder, and one timer.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="battle-opponent">Opponent</Label>
            <Select value={opponentProfileId} onValueChange={setOpponentProfileId}>
              <SelectTrigger id="battle-opponent">
                <SelectValue placeholder="Choose an online student..." />
              </SelectTrigger>
              <SelectContent>
                {onlineProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="battle-folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="battle-folder">
                <SelectValue placeholder="Choose a folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Select value={timeLimitSeconds} onValueChange={setTimeLimitSeconds}>
                <SelectTrigger id="battle-time-limit">
                  <SelectValue placeholder="Choose a time limit..." />
                </SelectTrigger>
                <SelectContent>
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="w-full sm:w-auto"
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
