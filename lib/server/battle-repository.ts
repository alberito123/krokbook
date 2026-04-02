import type {
  BattleCurrentMatchState,
  BattleChallenge,
  BattleLobbyState,
  BattleMatch,
  BattleMatchPlayer,
  BattlePresence,
  BattleProfile,
  BattleResultAnswerEntry,
  BattleQuestionSnapshot,
  BattleQuestionView,
  BattleResultView,
} from '@/lib/battle/types'
import {
  BATTLE_CHALLENGE_TTL_MS,
  BATTLE_COUNTDOWN_SECONDS,
  BATTLE_PRESENCE_TTL_MS,
} from '@/lib/battle/constants'
import { buildBattleResultQuestions, isBattleMatchExpiredAt } from '@/lib/battle/runtime'
import { createBattleQuestionSelection } from '@/lib/battle/question-selection'
import { isBattleAnswerCorrect, resolveBattleOutcome, resolveWinner } from '@/lib/battle/scoring'
import { serializeBattleQuestions } from '@/lib/battle/serialization'
import type { Question } from '@/lib/types'
import { createSupabaseAdminClient } from './supabase-admin'
import { mapBattleProfile } from './battle-auth'
import { isSupabaseUniqueViolation } from './battle-persistence-errors'

interface BattleProfileRow {
  id: string
  nickname: string
  created_at: string
  last_login_at: string | null
}

interface BattleChallengeRow {
  id: string
  challenger_profile_id: string
  opponent_profile_id: string
  folder_id: string
  question_count: number
  time_limit_seconds: number
  status: BattleChallenge['status']
  created_at: string
  accepted_at: string | null
  expires_at: string
}

interface BattleMatchRow {
  id: string
  challenge_id: string
  folder_id: string
  question_count: number
  time_limit_seconds: number
  status: BattleMatch['status']
  start_at: string
  end_at: string | null
  winner_profile_id: string | null
  created_at: string
}

interface FolderRow {
  id: string
}

interface QuestionRow {
  id: string
  folder_id: string
  question_text: string
  answer_options: string[]
  correct_answer_index: number
  source_file: string | null
}

interface BattleMatchPlayerRow {
  id: string
  match_id: string
  profile_id: string
  status: BattleMatchPlayer['status']
  score: number
  finished_at: string | null
}

interface BattleMatchQuestionRow {
  id: string
  match_id: string
  question_id: string
  position: number
  answer_order: number[]
}

interface BattleMatchAnswerRow {
  match_question_id: string
  profile_id: string
  selected_index: number
  is_correct: boolean
  answered_at: string
}

interface BattlePresenceRow {
  profile_id: string
  status: BattlePresence['status']
  last_seen_at: string
}

function mapBattleChallenge(row: BattleChallengeRow): BattleChallenge {
  return {
    id: row.id,
    challengerProfileId: row.challenger_profile_id,
    opponentProfileId: row.opponent_profile_id,
    folderId: row.folder_id,
    questionCount: row.question_count,
    timeLimitSeconds: row.time_limit_seconds,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    expiresAt: row.expires_at,
  }
}

function mapBattleMatch(row: BattleMatchRow): BattleMatch {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    folderId: row.folder_id,
    questionCount: row.question_count,
    timeLimitSeconds: row.time_limit_seconds,
    status: row.status,
    startAt: row.start_at,
    endAt: row.end_at,
    winnerProfileId: row.winner_profile_id,
    createdAt: row.created_at,
  }
}

export async function upsertBattlePresence(profileId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('battle_presence')
    .upsert({
      profile_id: profileId,
      status: 'online',
      last_seen_at: new Date().toISOString(),
    })

  if (error) {
    throw error
  }
}

