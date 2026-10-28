(() => {
'use strict';
const host=document.getElementById('viewport'),status=document.getElementById('worldStatus'),talk=document.getElementById('interact');
let renderer;
try {if(!window.THREE)throw new Error('renderer unavailable');renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(error){host.parentElement.classList.add('world-error');status.textContent='เปิดโลก 3 มิติไม่ได้ กรุณาเปิด WebGL หรือใช้เบราว์เซอร์ที่รองรับ กรุณาลองเปิดหน้าเกมใหม่หลังเปิดการรองรับ WebGL';return;}
const T=THREE,scene=new T.Scene();scene.background=new T.Color('#b7e1eb');scene.fog=new T.Fog('#b7e1eb',45,110);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(48,1,.1,160);scene.add(new T.HemisphereLight(0xf7ffff,0x65824c,2.4));const sun=new T.DirectionalLight(0xfff3d5,3);sun.position.set(-9,18,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:.5,far:90});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);scene.add(sun.target);
// Keep the high-resolution shadow volume around the player in every map zone.
function updateSunShadow(){const step=48/2048;const x=Math.round(player.position.x/step)*step,z=Math.round(player.position.z/step)*step;sun.position.set(x-9,18,z+9);sun.target.position.set(x,0,z);sun.target.updateMatrixWorld();}
const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);}
function box(w,h,d,color,x,y,z,parent=scene){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sign(text,bg='#244c3d',fg='#ffffff',w=3){const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,768,192);ctx.fillStyle=fg;ctx.font='bold 62px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,100,730);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));return mesh;}
box(96,.6,112,'#a6c779',0,-.34,-22);box(9,.08,90,'#e6d8b5',0,.01,-20);box(36,.09,5,'#e6d8b5',0,.02,1);
for(let x=-24;x<=24;x+=3)for(let z=-24;z<=24;z+=3){if(Math.abs(x)<5||Math.abs(z-1)<3)continue;box(.07,.02,2.8,'#99bc6c',x,0,z);}
const obstacles=[];
function building(x,z,color,name){box(6,4.2,5,color,x,2.1,z);box(6.5,.5,5.5,'#f9edd2',x,4.45,z);box(6.7,.5,5.7,'#497c77',x,4.85,z);box(1.3,2.4,.15,'#37585c',x,1.2,z+2.55);for(const dx of [-1.85,1.85]){box(1.25,1.5,.14,'#a6e2ed',x+dx,2.2,z+2.57);box(1.5,.12,.3,'#fff0cf',x+dx,1.4,z+2.6);}const s=sign(name,'#fff0cf','#325951',4.6);s.position.set(x,3.65,z+2.6);scene.add(s);obstacles.push({x,z,w:3.4,d:2.9});}
building(-9,-7,'#e8b48b','ITEM SHOP');building(0,-12,'#9dbcb5','BLOCKTOWN');building(9,-7,'#c3afd7','SAFE ZONE');
function tree(x,z){box(.55,2.3,.55,'#9c7754',x,1.1,z);box(2.5,2.3,2.5,'#77a765',x,3,z);box(1.8,1.1,1.8,'#94bc75',x-.2,4.5,z);obstacles.push({x,z,w:.7,d:.7});}
[[-15,-12],[-16,-3],[-13,8],[15,-13],[16,-1],[12,10],[-8,16],[9,18],[-19,14],[19,17]].forEach(p=>tree(...p));
for(const [x,z] of [[-36,-60],[28,-62],[-34,-23],[30,-26],[32,18],[-32,19],[9,-64],[-10,-65]])tree(x,z);
const farm=window.BlockTownFarm.create({THREE:T,scene,box,sign,obstacles});
for(const x of [-5.8,5.8])for(const z of [3,11]){box(.12,3.5,.12,'#526d65',x,1.75,z);box(.65,.55,.65,'#fff2bd',x,3.6,z);}
function avatar(shirt,pants,hair){const g=new T.Group();box(.85,.95,.48,shirt,0,1.62,0,g);box(.66,.65,.62,'#f5c996',0,2.47,0,g);box(.72,.18,.68,hair,0,2.86,0,g);box(.18,.4,.65,hair,-.29,2.65,-.02,g);const limbs=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.62,2.03,0);box(.32,.58,.4,shirt,0,-.28,0,arm);box(.31,.35,.39,'#f5c996',0,-.74,0,arm);g.add(arm);const leg=new T.Group();leg.position.set(side*.23,1.12,0);box(.36,.83,.43,pants,0,-.42,0,leg);box(.39,.22,.64,'#f6f4e6',0,-.87,.09,leg);g.add(leg);limbs.push({arm,leg,side});}for(const x of [-.15,.15])box(.065,.08,.025,'#293d42',x,2.49,.322,g);box(.18,.035,.025,'#8c5948',0,2.32,.325,g);scene.add(g);g.userData.limbs=limbs;return g;}
const player=window.BlockTownAvatar.create(window.BlockTownAvatar.load());scene.add(player);player.position.set(0,0,8);const npc=avatar('#9c74d7','#444e76','#8055ad');npc.position.set(3.4,0,0);npc.rotation.y=.5;const name=sign('DiamondKing','#7357a2','#ffffff',2.5);name.position.set(0,3.5,0);npc.add(name);
const ring=new T.Mesh(new T.TorusGeometry(1.4,.045,8,64),mat('#f4d56a'));ring.rotation.x=-Math.PI/2;ring.position.set(3.4,.1,0);scene.add(ring);
const gem=new T.Mesh(new T.OctahedronGeometry(.42),new T.MeshStandardMaterial({color:'#9bf5ef',metalness:.3,roughness:.15}));gem.position.set(3.4,4.3,0);scene.add(gem);
const island=box(3,.5,3,'#dcc9a4',-3,.25,0);const prize=new T.Mesh(new T.IcosahedronGeometry(.65,0),mat('#f4ce67'));prize.position.set(-3,1.8,0);scene.add(prize);
let hudOpen=false;window.addEventListener('zerotrust:hud',e=>{hudOpen=e.detail.open;keys.clear();});
const keys=new Set();let yaw=0,pitch=.57,distance=16,drag=null,near=false,lost=false,shopModal=false;
const shop=window.BlockTownShop.create({THREE:T,scene,box,sign,obstacles,player});
window.addEventListener('zerotrust:shop-enter',()=>{player.position.set(80,0,0);yaw=0;pitch=.5;distance=14;keys.clear();window.BlockTownDialogue?.setProximity(Infinity);document.getElementById('exitShop').hidden=false;});
window.addEventListener('zerotrust:shop-leave',()=>{player.position.set(-9,0,-2.8);yaw=0;pitch=.57;distance=16;keys.clear();document.getElementById('exitShop').hidden=true;});
window.addEventListener('zerotrust:shop-modal',e=>{shopModal=e.detail.open;keys.clear();});
function interaction(){
if(hudOpen||shopModal)return;
if(shop.act(player.position))return;
if(!shop.isInside()&&farm.act(player.position))return;
if(window.BlockTownDialogue)window.BlockTownDialogue.advance();
host.focus({preventScroll:true});
}
talk.onclick=interaction;
document.addEventListener('keydown',e=>{if(hudOpen||shopModal||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true],#gameHud'))return;if(e.code==='KeyE'||e.key.toLowerCase()==='e'){if(shop.proximity(player.position)){e.preventDefault();e.stopImmediatePropagation();shop.act(player.position);}else if(!shop.isInside()&&farm.nearest(player.position)!==null){e.preventDefault();e.stopImmediatePropagation();farm.act(player.position);}}},{capture:true});
const supported=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable=true],#gameHud')||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();if(supported.includes(k)){keys.add(k);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();drag=null;});
host.addEventListener('pointerdown',e=>{host.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);});host.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.007;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*.005,.2,1.25);drag={id:e.pointerId,x:e.clientX,y:e.clientY};});function endDrag(){drag=null;}host.addEventListener('pointerup',endDrag);host.addEventListener('pointercancel',endDrag);host.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.008,6,22);},{passive:false});
const controlKeys={forward:'w',back:'s',left:'a',right:'d'};document.querySelectorAll('[data-move]').forEach(b=>{const key=controlKeys[b.dataset.move];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);b.setPointerCapture(e.pointerId);});for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>keys.delete(key));b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){keys.add(key);e.preventDefault();}});b.addEventListener('keyup',()=>keys.delete(key));b.addEventListener('blur',()=>keys.delete(key));});
document.getElementById('resetCamera').onclick=()=>{if(shop.isInside())shop.leave();player.position.set(0,0,8);yaw=0;pitch=.57;distance=16;keys.clear();};
window.addEventListener('zerotrust:visit-farm',()=>{if(shop.isInside())shop.leave();player.position.set(-12,0,-29);yaw=0;pitch=.65;distance=22;keys.clear();host.focus({preventScroll:true});});
window.addEventListener('zerotrust:visit-shop',()=>{if(shop.isInside())shop.leave();player.position.set(-9,0,-2.8);yaw=0;pitch=.57;distance=12;keys.clear();host.focus({preventScroll:true});});
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;keys.clear();status.textContent='การแสดงผล 3 มิติหยุดชั่วคราว กำลังกู้คืน…';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;status.textContent='กลับเข้าสู่โลกสามมิติแล้ว';});
let previous=performance.now(),time=0;const target=new T.Vector3();
function blocked(x,z){return obstacles.some(o=>Math.abs(x-o.x)<o.w+.4&&Math.abs(z-o.z)<o.d+.4)||Math.hypot(x-3.4,z)<.9;}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;if(document.hidden||lost)return;time+=dt;
const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const moving=!hudOpen&&!shopModal&&!!(x||z);if(moving){const norm=Math.hypot(x,z);const dx=(x*Math.cos(yaw)+z*Math.sin(yaw))/norm*4.5*dt,dz=(-x*Math.sin(yaw)+z*Math.cos(yaw))/norm*4.5*dt;const nx=T.MathUtils.clamp(player.position.x+dx,shop.isInside()?71: -43,shop.isInside()?89:43),nz=T.MathUtils.clamp(player.position.z+dz,shop.isInside()?-4.1:-72,shop.isInside()?7:28);if(!blocked(nx,player.position.z))player.position.x=nx;if(!blocked(player.position.x,nz))player.position.z=nz;player.rotation.y=Math.atan2(dx,dz);}
shop.update(player.position);
player.userData.limbs.forEach(({arm,leg,side})=>{arm.rotation.x=moving?Math.sin(time*10)*.6*side:0;leg.rotation.x=moving?-Math.sin(time*10)*.6*side:0;});player.position.y=moving?Math.abs(Math.sin(time*10))*.05:0;gem.rotation.y=time;gem.position.y=4.3+Math.sin(time*2)*.16;prize.rotation.y=-time*.7;
const separation=Math.hypot(player.position.x-npc.position.x,player.position.z-npc.position.z);
near=separation<=4.2;
const chatting=window.BlockTownDialogue?.isOpen();
const farmInfo=farm.update(player.position);
const shopNear=shop.proximity(player.position);
talk.hidden=!(shopNear||near||farmInfo.near);
talk.textContent=shopNear?shop.prompt(player.position):farmInfo.near?farmInfo.label:(chatting?'อ่านบทสนทนาต่อ [E]':'คุยกับ DiamondKing [E]');
document.querySelector('.world-label span').textContent=shop.isInside()?'ITEM SHOP · ภายในร้าน':farmInfo.inFarm?'GARDEN FARM · โซนฟาร์ม':'3D WORLD · ลานแลกเปลี่ยนไอเทม';
status.textContent=shop.nearExit(player.position)?'ทางออก · เดินผ่านกรอบประตู หรือกด E เพื่อกลับเมือง':shop.isInside()?'ยินดีต้อนรับ! เข้าใกล้เคาน์เตอร์แล้วกด E เพื่อซื้อของ · ◈ '+shop.info().coins+' เหรียญร้าน':shopNear?'กด E เพื่อเข้า Item Shop · ร้านไอเทมทางการในเกม':farmInfo.inFarm?farmInfo.message:near?(chatting?'กด E / แตะบอลลูนเพื่ออ่านต่อ · เดินออกเพื่อพักการคุย':'อยู่ใกล้ DiamondKing · กด E หรือปุ่มคุยเพื่อเริ่มสนทนา'):'คุยกับคนเสื้อม่วง · ฟาร์มอยู่หลังศาลากลาง ตามป้าย FARM ↑';
target.set(player.position.x,3.6,player.position.z-3);camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z+Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(target);name.quaternion.copy(camera.quaternion);updateSunShadow();renderer.render(scene,camera);
const bubble=document.getElementById('speech');const actor=window.BlockTownDialogue?.getAnchor()==='player'?player:npc;
const projected=new T.Vector3(actor.position.x,actor.position.y+3.25,actor.position.z).project(camera);
const width=host.clientWidth,height=host.clientHeight,bw=bubble.offsetWidth,bh=bubble.offsetHeight;
const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.25&&Math.abs(projected.y)<1.25;
window.BlockTownDialogue?.setProximity(shop.isInside()?Infinity:separation,visible);
if(bubble.hidden)return;
const scale=T.MathUtils.clamp(1-Math.max(0,separation-3)*.13,.62,1);
bubble.style.transform='scale('+scale+')';bubble.style.transformOrigin='50% 100%';
bubble.style.opacity=String(T.MathUtils.clamp((6-separation)/1.2,0,1));
bubble.classList.toggle('offscreen-speaker',!visible);
const px=(projected.x*.5+.5)*width,py=(-projected.y*.5+.5)*height;
const bx=T.MathUtils.clamp(px-bw/2,12,Math.max(12,width-bw-12));
bubble.style.left=bx+'px';bubble.style.top=T.MathUtils.clamp(py-bh-18,12,Math.max(12,height-bh-100))+'px';
bubble.style.setProperty('--tail-x',T.MathUtils.clamp(px-bx,20,bw-20)+'px');
}

document.addEventListener('visibilitychange',()=>keys.clear());requestAnimationFrame(frame);status.textContent='พร้อมแล้ว · คลิกฉากเพื่อใช้ปุ่มเดิน';
})();
