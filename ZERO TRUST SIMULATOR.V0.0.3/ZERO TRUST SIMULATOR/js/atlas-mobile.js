(() => {
'use strict';
function mount(){
 const trigger=document.getElementById('openPlayerAtlas'),phone=document.querySelector('.phone-screen');if(!trigger||!phone)return;
 const screen=document.createElement('section');screen.id='playerAtlasScreen';screen.className='atlas-mobile-screen';screen.hidden=true;screen.setAttribute('role','region');screen.setAttribute('aria-label','แผนที่ผู้เล่นประเทศไทย');
 const header=document.createElement('header');header.className='atlas-mobile-bar';
 const back=document.createElement('button');back.type='button';back.textContent='‹ กลับหน้าสถิติ';
 const title=document.createElement('strong');title.textContent='แผนที่ผู้เล่น';
 const reload=document.createElement('button');reload.type='button';reload.textContent='↻';reload.setAttribute('aria-label','โหลดแผนที่ใหม่');header.append(back,title,reload);
 const status=document.createElement('p');status.className='atlas-mobile-status';status.setAttribute('role','status');
 const frame=document.createElement('iframe');frame.title='Player Atlas แผนที่ผู้เล่นประเทศไทย';frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.referrerPolicy='strict-origin-when-cross-origin';
 screen.append(header,status,frame);phone.append(screen);
 let timer=null,opened=false;const url='https://omniinternship-ai.github.io/Player-Atlas/?embed=simulation';
 function clear(){if(timer)clearTimeout(timer);timer=null;}
 function load(){clear();status.hidden=false;status.textContent='กำลังเปิดแผนที่…';frame.src=url;timer=setTimeout(()=>{if(opened){status.hidden=false;status.textContent='หากแผนที่ยังไม่ขึ้น กด ↻ เพื่อลองใหม่ หรือกดกลับหน้าสถิติ';}},15000);}
 function open(event){event?.preventDefault();opened=true;screen.hidden=false;load();back.focus({preventScroll:true});}
 function close(){opened=false;clear();screen.hidden=true;frame.src='about:blank';trigger.focus({preventScroll:true});}
 frame.onload=()=>{if(opened){clear();status.hidden=true;}};back.onclick=close;reload.onclick=load;
 trigger.addEventListener('click',open);trigger.removeAttribute('target');trigger.removeAttribute('rel');trigger.setAttribute('aria-label','เปิดแผนที่ผู้เล่นประเทศไทยภายในมือถือ');
 document.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();close();}});
 window.SimulationAtlas=Object.freeze({open,close});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
