(() => {
'use strict';
if(new URLSearchParams(location.search).get('host')!=='v003')return;
window.addEventListener('message',event=>{if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='blocktown:profile')return;const p=event.data.profile;window.BlockTownPlayerProfile=p&&typeof p.display_name==='string'?p:null;let label=document.getElementById('blocktownPlayerName');if(!label){label=document.createElement('p');label.id='blocktownPlayerName';label.style.cssText='font-size:13px;margin:8px 0;color:#31584b';(document.querySelector('.hud-card')||document.querySelector('main'))?.prepend(label);}label.textContent=p&&typeof p.display_name==='string'?'ผู้เล่น: '+p.display_name:'';});
if(window.parent!==window)window.parent.postMessage({type:'blocktown:profile-request'},location.origin);
const returnUrl=new URL('../ZERO TRUST SIMULATOR.V0.0.3/ZERO TRUST SIMULATOR/index.html',location.href);
document.querySelectorAll('a[href]').forEach(link=>{const url=new URL(link.getAttribute('href'),location.href);if(url.origin!==location.origin)return;const name=url.pathname.split('/').pop();if(['menu.html','game.html','simulator.html'].includes(name)){url.searchParams.set('host','v003');link.href=url.href;}else if(name==='index.html'){link.href=returnUrl.href;link.textContent='← กลับหน้ามือถือ';link.addEventListener('click',event=>{if(window.parent!==window){event.preventDefault();window.parent.postMessage({type:'blocktown:close'},location.origin);}});}});
})();
