(() => {
 'use strict';
 const rootURL=new URL('../',document.currentScript.src),core=window.ZTMiniGameCore;
 const registry={
  'color-sort-puzzle':{title:'Color Sort Puzzle',icon:'🧪',description:'เรียงของเหลวสีเดียวกันให้ครบหลอด · ผ่านด่านสะสมรางวัล 5 / 10 / 20 คะแนน'},
  'thai-checkers':{title:'หมากฮอสไทย',icon:'♟',description:'ดวลกับ AI · ชนะ +50 แพ้ลดสูงสุด 20 คะแนนมินิเกม โดยยอดไม่ต่ำกว่า 0'}
 };
 let current=null,generation=0,guestChosen=false,overlay,back,pause,status,frame,focus,wasMusic=false;
 function scope(){const state=window.ZeroTrustCloudSync?.getState();const account=window.ZeroTrustAuth?.getUser();if(guestChosen||state?.guestMode||!account||account.is_anonymous)return 'guest';if(!state?.ready||state.userId!==account.id)throw Error('กรุณาเปิดสถิติแล้วเลือกข้อมูลในเครื่องหรือออนไลน์ให้เรียบร้อยก่อนเล่นสะสมคะแนน');return account.id;}
 function text(value){status.textContent=value;}
 function send(type,payload={},eventId=crypto.randomUUID()){
  if(!current||!frame?.contentWindow)return;frame.contentWindow.postMessage({channel:'zt-minigame',version:1,type,gameId:current.gameId,sessionId:current.sessionId,runId:current.runId,eventId,payload},current.origin);
 }
 function close(){
  if(current){send('stop');clearTimeout(current.timer);}generation++;current=null;overlay.hidden=true;
  frame?.remove();frame=null;pause.textContent='พัก';focus?.focus({preventScroll:true});if(wasMusic)window.SoundManager?.playBGM?.();
 }
 function paused(){if(!current)return;current.paused=true;send('pause');pause.textContent='เล่นต่อ';}
 function resume(){if(!current||document.hidden)return;current.paused=false;send('resume');pause.textContent='พัก';}
 async function open(id,button){
  if(current)close();focus=button;overlay.hidden=false;overlay.querySelector('strong').textContent=registry[id].title;back.focus({preventScroll:true});
  try{
   const owner=scope();if(!core||!window.PlayerStatsManager)throw Error('ระบบคะแนนยังไม่พร้อม');
   window.TetrisEngine?.stopGame?.();wasMusic=!!window.SoundManager?._bgmPlaying;window.SoundManager?.pauseBGM?.();
   const entry=new URL('Mini-Games/'+id+'/index.html',rootURL);entry.searchParams.set('hostOrigin',location.origin);
   const token=++generation;current={gameId:id,sessionId:crypto.randomUUID(),runId:crypto.randomUUID(),origin:entry.origin,owner,paused:false,ready:false,finished:false,token};
   text('กำลังเปิดเกม…');frame=document.createElement('iframe');frame.title=registry[id].title;frame.allow='autoplay; fullscreen';frame.setAttribute('allowfullscreen','');frame.src=entry.href;overlay.append(frame);
   current.timer=setTimeout(()=>{if(current?.token===token&&!current.ready)text('ยังเชื่อมเกมไม่ได้ ตรวจว่าอัปโหลดโฟลเดอร์ '+id+' ครบ แล้วกดกลับเพื่อเปิดใหม่');},15000);
  }catch(error){text(error.message);}
 }
 async function receive(event){
  if(!current||event.source!==frame?.contentWindow||event.origin!==current.origin)return;
  const m=event.data;if(!m||m.channel!=='zt-minigame'||m.version!==1||m.gameId!==current.gameId)return;
  if(m.type==='ready'){current.ready=true;clearTimeout(current.timer);send('init',{locale:'th',host:'simulation',gameTitle:registry[current.gameId].title});if(current.paused||document.hidden)paused();if(!current.finished)text('คะแนนรอบนี้จะบันทึกเมื่อจบเกม · กลับก่อนจบจะไม่เพิ่มคะแนน');return;}
  if(m.sessionId!==current.sessionId||m.runId!==current.runId)return;
  if(m.type==='replay-request'){if(!current.finished){text('รอส่งผลรอบเดิมให้สำเร็จก่อนเล่นใหม่');return;}current.runId=crypto.randomUUID();current.finished=false;current.paused=false;pause.textContent='พัก';send('init',{locale:'th',host:'simulation'});text('เริ่มรอบใหม่แล้ว');return;}
  if(m.type!=='result')return;
  const reason=core.validate(m,current);if(reason){send('ack',{status:'rejected',reason},m.eventId);text('ผลการเล่นไม่ผ่านการตรวจ: '+reason);return;}
  const token=current.token;
  const accept=()=>{
   if(!current||current.token!==token||current.runId!==m.runId||scope()!==current.owner)throw Error('ACCOUNT_OR_SESSION_CHANGED');
   const manager=window.PlayerStatsManager;
   const receipt=core.commit({storage:localStorage,loadStats:()=>manager.loadStats(),update:stats=>{manager.updateUI(stats);window.ServerRankingManager?.updateRankingData?.();}},m);
   current.finished=true;
   text('บันทึกในเครื่องแล้ว '+(receipt.awardedPoints>=0?'+':'')+receipt.awardedPoints+' คะแนน'+(current.owner==='guest'?' · Guest ยังไม่บันทึกออนไลน์':' · กำลังรอระบบซิงก์ออนไลน์'));
   send('ack',receipt,m.eventId);
   window.dispatchEvent(new CustomEvent('zerotrust:minigame:result',{detail:{gameId:m.gameId,runId:m.runId,points:receipt.awardedPoints}}));
  };
  try{if(navigator.locks?.request)await navigator.locks.request('zerotrust-external-minigame-score',accept);else accept();}
  catch(error){if(current?.token===token&&current.runId===m.runId){send('ack',{status:'rejected',reason:error.message},m.eventId);text('ยังบันทึกผลไม่ได้: '+error.message);}}
 }
 function mount(){
  const phone=document.querySelector('.phone-screen'),list=document.querySelector('.minigame-list-section');if(!phone||!list||!core)return;
  const cards=document.createElement('div');cards.className='external-game-list';
  for(const [id,game] of Object.entries(registry)){
   const card=document.createElement('article');card.className='external-game-card';const icon=document.createElement('span');icon.className='external-game-icon';icon.textContent=game.icon;const heading=document.createElement('h3');heading.textContent=game.title;const description=document.createElement('p');description.textContent=game.description;const button=document.createElement('button');button.type='button';button.textContent='▶ เล่น '+game.title;button.onclick=()=>open(id,button);card.append(icon,heading,description,button);cards.append(card);
  }list.prepend(cards);
  const oldCaption=document.querySelector('.item-minigame .sb-sub');if(oldCaption)oldCaption.textContent='Tetris · Color Sort · หมากฮอสไทย';
  overlay=document.createElement('section');overlay.className='external-game-screen';overlay.hidden=true;overlay.setAttribute('aria-label','หน้ามินิเกม');const bar=document.createElement('header');bar.className='external-game-bar';back=document.createElement('button');back.type='button';back.textContent='‹ คลังเกม';back.onclick=close;const title=document.createElement('strong');pause=document.createElement('button');pause.type='button';pause.textContent='พัก';pause.onclick=()=>current?.paused?resume():paused();bar.append(back,title,pause);status=document.createElement('div');status.className='external-game-status';status.setAttribute('role','status');overlay.append(bar,status);phone.append(overlay);
  window.addEventListener('message',receive);document.addEventListener('visibilitychange',()=>{if(document.hidden)paused();});
  window.addEventListener('zerotrust:auth:changed',()=>{if(current)close();guestChosen=false;});
  document.getElementById('loginGuestBtn')?.addEventListener('click',()=>{if(current)close();guestChosen=true;});
  window.addEventListener('zerotrust:cloud:saved',event=>{if(current?.finished&&event.detail?.externalRuns?.includes(current.runId))text('บันทึกคะแนนรอบนี้ออนไลน์แล้ว ✓');});
  window.addEventListener('storage',event=>{if(current&&['zt_v003_owner','zerotrust_player_stats_v1'].includes(event.key))close();});
  document.addEventListener('keydown',event=>{if(!overlay.hidden&&event.key==='Escape'){event.preventDefault();close();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
