begin;
create or replace function public.v003_my_ranking() returns jsonb
language sql stable security definer set search_path='' as $$
 with mine as (select * from public.v003_player_data where player_id=auth.uid()),
 totals as(select count(*) as players from public.v003_player_data)
 select case when auth.uid() is null then null else
 jsonb_build_object('players',t.players,'saved',exists(select 1 from mine),
 'rank',(select 1+count(*) from public.v003_player_data s where s.total_score>(select total_score from mine)),
 'lower_players',(select count(*) from public.v003_player_data s where s.total_score<(select total_score from mine)),
 'total_score',(select total_score from mine),'mission_score',(select mission_score from mine),
 'minigame_score',(select minigame_score from mine),'updated_at',(select updated_at from mine)) end
 from totals t;
$$;
revoke all on function public.v003_my_ranking() from public,anon;
grant execute on function public.v003_my_ranking() to authenticated;
commit;
