import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyOptimisticBattleAnswer,
  buildBattleResultQuestions,
  getInitialBattleResultQuestionId,
  isBattleMatchExpiredAt,
  isBattlePresenceActive,
  normalizeBattleSessionErrorMessage,
  resolveBattleMatchRefreshState,
} from '../../lib/battle/runtime'
import type { BattleCurrentMatchState, BattleResultQuestionView } from '../../lib/battle/types'

test('normalizeBattleSessionErrorMessage treats missing session as idle state', () => {
  assert.equal(normalizeBattleSessionErrorMessage('Battle session not found'), null)
  assert.equal(normalizeBattleSessionErrorMessage('Bad credentials'), 'Bad credentials')
})

test('resolveBattleMatchRefreshState requests result only when a live match just disappeared', () => {
  assert.deepEqual(
    resolveBattleMatchRefreshState('Active battle match not found', 'match-1'),
    { errorMessage: null, shouldLoadResult: true }
  )
  assert.deepEqual(
    resolveBattleMatchRefreshState('Active battle match not found', null),
    { errorMessage: null, shouldLoadResult: false }
  )
})

test('isBattlePresenceActive respects ttl and status', () => {
  const now = new Date('2026-04-01T20:00:45.000Z')

  assert.equal(
    isBattlePresenceActive('online', '2026-04-01T20:00:10.000Z', now),
    true
  )
  assert.equal(
    isBattlePresenceActive('online', '2026-04-01T19:59:50.000Z', now),
    false
  )
  assert.equal(
    isBattlePresenceActive('offline', '2026-04-01T20:00:40.000Z', now),
    false
  )
})

test('isBattleMatchExpiredAt flips exactly at timer boundary', () => {
  const startAt = '2026-04-01T20:00:00.000Z'

  assert.equal(
    isBattleMatchExpiredAt(startAt, 30, new Date('2026-04-01T20:00:29.999Z')),
    false
  )
  assert.equal(
    isBattleMatchExpiredAt(startAt, 30, new Date('2026-04-01T20:00:30.000Z')),
    true
  )
})

test('applyOptimisticBattleAnswer advances self progress without waiting for a full refresh', () => {
  const state: BattleCurrentMatchState = {
    match: {
      id: 'match-1',
      challengeId: 'challenge-1',
      folderId: 'folder-1',
      questionCount: 2,
      timeLimitSeconds: 120,
      status: 'in_progress',
      startAt: '2026-04-02T10:00:00.000Z',
      createdAt: '2026-04-02T09:59:55.000Z',
    },
    self: {
      id: 'player-1',
      matchId: 'match-1',
      profileId: 'profile-1',
      status: 'ready',
      score: 0,
      finishedAt: null,
    },
    opponent: {
      id: 'player-2',
      matchId: 'match-1',
      profileId: 'profile-2',
      status: 'ready',
      score: 0,
      finishedAt: null,
    },
    questions: [
      {
        questionId: 'question-1',
        position: 0,
        questionText: 'Q1',
        answerOptions: ['A', 'B'],
      },
      {
        questionId: 'question-2',
        position: 1,
        questionText: 'Q2',
        answerOptions: ['A', 'B'],
      },
    ],
    selfProgress: {
      answeredCount: 0,
      totalQuestions: 2,
      status: 'ready',
    },
    opponentProgress: {
      answeredCount: 0,
      totalQuestions: 2,
      status: 'ready',
    },
  }

  const nextState = applyOptimisticBattleAnswer(state, 'question-1')

  assert.equal(nextState?.selfProgress.answeredCount, 1)
  assert.equal(nextState?.selfProgress.status, 'in_progress')
  assert.equal(nextState?.self.status, 'in_progress')
})

