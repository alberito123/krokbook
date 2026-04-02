import { BATTLE_PRESENCE_TTL_MS } from './constants'
import type {
  BattleCurrentMatchState,
  BattleResultAnswerEntry,
  BattleResultQuestionAnswerView,
  BattleResultQuestionView,
} from './types'

export function normalizeBattleSessionErrorMessage(
  message: string | null | undefined
): string | null {
  if (message === 'Battle session not found') {
    return null
  }

  return message ?? 'Failed to load battle session'
}

export function resolveBattleMatchRefreshState(
  message: string | null | undefined,
  previousMatchId: string | null
): { errorMessage: string | null; shouldLoadResult: boolean } {
  const resolvedMessage = message ?? 'Failed to load battle match'
  const isIdleState = resolvedMessage === 'Active battle match not found'

  return {
    errorMessage: isIdleState ? null : resolvedMessage,
    shouldLoadResult: isIdleState && previousMatchId !== null,
  }
}

export function isBattlePresenceActive(
  status: 'online' | 'offline' | null | undefined,
  lastSeenAt: string | null | undefined,
  now = new Date()
): boolean {
  if (status !== 'online' || !lastSeenAt) {
    return false
  }

  return new Date(lastSeenAt).getTime() >= now.getTime() - BATTLE_PRESENCE_TTL_MS
}

export function isBattleMatchExpiredAt(
  startAt: string,
  timeLimitSeconds: number,
  now = new Date()
): boolean {
  return now.getTime() >= new Date(startAt).getTime() + timeLimitSeconds * 1000
}

export function applyOptimisticBattleAnswer(
  matchState: BattleCurrentMatchState | null,
  questionId: string
): BattleCurrentMatchState | null {
  if (!matchState) {
    return null
  }

  const currentQuestionIndex = Math.min(
    matchState.selfProgress.answeredCount,
    Math.max(matchState.questions.length - 1, 0)
  )
  const currentQuestion = matchState.questions[currentQuestionIndex]

  if (!currentQuestion || currentQuestion.questionId !== questionId) {
    return matchState
  }

  const nextAnsweredCount = Math.min(
    matchState.selfProgress.answeredCount + 1,
    matchState.selfProgress.totalQuestions
  )
  const hasAnsweredAllQuestions = nextAnsweredCount >= matchState.selfProgress.totalQuestions

  return {
    ...matchState,
    match: {
      ...matchState.match,
      status: matchState.match.status === 'countdown' ? 'in_progress' : matchState.match.status,
    },
    self: {
      ...matchState.self,
      status: hasAnsweredAllQuestions
        ? 'finished'
        : matchState.self.status === 'ready'
          ? 'in_progress'
          : matchState.self.status,
      finishedAt: hasAnsweredAllQuestions ? new Date().toISOString() : matchState.self.finishedAt,
    },
    selfProgress: {
      ...matchState.selfProgress,
      answeredCount: nextAnsweredCount,
      status: hasAnsweredAllQuestions
        ? 'finished'
        : matchState.selfProgress.status === 'ready'
          ? 'in_progress'
          : matchState.selfProgress.status,
    },
  }
}

function buildBattleResultAnswerView(
  answer: BattleResultAnswerEntry | undefined,
  answerOptions: string[]
): BattleResultQuestionAnswerView | null {
  if (!answer) {
    return null
  }

  return {
    selectedIndex: answer.selectedIndex,
    selectedOption: answerOptions[answer.selectedIndex] ?? null,
    isCorrect: answer.isCorrect,
    answeredAt: answer.answeredAt,
  }
}

export function buildBattleResultQuestions(input: {
  questions: Array<Omit<BattleResultQuestionView, 'selfAnswer' | 'opponentAnswer' | 'correctOption'>>
  answers: BattleResultAnswerEntry[]
  selfProfileId: string
  opponentProfileId: string
}): BattleResultQuestionView[] {
  const answersByQuestionId = input.answers.reduce<Map<string, BattleResultAnswerEntry[]>>((map, answer) => {
    const existingAnswers = map.get(answer.questionId) ?? []
    existingAnswers.push(answer)
    map.set(answer.questionId, existingAnswers)
    return map
  }, new Map())

  return [...input.questions]
    .sort((left, right) => left.position - right.position)
    .map(question => {
      const questionAnswers = answersByQuestionId.get(question.questionId) ?? []
      const selfAnswer = questionAnswers.find(answer => answer.profileId === input.selfProfileId)
      const opponentAnswer = questionAnswers.find(answer => answer.profileId === input.opponentProfileId)

      return {
        ...question,
        correctOption: question.answerOptions[question.correctIndex] ?? null,
        selfAnswer: buildBattleResultAnswerView(selfAnswer, question.answerOptions),
        opponentAnswer: buildBattleResultAnswerView(opponentAnswer, question.answerOptions),
      }
    })
}

export function getInitialBattleResultQuestionId(
  questions: BattleResultQuestionView[]
): string | null {
  if (questions.length === 0) {
    return null
  }

  const firstIncorrectQuestion = questions.find(question => question.selfAnswer?.isCorrect === false)
  if (firstIncorrectQuestion) {
    return firstIncorrectQuestion.questionId
  }

  const firstCorrectQuestion = questions.find(question => question.selfAnswer?.isCorrect === true)
  if (firstCorrectQuestion) {
    return firstCorrectQuestion.questionId
  }

  return questions[0]?.questionId ?? null
}
