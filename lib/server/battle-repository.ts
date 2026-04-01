import type { BattleChallenge, BattleLobbyState, BattleMatch, BattlePresence, BattleProfile } from '@/lib/battle/types'
import { BATTLE_CHALLENGE_TTL_MS, BATTLE_PRESENCE_TTL_MS } from '@/lib/battle/constants'
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
