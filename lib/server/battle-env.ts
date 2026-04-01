export function getBattleEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const sessionSecret = process.env.BATTLE_SESSION_SECRET

  if (!url || !serviceRoleKey || !sessionSecret) {
    throw new Error('Battle server env is not configured')
  }

  return { url, serviceRoleKey, sessionSecret }
}
