import type {
  BattleChallenge,
  BattleLobbyState,
  BattleMatch,
  BattlePresence,
  BattleProfile,
} from '@/lib/battle/types'
import { BATTLE_CHALLENGE_TTL_MS, BATTLE_PRESENCE_TTL_MS } from '@/lib/battle/constants'
import { createBattleQuestionSelection } from '@/lib/battle/question-selection'
import type { Question } from '@/lib/types'
import { createSupabaseAdminClient } from './supabase-admin'
import { mapBattleProfile } from './battle-auth'

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
  match_id: string
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

export async function findActiveBattleMatch(profileId: string): Promise<BattleMatch | null> {
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

  const [matchRow] = (matchRows as BattleMatchRow[]) ?? []
  return matchRow ? mapBattleMatch(matchRow) : null
}

export async function getBattleLobbyState(
  profile: BattleProfile,
  now = new Date()
): Promise<BattleLobbyState> {
  const [onlineProfiles, activeChallenges, activeMatch] = await Promise.all([
    listOnlineBattleProfiles(profile.id, now),
    listActiveBattleChallenges(profile.id, now),
    findActiveBattleMatch(profile.id),
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

  const activeMatch = await findActiveBattleMatch(profileId)
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
    .from('battle_challenges')
    .insert({
      challenger_profile_id: input.challengerProfileId,
      opponent_profile_id: input.opponentProfileId,
      folder_id: input.folderId,
      question_count: input.questionCount,
      time_limit_seconds: input.timeLimitSeconds,
      expires_at: expiresAt,
    })
    .select('id,challenger_profile_id,opponent_profile_id,folder_id,question_count,time_limit_seconds,status,created_at,accepted_at,expires_at')
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
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('battle_challenges')
    .select('id,challenger_profile_id,opponent_profile_id,folder_id,question_count,time_limit_seconds,status,created_at,accepted_at,expires_at')
    .eq('id', challengeId)
    .eq('status', 'pending')
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

export async function acceptChallenge(challenge: BattleChallenge, now = new Date()): Promise<BattleMatch> {
  const supabase = createSupabaseAdminClient()
  const questions = await listQuestionsForFolder(challenge.folderId)
  const { snapshots } = createBattleQuestionSelection(questions, {
    questionCount: challenge.questionCount,
  })
  const startAt = new Date(now.getTime() + 5_000).toISOString()
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
