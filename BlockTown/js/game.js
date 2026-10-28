(() => {
'use strict';
const KEY = 'zerotrust_blocktown_v1';
const stages = [
 {tag:'ข้อเสนอสุดคุ้ม',title:'เพชรเยอะขนาดนี้… จริงหรือ?',speech:'เติม 99 ได้เพชร 9,999! สนใจไหม?',story:'คุณอยากได้ปีกหายากในเกม คนแปลกหน้าชื่อ DiamondKing เสนอแพ็กเพชรราคาถูกมาก และส่งภาพรีวิวว่ามีคนซื้อแล้ว',choices:['ขอตรวจราคาและช่องทางเติมเงินในร้านทางการก่อน','รีบซื้อเลย คนอื่นก็ซื้อกันเยอะ'],safe:0,lesson:'ภาพรีวิวและยอดคนซื้อปลอมได้ ตรวจสอบผ่านร้านทางการที่เปิดเอง และคุยกับผู้ปกครองก่อนซื้อเสมอ'},
 {tag:'เร่งให้ตัดสินใจ',title:'“เหลือสิทธิ์สุดท้าย โอนตอนนี้!”',speech:'เหลือแค่คุณ! โอน 99 ภายใน 2 นาที!',story:'เขาส่งเลขบัญชีส่วนตัวและบอกว่าต้องโอนทันที ถ้าออกจากแชตจะเสียสิทธิ์ บัญชีผู้รับไม่ใช่ชื่อผู้ให้บริการเกม',choices:['โอน 99 บาทจำลองเพื่อจองสิทธิ์','หยุดคุยและขอให้ผู้ปกครองช่วยตรวจสอบ'],safe:1,cost:99,lesson:'การเร่งเวลาเป็นวิธีกดดันให้เราไม่ทันตรวจสอบ ไม่ต้องรีบโอน เงินจำลองที่หักในเกมนี้ใช้แสดงผลของการตัดสินใจเท่านั้น'},
 {tag:'ลิงก์รับรางวัล',title:'เว็บหน้าตาคุ้น… แต่ใครเป็นคนส่ง?',speech:'เข้าเว็บนี้ แล้วล็อกอินรับเพชรได้เลย!',story:'DiamondKing ส่งลิงก์หน้าตาเหมือนหน้าเกม ขอชื่อบัญชีและรหัสผ่านเพื่อส่งเพชรเข้าบัญชีให้คุณ',choices:['ไม่กรอกข้อมูล เปิดแอปทางการด้วยตัวเอง','ใช้รหัสผ่านเกมล็อกอินตามลิงก์'],safe:0,lesson:'เว็บปลอมอาจเลียนแบบหน้าจอเกมได้ อย่ากรอกรหัสผ่านผ่านลิงก์จากคนแปลกหน้า ให้เข้าแอปหรือเว็บไซต์ทางการด้วยตัวเอง'},
 {tag:'รหัสลับส่วนตัว',title:'OTP ไม่ใช่ตั๋วรับไอเทม',speech:'ขอ OTP หน่อย ระบบต้องยืนยันก่อนส่งของ',story:'เขาบอกว่าเป็นทีมงาน และขอรหัส OTP ที่ส่งเข้ามือถือ โดยกำชับว่าอย่าบอกผู้ปกครอง เพราะจะทำให้รับรางวัลไม่ได้',choices:['บอกรหัส เพราะเขาอ้างว่าเป็นทีมงาน','ไม่ส่งรหัส และบอกผู้ปกครองทันที'],safe:1,lesson:'อย่าให้ OTP หรือรหัสผ่านกับคนที่ติดต่อมาขอ แม้อ้างว่าเป็นทีมงาน การขอให้ปิดบังผู้ปกครองเป็นอีกสัญญาณอันตราย'},
 {tag:'หยุดวงจรการหลอก',title:'“เติมเพิ่ม แล้วจะคืนทั้งหมด”',speech:'จ่ายค่าปลดล็อกเพิ่ม 199 แล้วจะคืนเงินให้!',story:'ยังไม่ได้ไอเทม แต่เขาขอค่าปลดล็อกเพิ่มอีก หากเคยส่งเงินหรือข้อมูลไปแล้ว คุณยังหยุดและขอความช่วยเหลือได้ คุณไม่จำเป็นต้องจัดการคนเดียว',choices:['เก็บหลักฐาน บล็อก/รายงาน และขอผู้ปกครองช่วย','จ่ายเพิ่ม 199 บาทจำลอง หวังได้เงินคืน'],safe:0,cost:199,lesson:'หยุดส่งเงิน เก็บแชตและหลักฐาน แล้วให้ผู้ปกครองช่วยติดต่อช่องทางทางการของเกมและผู้ให้บริการชำระเงิน หากเผลอให้รหัสผ่าน ให้เปลี่ยนผ่านช่องทางทางการโดยเร็ว การถูกหลอกไม่ใช่ความผิดของเด็ก'}
];
let answers=[];
try {const saved=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(saved)&&saved.length<=stages.length&&saved.every((v,i)=>Number.isInteger(v)&&v>=0&&v<stages[i].choices.length)) answers=saved;} catch (_) {}
const el=id=>document.getElementById(id);
let index=answers.length;
const dialogue=window.BlockTownDialogue;
function say(speaker,text,anchor='npc'){if(dialogue)dialogue.show([{speaker,text,anchor}]);}
const npcLines=[
 'อยากได้ปีกหายากไหม? เติมแค่ 99 บาท ได้เพชร 9,999! ดูสิ มีรีวิวจากคนซื้อเพียบเลยนะ สนใจไหม?',
 'เหลือสิทธิ์สุดท้ายแล้ว! โอน 99 บาทเข้าบัญชีส่วนตัวที่ฉันส่งให้ ภายใน 2 นาที ถ้าออกจากแชตจะเสียสิทธิ์นะ!',
 'เข้าเว็บตามลิงก์ที่ฉันส่งให้เลย หน้าตาเหมือนเกมใช่ไหม? กรอกชื่อบัญชีกับรหัสผ่าน แล้วฉันจะส่งเพชรให้!',
 'ฉันเป็นทีมงานนะ! ขอ OTP ที่ส่งเข้ามือถือหน่อย จะได้ยืนยันรับไอเทม อย่าบอกผู้ปกครองล่ะ เดี๋ยวรับรางวัลไม่ได้!',
 'ยังไม่ได้ของเหรอ? ต้องจ่ายค่าปลดล็อกอีก 199 บาทก่อน แล้วฉันจะคืนเงินทั้งหมดให้ เชื่อฉันสิ!'
];
function balance(){return 300-answers.reduce((sum,a,i)=>sum+(a!==stages[i].safe?(stages[i].cost||0):0),0);}
function score(){return answers.reduce((sum,a,i)=>sum+Number(a===stages[i].safe),0);}
function emit(type,detail){window.dispatchEvent(new CustomEvent('zerotrust:game:'+type,{detail:{version:1,scenarioId:'blocktown-topup-v1',...detail}}));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(answers));}catch(_){el('feedback').append(' (บันทึกไม่ได้ในเบราว์เซอร์นี้ เล่นต่อได้จนกว่าจะปิดหน้า)');}}
function render(){
 el('wallet').textContent='◈ '+balance()+' บาทจำลอง';
 el('feedback').hidden=true;el('next').hidden=true;el('choices').replaceChildren();el('choices').hidden=true;
 el('bar').style.width=(Math.min(index+1,5)*20)+'%';
 if(index>=stages.length){
 el('progress').textContent='05 / 05';el('tag').textContent='ภารกิจสำเร็จ';el('title').textContent='คุณฝึกครบแล้ว! 🛡';dialogue.show([{speaker:'คุณ / ผู้เล่น',text:'หยุดคิด ตรวจสอบ และขอความช่วยเหลือ! ฉันฝึกครบแล้ว คราวหน้าจะไม่รีบเติมเงินตามคนแปลกหน้า',anchor:'player'}],()=>{el('story').hidden=false;el('feedback').hidden=false;el('choices').hidden=false;});
 el('story').hidden=true;el('story').textContent='ตัดสินใจปลอดภัย '+score()+' / 5 ครั้ง · เงินจำลองคงเหลือ '+balance()+' บาท ทุกครั้งที่พลาดคือโอกาสฝึก ไม่ใช่ความผิดของคุณ';
 el('feedback').hidden=true;el('feedback').className='feedback';el('feedback').textContent='จำไว้: ซื้อผ่านร้านทางการ ไม่ส่งรหัสลับ ไม่โอนตามแรงกดดัน และบอกผู้ใหญ่ที่ไว้ใจได้';
 const review=document.createElement('div');answers.forEach((a,i)=>{const p=document.createElement('p');p.textContent=(i+1)+'. '+(a===stages[i].safe?'✓ ':'↻ ')+stages[i].lesson;review.append(p);});el('choices').append(review);return;
 }
 const s=stages[index];el('progress').textContent=String(index+1).padStart(2,'0')+' / 05';el('tag').textContent='ด่าน '+String(index+1).padStart(2,'0')+' · '+s.tag;el('title').textContent=s.title;el('story').textContent='';el('story').hidden=true;dialogue.show([{speaker:'DiamondKing / คนแปลกหน้า',text:npcLines[index],anchor:'npc'}],()=>{el('choices').hidden=false;});
 s.choices.forEach((text,a)=>{const b=document.createElement('button');b.textContent=String.fromCharCode(65+a)+'  '+text;b.onclick=()=>choose(a,b);el('choices').append(b);});
}
function choose(a,b){if(answers.length!==index)return;const s=stages[index];answers.push(a);el('choices').querySelectorAll('button').forEach(button=>button.disabled=true);b.classList.add('selected');const safe=a===s.safe;el('choices').hidden=true;el('feedback').hidden=true;el('feedback').textContent='';
if(dialogue)dialogue.show([{speaker:'คุณ / ผู้เล่น',text:s.choices[a],anchor:'player'},{speaker:'คุณ / ผู้เล่น · บทเรียน',text:(safe?'ฉันเลือกอย่างปลอดภัย! ':'ครั้งหน้าฉันจะระวังให้มากขึ้น: ')+s.lesson,anchor:'player'}],()=>{el('next').hidden=false;el('dialogueHint').textContent='กด E / แตะ เพื่อไปต่อ';});persist();el('wallet').textContent='◈ '+balance()+' บาทจำลอง';el('next').hidden=true;el('next').textContent=index===4?'ดูสรุปภารกิจ →':'ไปเหตุการณ์ถัดไป →';emit('decision',{stage:index+1,choice:a,safe});if(answers.length===5)emit('complete',getResult());el('dialogueAdvance').focus({preventScroll:true});}
function getResult(){return {scenarioId:'blocktown-topup-v1',version:1,complete:answers.length===5,score:score(),maxScore:5,balance:balance(),answers:[...answers]};}
el('next').onclick=()=>{index=answers.length;render();el('dialogueAdvance').focus({preventScroll:true});};
function restartGame(){
if(!window.confirm('เล่นใหม่? คะแนน คำตอบ และความคืบหน้าของเกมนี้จะถูกรีเซ็ต'))return;
answers=[];index=0;
dialogue.setProximity(Infinity);
persist();render();
el('resetCamera').click();
el('restartTop').focus({preventScroll:true});
emit('restart',{});
}
el('restart').onclick=restartGame;
el('restartTop').onclick=restartGame;
// Read-only integration contract. Future adapters can subscribe without collecting chat or credentials.
window.ZeroTrustGame=Object.freeze({version:1,getResult});
render();emit('ready',{resumed:answers.length>0});
})();