test('applyOptimisticBattleAnswer marks the final answer as finished', () => {
  const state: BattleCurrentMatchState = {
    match: {
      id: 'match-1',
      challengeId: 'challenge-1',
      folderId: 'folder-1',
      questionCount: 1,
      timeLimitSeconds: 120,
      status: 'countdown',
      startAt: '2026-04-02T10:00:00.000Z',
      createdAt: '2026-04-02T09:59:55.000Z',
    },
    self: {
      id: 'player-1',
      matchId: 'match-1',
      profileId: 'profile-1',
      status: 'ready',
      score: 0,
      finishedAt: null,
    },
    opponent: {
      id: 'player-2',
      matchId: 'match-1',
      profileId: 'profile-2',
      status: 'ready',
      score: 0,
      finishedAt: null,
    },
    questions: [
      {
        questionId: 'question-1',
        position: 0,
        questionText: 'Q1',
        answerOptions: ['A', 'B'],
      },
    ],
    selfProgress: {
      answeredCount: 0,
      totalQuestions: 1,
      status: 'ready',
    },
    opponentProgress: {
      answeredCount: 0,
      totalQuestions: 1,
      status: 'ready',
    },
  }

  const nextState = applyOptimisticBattleAnswer(state, 'question-1')

  assert.equal(nextState?.match.status, 'in_progress')
  assert.equal(nextState?.selfProgress.answeredCount, 1)
  assert.equal(nextState?.selfProgress.status, 'finished')
  assert.equal(nextState?.self.status, 'finished')
  assert.ok(nextState?.self.finishedAt)
})

test('buildBattleResultQuestions maps both players answers onto readable review cards', () => {
  const questions: Array<Omit<BattleResultQuestionView, 'selfAnswer' | 'opponentAnswer' | 'correctOption'>> = [
    {
      questionId: 'question-2',
      position: 1,
      questionText: 'Second question',
      sourceFile: 'set-a.docx',
      answerOptions: ['A2', 'B2', 'C2'],
      correctIndex: 2,
    },
    {
      questionId: 'question-1',
      position: 0,
      questionText: 'First question',
      answerOptions: ['A1', 'B1', 'C1'],
      correctIndex: 1,
    },
  ]

  const resultQuestions = buildBattleResultQuestions({
    questions,
    answers: [
      {
        questionId: 'question-1',
        profileId: 'self',
        selectedIndex: 1,
        isCorrect: true,
        answeredAt: '2026-04-02T10:00:10.000Z',
      },
      {
        questionId: 'question-1',
        profileId: 'opponent',
        selectedIndex: 0,
        isCorrect: false,
        answeredAt: '2026-04-02T10:00:14.000Z',
      },
      {
        questionId: 'question-2',
        profileId: 'opponent',
        selectedIndex: 2,
        isCorrect: true,
        answeredAt: '2026-04-02T10:00:20.000Z',
      },
    ],
    selfProfileId: 'self',
    opponentProfileId: 'opponent',
  })

  assert.equal(resultQuestions[0]?.questionId, 'question-1')
  assert.equal(resultQuestions[0]?.correctOption, 'B1')
  assert.equal(resultQuestions[0]?.selfAnswer?.selectedOption, 'B1')
  assert.equal(resultQuestions[0]?.opponentAnswer?.selectedOption, 'A1')
  assert.equal(resultQuestions[1]?.questionId, 'question-2')
  assert.equal(resultQuestions[1]?.selfAnswer, null)
  assert.equal(resultQuestions[1]?.opponentAnswer?.isCorrect, true)
})

test('getInitialBattleResultQuestionId prefers the first incorrect answer', () => {
  const questionId = getInitialBattleResultQuestionId([
    {
      questionId: 'question-1',
      position: 0,
      questionText: 'Q1',
      answerOptions: ['A', 'B'],
      correctIndex: 0,
      correctOption: 'A',
      selfAnswer: {
        selectedIndex: 0,
        selectedOption: 'A',
        isCorrect: true,
        answeredAt: '2026-04-02T10:00:00.000Z',
      },
      opponentAnswer: null,
    },
    {
      questionId: 'question-2',
      position: 1,
      questionText: 'Q2',
      answerOptions: ['A', 'B'],
      correctIndex: 1,
      correctOption: 'B',
      selfAnswer: {
        selectedIndex: 0,
        selectedOption: 'A',
        isCorrect: false,
        answeredAt: '2026-04-02T10:00:10.000Z',
      },
      opponentAnswer: null,
    },
  ])

  assert.equal(questionId, 'question-2')
})

test('getInitialBattleResultQuestionId falls back to the first correct answer', () => {
  const questionId = getInitialBattleResultQuestionId([
    {
      questionId: 'question-1',
      position: 0,
      questionText: 'Q1',
      answerOptions: ['A', 'B'],
      correctIndex: 0,
      correctOption: 'A',
      selfAnswer: {
        selectedIndex: 0,
        selectedOption: 'A',
        isCorrect: true,
        answeredAt: '2026-04-02T10:00:00.000Z',
      },
      opponentAnswer: null,
    },
  ])

  assert.equal(questionId, 'question-1')
})
