(() => {
'use strict';
const kit=window.BlockTownAvatar,el=id=>document.getElementById(id);let draft=kit.load(),dirty=false,refresh=()=>{};
const labels={skin:'สีผิว',hairStyle:'ทรงผม',hair:'สีผม',shirt:'สีเสื้อ',pants:'สีกางเกง',accessory:'เครื่องประดับ'};
function controls(){el('options').replaceChildren();for(const [key,label] of Object.entries(labels)){const group=document.createElement('fieldset');group.className='option-group';const legend=document.createElement('legend');legend.textContent=label;group.append(legend);const row=document.createElement('div');row.className='swatches';for(const [value,name] of kit.options[key]){const b=document.createElement('button');b.type='button';b.className=value.startsWith('#')?'swatch':'option-text';if(value.startsWith('#'))b.style.backgroundColor=value;else b.textContent=name;b.setAttribute('aria-label',label+' '+name);b.title=name;b.setAttribute('aria-pressed',String(draft[key]===value));b.onclick=()=>{draft={...draft,[key]:value};dirty=true;row.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===b)));el('saveStatus').textContent='มีการเปลี่ยนแปลง · กดบันทึกเพื่อนำไปใช้ในเกม';el('previewBadge').textContent='กำลังลองชุด';refresh();};row.append(b);}group.append(row);el('options').append(group);}}
function editing(on){document.body.classList.toggle('editing',on);el('mainMenu').hidden=on;el('customPanel').hidden=!on;el('saveStatus').textContent='';(on?el('back'):el('customize')).focus({preventScroll:true});}
el('customize').onclick=()=>editing(true);
el('back').onclick=()=>{if(dirty&&!window.confirm('กลับเมนูโดยไม่บันทึกรูปลักษณ์ที่เพิ่งแก้ไข?'))return;draft=kit.load();dirty=false;controls();refresh();el('previewBadge').textContent='พร้อมออกผจญภัย';editing(false);};
el('save').onclick=()=>{if(kit.save(draft)){dirty=false;el('saveStatus').textContent='✓ บันทึกแล้ว ตัวละครนี้พร้อมใช้ในเกม';el('previewBadge').textContent='บันทึกแล้ว ✓';}else el('saveStatus').textContent='เบราว์เซอร์ไม่อนุญาตให้บันทึก กรุณาเปิดการเก็บข้อมูลแล้วลองอีกครั้ง';};
el('default').onclick=()=>{draft={...kit.defaults};dirty=true;controls();refresh();el('saveStatus').textContent='คืนรูปลักษณ์เริ่มต้นแล้ว · กดบันทึกเพื่อนำไปใช้';el('previewBadge').textContent='กำลังลองชุด';};
el('help').onclick=()=>{el('helpText').hidden=!el('helpText').hidden;el('help').setAttribute('aria-expanded',String(!el('helpText').hidden));};
try{const progress=JSON.parse(localStorage.getItem('zerotrust_blocktown_v1'));if(Array.isArray(progress)&&progress.length>0&&progress.length<=5)el('play').textContent=progress.length===5?'เข้าเมือง · ดูผลภารกิจ →':'เล่นต่อ · ด่าน '+(progress.length+1)+' / 5 →';}catch(_){}

// Keep the menu visible if the local server stops rather than navigating to a blank error page.
el('play').addEventListener('click',async event=>{
if(location.protocol==='file:'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
event.preventDefault();if(el('play').getAttribute('aria-busy')==='true')return;
const original=el('play').textContent;el('play').setAttribute('aria-busy','true');el('play').textContent='กำลังเปิดเกม…';
const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
try{const response=await fetch(new URL('game.html',location.href),{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('unavailable');const html=await response.text();if(!html.includes('id="viewport"'))throw new Error('missing game');window.location.href=el('play').href;}
catch(_){el('saveStatus').textContent='เชื่อมต่อเกมไม่ได้ กรุณาเปิด PLAY-BLOCKTOWN.cmd แล้วลองอีกครั้ง ข้อมูลที่บันทึกไว้ยังอยู่';}
finally{clearTimeout(timeout);el('play').removeAttribute('aria-busy');el('play').textContent=original;}
});
controls();
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(_){el('avatarPreview').textContent='ไม่สามารถเปิดตัวอย่าง 3 มิติได้ กรุณาเปิด WebGL เพื่อดูตัวละคร';return;}
const T=THREE,host=el('avatarPreview'),scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.1,50);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.append(renderer.domElement);scene.add(new T.HemisphereLight(0xffffff,0x749650,2.5));const sun=new T.DirectionalLight(0xfff4d5,3);sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const platform=new T.Mesh(new T.CylinderGeometry(1.7,1.85,.25,8),new T.MeshStandardMaterial({color:'#e9efce',roughness:.85}));platform.position.y=-.24;platform.receiveShadow=true;scene.add(platform);const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-.38;floor.receiveShadow=true;scene.add(floor);
let avatar=null,rotation=-.35,drag=null,auto=false,lost=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
refresh=()=>{if(avatar){scene.remove(avatar);kit.dispose(avatar);}avatar=kit.create(draft);avatar.rotation.y=rotation;scene.add(avatar);};refresh();
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,3.1,w/h<.8?9.8:8);camera.lookAt(0,1.5,0);camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();
host.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX};host.setPointerCapture(e.pointerId);});host.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;rotation+=(e.clientX-drag.x)*.015;drag.x=e.clientX;});for(const evt of ['pointerup','pointercancel'])host.addEventListener(evt,()=>drag=null);
el('rotate').setAttribute('aria-pressed','false');el('rotate').onclick=()=>{auto=!auto;el('rotate').setAttribute('aria-pressed',String(auto));el('rotate').textContent=auto?'Ⅱ หยุดหมุน':'↻ หมุนอัตโนมัติ';};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;el('previewBadge').textContent='การแสดงผลหยุดชั่วคราว';});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;el('previewBadge').textContent='พร้อมแสดงตัวละคร';});let last=performance.now(),time=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||lost)return;time+=dt;if(auto&&!drag)rotation+=dt*.5;avatar.rotation.y=rotation;avatar.position.y=reduced?0:Math.sin(time*1.5)*.025;renderer.render(scene,camera);}requestAnimationFrame(frame);
})();
