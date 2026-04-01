import type { BattleQuestionSnapshot, BattleResultOutcome } from './types'

export function resolveWinner(aScore: number, bScore: number): 'a' | 'b' | null {
  if (aScore === bScore) return null
  return aScore > bScore ? 'a' : 'b'
}

export function resolveBattleOutcome(
  selfScore: number,
  opponentScore: number
): BattleResultOutcome {
  const winner = resolveWinner(selfScore, opponentScore)
  if (winner === null) return 'draw'
  return winner === 'a' ? 'won' : 'lost'
}

export function isBattleAnswerCorrect(
  snapshot: BattleQuestionSnapshot,
  selectedIndex: number
): boolean {
  if (selectedIndex < 0 || selectedIndex >= snapshot.answerOrder.length) {
    return false
  }

  return snapshot.answerOrder[selectedIndex] === snapshot.correctAnswerIndex
}

export function calculateBattleScore(
  snapshots: BattleQuestionSnapshot[],
  answers: Array<{ questionId: string; selectedIndex: number }>
): number {
  const snapshotByQuestionId = new Map(
    snapshots.map(snapshot => [snapshot.questionId, snapshot] as const)
  )

  return answers.reduce((score, answer) => {
    const snapshot = snapshotByQuestionId.get(answer.questionId)
    if (!snapshot) return score
    return isBattleAnswerCorrect(snapshot, answer.selectedIndex) ? score + 1 : score
  }, 0)
}
