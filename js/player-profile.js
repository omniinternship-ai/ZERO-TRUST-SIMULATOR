(() => {
'use strict';
const catalog=window.ZeroTrustProvinces||[];
let generation=0,active=null,profile=null,loaded=false,saving=false,ui;
const user=()=>window.ZeroTrustAuth?.getUser();
function setStatus(text){ui.status.textContent=text;}
function publish(value){profile=value;window.dispatchEvent(new CustomEvent('zerotrust:profile:changed',{detail:{profile:value}}));}
function region(){const item=catalog.find(p=>p.code===ui.province.value);ui.region.value=item?.region||'ยังไม่เลือกจังหวัด';}
function enable(){const signed=active&&!active.is_anonymous;ui.fields.disabled=!signed||!loaded||saving;ui.retry.disabled=!signed||saving;}
function clear(){ui.name.value='';ui.province.value='';ui.shareName.checked=false;ui.shareArea.checked=false;region();publish(null);}
async function load(next){
 const token=++generation;active=next;loaded=false;saving=false;clear();enable();
 if(!next||next.is_anonymous){setStatus('เข้าสู่ระบบ Google เพื่อบันทึกโปรไฟล์ • Guest ยังไม่ผูกบัญชี');return;}
 setStatus('กำลังโหลดโปรไฟล์…');
 try{
  const {data,error}=await window.ZeroTrustAuth.getClient().from('v003_player_profiles').select('player_id,display_name,province_code,share_name,share_area,updated_at').eq('player_id',next.id).maybeSingle();
  if(token!==generation)return;if(error)throw error;
  ui.name.value=data?.display_name||'';ui.province.value=data?.province_code||'';ui.shareName.checked=!!data?.share_name;ui.shareArea.checked=!!data?.share_area;region();loaded=true;publish(data?{...data,province:catalog.find(p=>p.code===data.province_code)?.name||null,region:catalog.find(p=>p.code===data.province_code)?.region||null}:null);
  setStatus(data?'โหลดโปรไฟล์แล้ว • แก้ไขและกดบันทึกได้':'ตั้งชื่อที่ต้องการใช้ในเกม • ไม่จำเป็นต้องใช้ชื่อจริง');
 }catch(error){if(token===generation)setStatus('โหลดโปรไฟล์ไม่ได้: '+error.message+' • หากยังไม่ติดตั้ง ให้รัน supabase/player-profiles.sql');}
 finally{if(token===generation)enable();}
}
async function save(event){
 event.preventDefault();const current=user();if(!loaded||saving||!current||current.id!==active?.id)return;
 const name=ui.name.value.trim();if([...name].length<2||[...name].length>40||/[\u0000-\u001f\u007f]/.test(name)){setStatus('กรุณาตั้งชื่อ 2–40 ตัวอักษร โดยไม่มีอักขระควบคุม');return;}
 if(ui.shareArea.checked&&!ui.province.value){setStatus('เลือกจังหวัดก่อนยินยอมเผยแพร่พื้นที่');return;}
 const token=generation;saving=true;enable();setStatus('กำลังบันทึกโปรไฟล์…');
 try{
  const {data,error}=await window.ZeroTrustAuth.getClient().rpc('save_v003_profile',{p_name:name,p_province:ui.province.value||null,p_share_name:ui.shareName.checked,p_share_area:ui.shareArea.checked});
  if(token!==generation)return;if(error)throw error;
  const saved=Array.isArray(data)?data[0]:data;if(!saved||saved.player_id!==current.id)throw Error('ผลการบันทึกไม่ตรงกับบัญชี');
  const place=catalog.find(p=>p.code===saved.province_code);publish({...saved,province:place?.name||null,region:place?.region||null});
  ui.name.value=saved.display_name;setStatus('บันทึกโปรไฟล์ใน Supabase แล้ว ✓');
 }catch(error){if(token===generation)setStatus('ยังบันทึกไม่สำเร็จ: '+error.message+' • ข้อมูลที่กรอกยังอยู่ในฟอร์ม');}
 finally{if(token===generation){saving=false;enable();}}
}
function mount(){
 const box=document.createElement('section');box.className='player-profile-card';box.innerHTML=`<h2>โปรไฟล์ผู้เล่น</h2><p>ใช้บัญชี Google เดียวกับคะแนน ชื่อในเกมตั้งเองได้</p><form id="playerProfileForm"><fieldset id="profileFields" disabled><label for="profileName">ชื่อที่แสดงในเกม</label><input id="profileName" maxlength="80" autocomplete="nickname" placeholder="ตั้งชื่อ 2–40 ตัวอักษร"><label for="profileProvince">จังหวัด (ไม่บังคับ)</label><select id="profileProvince"><option value="">ยังไม่ระบุจังหวัด</option></select><label for="profileRegion">ภูมิภาค · กำหนดจากจังหวัดอัตโนมัติ</label><input id="profileRegion" readonly><label class="profile-check"><input type="checkbox" id="profileShareName"><span>ยินยอมแสดงชื่อที่ตั้งและคะแนนของฉันบน Player Atlas</span></label><label class="profile-check"><input type="checkbox" id="profileShareArea"><span>ยินยอมแสดงจังหวัดและภูมิภาคกับโปรไฟล์สาธารณะ</span></label><p class="profile-hint">ไม่แสดงอีเมลหรือพิกัด GPS • ถอนความยินยอมได้โดยเอาเครื่องหมายออกแล้วบันทึก • ภูมิภาคใช้เกณฑ์แบ่ง 6 ภาคของระบบ</p><button type="submit">บันทึกโปรไฟล์</button></fieldset></form><button type="button" id="profileRetry">โหลดโปรไฟล์ใหม่</button><p id="profileStatus" role="status" aria-live="polite"></p>`;
 const area=document.querySelector('#settingsScreen .settings-content-area');
 const original=Array.from(area.children);
 const tabs=document.createElement('div');tabs.className='profile-settings-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','หมวดการตั้งค่า');
 const general=document.createElement('button'),personal=document.createElement('button');
 general.type=personal.type='button';general.textContent='ตั้งค่าทั่วไป';personal.textContent='โปรไฟล์ผู้เล่น';general.id='settingsGeneralTab';personal.id='settingsProfileTab';
 for(const b of [general,personal]){b.setAttribute('role','tab');b.setAttribute('aria-selected','false');}
 box.id='settingsProfilePanel';box.setAttribute('role','tabpanel');box.setAttribute('aria-labelledby',personal.id);personal.setAttribute('aria-controls',box.id);
 function showProfile(on){box.hidden=!on;original.forEach(node=>node.hidden=on);general.setAttribute('aria-selected',String(!on));personal.setAttribute('aria-selected',String(on));area.scrollTop=0;}
 general.onclick=()=>showProfile(false);personal.onclick=()=>showProfile(true);
 tabs.append(general,personal);area.before(tabs);area.prepend(box);showProfile(false);
 tabs.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const on=document.activeElement===general;showProfile(on);(on?personal:general).focus();}});

 const get=id=>box.querySelector('#'+id);ui={name:get('profileName'),province:get('profileProvince'),region:get('profileRegion'),shareName:get('profileShareName'),shareArea:get('profileShareArea'),status:get('profileStatus'),fields:get('profileFields'),retry:get('profileRetry')};
 for(const p of [...catalog].sort((a,b)=>a.name.localeCompare(b.name,'th'))){const option=document.createElement('option');option.value=p.code;option.textContent=p.name;ui.province.append(option);}
 ui.province.onchange=region;get('playerProfileForm').onsubmit=save;ui.retry.onclick=()=>load(user());
 window.addEventListener('zerotrust:auth:changed',e=>{if(e.detail.user?.id===active?.id&&loaded)return;setTimeout(()=>load(e.detail.user),0);});
 window.ZeroTrustProfile=Object.freeze({get:()=>profile,reload:()=>load(user())});load(user());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
