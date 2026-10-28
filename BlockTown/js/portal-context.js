(() => {
'use strict';
if(new URLSearchParams(location.search).get('host')!=='v003')return;
const returnUrl=new URL('../ZERO TRUST SIMULATOR.V0.0.3/ZERO TRUST SIMULATOR/index.html',location.href);
document.querySelectorAll('a[href]').forEach(link=>{const url=new URL(link.getAttribute('href'),location.href);if(url.origin!==location.origin)return;const name=url.pathname.split('/').pop();if(['menu.html','game.html','simulator.html'].includes(name)){url.searchParams.set('host','v003');link.href=url.href;}else if(name==='index.html'){link.href=returnUrl.href;link.textContent='← กลับหน้ามือถือ';link.addEventListener('click',event=>{if(window.parent!==window){event.preventDefault();window.parent.postMessage({type:'blocktown:close'},location.origin);}});}});
})();
