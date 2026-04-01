'use client'

import * as React from 'react'
import { Clock3, Loader2, Swords, Users } from 'lucide-react'
import type { BattleCurrentMatchState } from '@/lib/battle/types'
import { Button } from '@/components/ui/button'

interface BattleMatchViewProps {
  matchState: BattleCurrentMatchState
  isSubmitting: boolean
  onSubmitAnswer: (matchId: string, questionId: string, selectedIndex: number) => Promise<void>
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function BattleMatchView({
  matchState,
  isSubmitting,
  onSubmitAnswer,
}: BattleMatchViewProps) {
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const startAt = new Date(matchState.match.startAt).getTime()
  const endAt = startAt + matchState.match.timeLimitSeconds * 1000
  const countdownSeconds = Math.max(Math.ceil((startAt - now) / 1000), 0)
  const timeLeftSeconds = Math.max(Math.ceil((endAt - now) / 1000), 0)
  const currentQuestionIndex = Math.min(
    matchState.selfProgress.answeredCount,
    Math.max(matchState.questions.length - 1, 0)
  )
  const currentQuestion = matchState.questions[currentQuestionIndex]
  const hasAnsweredAllQuestions = matchState.selfProgress.answeredCount >= matchState.selfProgress.totalQuestions

  return (
    <div className="min-h-[100dvh] bg-zinc-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.35fr,0.65fr]">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  <Swords className="h-3.5 w-3.5" />
                  Live battle
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 md:text-3xl">
                    Question {Math.min(matchState.selfProgress.answeredCount + 1, matchState.match.questionCount)} of {matchState.match.questionCount}
                  </h1>
                  <p className="mt-2 text-sm text-zinc-500">
                    Both players are solving the same locked question set.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[240px]">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Status</p>
                  <p className="mt-2 text-sm font-medium text-zinc-950">
                    {countdownSeconds > 0 ? 'Countdown' : matchState.match.status.replace('_', ' ')}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Time left</p>
                  <p className="mt-2 text-sm font-medium text-zinc-950">
                    {countdownSeconds > 0 ? formatTime(countdownSeconds) : formatTime(timeLeftSeconds)}
                  </p>
                </div>
              </div>
            </div>

            {countdownSeconds > 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-6 py-6 text-5xl font-bold text-zinc-950">
                  {countdownSeconds}
                </div>
                <p className="max-w-md text-sm text-zinc-500">
                  Battle is locked in. The same timer and the same questions start for both players at once.
                </p>
              </div>
            ) : hasAnsweredAllQuestions || !currentQuestion || timeLeftSeconds <= 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <div>
                  <h2 className="text-xl font-semibold text-zinc-950">Waiting for final result</h2>
                  <p className="mt-2 max-w-md text-sm text-zinc-500">
                    Your answers are already recorded. The server is waiting for the other player or final timer expiration.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-6">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-sm leading-7 text-zinc-950">{currentQuestion.questionText}</p>
                  {currentQuestion.sourceFile && (
                    <p className="mt-3 text-xs text-zinc-400">Source: {currentQuestion.sourceFile}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {currentQuestion.answerOptions.map((option, index) => (
                    <Button
                      key={`${currentQuestion.questionId}-${index}`}
                      variant="outline"
                      className="h-auto w-full justify-start whitespace-normal px-4 py-4 text-left text-sm leading-6 text-zinc-700 hover:bg-zinc-100"
                      disabled={isSubmitting}
                      onClick={() => onSubmitAnswer(matchState.match.id, currentQuestion.questionId, index)}
                    >
                      <span className="mr-3 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-600">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{option}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">Battle state</h2>
                  <p className="text-sm text-zinc-500">Progress is updated from server state.</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">You</p>
                  <p className="mt-2 text-sm font-medium text-zinc-950">
                    {matchState.selfProgress.answeredCount} / {matchState.selfProgress.totalQuestions}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{matchState.self.status.replace('_', ' ')}</p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Opponent</p>
                  <p className="mt-2 text-sm font-medium text-zinc-950">
                    {matchState.opponentProgress.answeredCount} / {matchState.opponentProgress.totalQuestions}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{matchState.opponent.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">Timer rules</h2>
                  <p className="text-sm text-zinc-500">If time ends, the server finalizes from saved answers.</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600">
                <li>One question at a time, no answer reveal during the match.</li>
                <li>Equal correct answers always end in a draw.</li>
                <li>Leaving the page does not pause the timer.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
