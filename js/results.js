(() => {
  'use strict';
  const pendingKey = 'zt_pending_result_v1';
  const status = document.createElement('a');
  status.href = 'statistics.html';
  status.textContent = 'สถิติผู้เล่น';
  status.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;background:#14233b;color:white;padding:10px;border-radius:10px;font:13px sans-serif';
  document.body.append(status);
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
