'use client'

import { ArrowLeft, CheckCircle2, CircleOff, Medal, Trophy, XCircle } from 'lucide-react'
import type { BattleResultView } from '@/lib/battle/types'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
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
  const questionGroups = {
    all: result.questions,
    selfCorrect: result.questions.filter(question => question.selfAnswer?.isCorrect),
    opponentCorrect: result.questions.filter(question => question.opponentAnswer?.isCorrect),
  }

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

        <div className="mt-8 border-t border-zinc-200 pt-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Answer review</h2>
            <p className="text-sm text-zinc-500">
              Full question set with the correct option and both submitted answers.
            </p>
          </div>

          <Tabs defaultValue="all" className="mt-6">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-zinc-100 p-1">
              <TabsTrigger value="all" className="rounded-xl">All</TabsTrigger>
              <TabsTrigger value="selfCorrect" className="rounded-xl">You got right</TabsTrigger>
              <TabsTrigger value="opponentCorrect" className="rounded-xl">Opponent got right</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ResultQuestionList questions={questionGroups.all} emptyMessage="No review data available for this match." />
            </TabsContent>
            <TabsContent value="selfCorrect">
              <ResultQuestionList questions={questionGroups.selfCorrect} emptyMessage="You do not have correct answers in this round." />
            </TabsContent>
            <TabsContent value="opponentCorrect">
              <ResultQuestionList questions={questionGroups.opponentCorrect} emptyMessage="Opponent does not have correct answers in this round." />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function ResultQuestionList({
  questions,
  emptyMessage,
}: {
  questions: BattleResultView['questions']
  emptyMessage: string
}) {
  if (questions.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      {questions.map(question => (
        <article key={question.questionId} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                Question {question.position + 1}
              </p>
              {question.sourceFile && (
                <p className="mt-2 text-xs text-zinc-400">Source: {question.sourceFile}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <AnswerStateBadge label="You" isCorrect={question.selfAnswer?.isCorrect ?? false} hasAnswer={question.selfAnswer !== null} />
              <AnswerStateBadge label="Opponent" isCorrect={question.opponentAnswer?.isCorrect ?? false} hasAnswer={question.opponentAnswer !== null} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm leading-7 text-zinc-950">{question.questionText}</p>
          </div>

          <div className="mt-4 space-y-2">
            {question.answerOptions.map((option, index) => {
              const isCorrectOption = question.correctIndex === index
              const selfPicked = question.selfAnswer?.selectedIndex === index
              const opponentPicked = question.opponentAnswer?.selectedIndex === index

              return (
                <div
                  key={`${question.questionId}-${index}`}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-sm',
                    isCorrectOption ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-zinc-200 bg-white text-zinc-700'
                  )}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        isCorrectOption ? 'border-emerald-200 bg-white text-emerald-700' : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                      )}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="leading-6">{option}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isCorrectOption && <InlinePill className="border-emerald-200 bg-white text-emerald-700">Correct</InlinePill>}
                      {selfPicked && <InlinePill className="border-blue-200 bg-blue-50 text-blue-700">You</InlinePill>}
                      {opponentPicked && <InlinePill className="border-amber-200 bg-amber-50 text-amber-700">Opponent</InlinePill>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <AnswerSummary label="You" answer={question.selfAnswer} />
            <AnswerSummary label="Opponent" answer={question.opponentAnswer} />
          </div>
        </article>
      ))}
    </div>
  )
}

function AnswerSummary({
  label,
  answer,
}: {
  label: string
  answer: BattleResultView['questions'][number]['selfAnswer']
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      {answer ? (
        <>
          <p className="mt-2 text-sm font-medium text-zinc-950">
            {answer.selectedOption ?? 'Selected option unavailable'}
          </p>
          <p className={cn(
            'mt-1 text-xs font-medium',
            answer.isCorrect ? 'text-emerald-700' : 'text-red-600'
          )}>
            {answer.isCorrect ? 'Correct answer' : 'Incorrect answer'}
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-medium text-zinc-950">No answer submitted</p>
          <p className="mt-1 text-xs text-zinc-500">Timer expired or player did not finish this question.</p>
        </>
      )}
    </div>
  )
}

function AnswerStateBadge({
  label,
  isCorrect,
  hasAnswer,
}: {
  label: string
  isCorrect: boolean
  hasAnswer: boolean
}) {
  if (!hasAnswer) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500">
        <CircleOff className="h-3.5 w-3.5" />
        {label}: no answer
      </div>
    )
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
      isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
    )}>
      {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}: {isCorrect ? 'correct' : 'wrong'}
    </div>
  )
}

function InlinePill({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', className)}>
      {children}
    </span>
  )
}
