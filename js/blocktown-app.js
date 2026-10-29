(() => {
'use strict';
const phone=document.querySelector('.phone-screen');if(!phone)return;
const app=document.createElement('section');app.className='blocktown-app';app.id='blocktownApp';app.hidden=true;app.setAttribute('aria-label','แอป BlockTown');
const bar=document.createElement('div');bar.className='blocktown-app-bar';
const close=document.createElement('button');close.type='button';close.textContent='← หน้ามือถือ';
const label=document.createElement('strong');label.textContent='BlockTown 3D';
const full=document.createElement('a');const scriptBase=new URL('../',document.currentScript?.src||new URL('js/blocktown-app.js',location.href).href);const nested=decodeURIComponent(scriptBase.pathname).includes('/ZERO TRUST SIMULATOR.V0.0.3/');const url=new URL((nested?'../../':'')+'BlockTown/menu.html?host=v003',scriptBase);full.href=url.href;full.target='_blank';full.rel='noopener';full.textContent='เต็มจอ ↗';
const error=document.createElement('div');error.className='blocktown-app-error';error.hidden=true;error.setAttribute('role','status');
const frame=document.createElement('iframe');frame.title='เกม BlockTown ในมือถือ V0.0.3';frame.allow='fullscreen';bar.append(close,label,full);app.append(bar,error,frame);phone.append(app);
let previousFocus=null;
function hide(){app.hidden=true;frame.hidden=false;error.hidden=true;frame.src='about:blank';previousFocus?.focus({preventScroll:true});}
async function open(button){previousFocus=button;app.hidden=false;error.hidden=true;frame.hidden=false;close.focus({preventScroll:true});if(location.protocol==='file:'){frame.src=url.href;return;}const control=new AbortController(),timer=setTimeout(()=>control.abort(),6000);try{const res=await fetch(url,{cache:'no-store',signal:control.signal});if(!res.ok)throw new Error('missing game');if(!app.hidden)frame.src=url.href;}catch(_){if(!app.hidden){frame.hidden=true;error.hidden=false;error.textContent=location.hostname==='127.0.0.1'||location.hostname==='localhost'?'เปิดเกมไม่ได้ ตรวจว่าเซิร์ฟเวอร์ทำงานและมีโฟลเดอร์ BlockTown':'เปิดเกมไม่ได้ ตรวจว่าอัปโหลดโฟลเดอร์ BlockTown ที่ราก repository แล้ว: '+url.pathname;}}finally{clearTimeout(timer);}}
close.onclick=hide;
document.addEventListener('click',event=>{const icon=event.target.closest('[data-app-id="blocktown"]');if(icon){event.preventDefault();event.stopImmediatePropagation();open(icon);}},{capture:true});
window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.origin!==location.origin)return;if(event.data?.type==='blocktown:close')hide();});
function sendProfile(){const p=window.ZeroTrustProfile?.get();frame.contentWindow?.postMessage({type:'blocktown:profile',profile:p?{display_name:p.display_name,province:p.province,region:p.region}:null},location.origin);}
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='blocktown:profile-request')sendProfile();});
window.addEventListener('zerotrust:profile:changed',sendProfile);
window.BlockTownV03=Object.freeze({close:hide});
})();
