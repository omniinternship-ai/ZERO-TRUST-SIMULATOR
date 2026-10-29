(() => {
  'use strict';
  const KEYS=['zerotrust_player_stats_v1','zerotrust_quest_progression_v2','zerotrust_blocktown_v1'];
  let userId=null, generation=0, revision=0, baseline='', ready=false, busy=false, pending=null;
  let status, panel, guestMode=false;
  const encode=s=>JSON.stringify(s,(_key,value)=>value && typeof value==='object' && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])) : value);
  function message(text){if(status)status.textContent=text;}
  function backup(id){try{localStorage.setItem('zt_v003_backup_'+(id||'guest'),encode(window.ZeroTrustCloudData.snapshot()));}catch(_){}}
  function apply(data){
    backup(userId);
    const values=[data.stats,data.progression,data.blocktown_answers];
    // Keep a full recovery copy before replacing the three local records.
    localStorage.setItem('zt_v003_before_cloud_restore',encode(KEYS.map(k=>localStorage.getItem(k))));
    KEYS.forEach((k,i)=>localStorage.setItem(k,encode(values[i])));
    localStorage.setItem('zt_v003_owner',userId);
    location.reload();
  }
  function choice(remote, token){
    ready=false;pending=remote;
    panel.replaceChildren();panel.hidden=false;
    const text=document.createElement('p');text.textContent=remote?'พบบันทึกออนไลน์ เลือกข้อมูลที่จะใช้ก่อนเปิดซิงก์อัตโนมัติ':'บัญชีนี้ยังไม่มีบันทึกออนไลน์ ต้องการนำสถิติในเครื่องเข้าบัญชีนี้หรือไม่?';
    panel.append(text);
    function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:10px;margin:4px;border:2px solid #14b8a6;border-radius:8px;background:#102c37;color:white;cursor:pointer';b.onclick=()=>{if(token===generation)action();};panel.append(b);}
    if(remote)button('ใช้ข้อมูลออนไลน์ (โหลดหน้าใหม่)',()=>apply(remote));
    button(remote?'ใช้ข้อมูลในเครื่องแทนออนไลน์':'บันทึกข้อมูลในเครื่องเข้าบัญชีนี้',()=>{
      revision=remote?.revision||0;baseline='';ready=true;panel.hidden=true;
      localStorage.setItem('zt_v003_owner',userId);flush();
    });
    button('ยังไม่ซิงก์',()=>{panel.hidden=true;message('ยังไม่ซิงก์ • ข้อมูลเก็บในเครื่อง');});
    message('รอเลือกข้อมูล • เปิดตัวเลือกที่หน้า Start Game');
  }
  async function connect(user){
    const next=user&&!user.is_anonymous?user.id:null;
    if(next===userId)return;
    backup(userId);userId=next;const token=++generation;ready=false;baseline='';panel.hidden=true;
    if(!next){message('Guest • เก็บข้อมูลในเครื่อง');return;}
    message('กำลังโหลดสถิติออนไลน์…');
    const atStart=encode(window.ZeroTrustCloudData.snapshot());
    try{
      const remote=await window.ZeroTrustCloudData.load();if(token!==generation)return;
      const owner=localStorage.getItem('zt_v003_owner');
      if(remote && owner===next && encode({stats:remote.stats,progression:remote.progression,blocktownAnswers:remote.blocktown_answers})===atStart){revision=remote.revision;baseline=atStart;ready=true;message('ซิงก์แล้ว');return;}
      choice(remote,token);
    }catch(error){if(token===generation)message('โหลดออนไลน์ไม่ได้ • '+error.message+' • กดเชื่อมต่อใหม่');}
  }
  async function flush(){
    if(!ready||busy||!userId)return;
    const token=generation;const snapshot=window.ZeroTrustCloudData.snapshot(), serialized=encode(snapshot);
    if(serialized===baseline)return;
    busy=true;message('กำลังบันทึกสถิติ…');
    try{
      const saved=await window.ZeroTrustCloudData.save(snapshot,revision);
      if(token!==generation)return;
      revision=saved.revision;baseline=serialized;backup(userId);message('บันทึกออนไลน์แล้ว ✓');window.dispatchEvent(new CustomEvent('zerotrust:cloud:saved'));
    }catch(error){
      if(token!==generation)return;
      if(error.code==='40001'){ready=false;message('ข้อมูลออนไลน์เปลี่ยนจากอีกอุปกรณ์ กรุณาเชื่อมต่อใหม่เพื่อเลือกข้อมูล');}
      else message('ยังบันทึกไม่ได้ • เก็บข้อมูลในเครื่องไว้แล้ว • '+error.message);
    }finally{busy=false;}
  }
  function mount(){
    const box=document.createElement('div');box.style.cssText='padding:8px;font-size:14px;line-height:1.5';
    status=document.createElement('p');status.setAttribute('role','status');
    const retry=document.createElement('button');retry.type='button';retry.textContent='เชื่อมต่อสถิติ / เลือกข้อมูล';retry.style.cssText='border:2px solid #14b8a6;border-radius:8px;padding:8px;cursor:pointer';
    retry.onclick=()=>{if(busy)return;userId=null;connect(window.ZeroTrustAuth?.getUser());};
    box.append(status,retry);document.querySelector('#playerStatsScreen').prepend(box);
    panel=document.createElement('div');panel.style.cssText='padding:12px;border:2px solid #14b8a6;border-radius:12px;background:#10222f;color:white;max-height:240px;overflow:auto';panel.hidden=true;
    document.querySelector('.login-content-box').append(panel);
    // Also make the decision controls reachable while playing.
    retry.onclick=()=>{if(busy)return;guestMode=false;document.querySelector('#playerStatsScreen').prepend(panel);userId=null;connect(window.ZeroTrustAuth?.getUser());};
    document.getElementById('loginGuestBtn').addEventListener('click',()=>{guestMode=true;connect(null);});
    window.addEventListener('zerotrust:auth:changed',e=>{if(!guestMode)connect(e.detail.user);});
    window.addEventListener('online',()=>{if(guestMode)return;if(ready)flush();else{userId=null;connect(window.ZeroTrustAuth?.getUser());}});
    window.addEventListener('storage',e=>{if(KEYS.includes(e.key))flush();});
    window.addEventListener('zerotrust:blocktown:reward',flush);
    setInterval(()=>{flush().catch(e=>message('ข้อมูลยังอยู่ในเครื่อง • '+e.message));},2500);
    message('Guest • เก็บข้อมูลในเครื่อง');connect(window.ZeroTrustAuth?.getUser());
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
