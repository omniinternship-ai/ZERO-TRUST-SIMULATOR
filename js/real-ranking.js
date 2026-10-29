(() => {
'use strict';
const $=id=>document.getElementById(id),fmt=n=>Number(n).toLocaleString('th-TH',{maximumFractionDigits:1});
let cache=null,last=0,busy=false,sequence=0,controller;
const text=(id,value)=>{if($(id))$(id).textContent=value;};
async function rpc(name,signal,token){const c=window.SUPABASE_CONFIG;if(!c?.url||!c.publishableKey)throw Error('ไม่พบการตั้งค่า Supabase');const headers={apikey:c.publishableKey,'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;const response=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{method:'POST',headers,body:'{}',signal,cache:'no-store'});const data=await response.json();if(!response.ok){const e=new Error(data.message||'HTTP '+response.status);e.code=data.code;throw e;}return data;}
function render(data){
 const global=data?.global,me=data?.me;const summary=global?.summary;
 text('rankingPlayerCount',summary?fmt(summary.players)+' บัญชีที่มีสถิติใน Supabase':'ยังโหลดจำนวนผู้เล่นไม่ได้');
 text('rankingAverage',summary&&Number(summary.players)>0?fmt(summary.average_score)+' คะแนน':'—');
 const saved=!!me?.saved;for(const [id,key] of [['playerRankMissionVal','mission_score'],['playerRankMinigameVal','minigame_score'],['playerRankTotalVal','total_score']])text(id,saved?fmt(me[key]):'—');
 text('playerRankNumber',saved?'#'+fmt(me.rank):'—');
 const name=document.querySelector('.rpc-player-name');if(name)name.textContent=window.ZeroTrustProfile?.get()?.display_name||'โปรไฟล์ของคุณ';
 text('statsPercentileBanner',saved&&Number(me.players)>0?'คะแนนที่บันทึกของคุณสูงกว่า '+fmt(Number(me.lower_players)/Number(me.players)*100)+'% ของบัญชีทั้งหมด':window.ZeroTrustAuth?.getUser()?'ยังไม่มีอันดับที่ยืนยันได้ • ต้องบันทึกคะแนนและติดตั้ง real-ranking.sql':'เข้าสู่ระบบและซิงก์คะแนนเพื่อดูอันดับของคุณ');
 text('comparePlayerScoreVal',saved?fmt(me.total_score)+' คะแนน (ออนไลน์)':'ยังไม่มีคะแนนออนไลน์');
 const maximum=Math.max(1,Number(saved?me.total_score:0),Number(summary?.average_score||0));
 if($('comparePlayerBarFill'))$('comparePlayerBarFill').style.width=saved?Math.max(0,Number(me.total_score)/maximum*100)+'%':'0%';
 if($('rankingAverageBar'))$('rankingAverageBar').style.width=summary?Math.max(0,Number(summary.average_score||0)/maximum*100)+'%':'0%';
 const list=$('serverRankingList');if(!list)return;list.replaceChildren();
 function row(rank,name,detail,score){const div=document.createElement('div');div.className='ranking-item';const left=document.createElement('div');left.className='ri-left';const number=document.createElement('span');number.className='ri-rank';number.textContent='#'+fmt(rank);const body=document.createElement('div');body.className='ri-name-group';const title=document.createElement('span');title.className='ri-name';title.textContent=name;const sub=document.createElement('span');sub.className='ri-title';sub.textContent=detail;body.append(title,sub);left.append(number,body);const val=document.createElement('strong');val.className='ri-score';val.textContent=fmt(score);div.append(left,val);list.append(div);}
 const groups=global?.ranking||[];for(const r of groups)row(r.rank,'กลุ่มคะแนน '+fmt(r.total_score),'ผู้เล่น '+fmt(r.players)+' บัญชี'+(Number(r.players)>1?' · อันดับร่วม':''),r.total_score);
 if(data?.profiles?.length){const heading=document.createElement('p');heading.textContent='โปรไฟล์ที่ยินยอมเผยแพร่';list.append(heading);for(const p of data.profiles)row(p.rank,p.display_name,[p.province,p.region].filter(Boolean).join(' · ')||'ไม่เผยแพร่พื้นที่',p.total_score);}
 if(!groups.length){const p=document.createElement('p');p.textContent=summary?'ยังไม่มีผู้เล่นบันทึกคะแนน':'ยังโหลดอันดับออนไลน์ไม่ได้';list.append(p);}
}
async function refresh(force=false){
 if(cache)render(cache);else render(null);
 if(busy||(!force&&Date.now()-last<30000))return;
 busy=true;const ticket=++sequence;controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);text('realRankingStatus','กำลังโหลดอันดับจาก Supabase…');
 try{
  const current=window.ZeroTrustAuth?.getUser();const id=current?.id;
  const globalPromise=rpc('atlas_global_summary',controller.signal),profilesPromise=rpc('atlas_public_profiles',controller.signal);
  const ownPromise=(async()=>{if(!current||current.is_anonymous)return null;const session=await window.ZeroTrustAuth.getClient().auth.getSession();if(session.error)throw session.error;if(!session.data.session?.access_token)return null;return rpc('v003_my_ranking',controller.signal,session.data.session.access_token);})();
  const results=await Promise.allSettled([globalPromise,profilesPromise,ownPromise]);if(ticket!==sequence||id!==window.ZeroTrustAuth?.getUser()?.id)return;
  if(results[0].status==='rejected')throw results[0].reason;
  cache={global:results[0].value,profiles:results[1].status==='fulfilled'?results[1].value:[],me:results[2].status==='fulfilled'?results[2].value:null};last=Date.now();render(cache);
  text('realRankingStatus',results[2].status==='rejected'?'โหลดอันดับรวมแล้ว • อันดับส่วนตัวโหลดไม่ได้ ตรวจการติดตั้ง real-ranking.sql':'ข้อมูลจริงจาก Supabase • อันดับใช้คะแนนที่บันทึกแล้ว');
 }catch(error){if(ticket===sequence){last=Date.now();text('realRankingStatus',(error.name==='AbortError'?'หมดเวลารอ Supabase':error.message)+(cache?' • แสดงข้อมูลครั้งล่าสุด':' • ไม่ใช้รายชื่อหรือคะแนนสมมติ'));}}
 finally{clearTimeout(timer);if(ticket===sequence)busy=false;}
}
window.ZeroTrustRanking=Object.freeze({refresh});
function invalidate(){sequence++;controller?.abort();busy=false;cache=null;last=0;setTimeout(()=>refresh(true),0);}
function mount(){if($('refreshRealRanking'))$('refreshRealRanking').onclick=()=>refresh(true);window.addEventListener('zerotrust:auth:changed',invalidate);window.addEventListener('zerotrust:profile:changed',()=>{if(cache)render(cache);});window.addEventListener('zerotrust:cloud:saved',()=>{last=0;refresh(true);});render(null);refresh();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