export async function listOnlineBattleProfiles(
  currentProfileId: string,
  now = new Date()
): Promise<BattleProfile[]> {
  const supabase = createSupabaseAdminClient()
  const onlineSince = new Date(now.getTime() - BATTLE_PRESENCE_TTL_MS).toISOString()

  const { data: presenceRows, error: presenceError } = await supabase
    .from('battle_presence')
    .select('profile_id,status,last_seen_at')
    .eq('status', 'online')
    .gte('last_seen_at', onlineSince)

  if (presenceError) {
    throw presenceError
  }

  const profileIds = (presenceRows as BattlePresenceRow[])
    .map(row => row.profile_id)
    .filter(profileId => profileId !== currentProfileId)

  if (profileIds.length === 0) {
    return []
  }

  const { data: profileRows, error: profileError } = await supabase
    .from('battle_profiles')
    .select('id,nickname,created_at,last_login_at')
    .in('id', profileIds)
    .order('nickname', { ascending: true })

  if (profileError) {
    throw profileError
  }

  return (profileRows as BattleProfileRow[]).map(mapBattleProfile)
}

export async function isBattleProfileOnline(
  profileId: string,
  now = new Date()
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const onlineSince = new Date(now.getTime() - BATTLE_PRESENCE_TTL_MS).toISOString()

  const { data, error } = await supabase
    .from('battle_presence')
    .select('profile_id,status,last_seen_at')
    .eq('profile_id', profileId)
    .eq('status', 'online')
    .gte('last_seen_at', onlineSince)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function listActiveBattleChallenges(
  profileId: string,
  now = new Date()
): Promise<{ incomingChallenges: BattleChallenge[]; outgoingChallenges: BattleChallenge[] }> {
  const supabase = createSupabaseAdminClient()
  const nowIso = now.toISOString()
  const activeSince = new Date(now.getTime() - BATTLE_CHALLENGE_TTL_MS).toISOString()

  const { data: incomingRows, error: incomingError } = await supabase
    .from('battle_challenges')
    .select('id,challenger_profile_id,opponent_profile_id,folder_id,question_count,time_limit_seconds,status,created_at,accepted_at,expires_at')
    .eq('opponent_profile_id', profileId)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .gte('created_at', activeSince)
    .order('created_at', { ascending: false })

  if (incomingError) {
    throw incomingError
  }

  const { data: outgoingRows, error: outgoingError } = await supabase
    .from('battle_challenges')
    .select('id,challenger_profile_id,opponent_profile_id,folder_id,question_count,time_limit_seconds,status,created_at,accepted_at,expires_at')
    .eq('challenger_profile_id', profileId)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .gte('created_at', activeSince)
    .order('created_at', { ascending: false })

  if (outgoingError) {
    throw outgoingError
  }

  return {
    incomingChallenges: (incomingRows as BattleChallengeRow[]).map(mapBattleChallenge),
    outgoingChallenges: (outgoingRows as BattleChallengeRow[]).map(mapBattleChallenge),
  }
}

export async function findActiveBattleMatch(
  profileId: string,
  now = new Date()
): Promise<BattleMatch | null> {
  const supabase = createSupabaseAdminClient()
  const { data: playerRows, error: playerError } = await supabase
    .from('battle_match_players')
    .select('match_id')
    .eq('profile_id', profileId)

  if (playerError) {
    throw playerError
  }

  const matchIds = (playerRows as Array<{ match_id: string }>).map(row => row.match_id)
  if (matchIds.length === 0) {
    return null
  }

  const { data: matchRows, error: matchError } = await supabase
    .from('battle_matches')
    .select('id,challenge_id,folder_id,question_count,time_limit_seconds,status,start_at,end_at,winner_profile_id,created_at')
    .in('id', matchIds)
    .in('status', ['countdown', 'in_progress'])
    .order('start_at', { ascending: true })
    .limit(1)

  if (matchError) {
    throw matchError
  }

  for (const matchRow of (matchRows as BattleMatchRow[]) ?? []) {
    const match = mapBattleMatch(matchRow)
    if (isBattleMatchExpired(match, now)) {
      await finalizeBattleMatch(match.id, now)
      continue
    }

    return match
  }

  return null
}

export async function getBattleLobbyState(
  profile: BattleProfile,
  now = new Date()
): Promise<BattleLobbyState> {
  const [onlineProfiles, activeChallenges, activeMatch] = await Promise.all([
    listOnlineBattleProfiles(profile.id, now),
    listActiveBattleChallenges(profile.id, now),
    findActiveBattleMatch(profile.id, now),
  ])

  return {
    profile,
    onlineProfiles,
    incomingChallenges: activeChallenges.incomingChallenges,
    outgoingChallenges: activeChallenges.outgoingChallenges,
    activeMatch,
  }
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    folderId: row.folder_id,
    questionText: row.question_text,
    answerOptions: row.answer_options,
    correctAnswerIndex: row.correct_answer_index,
    sourceFile: row.source_file ?? undefined,
  }
}

