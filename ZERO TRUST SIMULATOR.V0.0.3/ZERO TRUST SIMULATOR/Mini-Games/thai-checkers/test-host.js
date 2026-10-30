(() => {
  'use strict';
  const frame = document.getElementById('game'), origin = location.origin, gameId = 'thai-checkers';
  let sessionId = crypto.randomUUID(), runId = crypto.randomUUID(), total = 0, last = null, open = true, paused = false;
  const receipts = new Map();
  function log(text) {
    const el = document.getElementById('log');
    if (el) el.textContent = (text + '\n' + el.textContent).slice(0, 7000);
  }
  function send(type, payload = {}, eventId = crypto.randomUUID()) {
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ channel: 'zt-minigame', version: 1, type, gameId, sessionId, runId, eventId, payload }, origin);
  }
  function accept(m) {
    const error = window.ZTMockRules.validate(m, { gameId, sessionId, runId });
    if (error) {
      send('ack', { status: 'rejected', reason: error }, m?.eventId);
      log('ปฏิเสธผล: ' + error);
      return;
    }
    let receipt = receipts.get(runId);
    if (receipt && receipt.eventId !== m.eventId) {
      send('ack', { status: 'rejected', reason: 'ROUND_ALREADY_FINISHED' }, m.eventId);
      return;
    }
    if (!receipt) {
      const awardedPoints = window.ZTMockRules.reward(m.payload);
      receipt = { eventId: m.eventId, status: 'accepted', awardedPoints, persisted: 'mock-only' };
      receipts.set(runId, receipt);
      total += awardedPoints;
      const totalEl = document.getElementById('total');
      if (totalEl) totalEl.textContent = total;
      log('รับผล: ' + m.payload.rawScore + ' แต้ม (สะสม: ' + total + ')');
    } else {
      log('ผลซ้ำ: ตอบ receipt เดิม ไม่บวกซ้ำ');
    }
    const dropAck = document.getElementById('dropAck');
    if (!dropAck || !dropAck.checked) send('ack', receipt, m.eventId);
  }
  function load() {
    open = true;
    paused = false;
    sessionId = crypto.randomUUID();
    runId = crypto.randomUUID();
    last = null;
    frame.src = 'index.html?hostOrigin=' + encodeURIComponent(origin);
  }
  window.addEventListener('message', event => {
    if (!open || !frame || event.source !== frame.contentWindow || event.origin !== origin) return;
    const m = event.data;
    if (!m || m.channel !== 'zt-minigame' || m.version !== 1 || m.gameId !== gameId) return;
    if (m.type === 'ready') {
      send('init', { locale: 'th' });
      return;
    }
    if (m.sessionId !== sessionId || m.runId !== runId) return;
    if (m.type === 'result') {
      last = m;
      accept(m);
    }
    if (m.type === 'replay-request' && receipts.has(runId)) {
      runId = crypto.randomUUID();
      last = null;
      paused = false;
      send('init', { locale: 'th' });
    }
  });

  const btnRotate = document.getElementById('rotate');
  if (btnRotate) btnRotate.onclick = () => frame.classList.toggle('landscape');
  const btnPause = document.getElementById('pause');
  if (btnPause) btnPause.onclick = () => { paused = true; send('pause'); };
  const btnResume = document.getElementById('resume');
  if (btnResume) btnResume.onclick = () => { paused = false; send('resume'); };
  const btnDup = document.getElementById('duplicate');
  if (btnDup) btnDup.onclick = () => { if (last) accept(last); else log('ยังไม่มีผลให้ส่งซ้ำ'); };
  const btnExit = document.getElementById('exit');
  if (btnExit) btnExit.onclick = () => { send('stop'); open = false; frame.src = 'about:blank'; log('ออกจากเกมแล้ว'); };
  const btnOpen = document.getElementById('open');
  if (btnOpen) btnOpen.onclick = load;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && open) {
      paused = true;
      send('pause');
    }
  });

  if (location.protocol === 'file:') {
    log('เปิดผ่าน HTTP เช่น http://127.0.0.1:8780/games/thai-checkers/test-host.html จึงทดสอบ origin ได้');
  } else {
    load();
  }
})();
