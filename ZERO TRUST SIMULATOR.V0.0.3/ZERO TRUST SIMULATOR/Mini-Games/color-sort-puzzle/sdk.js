/**
 * ZT-MiniGame SDK Client Implementation
 * Protocol: zt-minigame/1
 * For ZERO TRUST SIMULATOR Minigames
 */
(() => {
  'use strict';

  const gameId = 'color-sort-puzzle';
  const embedded = window.parent !== window;
  const params = new URLSearchParams(location.search);
  const host = params.get('hostOrigin');

  let validHost = false;
  try {
    validHost = !!host && /^https?:$/.test(new URL(host).protocol) && new URL(host).origin === host;
  } catch (_) {
    validHost = false;
  }

  let sessionId = null;
  let runId = null;
  let callbacks = {};
  let pending = null;
  let readyTimer = null;
  let finalMessage = null;

  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback RFC4122 v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function envelope(type, payload = {}, eventId = generateUUID()) {
    return {
      channel: 'zt-minigame',
      version: 1,
      type,
      gameId,
      sessionId,
      runId,
      eventId,
      payload
    };
  }

  function send(message) {
    if (validHost && embedded) {
      window.parent.postMessage(message, host);
    }
  }

  function sendReady() {
    send(envelope('ready', { gameVersion: '1.0.0' }));
  }

  window.addEventListener('message', event => {
    if (!embedded || !validHost || event.source !== window.parent || event.origin !== host) {
      return;
    }

    const m = event.data;
    if (!m || m.channel !== 'zt-minigame' || m.version !== 1 || m.gameId !== gameId) {
      return;
    }

    // Host Init
    if (m.type === 'init') {
      if (typeof m.sessionId !== 'string' || typeof m.runId !== 'string') return;
      // If already initialized with this exact session and run, do not restart
      if (m.sessionId === sessionId && m.runId === runId) return;

      if (pending) {
        clearInterval(pending.timer);
        pending.reject(new Error('Round changed'));
        pending = null;
      }

      sessionId = m.sessionId;
      runId = m.runId;
      finalMessage = null;
      if (readyTimer) {
        clearInterval(readyTimer);
        readyTimer = null;
      }
      callbacks.start?.({ embedded: true, runId, locale: m.payload?.locale || 'th' });
      return;
    }

    // Must match current active session and run
    if (m.sessionId !== sessionId || m.runId !== runId) return;

    // Host Ack for result
    if (m.type === 'ack' && pending && m.eventId === pending.message.eventId) {
      const p = pending;
      clearInterval(p.timer);
      pending = null;
      if (m.payload?.status === 'accepted') {
        p.resolve(m.payload);
      } else {
        p.reject(new Error(m.payload?.reason || 'Result rejected'));
      }
      return;
    }

    // Lifecycle commands
    if (m.type === 'pause') callbacks.pause?.();
    if (m.type === 'resume') callbacks.resume?.();
    if (m.type === 'stop') callbacks.stop?.();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      callbacks.pause?.();
    }
  });

  window.ZTMiniGame = {
    get gameId() { return gameId; },
    get isEmbedded() { return embedded; },
    get hasValidHost() { return validHost; },

    connect(handlers) {
      callbacks = handlers || {};
      if (!embedded) {
        // Standalone practice mode
        callbacks.start?.({ embedded: false });
        return;
      }
      if (!validHost) {
        callbacks.error?.('Missing or invalid hostOrigin parameter in query string.');
        return;
      }
      sendReady();
      readyTimer = setInterval(sendReady, 1500);
    },

    async finish(payload) {
      if (!embedded) {
        return { status: 'practice', awardedPoints: 0, persisted: 'none' };
      }
      if (!sessionId || !runId) {
        throw new Error('Host not ready');
      }
      if (pending) {
        throw new Error('Result is currently being sent');
      }

      // Preserve identical eventId on retry for the same runId
      if (!finalMessage || finalMessage.runId !== runId) {
        finalMessage = envelope('result', payload);
      }

      return new Promise((resolve, reject) => {
        let attempts = 1;
        const p = { message: finalMessage, resolve, reject };
        pending = p;

        p.timer = setInterval(() => {
          attempts++;
          if (attempts > 3) {
            clearInterval(p.timer);
            pending = null;
            reject(new Error('No acknowledgement from host; retry using the same result'));
            return;
          }
          send(p.message);
        }, 1800);

        send(p.message);
      });
    },

    requestReplay() {
      if (embedded) {
        send(envelope('replay-request'));
      } else {
        callbacks.start?.({ embedded: false });
      }
    }
  };
})();