export async function hasActiveBattle(
  profileId: string,
  options: { now?: Date; ignoreChallengeId?: string } = {}
): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const now = options.now ?? new Date()
  const nowIso = now.toISOString()

  let challengeQuery = supabase
    .from('battle_challenges')
    .select('id')
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .or(`challenger_profile_id.eq.${profileId},opponent_profile_id.eq.${profileId}`)
    .limit(1)

  if (options.ignoreChallengeId) {
    challengeQuery = challengeQuery.neq('id', options.ignoreChallengeId)
  }

  const { data: challengeRows, error: challengeError } = await challengeQuery

  if (challengeError) {
    throw challengeError
  }

  if ((challengeRows ?? []).length > 0) {
    return true
  }

  const activeMatch = await findActiveBattleMatch(profileId, now)
  return activeMatch !== null
}

export async function createChallenge(input: {
  challengerProfileId: string
  opponentProfileId: string
  folderId: string
  questionCount: number
  timeLimitSeconds: number
  now?: Date
}): Promise<BattleChallenge> {
  const supabase = createSupabaseAdminClient()
  const now = input.now ?? new Date()
  const expiresAt = new Date(now.getTime() + BATTLE_CHALLENGE_TTL_MS).toISOString()

  const { data, error } = await supabase
    .rpc('create_battle_challenge_atomic', {
      p_challenger_profile_id: input.challengerProfileId,
      p_opponent_profile_id: input.opponentProfileId,
      p_folder_id: input.folderId,
      p_question_count: input.questionCount,
      p_time_limit_seconds: input.timeLimitSeconds,
      p_expires_at: expiresAt,
    })
    .single()

  if (error) {
    throw error
  }

  return mapBattleChallenge(data as BattleChallengeRow)
}

export async function findFolder(folderId: string): Promise<FolderRow | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('folders')
    .select('id')
    .eq('id', folderId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as FolderRow | null
}

export async function listQuestionsForFolder(folderId: string): Promise<Question[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('questions')
    .select('id,folder_id,question_text,answer_options,correct_answer_index,source_file')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data as QuestionRow[]).map(mapQuestion)
}

export async function findPendingChallengeById(challengeId: string): Promise<BattleChallenge | null> {
  const challenge = await findBattleChallengeById(challengeId)
  return challenge?.status === 'pending' ? challenge : null
}

export async function findBattleChallengeById(challengeId: string): Promise<BattleChallenge | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_challenges')
    .select('id,challenger_profile_id,opponent_profile_id,folder_id,question_count,time_limit_seconds,status,created_at,accepted_at,expires_at')
    .eq('id', challengeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapBattleChallenge(data as BattleChallengeRow) : null
}

export async function declineChallenge(challengeId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('battle_challenges')
    .update({ status: 'declined' })
    .eq('id', challengeId)

  if (error) {
    throw error
  }
}

export async function cancelChallenge(challengeId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('battle_challenges')
    .update({ status: 'cancelled' })
    .eq('id', challengeId)

  if (error) {
    throw error
  }
}

