'use client'

import { ArrowLeft, Medal, Trophy } from 'lucide-react'
import type { BattleResultView } from '@/lib/battle/types'
import { Button } from '@/components/ui/button'

interface BattleResultCardProps {
  result: BattleResultView
  onBackToLobby: () => void
}

const RESULT_COPY: Record<BattleResultView['outcome'], { title: string; tone: string }> = {
  won: {
    title: 'You won the battle',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  lost: {
    title: 'You lost this round',
    tone: 'bg-red-50 text-red-700 border-red-200',
  },
  draw: {
    title: 'Battle ended in a draw',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

export function BattleResultCard({ result, onBackToLobby }: BattleResultCardProps) {
  const copy = RESULT_COPY[result.outcome]

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              <Trophy className="h-3.5 w-3.5" />
              Final result
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 md:text-3xl">{copy.title}</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Final score is locked by the server from recorded answers.
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${copy.tone}`}>
            {result.outcome.toUpperCase()}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Your score</p>
            <p className="mt-3 text-4xl font-bold text-zinc-950">{result.selfScore}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Opponent score</p>
            <p className="mt-3 text-4xl font-bold text-zinc-950">{result.opponentScore}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-zinc-500" />
              Equal correct answers always end in a draw.
            </div>
          </div>

          <Button onClick={onBackToLobby} className="sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to lobby
          </Button>
        </div>
      </div>
    </div>
  )
}
