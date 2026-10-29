(() => {
'use strict';
const config=window.SUPABASE_CONFIG;
const client=config&&window.supabase?window.supabase.createClient(config.url,config.publishableKey,{auth:{storageKey:'zt-player-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}):null;
const BUCKET='short-series-media';
async function signed(path){if(!client)throw Error('โหลด Supabase ไม่สำเร็จ');const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,3600);if(error)throw error;return data.signedUrl;}
async function catalog(){if(!client)throw Error('โหลด Supabase ไม่สำเร็จ');const [s,e]=await Promise.all([client.from('shorts_series').select('*').eq('status','published').order('created_at',{ascending:false}).limit(100),client.from('shorts_episodes').select('id,series_id,episode_number,title,video_path,duration_seconds').eq('status','published').order('episode_number').limit(5000)]);if(s.error)throw s.error;if(e.error)throw e.error;return Promise.all(s.data.map(async(row)=>{let poster='assets/poster-1.svg';if(row.poster_path){try{poster=await signed(row.poster_path);}catch(_){}}const episodes=e.data.filter(x=>x.series_id===row.id);return {id:row.id,title:row.title,synopsis:row.synopsis,genre:row.genre,episodes:episodes.length,episodeList:episodes,poster,tag:episodes.length?'พร้อมรับชม':'เร็ว ๆ นี้',live:true};}));}
window.ShortSeriesAPI=Object.freeze({client,bucket:BUCKET,signed,catalog});
})();
