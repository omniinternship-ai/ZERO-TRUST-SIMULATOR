(() => {
 'use strict';
 const viewer=document.getElementById('viewer'),video=document.getElementById('episodeVideo');
 const button=document.createElement('button');button.type='button';button.className='viewer-fullscreen';
 button.setAttribute('aria-label','ดูวิดีโอเต็มหน้าจอ');button.textContent='⛶ เต็มจอ';viewer.append(button);
 const message=document.createElement('p');message.className='viewer-screen-status';message.setAttribute('role','status');viewer.append(message);
 let locked=false,pending=false,timer;
 const full=()=>document.fullscreenElement===viewer||document.webkitFullscreenElement===viewer;
 function say(text){message.textContent=text;clearTimeout(timer);timer=setTimeout(()=>message.textContent='',5000);}
 function layout(){
  const w=video.videoWidth,h=video.videoHeight,ratio=w&&h?w/h:9/16;
  viewer.style.setProperty('--video-ratio',String(ratio));viewer.classList.toggle('video-landscape',ratio>1);
 }
 function update(){const on=full()||viewer.classList.contains('expanded-view')||!!video.webkitDisplayingFullscreen;button.textContent=on?'⛶ ออกเต็มจอ':'⛶ เต็มจอ';button.setAttribute('aria-label',on?'ออกจากเต็มหน้าจอ':'ดูวิดีโอเต็มหน้าจอ');button.setAttribute('aria-pressed',String(on));if(!on&&locked){screen.orientation?.unlock?.();locked=false;}}
 async function lockOrientation(){
  if(!full()||!video.videoWidth||!screen.orientation?.lock)return;
  try{await screen.orientation.lock(video.videoWidth>video.videoHeight?'landscape':'portrait');locked=true;}
  catch(_){if(video.videoWidth>video.videoHeight)say('หมุนมือถือเป็นแนวนอนเพื่อขยายภาพ หากไม่หมุนให้เปิดการหมุนหน้าจอ');}
 }
 button.onclick=async()=>{
  if(pending)return;pending=true;button.disabled=true;
  try{
   if(viewer.classList.contains('expanded-view')){viewer.classList.remove('expanded-view');}
   else if(full()){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.();}
   else if(viewer.requestFullscreen){await viewer.requestFullscreen();await lockOrientation();}
   else if(viewer.webkitRequestFullscreen){viewer.webkitRequestFullscreen();}
   else if(video.webkitEnterFullscreen&&!video.hidden){video.webkitEnterFullscreen();}
   else viewer.classList.add('expanded-view');
  }catch(_){viewer.classList.add('expanded-view');say('ขยายเต็มพื้นที่เว็บแล้ว หมุนมือถือเพื่อดูแนวนอน');}
  finally{pending=false;button.disabled=false;update();}
 };
 video.addEventListener('loadedmetadata',()=>{layout();if(full())lockOrientation();});video.addEventListener('emptied',layout);
 document.addEventListener('fullscreenchange',update);document.addEventListener('webkitfullscreenchange',update);
 video.addEventListener('webkitbeginfullscreen',update);video.addEventListener('webkitendfullscreen',update);
 viewer.addEventListener('close',()=>{viewer.classList.remove('expanded-view');update();if(full()){const result=document.exitFullscreen?.();result?.catch(()=>{});}if(locked){screen.orientation?.unlock?.();locked=false;}});
 layout();update();
})();
