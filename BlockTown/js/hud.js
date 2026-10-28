(() => {
'use strict';
const hud=document.getElementById('gameHud'),toggle=hud.querySelector('summary');
function close(focus=false){hud.open=false;if(focus)toggle.focus({preventScroll:true});}
document.getElementById('closeHud').onclick=()=>close(true);
document.getElementById('shopGuide').onclick=()=>{close();window.dispatchEvent(new CustomEvent('zerotrust:visit-shop'));};
document.getElementById('farmGuide').onclick=()=>{close();window.dispatchEvent(new CustomEvent('zerotrust:visit-farm'));};
document.getElementById('hudResetCamera').onclick=()=>{document.getElementById('resetCamera').click();close();};
hud.addEventListener('toggle',()=>{toggle.setAttribute('aria-expanded',String(hud.open));window.dispatchEvent(new CustomEvent('zerotrust:hud',{detail:{open:hud.open}}));});
document.addEventListener('pointerdown',e=>{if(hud.open&&!hud.contains(e.target))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&hud.open){e.preventDefault();close(true);}});
document.getElementById('restartTop').addEventListener('click',()=>close());
})();
