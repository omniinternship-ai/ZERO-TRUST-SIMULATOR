(() => {
 'use strict';
 const viewer=document.getElementById('viewer');
 const button=document.createElement('button');button.className='video-comment-button';button.type='button';button.setAttribute('aria-label','เปิดความคิดเห็น');
 button.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h16a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H14l-7 5v-5a5 5 0 0 1-4-5V10a5 5 0 0 1 5-5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg><span>0</span>';
 viewer.querySelector('.portrait-view').append(button);
 const sheet=document.createElement('dialog');sheet.id='commentSheet';sheet.setAttribute('aria-labelledby','commentTitle');
 sheet.innerHTML='<div class="comment-handle"></div><header><h2 id="commentTitle">ความคิดเห็น <span id="commentTotal">0</span></h2><button type="button" class="comment-close" aria-label="ปิดความคิดเห็น">✕</button></header><p class="comment-note">ความคิดเห็นในอุปกรณ์นี้ · แยกตามตอน</p><div class="comment-list" aria-live="polite"></div><form class="comment-form"><label for="commentText">เพิ่มความคิดเห็น</label><div><textarea id="commentText" maxlength="500" rows="2" placeholder="แบ่งปันความคิดเห็นของคุณ…" required></textarea><button type="submit">ส่ง</button></div><p role="status" class="comment-status"></p></form>';
 document.body.append(sheet);let key='',rows=[];
 const count=()=>{button.querySelector('span').textContent=rows.length;sheet.querySelector('#commentTotal').textContent=rows.length;};
 function read(){key=viewer.dataset.commentKey||document.getElementById('viewerTitle').textContent+'|'+document.getElementById('viewerEpisode').textContent;rows=[];try{const data=JSON.parse(localStorage.getItem('shot_comments_v1:'+key)||'[]');if(Array.isArray(data))rows=data.filter(x=>typeof x.text==='string'&&typeof x.at==='number').slice(-200);}catch(_){}count();}
 function render(){const list=sheet.querySelector('.comment-list');list.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='comment-empty';p.textContent='ยังไม่มีความคิดเห็น มาเริ่มคุยกันเลย';list.append(p);}for(const row of rows){const item=document.createElement('article'),name=document.createElement('strong'),text=document.createElement('p'),time=document.createElement('small');name.textContent='คุณ';text.textContent=row.text;time.textContent=new Date(row.at).toLocaleString('th-TH');item.append(name,text,time);list.append(item);}count();}
 button.onclick=()=>{read();render();sheet.querySelector('.comment-status').textContent='';sheet.showModal();};
 sheet.querySelector('.comment-close').onclick=()=>sheet.close();sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)sheet.close();}});
 sheet.addEventListener('close',()=>{if(viewer.open)button.focus({preventScroll:true});});
 sheet.querySelector('form').onsubmit=e=>{e.preventDefault();const input=sheet.querySelector('textarea'),text=input.value.trim();if(!text)return;const next=[...rows,{text:text.slice(0,500),at:Date.now()}].slice(-200);try{localStorage.setItem('shot_comments_v1:'+key,JSON.stringify(next));rows=next;input.value='';render();sheet.querySelector('.comment-status').textContent='บันทึกความคิดเห็นในอุปกรณ์นี้แล้ว';sheet.querySelector('.comment-list').scrollTop=1e9;}catch(_){sheet.querySelector('.comment-status').textContent='บันทึกไม่ได้ พื้นที่จัดเก็บไม่พร้อม กรุณาลองใหม่';}};
 new MutationObserver(()=>{if(sheet.open)sheet.close();read();}).observe(document.getElementById('viewerEpisode'),{childList:true,subtree:true,characterData:true});
 window.addEventListener('shot:episode',()=>{if(sheet.open)sheet.close();read();});viewer.addEventListener('close',()=>{if(sheet.open)sheet.close();});read();
})();
