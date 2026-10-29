-- SHOT CMS. Run after signing in at least once with Google.
begin;
create table if not exists public.shorts_admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.shorts_admins enable row level security;
revoke all on public.shorts_admins from public,anon,authenticated;
create or replace function public.is_shorts_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.shorts_admins where user_id=auth.uid());
$$;
revoke all on function public.is_shorts_admin() from public;
grant execute on function public.is_shorts_admin() to anon,authenticated;
create table if not exists public.shorts_series(
 id uuid primary key default gen_random_uuid(),title text not null check(char_length(btrim(title)) between 1 and 120),
 synopsis text not null default '' check(char_length(synopsis)<=4000),genre text not null default 'ดราม่า',
 poster_path text, status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.shorts_episodes(
 id uuid primary key default gen_random_uuid(),series_id uuid not null references public.shorts_series(id) on delete cascade,
 episode_number integer not null check(episode_number between 1 and 9999),title text not null check(char_length(btrim(title)) between 1 and 160),
 synopsis text not null default '' check(char_length(synopsis)<=4000),video_path text not null unique,
 duration_seconds integer not null default 0 check(duration_seconds>=0),
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(series_id,episode_number)
);
create index if not exists shorts_episodes_series_idx on public.shorts_episodes(series_id,episode_number);
alter table public.shorts_series enable row level security;
alter table public.shorts_episodes enable row level security;
revoke all on public.shorts_series,public.shorts_episodes from public,anon,authenticated;
grant select on public.shorts_series,public.shorts_episodes to anon,authenticated;
grant insert,update,delete on public.shorts_series,public.shorts_episodes to authenticated;
drop policy if exists shorts_series_read on public.shorts_series;
create policy shorts_series_read on public.shorts_series for select to anon,authenticated using(status='published' or public.is_shorts_admin());
drop policy if exists shorts_series_admin on public.shorts_series;
create policy shorts_series_admin on public.shorts_series for all to authenticated using(public.is_shorts_admin()) with check(public.is_shorts_admin());
drop policy if exists shorts_episodes_read on public.shorts_episodes;
create policy shorts_episodes_read on public.shorts_episodes for select to anon,authenticated using(public.is_shorts_admin() or (status='published' and exists(select 1 from public.shorts_series s where s.id=series_id and s.status='published')));
drop policy if exists shorts_episodes_admin on public.shorts_episodes;
create policy shorts_episodes_admin on public.shorts_episodes for all to authenticated using(public.is_shorts_admin()) with check(public.is_shorts_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('short-series-media','short-series-media',false,52428800,array['video/mp4','video/webm','image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='short-series-media' and public=true) then
  raise exception 'short-series-media already exists as PUBLIC. Use a new dedicated private bucket before installing.';
 end if;
end $$;
-- Never change visibility of an existing bucket silently.
drop policy if exists shorts_media_read on storage.objects;
create policy shorts_media_read on storage.objects for select to anon,authenticated using(bucket_id='short-series-media' and (
 public.is_shorts_admin() or exists(select 1 from public.shorts_episodes e join public.shorts_series s on s.id=e.series_id where e.video_path=name and e.status='published' and s.status='published')
 or exists(select 1 from public.shorts_series s where s.poster_path=name and s.status='published')));
drop policy if exists shorts_media_insert on storage.objects;
create policy shorts_media_insert on storage.objects for insert to authenticated with check(bucket_id='short-series-media' and public.is_shorts_admin());
drop policy if exists shorts_media_update on storage.objects;
create policy shorts_media_update on storage.objects for update to authenticated using(bucket_id='short-series-media' and public.is_shorts_admin()) with check(bucket_id='short-series-media' and public.is_shorts_admin());
drop policy if exists shorts_media_delete on storage.objects;
create policy shorts_media_delete on storage.objects for delete to authenticated using(bucket_id='short-series-media' and public.is_shorts_admin());
create or replace function public.shorts_validate_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.updated_at=now();
 if tg_table_name='shorts_episodes' then
  if not exists(select 1 from storage.objects where bucket_id='short-series-media' and name=new.video_path) then raise exception 'Upload video before saving episode';end if;
 elsif new.poster_path is not null and not exists(select 1 from storage.objects where bucket_id='short-series-media' and name=new.poster_path) then raise exception 'Poster not uploaded';
 end if;
 return new;
end;$$;
revoke all on function public.shorts_validate_media() from public,anon,authenticated;
drop trigger if exists shorts_validate_series on public.shorts_series;
create trigger shorts_validate_series before insert or update on public.shorts_series for each row execute function public.shorts_validate_media();
drop trigger if exists shorts_validate_episode on public.shorts_episodes;
create trigger shorts_validate_episode before insert or update on public.shorts_episodes for each row execute function public.shorts_validate_media();
commit;
-- Give YOUR account admin rights separately in SQL Editor; never grant all users admin.
-- insert into public.shorts_admins(user_id) select id from auth.users where email='YOUR_GOOGLE_EMAIL' on conflict do nothing;
