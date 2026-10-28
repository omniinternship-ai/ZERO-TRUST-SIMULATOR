(() => {
'use strict';
const el=id=>document.getElementById(id),frame=el('screen');let landscape=false;
function size(){const [a,b]=el('device').value.split(',').map(Number);const width=landscape?b:a,height=landscape?a:b;return {width,height};}
function layout(){const {width,height}=size(),horizontalPadding=landscape?44:24,verticalPadding=landscape?24:44;const outerWidth=width+horizontalPadding,outerHeight=height+verticalPadding;
const availableWidth=Math.max(180,el('stage').clientWidth-40),availableHeight=Math.max(280,window.innerHeight-el('deviceSpace').getBoundingClientRect().top-60);const selected=el('zoom').value;const scale=selected==='fit'?Math.min(1,availableWidth/outerWidth,availableHeight/outerHeight):Number(selected);
frame.style.width=width+'px';frame.style.height=height+'px';el('phone').style.width=outerWidth+'px';el('phone').style.height=outerHeight+'px';el('phone').classList.toggle('landscape',landscape);el('phone').style.transform='scale('+scale+')';el('deviceSpace').style.width=(outerWidth*scale)+'px';el('deviceSpace').style.height=(outerHeight*scale)+'px';el('dimensions').textContent=width+' × '+height;el('orientation').textContent=landscape?'แนวนอน':'แนวตั้ง';el('scaleText').textContent='แสดงผล '+Math.round(scale*100)+'% · พื้นที่เกมจริง '+width+' × '+height+' CSS px';el('rotate').textContent=landscape?'↻ หมุนเป็นแนวตั้ง':'↻ หมุนเป็นแนวนอน';el('rotate').setAttribute('aria-pressed',String(landscape));}
el('rotate').onclick=()=>{landscape=!landscape;layout();el('notice').textContent='หมุนเป็น'+(landscape?'แนวนอน':'แนวตั้ง')+'แล้ว · เกมไม่ถูกโหลดใหม่';};el('device').onchange=layout;el('zoom').onchange=layout;
el('menu').onclick=()=>frame.src='menu.html';el('game').onclick=()=>frame.src='game.html';el('reload').onclick=()=>{try{frame.contentWindow.location.reload();}catch(_){frame.src='menu.html';}};
frame.addEventListener('load',()=>{try{const page=frame.contentWindow.location.pathname.split('/').pop();el('pageName').textContent=page==='game.html'?'เกม 3 มิติ':page==='menu.html'?'เมนู / ตัวละคร':'ระบบหลัก';}catch(_){el('pageName').textContent='หน้าในจอจำลอง';}});
new ResizeObserver(layout).observe(el('stage'));window.addEventListener('resize',layout);layout();
})();
