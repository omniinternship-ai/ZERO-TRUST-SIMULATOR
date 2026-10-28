-- V003 personal statistics backup. Run the entire file in Supabase SQL Editor.
-- Additive migration: does not change legacy game_results / submit_result.
begin;
create table if not exists public.v003_player_data (
  player_id uuid primary key references auth.users(id) on delete cascade,
  app_version text not null default '0.0.3',
  revision bigint not null default 1 check (revision > 0),
  mission_score bigint not null,
  minigame_score bigint not null,
  total_score bigint generated always as (mission_score + minigame_score) stored,
  safest_count integer not null check (safest_count >= 0),
  low_safety_count integer not null check (low_safety_count >= 0),
  risky_count integer not null check (risky_count >= 0),
  scammed_count integer not null check (scammed_count >= 0),
  stats jsonb not null check (jsonb_typeof(stats) = 'object'),
  progression jsonb not null default '{}'::jsonb check (jsonb_typeof(progression) = 'object'),
  blocktown_answers jsonb not null default '[]'::jsonb check (jsonb_typeof(blocktown_answers) = 'array'),
  updated_at timestamptz not null default now()
);
comment on table public.v003_player_data is 'Personal client-reported statistics backup; not verified leaderboard scores. History is stored inside stats.history.';
alter table public.v003_player_data enable row level security;
revoke all on public.v003_player_data from public, anon, authenticated;
grant select on public.v003_player_data to authenticated;
drop policy if exists v003_read_own on public.v003_player_data;
create policy v003_read_own on public.v003_player_data for select to authenticated
  using (player_id = (select auth.uid()));

create or replace function public.save_v003_player_data(
  p_stats jsonb, p_progression jsonb default '{}'::jsonb,
  p_blocktown_answers jsonb default '[]'::jsonb, p_expected_revision bigint default 0
) returns public.v003_player_data
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  saved public.v003_player_data;
  current_revision bigint;
  mission bigint; mini bigint;
  safest integer; low_safety integer; risky integer; scammed integer;
begin
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Google/account sign-in required' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if p_stats is null or jsonb_typeof(p_stats) <> 'object'
     or jsonb_typeof(p_stats->'history') is distinct from 'array'
     or jsonb_typeof(p_stats->'counts') is distinct from 'object'
     or p_progression is null or jsonb_typeof(p_progression) <> 'object'
     or p_blocktown_answers is null or jsonb_typeof(p_blocktown_answers) <> 'array' then
    raise exception 'Invalid data structure';
  end if;
  if octet_length(p_stats::text) > 2097152 or octet_length(p_progression::text) > 65536
     or jsonb_array_length(p_blocktown_answers) > 5 then raise exception 'Payload too large'; end if;
  if exists (select 1 from jsonb_array_elements(p_blocktown_answers) a where a not in ('0'::jsonb,'1'::jsonb)) then raise exception 'Invalid BlockTown answers'; end if;
  if exists (select 1 from jsonb_array_elements(p_stats->'history') a where jsonb_typeof(a) <> 'object') then raise exception 'Invalid history'; end if;
  if exists (select 1 from (values (p_stats->'missionScore'),(p_stats->'minigameScore'),(p_stats->'totalScore'),
    (p_stats->'counts'->'safest'),(p_stats->'counts'->'low_safety'),(p_stats->'counts'->'risky'),(p_stats->'counts'->'scammed')) v(n)
    where jsonb_typeof(n) is distinct from 'number' or n::text !~ '^-?[0-9]+$') then raise exception 'Scores/counts must be integers'; end if;
  mission := (p_stats->>'missionScore')::bigint; mini := (p_stats->>'minigameScore')::bigint;
  safest := (p_stats->'counts'->>'safest')::integer; low_safety := (p_stats->'counts'->>'low_safety')::integer;
  risky := (p_stats->'counts'->>'risky')::integer; scammed := (p_stats->'counts'->>'scammed')::integer;
  if mini < 0 or least(safest,low_safety,risky,scammed) < 0 or mission+mini <> (p_stats->>'totalScore')::bigint then raise exception 'Inconsistent statistics'; end if;
  -- Serialize saves for one player, including simultaneous first inserts.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 3003));
  select revision into current_revision from public.v003_player_data where player_id=uid;
  if coalesce(current_revision,0) <> p_expected_revision then
    raise exception 'Revision conflict: reload cloud data before saving' using errcode = '40001';
  end if;
  insert into public.v003_player_data as existing
    (player_id,revision,mission_score,minigame_score,safest_count,low_safety_count,risky_count,scammed_count,stats,progression,blocktown_answers)
  values (uid,1,mission,mini,safest,low_safety,risky,scammed,p_stats,p_progression,p_blocktown_answers)
  on conflict (player_id) do update set
    revision=existing.revision+1,mission_score=excluded.mission_score,minigame_score=excluded.minigame_score,
    safest_count=excluded.safest_count,low_safety_count=excluded.low_safety_count,risky_count=excluded.risky_count,
    scammed_count=excluded.scammed_count,stats=excluded.stats,progression=excluded.progression,
    blocktown_answers=excluded.blocktown_answers,updated_at=now()
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.save_v003_player_data(jsonb,jsonb,jsonb,bigint) from public, anon;
grant execute on function public.save_v003_player_data(jsonb,jsonb,jsonb,bigint) to authenticated;
commit;
