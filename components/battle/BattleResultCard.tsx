'use client'

import * as React from 'react'
import { ArrowLeft, Check, Medal, Trophy, X } from 'lucide-react'
import type { BattleResultView } from '@/lib/battle/types'
import { getInitialBattleResultQuestionId } from '@/lib/battle/runtime'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

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
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(() =>
    getInitialBattleResultQuestionId(result.questions)
  )

  React.useEffect(() => {
    setSelectedQuestionId(getInitialBattleResultQuestionId(result.questions))
  }, [result.questions])

  const selectedQuestion = result.questions.find(question => question.questionId === selectedQuestionId) ?? result.questions[0] ?? null

  return (
    <div className="mx-auto w-full max-w-4xl">
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

        <div className="mt-8 border-t border-zinc-200 pt-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Answer review</h2>
            <p className="text-sm text-zinc-500">
              Fast review of your own answers in the same reading pattern as the standard test mode.
            </p>
          </div>

          {result.questions.length === 0 || !selectedQuestion ? (
            <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              No review data available for this match.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-1.5">
                {result.questions.map((question, index) => {
                  const isActive = question.questionId === selectedQuestion.questionId
                  const isCorrect = question.selfAnswer?.isCorrect === true
                  const isIncorrect = question.selfAnswer?.isCorrect === false

                  return (
                    <button
                      key={question.questionId}
                      type="button"
                      onClick={() => setSelectedQuestionId(question.questionId)}
                      className={cn(
                        'h-9 min-w-9 rounded-md px-3 text-sm font-medium transition-colors',
                        isIncorrect
                          ? isActive
                            ? 'bg-red-600 text-white'
                            : 'bg-red-500 text-white hover:bg-red-600'
                          : isCorrect
                            ? isActive
                              ? 'bg-green-600 text-white'
                              : 'bg-green-500 text-white hover:bg-green-600'
                            : isActive
                              ? 'border-2 border-amber-400 bg-amber-100 text-amber-900'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      )}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>

              <div className="text-sm text-zinc-600">
                Question {selectedQuestion.position + 1} of {result.questions.length}
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-6">
                  <p className="text-zinc-900 leading-relaxed">{selectedQuestion.questionText}</p>
                  {selectedQuestion.sourceFile && (
                    <p className="mt-3 text-xs text-zinc-400">Source: {selectedQuestion.sourceFile}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedQuestion.answerOptions.map((option, index) => {
                    const isCorrect = selectedQuestion.correctIndex === index
                    const isSelected = selectedQuestion.selfAnswer?.selectedIndex === index

                    return (
                      <div
                        key={`${selectedQuestion.questionId}-${index}`}
                        className={cn(
                          'w-full rounded-lg border-2 p-4 text-left transition-colors',
                          isCorrect
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : isSelected
                              ? 'border-red-500 bg-red-50 text-red-900'
                              : 'border-zinc-200 bg-white text-zinc-500'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-sm leading-6">{option}</span>
                          {isCorrect && (
                            <span className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-green-600">
                              <Check className="h-4 w-4" />
                              Correct
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-red-600">
                              <X className="h-4 w-4" />
                              Your Answer
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  {selectedQuestion.selfAnswer ? (
                    <span className={cn(
                      'font-medium',
                      selectedQuestion.selfAnswer.isCorrect ? 'text-green-700' : 'text-red-600'
                    )}>
                      {selectedQuestion.selfAnswer.isCorrect ? 'You answered this question correctly.' : 'You answered this question incorrectly.'}
                    </span>
                  ) : (
                    <span className="font-medium text-zinc-700">No answer was submitted for this question.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