export async function acceptChallenge(challenge: BattleChallenge, now = new Date()): Promise<BattleMatch> {
  const supabase = createSupabaseAdminClient()
  const questions = await listQuestionsForFolder(challenge.folderId)
  const { snapshots } = createBattleQuestionSelection(questions, {
    questionCount: challenge.questionCount,
  })
  const startAt = new Date(now.getTime() + BATTLE_COUNTDOWN_SECONDS * 1000).toISOString()
  let matchId: string | null = null

  try {
    const { data: matchData, error: matchError } = await supabase
      .from('battle_matches')
      .insert({
        challenge_id: challenge.id,
        folder_id: challenge.folderId,
        question_count: challenge.questionCount,
        time_limit_seconds: challenge.timeLimitSeconds,
        status: 'countdown',
        start_at: startAt,
      })
      .select('id,challenge_id,folder_id,question_count,time_limit_seconds,status,start_at,end_at,winner_profile_id,created_at')
      .single()

    if (matchError) {
      if (isSupabaseUniqueViolation(matchError, 'battle_matches_challenge_id_key')) {
        const existingMatch = await findBattleMatchByChallengeId(challenge.id)
        if (existingMatch) {
          return existingMatch
        }
      }

      throw matchError
    }

    const match = mapBattleMatch(matchData as BattleMatchRow)
    matchId = match.id

    const { error: playersError } = await supabase
      .from('battle_match_players')
      .insert([
        {
          match_id: match.id,
          profile_id: challenge.challengerProfileId,
          status: 'ready',
        },
        {
          match_id: match.id,
          profile_id: challenge.opponentProfileId,
          status: 'ready',
        },
      ])

    if (playersError) {
      throw playersError
    }

    const { error: questionsError } = await supabase
      .from('battle_match_questions')
      .insert(
        snapshots.map(snapshot => ({
          match_id: match.id,
          question_id: snapshot.questionId,
          position: snapshot.position,
          answer_order: snapshot.answerOrder,
        }))
      )

    if (questionsError) {
      throw questionsError
    }

    const { error: challengeError } = await supabase
      .from('battle_challenges')
      .update({
        status: 'accepted',
        accepted_at: now.toISOString(),
      })
      .eq('id', challenge.id)

    if (challengeError) {
      throw challengeError
    }

    return match
  } catch (error) {
    if (matchId) {
      await supabase.from('battle_matches').delete().eq('id', matchId)
    }
    throw error
  }
}

function mapBattleMatchPlayer(row: BattleMatchPlayerRow): BattleMatchPlayer {
  return {
    id: row.id,
    matchId: row.match_id,
    profileId: row.profile_id,
    status: row.status,
    score: row.score,
    finishedAt: row.finished_at,
  }
}

async function findBattleMatchById(matchId: string): Promise<BattleMatch | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_matches')
    .select('id,challenge_id,folder_id,question_count,time_limit_seconds,status,start_at,end_at,winner_profile_id,created_at')
    .eq('id', matchId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapBattleMatch(data as BattleMatchRow) : null
}

export async function findBattleMatchByChallengeId(challengeId: string): Promise<BattleMatch | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_matches')
    .select('id,challenge_id,folder_id,question_count,time_limit_seconds,status,start_at,end_at,winner_profile_id,created_at')
    .eq('challenge_id', challengeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapBattleMatch(data as BattleMatchRow) : null
}

async function listBattleMatchPlayers(matchId: string): Promise<BattleMatchPlayer[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_match_players')
    .select('id,match_id,profile_id,status,score,finished_at')
    .eq('match_id', matchId)

  if (error) {
    throw error
  }

  return (data as BattleMatchPlayerRow[]).map(mapBattleMatchPlayer)
}

async function listBattleMatchQuestions(matchId: string): Promise<BattleMatchQuestionRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_match_questions')
    .select('id,match_id,question_id,position,answer_order')
    .eq('match_id', matchId)
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return data as BattleMatchQuestionRow[]
}

