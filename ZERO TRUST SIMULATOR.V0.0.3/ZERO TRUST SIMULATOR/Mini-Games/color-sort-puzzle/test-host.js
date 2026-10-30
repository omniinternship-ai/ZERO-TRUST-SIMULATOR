(() => {
  'use strict';

  const frame = document.getElementById('game');
  const origin = location.origin;
  const gameId = 'color-sort-puzzle';

  let sessionId = crypto.randomUUID();
  let runId = crypto.randomUUID();
  let totalPoints = 0;
  let lastMessage = null;
  let isOpen = true;
  let isPaused = false;

  const receipts = new Map(); // runId -> receipt

  function log(text) {
    const logEl = document.getElementById('log');
    const time = new Date().toLocaleTimeString();
    logEl.textContent = `[${time}] ${text}\n` + logEl.textContent.slice(0, 7000);
  }

  function sendToGame(type, payload = {}, eventId = crypto.randomUUID()) {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({
      channel: 'zt-minigame',
      version: 1,
      type,
      gameId,
      sessionId,
      runId,
      eventId,
      payload
    }, origin);
  }

  function acceptResult(m) {
    const error = ZTMockRules.validate(m, { gameId, sessionId, runId });
    if (error) {
      sendToGame('ack', { status: 'rejected', reason: error }, m?.eventId);
      log(`❌ ปฏิเสธผล: ${error}`);
      return;
    }

    let receipt = receipts.get(runId);
    if (receipt && receipt.eventId !== m.eventId) {
      sendToGame('ack', { status: 'rejected', reason: 'ROUND_ALREADY_FINISHED' }, m.eventId);
      log(`⚠️ ปฏิเสธ: รอบนี้ (runId: ${runId.slice(0, 8)}) จบแล้วและได้รับ receipt ด้วย eventId อื่นแล้ว`);
      return;
    }

    if (!receipt) {
      const awardedPoints = ZTMockRules.reward(m.payload);
      receipt = {
        eventId: m.eventId,
        status: 'accepted',
        awardedPoints,
        persisted: 'mock-only'
      };
      receipts.set(runId, receipt);
      totalPoints += awardedPoints;
      document.getElementById('total').textContent = totalPoints;
      log(`✅ ยอมรับผล: คะแนนดิบ ${m.payload.rawScore} -> ให้คะแนนจำลอง ${awardedPoints} แต้ม (แต้มสะสม: ${totalPoints})`);
    } else {
      log(`ℹ️ ได้รับผลซ้ำ (eventId เดิม): ตอบ receipt เดิม ไม่เพิ่มแต้มซ้ำ`);
    }

    if (!document.getElementById('dropAck').checked) {
      sendToGame('ack', receipt, m.eventId);
    } else {
      log(`⚡ จำลอง dropAck (ไม่ส่ง ack ตอบกลับเพื่อทดสอบ retry ของ client)`);
    }
  }

  function loadGame() {
    isOpen = true;
    isPaused = false;
    sessionId = crypto.randomUUID();
    runId = crypto.randomUUID();
    lastMessage = null;
    log(`🚀 เปิดเกมใหม่: session=${sessionId.slice(0, 8)} run=${runId.slice(0, 8)}`);
    frame.src = 'index.html?hostOrigin=' + encodeURIComponent(origin);
  }

  window.addEventListener('message', event => {
    if (!isOpen || event.source !== frame.contentWindow || event.origin !== origin) {
      return;
    }

    const m = event.data;
    if (!m || m.channel !== 'zt-minigame' || m.version !== 1 || m.gameId !== gameId) {
      return;
    }

    if (m.type === 'ready') {
      log(`📩 ได้รับ ready จากเกม (gameVersion: ${m.payload?.gameVersion || '?'})`);
      sendToGame('init', { locale: 'th' });
      log(`📤 ส่ง init: sessionId=${sessionId.slice(0, 8)} runId=${runId.slice(0, 8)}`);
      return;
    }

    if (m.sessionId !== sessionId || m.runId !== runId) {
      log(`⚠️ ข้อความไม่ตรง session/run ที่เปิดอยู่ (ละเว้น)`);
      return;
    }

    if (m.type === 'result') {
      lastMessage = m;
      log(`📩 ได้รับ result: outcome=${m.payload?.outcome} rawScore=${m.payload?.rawScore}`);
      acceptResult(m);
      return;
    }

    if (m.type === 'replay-request') {
      log(`📩 ได้รับ replay-request จากเกม`);
      if (receipts.has(runId)) {
        runId = crypto.randomUUID();
        lastMessage = null;
        isPaused = false;
        log(`🔄 อนุญาตเริ่มรอบใหม่: new runId=${runId.slice(0, 8)}`);
        sendToGame('init', { locale: 'th' });
      } else {
        log(`⚠️ ปฏิเสธ replay-request: รอบปัจจุบันยังไม่จบรอบ`);
      }
    }
  });

  document.getElementById('rotate').onclick = () => {
    frame.classList.toggle('landscape');
    log(`📱 สลับการแสดงผล iframe (portrait / landscape)`);
  };

  document.getElementById('pause').onclick = () => {
    isPaused = true;
    sendToGame('pause');
    log(`⏸️ ส่งคำสั่ง pause ไปยังเกม`);
  };

  document.getElementById('resume').onclick = () => {
    isPaused = false;
    sendToGame('resume');
    log(`▶️ ส่งคำสั่ง resume ไปยังเกม`);
  };

  document.getElementById('duplicate').onclick = () => {
    if (lastMessage) {
      log(`🔁 ทดสอบส่งผลล่าสุดซ้ำ (Idempotency test)`);
      acceptResult(lastMessage);
    } else {
      log(`⚠️ ยังไม่มีผลการเล่นล่าสุดให้ส่งซ้ำ`);
    }
  };

  document.getElementById('exit').onclick = () => {
    sendToGame('stop');
    isOpen = false;
    frame.src = 'about:blank';
    log(`🛑 ส่งคำสั่ง stop และปิดเกมแล้ว`);
  };

  document.getElementById('open').onclick = loadGame;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isOpen) {
      isPaused = true;
      sendToGame('pause');
      log(`👁️ แท็บถูกซ่อน: ส่งคำสั่ง pause ไปยังเกมอัตโนมัติ`);
    }
  });

  if (location.protocol === 'file:') {
    log('⚠️ หมายเหตุ: เปิดผ่าน HTTP Server (เช่น http://127.0.0.1:8780/test-host.html) เพื่อให้เบราว์เซอร์ตรวจสอบ origin ได้ถูกต้อง');
  } else {
    loadGame();
  }
})();
