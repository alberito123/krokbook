create extension if not exists pgcrypto;

create table if not exists public.battle_profiles (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index if not exists battle_profiles_nickname_idx
  on public.battle_profiles (nickname);

create table if not exists public.battle_presence (
  profile_id uuid primary key references public.battle_profiles (id) on delete cascade,
  status text not null default 'online',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint battle_presence_status_check
    check (status in ('online', 'offline'))
);

create index if not exists battle_presence_last_seen_at_idx
  on public.battle_presence (last_seen_at desc);

create table if not exists public.battle_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_profile_id uuid not null references public.battle_profiles (id) on delete cascade,
  opponent_profile_id uuid not null references public.battle_profiles (id) on delete cascade,
  folder_id uuid not null references public.folders (id) on delete cascade,
  question_count integer not null check (question_count > 0),
  time_limit_seconds integer not null check (time_limit_seconds > 0),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  constraint battle_challenges_status_check
    check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  constraint battle_challenges_profiles_distinct_check
    check (challenger_profile_id <> opponent_profile_id)
);

create index if not exists battle_challenges_status_idx
  on public.battle_challenges (status);

create index if not exists battle_challenges_opponent_profile_id_idx
  on public.battle_challenges (opponent_profile_id);

create index if not exists battle_challenges_challenger_profile_id_idx
  on public.battle_challenges (challenger_profile_id);

create table if not exists public.battle_matches (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.battle_challenges (id) on delete cascade,
  folder_id uuid not null references public.folders (id) on delete cascade,
  question_count integer not null check (question_count > 0),
  time_limit_seconds integer not null check (time_limit_seconds > 0),
  status text not null default 'countdown',
  start_at timestamptz not null,
  end_at timestamptz,
  winner_profile_id uuid references public.battle_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint battle_matches_status_check
    check (status in ('countdown', 'in_progress', 'finished', 'cancelled'))
);

create index if not exists battle_matches_status_idx
  on public.battle_matches (status);

create index if not exists battle_matches_winner_profile_id_idx
  on public.battle_matches (winner_profile_id);

create table if not exists public.battle_match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.battle_matches (id) on delete cascade,
  profile_id uuid not null references public.battle_profiles (id) on delete cascade,
  status text not null default 'ready',
  score integer not null default 0,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint battle_match_players_status_check
    check (status in ('ready', 'in_progress', 'finished', 'timed_out', 'abandoned')),
  constraint battle_match_players_match_profile_unique
    unique (match_id, profile_id)
);

create index if not exists battle_match_players_match_id_idx
  on public.battle_match_players (match_id);

create index if not exists battle_match_players_profile_id_idx
  on public.battle_match_players (profile_id);

create table if not exists public.battle_match_questions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.battle_matches (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null check (position >= 0),
  answer_order integer[] not null,
  created_at timestamptz not null default now(),
  constraint battle_match_questions_match_position_unique
    unique (match_id, position),
  constraint battle_match_questions_match_question_unique
    unique (match_id, question_id)
);

create index if not exists battle_match_questions_match_id_idx
  on public.battle_match_questions (match_id);

create index if not exists battle_match_questions_question_id_idx
  on public.battle_match_questions (question_id);

create table if not exists public.battle_match_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.battle_matches (id) on delete cascade,
  match_question_id uuid not null references public.battle_match_questions (id) on delete cascade,
  profile_id uuid not null references public.battle_profiles (id) on delete cascade,
  selected_index integer not null,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint battle_match_answers_match_profile_question_unique
    unique (match_id, profile_id, match_question_id)
);

create index if not exists battle_match_answers_match_id_idx
  on public.battle_match_answers (match_id);

create index if not exists battle_match_answers_profile_id_idx
  on public.battle_match_answers (profile_id);

create index if not exists battle_match_answers_match_question_id_idx
  on public.battle_match_answers (match_question_id);
