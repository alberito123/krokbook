create or replace function public.create_battle_challenge_atomic(
  p_challenger_profile_id uuid,
  p_opponent_profile_id uuid,
  p_folder_id uuid,
  p_question_count integer,
  p_time_limit_seconds integer,
  p_expires_at timestamptz
) returns public.battle_challenges
language plpgsql
as $$
declare
  v_challenge public.battle_challenges;
begin
  if p_challenger_profile_id = p_opponent_profile_id then
    raise exception 'Battle players must be different';
  end if;

  perform 1
  from public.battle_profiles
  where id in (p_challenger_profile_id, p_opponent_profile_id)
  order by id
  for update;

  if exists (
    select 1
    from public.battle_challenges
    where status = 'pending'
      and expires_at > now()
      and (
        challenger_profile_id in (p_challenger_profile_id, p_opponent_profile_id)
        or opponent_profile_id in (p_challenger_profile_id, p_opponent_profile_id)
      )
  ) then
    raise exception 'Battle profile already has an active challenge';
  end if;

  if exists (
    select 1
    from public.battle_match_players players
    join public.battle_matches matches
      on matches.id = players.match_id
    where players.profile_id in (p_challenger_profile_id, p_opponent_profile_id)
      and matches.status in ('countdown', 'in_progress')
      and (matches.start_at + make_interval(secs => matches.time_limit_seconds)) > now()
  ) then
    raise exception 'Battle profile already has an active match';
  end if;

  insert into public.battle_challenges (
    challenger_profile_id,
    opponent_profile_id,
    folder_id,
    question_count,
    time_limit_seconds,
    expires_at
  ) values (
    p_challenger_profile_id,
    p_opponent_profile_id,
    p_folder_id,
    p_question_count,
    p_time_limit_seconds,
    p_expires_at
  )
  returning * into v_challenge;

  return v_challenge;
end;
$$;
