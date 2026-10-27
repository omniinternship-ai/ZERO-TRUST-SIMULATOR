-- Run in Supabase SQL Editor. Safe to rerun.
create table if not exists public.score_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.score_admins enable row level security;
revoke all on public.score_admins from anon, authenticated;
grant select on public.score_admins to authenticated;
drop policy if exists own_admin_membership on public.score_admins;
create policy own_admin_membership on public.score_admins for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.game_results (
  id uuid primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null default 'kai-v1' check (scenario = 'kai-v1'),
  score smallint not null check (score between 0 and 10),
  answers jsonb not null,
  completed_at timestamptz not null default now(),
  unique (player_id, scenario)
);
create index if not exists game_results_completed_idx on public.game_results(completed_at desc);
alter table public.game_results enable row level security;
revoke all on public.game_results from anon, authenticated;
grant select on public.game_results to authenticated;
drop policy if exists admins_read_results on public.game_results;
create policy admins_read_results on public.game_results for select to authenticated
using (exists (select 1 from public.score_admins where user_id = (select auth.uid())));

create or replace function public.submit_result(p_id uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  calculated_score integer;
  answer_key text[] := array['B','A','A','A','B','A','A','A','A','A'];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_id is null or jsonb_typeof(p_answers) is distinct from 'array' then raise exception 'Invalid answers'; end if;
  if jsonb_array_length(p_answers) <> 10 then raise exception 'Ten answers required'; end if;
  if exists (select 1 from jsonb_array_elements(p_answers) a
    where jsonb_typeof(a->'stage') is distinct from 'number'
      or (a->>'stage') !~ '^[0-9]$'
      or a->>'choice' is null or a->>'choice' not in ('A','B','C')) then
    raise exception 'Invalid answer format';
  end if;
  if (select count(distinct a->>'stage') from jsonb_array_elements(p_answers) a) <> 10 then raise exception 'Duplicate stages'; end if;
  select count(*) into calculated_score from jsonb_array_elements(p_answers) a
    where a->>'choice' = answer_key[(a->>'stage')::integer + 1];
  insert into public.game_results(id, player_id, score, answers)
    values (p_id, auth.uid(), calculated_score, p_answers)
    on conflict (player_id, scenario) do nothing;
end;
$$;
revoke all on function public.submit_result(uuid,jsonb) from public, anon;
grant execute on function public.submit_result(uuid,jsonb) to authenticated;
