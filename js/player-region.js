(() => {
'use strict';
let epoch=0,box,select,consent,status,save,withdraw;
function message(text){status.textContent=text;}
async function load(user){
 const token=++epoch;box.hidden=!user||user.is_anonymous;if(box.hidden)return;
 const client=window.ZeroTrustAuth?.getClient();if(!client)return;
 save.disabled=true;withdraw.disabled=true;message('กำลังโหลดข้อมูลจังหวัด…');
 try{
  const [provinces,own]=await Promise.all([client.from('atlas_provinces').select('code,name').order('name'),client.from('atlas_player_region').select('province_code,consent').eq('player_id',user.id).maybeSingle()]);
  if(token!==epoch)return;if(provinces.error)throw provinces.error;if(own.error)throw own.error;
  select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='เลือกจังหวัด (ไม่บังคับ)';select.append(empty);
  for(const row of provinces.data){const o=document.createElement('option');o.value=row.code;o.textContent=row.name;select.append(o);}
  select.value=own.data?.province_code||'';consent.checked=own.data?.consent===true;save.disabled=false;withdraw.disabled=!own.data;
  message('ใช้ศูนย์กลางจังหวัดในภาพรวมเท่านั้น ไม่เก็บ GPS หรือแสดงชื่อบนลูกโลก');
 }catch(error){if(token===epoch)message('ยังใช้ข้อมูลพื้นที่ไม่ได้: '+error.message+' • ต้องติดตั้ง atlas.sql ก่อน');}
}
async function submit(revoke){
 const user=window.ZeroTrustAuth?.getUser();if(!user||user.is_anonymous)return;
 if(!select.value){message('กรุณาเลือกจังหวัดก่อน');return;}
 if(!revoke&&!consent.checked){message('กรุณาติ๊กยินยอมก่อนส่งพื้นที่ หรือกดถอนความยินยอม');return;}
 const token=epoch;save.disabled=true;withdraw.disabled=true;
 try{const {error}=await window.ZeroTrustAuth.getClient().rpc('atlas_set_region',{p_code:select.value,p_consent:!revoke});if(error)throw error;if(token!==epoch)return;consent.checked=!revoke;message(revoke?'ถอนความยินยอมแล้ว จะไม่นำจังหวัดของคุณไปรวมบนลูกโลก':'บันทึกจังหวัดแล้ว • แสดงเมื่อมีผู้ยินยอมอย่างน้อย 5 คนในจังหวัด');}
 catch(error){if(token===epoch)message('บันทึกไม่ได้: '+error.message);}
 finally{if(token===epoch){save.disabled=false;withdraw.disabled=false;}}
}
function mount(){
 box=document.createElement('section');box.hidden=true;box.style.cssText='border:1px solid #486a70;padding:12px;border-radius:10px;margin:12px 0;font-size:13px;line-height:1.6;color:#c8e5e1;background:#10222f';
 const title=document.createElement('strong');title.textContent='พื้นที่ของคุณบน Player Atlas (สมัครใจ)';
 select=document.createElement('select');select.setAttribute('aria-label','จังหวัดสำหรับสถิติภาพรวม');select.style.cssText='display:block;width:100%;padding:8px;margin:8px 0;color:#fff;background:#19303e;border:1px solid #79c4ab;border-radius:6px';
 consent=document.createElement('input');consent.type='checkbox';const label=document.createElement('label');label.append(consent,document.createTextNode(' ยินยอมให้รวมจังหวัดกับคะแนนในสถิติสาธารณะแบบกลุ่ม โดยไม่แสดงตัวตน'));
 status=document.createElement('p');status.setAttribute('role','status');save=document.createElement('button');save.type='button';save.textContent='บันทึกจังหวัด';withdraw=document.createElement('button');withdraw.type='button';withdraw.textContent='ถอนความยินยอม';
 for(const b of [save,withdraw])b.style.cssText='padding:8px;margin:4px;border:1px solid #8cd4b2;border-radius:6px;color:#fff;background:#19303e;cursor:pointer';
 save.onclick=()=>submit(false);withdraw.onclick=()=>submit(true);box.append(title,select,label,status,save,withdraw);document.querySelector('.login-content-box').append(box);
 window.addEventListener('zerotrust:auth:changed',e=>{setTimeout(()=>load(e.detail.user),0);});load(window.ZeroTrustAuth?.getUser());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
