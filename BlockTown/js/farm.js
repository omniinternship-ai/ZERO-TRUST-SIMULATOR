(() => {
'use strict';
const KEY='zerotrust_farm_v1',GROW_MS=20000;
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.planted)&&v.planted.length===6&&v.planted.every(t=>Number.isFinite(t)&&t>=0&&t<=Date.now())&&Number.isInteger(v.harvested)&&v.harvested>=0)return v;}catch(_){}return {planted:Array(6).fill(0),harvested:0};}
function create({THREE:T,scene,box,sign,obstacles}){
const state=load(),plots=[];
// Wide back lanes remain open on both sides of the town hall.
box(34,.09,6,'#e6d8b5',0,.025,-24);for(const x of [-5.8,5.8])box(3,.09,20,'#e6d8b5',x,.025,-17);
box(30,.08,31,'#c3d591',0,.015,-42);box(34,.1,3,'#e6d8b5',0,.065,-51);box(3,.1,26,'#e6d8b5',-13,.065,-39);
for(const z of [-33,-43])for(const x of [-8,0,8]){const i=plots.length;box(5.7,.22,6,'#9b7952',x,.1,z);box(5.25,.1,5.6,'#6d4e35',x,.24,z);const plants=new T.Group();plants.position.set(x,.3,z);scene.add(plants);for(const dx of [-1.4,1.4])for(const dz of [-1.5,1.5]){box(.15,.8,.15,'#4f8c45',dx,.4,dz,plants);for(const side of [-1,1]){const leaf=box(.7,.2,.32,'#76b34c',dx+side*.25,.65,dz,plants);leaf.rotation.z=side*.3;}box(.32,.38,.32,'#e89a42',dx,.15,dz,plants);}plots.push({x,z,plants});}
// Barn and equipment are solid; the field paths are walkable.
box(9,5,7,'#bc6b52',-23,2.5,-51);box(10,.5,8,'#f1ddb9',-23,5.2,-51);const roofLeft=box(5.6,.25,8.2,'#587d70',-25.3,6.05,-51);roofLeft.rotation.z=.48;const roofRight=box(5.6,.25,8.2,'#587d70',-20.7,6.05,-51);roofRight.rotation.z=-.48;box(3,3.1,.15,'#715643',-23,1.55,-47.4);const barnSign=sign('FARM HOUSE','#fff1cf','#4b6f47',6);barnSign.position.set(-23,4.2,-47.35);scene.add(barnSign);obstacles.push({x:-23,z:-51,w:5,d:4});
for(const x of [-30,18])for(let z=-57;z<=-28;z+=3){box(.22,1.3,.22,'#e5d3a8',x,.65,z);if(z<-28){box(.15,.15,3,'#ebddb9',x,.5,z+1.5);box(.15,.15,3,'#ebddb9',x,1,z+1.5);}}obstacles.push({x:-30,z:-42.5,w:.15,d:15.8},{x:18,z:-42.5,w:.15,d:15.8});
for(const x of [-21,-18]){box(2,1.1,1.4,'#e4bd59',x,.55,-35);box(.12,1.15,1.45,'#ab8c42',x,.55,-35);}box(2.2,1.2,2.2,'#7799a2',11,.6,-55);box(2.35,.2,2.35,'#dce3c8',11,1.3,-55);obstacles.push({x:11,z:-55,w:1.3,d:1.3});
for(const [x,z,label] of [[-5.8,-19,'FARM ↑'],[0,-27,'GARDEN FARM']]){box(.2,2.8,.2,'#9c7953',x,1.4,z);const labelMesh=sign(label,'#f7e8b9','#456b40',4);labelMesh.position.set(x,2.7,z+.13);scene.add(labelMesh);}
let lastUpdate=0,notice='',noticeUntil=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(_){notice='เก็บข้อมูลฟาร์มไม่ได้ในเบราว์เซอร์นี้';noticeUntil=Date.now()+4000;return false;}}
function nearest(position){let result=null,best=3.5;plots.forEach((p,i)=>{const d=Math.hypot(p.x-position.x,p.z-position.z);if(d<best){best=d;result=i;}});return result;}
function prompt(i){if(i===null)return '';const planted=state.planted[i];if(!planted)return 'ปลูกผัก [E]';const remaining=Math.ceil((GROW_MS-(Date.now()-planted))/1000);return remaining>0?'กำลังเติบโต · '+remaining+' วินาที':'เก็บเกี่ยวผัก [E]';}
function act(position){const i=nearest(position);if(i===null)return false;const now=Date.now();if(!state.planted[i]){state.planted[i]=now;notice='ปลูกแล้ว! รอ 20 วินาทีเพื่อเก็บเกี่ยว';}else if(now-state.planted[i]>=GROW_MS){state.planted[i]=0;state.harvested++;notice='เก็บเกี่ยวสำเร็จ · รวม '+state.harvested+' ครั้ง';}else{notice=prompt(i);noticeUntil=now+2000;return true;}noticeUntil=now+3000;save();lastUpdate=0;return true;}
function update(position){const now=Date.now();if(now-lastUpdate>250){plots.forEach((p,i)=>{p.plants.visible=state.planted[i]>0;const age=state.planted[i]?Math.min(1,(now-state.planted[i])/GROW_MS):0;p.plants.scale.setScalar(.25+.75*age);});lastUpdate=now;}const i=nearest(position);return {near:i!==null,label:prompt(i),message:now<noticeUntil?notice:'โซนฟาร์ม · เข้าใกล้แปลงแล้วกด E เพื่อปลูก / เก็บเกี่ยว · เก็บแล้ว '+state.harvested+' ครั้ง',inFarm:position.z<-26};}
return {update,act,nearest};
}
window.BlockTownFarm=Object.freeze({create});
})();
