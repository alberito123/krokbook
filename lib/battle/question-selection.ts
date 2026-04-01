import type { Question } from '@/lib/types'
import type {
  BattleQuestionSelectionOptions,
  BattleQuestionSelectionResult,
  BattleQuestionSnapshot,
} from './types'

function createRandomIndexOrder(length: number, random: () => number): number[] {
  const indices = Array.from({ length }, (_, index) => index)

  for (let current = indices.length - 1; current > 0; current -= 1) {
    const next = Math.floor(random() * (current + 1))
    const value = indices[current]
    indices[current] = indices[next]
    indices[next] = value
  }

  return indices
}

function buildBattleQuestionSnapshot(
  question: Question,
  position: number,
  random: () => number
): BattleQuestionSnapshot {
  return {
    questionId: question.id,
    position,
    questionText: question.questionText,
    sourceFile: question.sourceFile,
    answerOptions: question.answerOptions,
    answerOrder: createRandomIndexOrder(question.answerOptions.length, random),
    correctAnswerIndex: question.correctAnswerIndex,
  }
}

export function createBattleQuestionSelection(
  questions: Question[],
  options: BattleQuestionSelectionOptions
): BattleQuestionSelectionResult {
  const { questionCount, random = Math.random } = options

  if (questionCount <= 0) {
    throw new Error('Battle question count must be greater than zero')
  }

  if (questions.length < questionCount) {
    throw new Error('Not enough questions available for battle selection')
  }

  const shuffledQuestions = [...questions]

  for (let current = shuffledQuestions.length - 1; current > 0; current -= 1) {
    const next = Math.floor(random() * (current + 1))
    const value = shuffledQuestions[current]
    shuffledQuestions[current] = shuffledQuestions[next]
    shuffledQuestions[next] = value
  }

  const selectedQuestions = shuffledQuestions.slice(0, questionCount)
  const snapshots = selectedQuestions.map((question, index) =>
    buildBattleQuestionSnapshot(question, index, random)
  )

  return { selectedQuestions, snapshots }
}
