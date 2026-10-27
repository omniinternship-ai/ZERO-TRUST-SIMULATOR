(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const config = window.SUPABASE_CONFIG;
 if (!config?.url || !config.publishableKey || !window.supabase) return;
 const client = window.supabase.createClient(config.url, config.publishableKey, {auth:{storageKey:'zt-player-auth'}});
 for (const avatar of ['🦊','🐱','🐼','🐯','🐸','🤖','🐨','🦁']) { const option=document.createElement('option'); option.value=avatar; option.textContent=avatar; $('avatar').append(option); }
 async function loadBoard() {
  $('reloadBoard').disabled=true;
  try {
   const {data,error}=await client.rpc('player_leaderboard');
   if(error) throw error;
   $('boardRows').replaceChildren();
   for (const player of data) {
    const tr=document.createElement('tr');
    if(player.is_me){tr.style.background='#164e49';tr.setAttribute('aria-label','คะแนนของคุณ');}
    for(const text of [player.rank,`${player.avatar} ${player.display_name}${player.is_me?' (คุณ)':''}`,`${player.score}/10`]) {
     const td=document.createElement('td');td.textContent=text;tr.append(td);
    }
    $('boardRows').append(tr);
   }
   const mine=data.find(row=>row.is_me);
   $('myScore').textContent=mine?`คะแนนของคุณ ${mine.score}/10 • อันดับ ${mine.rank}`:'ยังไม่มีคะแนนของคุณบนบอร์ด: ตั้งโปรไฟล์ เปิดแสดงบนบอร์ด แล้วเล่นให้ครบ 10 ข้อในเบราว์เซอร์นี้';
   $('boardStatus').textContent=data.length?'100 อันดับแรก พร้อมอันดับของคุณ • คะแนนเท่ากันได้อันดับเดียวกัน':'ยังไม่มีผู้เล่นแสดงคะแนนบนบอร์ด';
  }catch(error){$('boardStatus').textContent=error.code==='PGRST202'?'กำลังเตรียมฐานข้อมูลบอร์ดคะแนน กรุณาตั้งค่า leaderboard.sql ใน Supabase':`โหลดบอร์ดไม่ได้: ${error.message}`;}
  finally{$('reloadBoard').disabled=false;}
 }
 async function loadProfile(){
  const {data,error}=await client.auth.getSession();if(error||!data.session)return;
  const result=await client.from('player_profiles').select('display_name,avatar,listed').eq('user_id',data.session.user.id).maybeSingle();
  if(result.data){$('nickname').value=result.data.display_name;$('avatar').value=result.data.avatar;$('listed').checked=result.data.listed;}
 }
 $('profileForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;
  try{
   const name=$('nickname').value.trim();if(!name||name.length>30)throw new Error('ชื่อเล่นต้องมี 1–30 ตัวอักษร');
   let session=await client.auth.getSession();if(session.error)throw session.error;
   if(!session.data.session){const login=await client.auth.signInAnonymously();if(login.error)throw login.error;session=await client.auth.getSession();}
   const {error}=await client.from('player_profiles').upsert({user_id:session.data.session.user.id,display_name:name,avatar:$('avatar').value,listed:$('listed').checked});
   if(error)throw error;
   $('profileStatus').textContent='บันทึกโปรไฟล์แล้ว';await loadBoard();
  }catch(error){$('profileStatus').textContent=`บันทึกไม่ได้: ${error.message}`;}finally{button.disabled=false;}
 });
 $('reloadBoard').addEventListener('click',loadBoard);
 client.auth.onAuthStateChange(()=>{setTimeout(()=>{loadProfile();loadBoard();},0);});
 loadProfile();loadBoard();
})();
