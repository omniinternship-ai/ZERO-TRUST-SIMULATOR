(() => {
'use strict';
const phone=document.querySelector('.phone-screen');if(!phone)return;
const base=new URL('../',document.currentScript.src);
const nested=decodeURIComponent(base.pathname).includes('/ZERO TRUST SIMULATOR.V0.0.3/');
const url=new URL((nested?'../../':'')+'Short-Series/index.html?embed=simulation',base);
const screen=document.createElement('section');screen.className='blocktown-app shot-app';screen.hidden=true;screen.setAttribute('aria-label','แอป Shot Series');
const bar=document.createElement('header');bar.className='blocktown-app-bar';bar.style.background='#211c40';
const back=document.createElement('button');back.type='button';back.textContent='‹ หน้ามือถือ';
const title=document.createElement('strong');title.textContent='SHOT · ซีรีส์';
const reload=document.createElement('button');reload.type='button';reload.textContent='↻';reload.setAttribute('aria-label','โหลดซีรีส์ใหม่');
const status=document.createElement('div');status.className='blocktown-app-error';status.setAttribute('role','status');status.hidden=true;
const frame=document.createElement('iframe');frame.title='SHOT ซีรีส์แนวตั้ง';frame.allow='autoplay; fullscreen; picture-in-picture';frame.setAttribute('allowfullscreen','');
bar.append(back,title,reload);screen.append(bar,status,frame);phone.append(screen);
let focus=null,request=0;
async function load(){const ticket=++request;status.hidden=false;status.textContent='กำลังเปิดซีรีส์…';frame.hidden=true;
 if(location.protocol==='file:'){frame.src=url.href;frame.hidden=false;status.hidden=true;return;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error();if(ticket!==request||screen.hidden)return;frame.src=url.href;frame.hidden=false;status.hidden=true;}
 catch(_){if(ticket===request&&!screen.hidden)status.textContent='เปิดซีรีส์ไม่ได้ กรุณาอัปโหลดโฟลเดอร์ Short-Series ไว้ที่ราก repository แล้วกด ↻ ลองใหม่';}
 finally{clearTimeout(timer);}
}
function close(){++request;screen.hidden=true;frame.src='about:blank';focus?.focus({preventScroll:true});}
back.onclick=close;reload.onclick=load;
document.addEventListener('click',event=>{const icon=event.target.closest('[data-app-id="shot-series"]');if(!icon)return;event.preventDefault();event.stopImmediatePropagation();focus=icon;screen.hidden=false;back.focus({preventScroll:true});load();},{capture:true});
document.addEventListener('keydown',event=>{if(!screen.hidden&&event.key==='Escape'){event.preventDefault();close();}});
window.SimulationShot=Object.freeze({close});
})();
