(() => {
  'use strict';
  let client, session = null, busy = false;
  const el = id => document.getElementById(id);
  function notice(message) {
    el('loginAuthNoticeText').textContent = message;
    el('loginAuthNotice').hidden = false;
  }
  function render(next) {
    session = next;
    const user = session?.user;
    const signedIn = user && !user.is_anonymous;
    el('loginAccountStatus').textContent = signedIn ? `เข้าสู่ระบบแล้ว: ${user.user_metadata?.full_name || user.email || 'ผู้เล่น'}` : 'เข้าสู่ระบบเพื่อใช้บัญชีผู้เล่น หรือเล่นแบบ Guest';
    el('loginSignOutBtn').hidden = !signedIn;
    el('loginGoogleBtn').hidden = !!signedIn;
    el('loginStartBtn').disabled = busy;
    window.dispatchEvent(new CustomEvent('zerotrust:auth:changed', {detail:{user: user || null}}));
  }
  async function init() {
    try {
      const config = window.SUPABASE_CONFIG;
      if (!window.supabase || !config?.url || !config.publishableKey) throw Error('ไม่สามารถโหลดระบบ Login ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
      client = window.supabase.createClient(config.url, config.publishableKey, {auth:{storageKey:'zt-player-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
      client.auth.onAuthStateChange((_event, next) => { render(next); });
      const {data,error} = await client.auth.getSession();
      if(error) throw error;
      render(data.session);
      const params = new URLSearchParams(location.search);
      const hash = new URLSearchParams(location.hash.slice(1));
      const oauthError = params.get('error_description') || hash.get('error_description');
      if(oauthError) notice(`เข้าสู่ระบบไม่สำเร็จ: ${oauthError}`);
      if(params.has('code') || params.has('error') || hash.has('error')) {
        ['code','error','error_description','error_code'].forEach(k=>params.delete(k));
        history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():''));
      }
    } catch(error) { notice(error.message); }
  }
  async function google() {
    if(busy) return;
    if(!client) { notice('ระบบ Google Login ยังไม่พร้อม กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรช'); return; }
    busy = true; el('loginGoogleBtn').disabled = true; render(session);
    notice('กำลังเปิด Google เพื่อเข้าสู่ระบบ…');
    try {
      const redirect = new URL(location.pathname,location.origin).href;
      const {error} = await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,queryParams:{prompt:'select_account'}}});
      if(error) throw error;
    } catch(error) { notice(`เข้าสู่ระบบ Google ไม่สำเร็จ: ${error.message}`); }
    finally {busy=false;el('loginGoogleBtn').disabled=false;render(session);}
  }
  async function signOut() {
    if(!client || busy) return;
    busy=true;
    try {const {error}=await client.auth.signOut();if(error)throw error;render(null);notice('ออกจากระบบแล้ว');}
    catch(error){notice(`ออกจากระบบไม่สำเร็จ: ${error.message}`);}
    finally{busy=false;render(session);}
  }
  window.ZeroTrustAuth = Object.freeze({google,signOut,getClient:()=>client,getUser:()=>session?.user || null});
  function mount(){
    const status=document.createElement('p');status.id='loginAccountStatus';status.setAttribute('role','status');status.style.cssText='font-size:14px;line-height:1.5;color:inherit;text-align:center;margin:8px 0';
    const logout=document.createElement('button');logout.id='loginSignOutBtn';logout.type='button';logout.className='login-auth-btn';logout.textContent='ออกจากระบบ';logout.hidden=true;logout.addEventListener('click',signOut);
    el('loginGoogleBtn').parentElement.append(status,logout);
    render(null);init();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
