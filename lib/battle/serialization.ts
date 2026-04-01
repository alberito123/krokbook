import type { BattleQuestionSnapshot, BattleQuestionView } from './types'

export function serializeBattleQuestion(snapshot: BattleQuestionSnapshot): BattleQuestionView {
  return {
    questionId: snapshot.questionId,
    position: snapshot.position,
    questionText: snapshot.questionText,
    sourceFile: snapshot.sourceFile,
    answerOptions: snapshot.answerOrder.map(index => snapshot.answerOptions[index]),
  }
}

export function serializeBattleQuestions(
  snapshots: BattleQuestionSnapshot[]
): BattleQuestionView[] {
  return snapshots.map(serializeBattleQuestion)
}
