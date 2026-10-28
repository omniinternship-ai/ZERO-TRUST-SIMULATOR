(() => {
'use strict';
const bubble=document.getElementById('speech'),text=document.getElementById('dialogueText'),speaker=document.getElementById('speaker'),hint=document.getElementById('dialogueHint'),accessible=document.getElementById('dialogueAccessible');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let timer=null,queue=[],page=0,letters=[],position=0,onDone=null,anchor='npc',opened=false,proximity=Infinity,inView=true;
const split=value=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(value)].map(x=>x.segment):Array.from(value);
function stop(){clearTimeout(timer);timer=null;}
function complete(){stop();position=letters.length;text.textContent=letters.join('');bubble.classList.remove('typing');hint.textContent=page<queue.length-1?'กด E / แตะ เพื่ออ่านต่อ':'เลือกคำตอบในบอลลูนนี้';if(page===queue.length-1&&onDone){const fn=onDone;onDone=null;fn();}}
function tick(){if(!opened||bubble.hidden){stop();return;}position++;text.textContent=letters.slice(0,position).join('');if(position>=letters.length){complete();return;}timer=setTimeout(tick,/[.!?…ๆ]/.test(letters[position-1])?140:26);}
function render(){stop();const entry=queue[page];anchor=entry.anchor||'npc';bubble.dataset.anchor=anchor;speaker.textContent=entry.speaker;speaker.dataset.kind=anchor;letters=split(entry.text);position=0;text.textContent='';accessible.textContent=entry.speaker+' พูดว่า '+entry.text;bubble.classList.add('typing');hint.textContent='กด E / แตะ เพื่อแสดงข้อความทั้งหมด';if(opened&&!bubble.hidden){if(reduced.matches)complete();else tick();}}
function show(entries,callback){stop();queue=entries.flatMap(entry=>{const chars=split(entry.text),pages=[];for(let i=0;i<chars.length;i+=100)pages.push({...entry,text:chars.slice(i,i+100).join('')});return pages;});page=0;onDone=callback||null;if(!queue.length)return;bubble.hidden=!opened;render();}
function advance(){if(position<letters.length){complete();return;}if(page<queue.length-1){page++;render();}}
function interact(){
if(!opened){if(proximity>4.2||!inView)return false;opened=true;bubble.hidden=false;if(position<letters.length){if(reduced.matches)complete();else tick();}return true;}
if(proximity>=6||!inView)return false;
const next=document.getElementById('next');if(next&&!next.hidden){next.click();return;}advance();}
document.getElementById('dialogueAdvance').addEventListener('click',interact);
document.addEventListener('keydown',e=>{
if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable=true],#gameHud,dialog'))return;
if(e.code==='KeyE'||e.key.toLowerCase()==='e'){e.preventDefault();interact();}
});
function setProximity(value,visible=true){
proximity=value;inView=visible;
if(proximity>=6){opened=false;}
const hidden=!opened||!inView;
if(hidden&&!bubble.hidden){stop();if(bubble.contains(document.activeElement)){document.getElementById('viewport').focus({preventScroll:true});}}
const wasHidden=bubble.hidden;bubble.hidden=hidden;
if(wasHidden&&!hidden&&position<letters.length){if(reduced.matches)complete();else tick();}
}
bubble.hidden=true;
window.BlockTownDialogue=Object.freeze({show,setProximity,isOpen:()=>opened,advance:interact,getAnchor:()=>anchor,isTyping:()=>position<letters.length});
window.addEventListener('pagehide',stop);
})();
