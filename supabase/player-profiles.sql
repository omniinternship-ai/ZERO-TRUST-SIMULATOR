-- Additive profile migration; legacy player_profiles remains unchanged.
begin;
create table if not exists public.v003_provinces(code text primary key,name text not null,region text not null);
insert into public.v003_provinces(code,name,region) values
('50','เชียงใหม่','ภาคเหนือ'),
('51','ลำพูน','ภาคเหนือ'),
('52','ลำปาง','ภาคเหนือ'),
('53','อุตรดิตถ์','ภาคเหนือ'),
('54','แพร่','ภาคเหนือ'),
('55','น่าน','ภาคเหนือ'),
('56','พะเยา','ภาคเหนือ'),
('57','เชียงราย','ภาคเหนือ'),
('58','แม่ฮ่องสอน','ภาคเหนือ'),
('30','นครราชสีมา','ภาคตะวันออกเฉียงเหนือ'),
('31','บุรีรัมย์','ภาคตะวันออกเฉียงเหนือ'),
('32','สุรินทร์','ภาคตะวันออกเฉียงเหนือ'),
('33','ศรีสะเกษ','ภาคตะวันออกเฉียงเหนือ'),
('34','อุบลราชธานี','ภาคตะวันออกเฉียงเหนือ'),
('35','ยโสธร','ภาคตะวันออกเฉียงเหนือ'),
('36','ชัยภูมิ','ภาคตะวันออกเฉียงเหนือ'),
('37','อำนาจเจริญ','ภาคตะวันออกเฉียงเหนือ'),
('38','บึงกาฬ','ภาคตะวันออกเฉียงเหนือ'),
('39','หนองบัวลำภู','ภาคตะวันออกเฉียงเหนือ'),
('40','ขอนแก่น','ภาคตะวันออกเฉียงเหนือ'),
('41','อุดรธานี','ภาคตะวันออกเฉียงเหนือ'),
('42','เลย','ภาคตะวันออกเฉียงเหนือ'),
('43','หนองคาย','ภาคตะวันออกเฉียงเหนือ'),
('44','มหาสารคาม','ภาคตะวันออกเฉียงเหนือ'),
('45','ร้อยเอ็ด','ภาคตะวันออกเฉียงเหนือ'),
('46','กาฬสินธุ์','ภาคตะวันออกเฉียงเหนือ'),
('47','สกลนคร','ภาคตะวันออกเฉียงเหนือ'),
('48','นครพนม','ภาคตะวันออกเฉียงเหนือ'),
('49','มุกดาหาร','ภาคตะวันออกเฉียงเหนือ'),
('10','กรุงเทพมหานคร','ภาคกลาง'),
('11','สมุทรปราการ','ภาคกลาง'),
('12','นนทบุรี','ภาคกลาง'),
('13','ปทุมธานี','ภาคกลาง'),
('14','พระนครศรีอยุธยา','ภาคกลาง'),
('15','อ่างทอง','ภาคกลาง'),
('16','ลพบุรี','ภาคกลาง'),
('17','สิงห์บุรี','ภาคกลาง'),
('18','ชัยนาท','ภาคกลาง'),
('19','สระบุรี','ภาคกลาง'),
('26','นครนายก','ภาคกลาง'),
('60','นครสวรรค์','ภาคกลาง'),
('61','อุทัยธานี','ภาคกลาง'),
('62','กำแพงเพชร','ภาคกลาง'),
('64','สุโขทัย','ภาคกลาง'),
('65','พิษณุโลก','ภาคกลาง'),
('66','พิจิตร','ภาคกลาง'),
('67','เพชรบูรณ์','ภาคกลาง'),
('72','สุพรรณบุรี','ภาคกลาง'),
('73','นครปฐม','ภาคกลาง'),
('74','สมุทรสาคร','ภาคกลาง'),
('75','สมุทรสงคราม','ภาคกลาง'),
('20','ชลบุรี','ภาคตะวันออก'),
('21','ระยอง','ภาคตะวันออก'),
('22','จันทบุรี','ภาคตะวันออก'),
('23','ตราด','ภาคตะวันออก'),
('24','ฉะเชิงเทรา','ภาคตะวันออก'),
('25','ปราจีนบุรี','ภาคตะวันออก'),
('27','สระแก้ว','ภาคตะวันออก'),
('63','ตาก','ภาคตะวันตก'),
('70','ราชบุรี','ภาคตะวันตก'),
('71','กาญจนบุรี','ภาคตะวันตก'),
('76','เพชรบุรี','ภาคตะวันตก'),
('77','ประจวบคีรีขันธ์','ภาคตะวันตก'),
('80','นครศรีธรรมราช','ภาคใต้'),
('81','กระบี่','ภาคใต้'),
('82','พังงา','ภาคใต้'),
('83','ภูเก็ต','ภาคใต้'),
('84','สุราษฎร์ธานี','ภาคใต้'),
('85','ระนอง','ภาคใต้'),
('86','ชุมพร','ภาคใต้'),
('90','สงขลา','ภาคใต้'),
('91','สตูล','ภาคใต้'),
('92','ตรัง','ภาคใต้'),
('93','พัทลุง','ภาคใต้'),
('94','ปัตตานี','ภาคใต้'),
('95','ยะลา','ภาคใต้'),
('96','นราธิวาส','ภาคใต้')
on conflict(code) do update set name=excluded.name,region=excluded.region;
alter table public.v003_provinces enable row level security;
revoke all on public.v003_provinces from public,anon,authenticated;
grant select on public.v003_provinces to authenticated;
drop policy if exists v003_province_read on public.v003_provinces;
create policy v003_province_read on public.v003_provinces for select to authenticated using(true);
create table if not exists public.v003_player_profiles(
 player_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 2 and 40),
 province_code text references public.v003_provinces(code),
 share_name boolean not null default false,
 share_area boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not share_area or province_code is not null)
);
alter table public.v003_player_profiles enable row level security;
revoke all on public.v003_player_profiles from public,anon,authenticated;
grant select on public.v003_player_profiles to authenticated;
drop policy if exists v003_own_profile on public.v003_player_profiles;
create policy v003_own_profile on public.v003_player_profiles for select to authenticated using(player_id=(select auth.uid()));
create or replace function public.save_v003_profile(p_name text,p_province text,p_share_name boolean,p_share_area boolean)
returns public.v003_player_profiles language plpgsql security definer set search_path='' as $$
declare saved public.v003_player_profiles;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Account sign-in required';end if;
 if p_name is null or char_length(btrim(p_name)) not between 2 and 40 or p_name ~ '[[:cntrl:]]' then raise exception 'Name must be 2-40 characters without control characters';end if;
 if p_share_name is null or p_share_area is null then raise exception 'Consent fields required';end if;
 if p_share_area and nullif(p_province,'') is null then raise exception 'Province required to share area';end if;
 insert into public.v003_player_profiles(player_id,display_name,province_code,share_name,share_area)
 values(auth.uid(),btrim(p_name),nullif(p_province,''),p_share_name,p_share_area)
 on conflict(player_id) do update set display_name=excluded.display_name,province_code=excluded.province_code,share_name=excluded.share_name,share_area=excluded.share_area,updated_at=now()
 returning * into saved;
 return saved;
end;$$;
revoke all on function public.save_v003_profile(text,text,boolean,boolean) from public,anon;
grant execute on function public.save_v003_profile(text,text,boolean,boolean) to authenticated;
-- Public data is opt-in. No IDs, email or answer history are returned.
create or replace function public.atlas_public_profiles()
returns table(rank bigint,display_name text,province text,region text,total_score bigint)
language sql stable security definer set search_path='' as $$
 with ranked as(select player_id,total_score,rank() over(order by total_score desc) as position from public.v003_player_data)
 select r.position,p.display_name,case when p.share_area then c.name else null end,
 case when p.share_area then c.region else null end,r.total_score
 from ranked r join public.v003_player_profiles p on p.player_id=r.player_id
 left join public.v003_provinces c on c.code=p.province_code
 where p.share_name order by r.total_score desc,p.display_name limit 100;
$$;
revoke all on function public.atlas_public_profiles() from public;
grant execute on function public.atlas_public_profiles() to anon,authenticated;
commit;