async function listBattleMatchAnswers(matchId: string): Promise<BattleMatchAnswerRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_match_answers')
    .select('match_question_id,profile_id,selected_index,is_correct,answered_at')
    .eq('match_id', matchId)

  if (error) {
    throw error
  }

  return data as BattleMatchAnswerRow[]
}

async function buildBattleQuestionSnapshots(matchId: string): Promise<{
  matchQuestions: BattleMatchQuestionRow[]
  snapshots: BattleQuestionSnapshot[]
}> {
  const matchQuestions = await listBattleMatchQuestions(matchId)
  if (matchQuestions.length === 0) {
    return { matchQuestions: [], snapshots: [] }
  }

  const supabase = createSupabaseAdminClient()
  const questionIds = matchQuestions.map(row => row.question_id)
  const { data, error } = await supabase
    .from('questions')
    .select('id,folder_id,question_text,answer_options,correct_answer_index,source_file')
    .in('id', questionIds)

  if (error) {
    throw error
  }

  const questionById = new Map((data as QuestionRow[]).map(row => [row.id, row] as const))

  const snapshots = matchQuestions.flatMap(matchQuestion => {
    const question = questionById.get(matchQuestion.question_id)
    if (!question) {
      return []
    }

    return [{
      questionId: question.id,
      position: matchQuestion.position,
      questionText: question.question_text,
      sourceFile: question.source_file ?? undefined,
      answerOptions: question.answer_options,
      answerOrder: matchQuestion.answer_order,
      correctAnswerIndex: question.correct_answer_index,
    }]
  })

  return { matchQuestions, snapshots }
}

function isBattleMatchExpired(match: BattleMatch, now = new Date()): boolean {
  return isBattleMatchExpiredAt(match.startAt, match.timeLimitSeconds, now)
}

export async function getCurrentBattleMatchState(profileId: string): Promise<BattleCurrentMatchState | null> {
  const now = new Date()
  const match = await findActiveBattleMatch(profileId, now)
  if (!match) {
    return null
  }

  const [players, answers, snapshotData] = await Promise.all([
    listBattleMatchPlayers(match.id),
    listBattleMatchAnswers(match.id),
    buildBattleQuestionSnapshots(match.id),
  ])

  const self = players.find(player => player.profileId === profileId)
  const opponent = players.find(player => player.profileId !== profileId)

  if (!self || !opponent) {
    throw new Error('Battle match players are inconsistent')
  }

  const answerCounts = answers.reduce<Map<string, number>>((counts, answer) => {
    counts.set(answer.profile_id, (counts.get(answer.profile_id) ?? 0) + 1)
    return counts
  }, new Map())

  return {
    match,
    self,
    opponent,
    questions: serializeBattleQuestions(snapshotData.snapshots),
    selfProgress: {
      answeredCount: answerCounts.get(self.profileId) ?? 0,
      totalQuestions: match.questionCount,
      status: self.status,
    },
    opponentProgress: {
      answeredCount: answerCounts.get(opponent.profileId) ?? 0,
      totalQuestions: match.questionCount,
      status: opponent.status,
    },
  }
}

