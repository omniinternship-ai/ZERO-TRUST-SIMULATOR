(function(root) {
  'use strict';

  function validate(message, context) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return 'INVALID_MESSAGE';
    }
    if (message.channel !== 'zt-minigame' || message.version !== 1 || message.type !== 'result') {
      return 'INVALID_PROTOCOL';
    }
    if (message.gameId !== context.gameId || message.sessionId !== context.sessionId || message.runId !== context.runId) {
      return 'INVALID_SESSION';
    }
    if (typeof message.eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(message.eventId)) {
      return 'INVALID_EVENT_ID';
    }

    const p = message.payload;
    if (!p || !['completed', 'failed', 'abandoned'].includes(p.outcome)) {
      return 'INVALID_OUTCOME';
    }
    if (!Number.isSafeInteger(p.rawScore) || p.rawScore < 0 || p.rawScore > 100) {
      return 'INVALID_SCORE';
    }
    if (!Number.isSafeInteger(p.durationMs) || p.durationMs < 0 || p.durationMs > 3600000) {
      return 'INVALID_DURATION';
    }

    const m = p.metrics;
    if (!m || typeof m !== 'object') {
      return 'INVALID_METRICS';
    }
    if (!Number.isSafeInteger(m.levelsCompleted) || m.levelsCompleted < 0 || m.levelsCompleted > 13) {
      return 'INVALID_LEVELS_METRIC';
    }
    if (!Number.isSafeInteger(m.totalMoves) || m.totalMoves < 0) {
      return 'INVALID_MOVES_METRIC';
    }

    // Integrity check
    if (p.outcome === 'completed' && p.rawScore === 100 && m.levelsCompleted !== 13) {
      return 'INVALID_COMPLETION';
    }

    return null;
  }

  function reward(payload) {
    const score = payload.rawScore || 0;
    if (score >= 100) return 20;
    if (score >= 60) return 10;
    if (score >= 30) return 5;
    return 0;
  }

  const api = { validate, reward };
  root.ZTMockRules = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
