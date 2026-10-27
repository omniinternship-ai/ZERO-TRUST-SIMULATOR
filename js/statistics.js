(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.SUPABASE_CONFIG;
  const message = text => { $('message').textContent = text; };
  function showSignup(show) {
    $('login').hidden = show; $('signup').hidden = !show;
    message('');
    $(show ? 'signupEmail' : 'email').focus();
  }
  $('showSignup').addEventListener('click', () => showSignup(true));
  $('showLogin').addEventListener('click', () => showSignup(false));
  if (!config?.url || !config.publishableKey || !window.supabase) {
    message('ยังไม่ได้เชื่อมต่อ: ตั้งค่า js/supabase-config.js และรัน supabase/schema.sql ก่อน');
    $('loginForm').querySelector('button').disabled = true;
    $('signupForm').querySelector('button').disabled = true;
    return;
  }
  const client = window.supabase.createClient(config.url, config.publishableKey, { auth: { storageKey: 'zt-admin-auth' } });
  let rows = [];
  $('signupForm').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('signupEmail').value.trim();
    const password = $('signupPassword').value;
    if (password !== $('confirmPassword').value) { message('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return; }
    if (password.length < 8) { message('กรุณาตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร'); return; }
    const button = event.submitter; button.disabled = true;
    try {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      $('signupPassword').value = ''; $('confirmPassword').value = '';
      // Keep registration separate from the administrator session.
      if (data.session) {
        const logout = await client.auth.signOut();
        if (logout.error) throw logout.error;
      }
      showSignup(false); $('email').value = email;
      message('ส่งคำขอสมัครแล้ว หากได้รับอีเมลยืนยัน กรุณากดยืนยันก่อนเข้าสู่ระบบ บัญชีต้องได้รับสิทธิ์ผู้ดูแลก่อนดูสถิติรวม');
    } catch (error) { message(error.message); }
    finally { button.disabled = false; }
  });
  function cell(row, value) { const td = document.createElement('td'); td.textContent = value; row.append(td); }
  function render() {
    $('total').textContent = rows.length;
    $('average').textContent = rows.length ? (rows.reduce((sum, row) => sum + row.score, 0) / rows.length).toFixed(1) : '—';
    $('best').textContent = rows.length ? rows.reduce((best, row) => Math.max(best, row.score), 0) : '—';
    $('players').textContent = new Set(rows.map(row => row.player_id)).size;
    $('rows').replaceChildren();
    for (const row of rows) {
      const tr = document.createElement('tr');
      cell(tr, new Date(row.completed_at).toLocaleString('th-TH'));
      cell(tr, row.player_id); cell(tr, `${row.score}/10`); cell(tr, `${row.score} ข้อ`);
      $('rows').append(tr);
    }
    $('distribution').replaceChildren();
    for (let score = 0; score <= 10; score++) {
      const count = rows.filter(row => row.score === score).length;
      const bar = document.createElement('div'); bar.className = 'bar';
      const label = document.createElement('span'); label.textContent = `${score}/10`;
      const track = document.createElement('div'); track.className = 'track';
      const fill = document.createElement('div'); fill.className = 'fill';
      fill.style.width = `${rows.length ? count / rows.length * 100 : 0}%`; track.append(fill);
      const value = document.createElement('span'); value.textContent = count;
      bar.append(label, track, value); $('distribution').append(bar);
    }
  }
  async function load() {
    $('refresh').disabled = true; $('export').disabled = true;
    try {
      const session = await client.auth.getSession();
      if (session.error) throw session.error;
      const loggedIn = !!session.data.session;
      $('login').hidden = loggedIn; $('dashboard').hidden = !loggedIn;
      if (!loggedIn) { rows = []; render(); return; }
      const admin = await client.from('score_admins').select('user_id').eq('user_id', session.data.session.user.id);
      if (admin.error) throw admin.error;
      if (!admin.data.length) throw new Error('บัญชีนี้ไม่มีสิทธิ์ดูสถิติผู้เล่น');
      if ($('from').value && $('to').value && $('from').value > $('to').value) throw new Error('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด');
      const collected = [];
      for (let offset = 0; ; offset += 500) {
        let query = client.from('game_results').select('id,player_id,score,completed_at').order('completed_at', { ascending: false }).order('id').range(offset, offset + 499);
        if ($('from').value) query = query.gte('completed_at', new Date(`${$('from').value}T00:00:00`).toISOString());
        if ($('to').value) { const end = new Date(`${$('to').value}T00:00:00`); end.setDate(end.getDate() + 1); query = query.lt('completed_at', end.toISOString()); }
        const { data, error } = await query;
        if (error) throw error;
        collected.push(...data); if (data.length < 500) break;
      }
      rows = collected; render(); message(rows.length ? `โหลดแล้ว ${rows.length} รายการ • วันที่ตามเวลาของอุปกรณ์` : 'ยังไม่มีผลการเล่นในช่วงนี้');
      $('export').disabled = !rows.length;
    } catch (error) { rows = []; render(); message(error.message); }
    finally { $('refresh').disabled = false; }
  }
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true;
    try {
      const { error } = await client.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
      $('password').value = ''; if (error) throw error; await load();
    } catch (error) { message(error.message); } finally { button.disabled = false; }
  });
  $('refresh').addEventListener('click', load);
  $('logout').addEventListener('click', async () => { const { error } = await client.auth.signOut(); if (error) message(error.message); else { message('ออกจากระบบแล้ว'); load(); } });
  $('export').addEventListener('click', () => {
    const csv = ['completed_at,player_id,score,max_score', ...rows.map(row => `${row.completed_at},${row.player_id},${row.score},10`)].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'zero-trust-results.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  load();
})();
