(() => {
  'use strict';
  const pendingKey = 'zt_pending_result_v1';
  const status = document.createElement('a');
  status.href = '#statistics';
  status.textContent = 'สถิติผู้เล่น';
  status.style.cssText = 'display:block;color:#334155;padding:8px;font:12px system-ui;text-align:center';
  const icon = document.createElement('button');
  icon.type = 'button';
  icon.className = 'app-item';
  icon.setAttribute('aria-label', 'เปิดแอป สถิติผู้เล่น');
  icon.innerHTML = '<div class="app-icon-wrapper"><svg viewBox="0 0 100 100" class="app-icon-svg" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#0f766e"/><path d="M25 70V50h12v20zm19 0V36h12v34zm19 0V23h12v47z" fill="white"/></svg></div><span class="app-label">สถิติผู้เล่น</span>';
  document.querySelector('.app-grid')?.append(icon);
  const screen = document.createElement('section');
  screen.hidden = true;
  screen.setAttribute('aria-label', 'แอปสถิติผู้เล่น');
  screen.style.cssText = 'position:absolute;inset:32px 0 24px;z-index:150;background:#09111f;display:flex;flex-direction:column;border-radius:16px;overflow:hidden';
  const back = document.createElement('button');
  back.type = 'button'; back.textContent = '‹ หน้าหลัก';
  back.style.cssText = 'border:0;background:#111e31;color:#5ae0ce;padding:14px;text-align:left;font:15px system-ui;cursor:pointer';
  const frame = document.createElement('iframe');
  frame.title = 'คะแนนและสถิติผู้เล่น';
  frame.style.cssText = 'border:0;width:100%;flex:1;min-height:0;background:#09111f';
  screen.append(back, status, frame);
  document.querySelector('.phone-screen')?.append(screen);
  function closeStatistics() { screen.hidden = true; screen.style.display = 'none'; icon.focus(); }
  closeStatistics();
  back.addEventListener('click', closeStatistics);
  icon.addEventListener('click', event => {
    event.stopImmediatePropagation();
    if (!frame.getAttribute('src')) frame.src = 'statistics.html?embed=1';
    screen.hidden = false; screen.style.display = 'flex'; back.focus();
  });
  let client;
  let syncing = false;
  async function sync() {
    if (syncing) return;
    const raw = localStorage.getItem(pendingKey);
    if (!raw) return;
    const config = window.SUPABASE_CONFIG;
    if (!config?.url || !config.publishableKey || !window.supabase) {
      status.textContent = 'คะแนนรอเชื่อมต่อ Supabase';
      return;
    }
    syncing = true;
    try {
      client ||= window.supabase.createClient(config.url, config.publishableKey, { auth: { storageKey: 'zt-player-auth' } });
      const session = await client.auth.getSession();
      if (session.error) throw session.error;
      if (!session.data.session) {
        const login = await client.auth.signInAnonymously();
        if (login.error) throw login.error;
      }
      const { error } = await client.rpc('submit_result', JSON.parse(raw));
      if (error) throw error;
      if (localStorage.getItem(pendingKey) === raw) localStorage.removeItem(pendingKey);
      status.textContent = 'บันทึกคะแนนแล้ว • สถิติ';
    } catch (error) {
      status.textContent = 'คะแนนรอส่ง • คลิกเพื่อลองใหม่';
      console.warn('Score sync:', error.message);
    } finally { syncing = false; }
  }
  window.recordGameResult = (history) => {
    if (history.length !== 10) return;
    const attemptKey = 'zt_kai_attempt_v1';
    let id = localStorage.getItem(attemptKey);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(attemptKey, id); }
    const answers = history.map(item => ({ stage: item.stageIndex, choice: item.choiceId }));
    localStorage.setItem(pendingKey, JSON.stringify({ p_id: id, p_answers: answers }));
    const score = history.filter(item => item.isSafe).length;
    status.textContent = `คะแนน ${score}/10 • กำลังบันทึก`;
    sync();
  };
  status.addEventListener('click', event => {
    if (localStorage.getItem(pendingKey)) { event.preventDefault(); sync(); }
  });
  window.addEventListener('online', sync);
  sync();
})();