export async function submitBattleAnswer(input: {
  matchId: string
  profileId: string
  questionId: string
  selectedIndex: number
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const match = await findBattleMatchById(input.matchId)

  if (!match) {
    throw new Error('Battle match not found')
  }

  if (match.status !== 'countdown' && match.status !== 'in_progress') {
    throw new Error('Battle match is not active')
  }

  const now = new Date()
  if (now.getTime() < new Date(match.startAt).getTime()) {
    throw new Error('Battle match has not started yet')
  }

  if (isBattleMatchExpired(match, now)) {
    await finalizeBattleMatch(match.id, now)
    throw new Error('Battle match has already ended')
  }

  const [players, snapshotData] = await Promise.all([
    listBattleMatchPlayers(match.id),
    buildBattleQuestionSnapshots(match.id),
  ])

  const player = players.find(entry => entry.profileId === input.profileId)
  if (!player) {
    throw new Error('Battle player not found')
  }

  const matchQuestion = snapshotData.matchQuestions.find(entry => entry.question_id === input.questionId)
  const snapshot = snapshotData.snapshots.find(entry => entry.questionId === input.questionId)

  if (!matchQuestion || !snapshot) {
    throw new Error('Battle question not found')
  }

  const { data: existingAnswer, error: existingAnswerError } = await supabase
    .from('battle_match_answers')
    .select('id')
    .eq('match_id', match.id)
    .eq('profile_id', input.profileId)
    .eq('match_question_id', matchQuestion.id)
    .maybeSingle()

  if (existingAnswerError) {
    throw existingAnswerError
  }

  if (existingAnswer) {
    throw new Error('Battle answer already submitted')
  }

  const isCorrect = isBattleAnswerCorrect(snapshot, input.selectedIndex)

  const { error: insertError } = await supabase
    .from('battle_match_answers')
    .insert({
      match_id: match.id,
      match_question_id: matchQuestion.id,
      profile_id: input.profileId,
      selected_index: input.selectedIndex,
      is_correct: isCorrect,
    })

  if (insertError) {
    if (isSupabaseUniqueViolation(insertError, 'battle_match_answers_match_profile_question_unique')) {
      throw new Error('Battle answer already submitted')
    }

    throw insertError
  }

  const { data: playerAnswers, error: playerAnswersError } = await supabase
    .from('battle_match_answers')
    .select('id')
    .eq('match_id', match.id)
    .eq('profile_id', input.profileId)

  if (playerAnswersError) {
    throw playerAnswersError
  }

  const answeredAllQuestions = (playerAnswers ?? []).length >= match.questionCount
  if (answeredAllQuestions) {
    const { error: playerUpdateError } = await supabase
      .from('battle_match_players')
      .update({
        status: 'finished',
        finished_at: now.toISOString(),
      })
      .eq('match_id', match.id)
      .eq('profile_id', input.profileId)

    if (playerUpdateError) {
      throw playerUpdateError
    }
  } else if (player.status === 'ready') {
    const { error: playerProgressError } = await supabase
      .from('battle_match_players')
      .update({ status: 'in_progress' })
      .eq('match_id', match.id)
      .eq('profile_id', input.profileId)

    if (playerProgressError) {
      throw playerProgressError
    }
  }

  const refreshedPlayers = await listBattleMatchPlayers(match.id)
  const everyoneFinished = refreshedPlayers.every(entry => entry.status === 'finished')
  if (everyoneFinished) {
    await finalizeBattleMatch(match.id, now)
  } else if (match.status === 'countdown') {
    await supabase
      .from('battle_matches')
      .update({ status: 'in_progress' })
      .eq('id', match.id)
  }
}

export async function finalizeBattleMatch(matchId: string, now = new Date()): Promise<BattleMatch> {
  const supabase = createSupabaseAdminClient()
  const match = await findBattleMatchById(matchId)

  if (!match) {
    throw new Error('Battle match not found')
  }

  if (match.status === 'finished') {
    return match
  }

  const [players, answers] = await Promise.all([
    listBattleMatchPlayers(match.id),
    listBattleMatchAnswers(match.id),
  ])

  const scoreByProfileId = answers.reduce<Map<string, number>>((scores, answer) => {
    const current = scores.get(answer.profile_id) ?? 0
    scores.set(answer.profile_id, answer.is_correct ? current + 1 : current)
    return scores
  }, new Map())

  const [firstPlayer, secondPlayer] = players
  if (!firstPlayer || !secondPlayer) {
    throw new Error('Battle match players are inconsistent')
  }

  const firstScore = scoreByProfileId.get(firstPlayer.profileId) ?? 0
  const secondScore = scoreByProfileId.get(secondPlayer.profileId) ?? 0
  const winner = resolveWinner(firstScore, secondScore)
  const winnerProfileId = winner === 'a'
    ? firstPlayer.profileId
    : winner === 'b'
      ? secondPlayer.profileId
      : null

  const { error: updatePlayersError } = await supabase
    .from('battle_match_players')
    .upsert(players.map(player => ({
      id: player.id,
      match_id: player.matchId,
      profile_id: player.profileId,
      status: player.finishedAt ? player.status : 'timed_out',
      score: scoreByProfileId.get(player.profileId) ?? 0,
      finished_at: player.finishedAt ?? now.toISOString(),
    })))

  if (updatePlayersError) {
    throw updatePlayersError
  }

  const { data, error } = await supabase
    .from('battle_matches')
    .update({
      status: 'finished',
      end_at: now.toISOString(),
      winner_profile_id: winnerProfileId,
    })
    .eq('id', match.id)
    .select('id,challenge_id,folder_id,question_count,time_limit_seconds,status,start_at,end_at,winner_profile_id,created_at')
    .single()

  if (error) {
    throw error
  }

  return mapBattleMatch(data as BattleMatchRow)
}

export async function getBattleResult(matchId: string, profileId: string): Promise<BattleResultView> {
  const match = await findBattleMatchById(matchId)
  if (!match) {
    throw new Error('Battle match not found')
  }

  const players = await listBattleMatchPlayers(match.id)
  const self = players.find(player => player.profileId === profileId)
  const opponent = players.find(player => player.profileId !== profileId)

  if (!self) {
    throw new Error('Battle player not found')
  }

  if (!opponent) {
    throw new Error('Battle match players are inconsistent')
  }

  const finalMatch = match.status === 'finished'
    ? match
    : isBattleMatchExpired(match)
      ? await finalizeBattleMatch(match.id)
      : null

  if (!finalMatch) {
    throw new Error('Battle result is not ready')
  }

  const finalPlayers = await listBattleMatchPlayers(finalMatch.id)
  const finalSelf = finalPlayers.find(player => player.profileId === profileId)
  const finalOpponent = finalPlayers.find(player => player.profileId !== profileId)

  if (!finalSelf || !finalOpponent) {
    throw new Error('Battle match players are inconsistent')
  }

  const [answers, snapshotData] = await Promise.all([
    listBattleMatchAnswers(finalMatch.id),
    buildBattleQuestionSnapshots(finalMatch.id),
  ])

  const questionIdByMatchQuestionId = new Map(
    snapshotData.matchQuestions.map(question => [question.id, question.question_id] as const)
  )

  const reviewAnswers: BattleResultAnswerEntry[] = answers.flatMap(answer => {
    const questionId = questionIdByMatchQuestionId.get(answer.match_question_id)
    if (!questionId) {
      return []
    }

    return [{
      questionId,
      profileId: answer.profile_id,
      selectedIndex: answer.selected_index,
      isCorrect: answer.is_correct,
      answeredAt: answer.answered_at,
    }]
  })

  const reviewQuestions = buildBattleResultQuestions({
    questions: snapshotData.snapshots.map(snapshot => ({
      questionId: snapshot.questionId,
      position: snapshot.position,
      questionText: snapshot.questionText,
      sourceFile: snapshot.sourceFile,
      answerOptions: snapshot.answerOrder.map(index => snapshot.answerOptions[index]),
      correctIndex: snapshot.answerOrder.indexOf(snapshot.correctAnswerIndex),
    })),
    answers: reviewAnswers,
    selfProfileId: finalSelf.profileId,
    opponentProfileId: finalOpponent.profileId,
  })

  return {
    matchId: finalMatch.id,
    outcome: resolveBattleOutcome(finalSelf.score, finalOpponent.score),
    selfScore: finalSelf.score,
    opponentScore: finalOpponent.score,
    questions: reviewQuestions,
  }
}
