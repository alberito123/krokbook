import type { Question } from '@/lib/types'

export type BattleChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
export type BattleMatchStatus = 'countdown' | 'in_progress' | 'finished' | 'cancelled'
export type BattleMatchPlayerStatus = 'ready' | 'in_progress' | 'finished' | 'timed_out' | 'abandoned'
export type BattleResultOutcome = 'won' | 'lost' | 'draw'

export interface BattleProfile {
  id: string
  nickname: string
  createdAt: string
  lastLoginAt?: string | null
}

export interface BattlePresence {
  profileId: string
  status: 'online' | 'offline'
  lastSeenAt: string
}

export interface BattleChallenge {
  id: string
  challengerProfileId: string
  opponentProfileId: string
  folderId: string
  questionCount: number
  timeLimitSeconds: number
  status: BattleChallengeStatus
  createdAt: string
  acceptedAt?: string | null
  expiresAt: string
}

export interface BattleMatch {
  id: string
  challengeId: string
  folderId: string
  questionCount: number
  timeLimitSeconds: number
  status: BattleMatchStatus
  startAt: string
  endAt?: string | null
  winnerProfileId?: string | null
  createdAt: string
}

export interface BattleMatchPlayer {
  id: string
  matchId: string
  profileId: string
  status: BattleMatchPlayerStatus
  score: number
  finishedAt?: string | null
}

export interface BattleQuestionSnapshot {
  questionId: string
  position: number
  questionText: string
  sourceFile?: string
  answerOptions: string[]
  answerOrder: number[]
  correctAnswerIndex: number
}

export interface BattleQuestionView {
  questionId: string
  position: number
  questionText: string
  sourceFile?: string
  answerOptions: string[]
}

export interface BattleAnswerRecord {
  questionId: string
  selectedIndex: number
  isCorrect: boolean
  answeredAt: string
}

export interface BattleLobbyState {
  profile: BattleProfile
  onlineProfiles: BattleProfile[]
  incomingChallenges: BattleChallenge[]
  outgoingChallenges: BattleChallenge[]
  activeMatch?: BattleMatch | null
}

export interface BattleResultView {
  matchId: string
  outcome: BattleResultOutcome
  selfScore: number
  opponentScore: number
}

export interface BattleQuestionSelectionOptions {
  questionCount: number
  random?: () => number
}

export interface BattleMatchProgressSummary {
  answeredCount: number
  totalQuestions: number
  status: BattleMatchPlayerStatus
}

export interface BattleCurrentMatchState {
  match: BattleMatch
  self: BattleMatchPlayer
  opponent: BattleMatchPlayer
  questions: BattleQuestionView[]
  selfProgress: BattleMatchProgressSummary
  opponentProgress: BattleMatchProgressSummary
}

export interface BattleQuestionSelectionResult {
  selectedQuestions: Question[]
  snapshots: BattleQuestionSnapshot[]
}
