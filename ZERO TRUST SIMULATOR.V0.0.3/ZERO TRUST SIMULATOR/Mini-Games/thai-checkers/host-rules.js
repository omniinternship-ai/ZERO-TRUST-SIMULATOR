(() => {
 'use strict';
 const rules={
  validate(m,ctx){
   if(!m||typeof m!=='object'||Array.isArray(m))return 'MALFORMED_MESSAGE';
   if(m.channel!=='zt-minigame'||m.version!==1||m.type!=='result')return 'INVALID_PROTOCOL';
   if(m.gameId!==ctx.gameId)return 'WRONG_GAME_ID';
   if(m.sessionId!==ctx.sessionId||m.runId!==ctx.runId)return 'INVALID_SESSION';
   if(typeof m.eventId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.eventId))return 'INVALID_EVENT_ID';
   const p=m.payload;if(!p||typeof p!=='object'||Array.isArray(p))return 'MALFORMED_PAYLOAD';
   if(!['completed','failed','abandoned'].includes(p.outcome))return 'INVALID_OUTCOME';
   if(!Number.isSafeInteger(p.rawScore)||p.rawScore<0||p.rawScore>50)return 'INVALID_SCORE';
   if(!Number.isSafeInteger(p.durationMs)||p.durationMs<0||p.durationMs>86400000)return 'INVALID_DURATION';
   const stats=p.metrics;if(!stats||typeof stats!=='object'||typeof stats.won!=='boolean')return 'INVALID_METRICS';
   for(const key of ['moves','playerCaptures','aiCaptures','playerKings','aiKings'])if(!Number.isSafeInteger(stats[key])||stats[key]<0||stats[key]>(key==='moves'?100000:8))return 'INVALID_METRICS';
   if(typeof stats.reason!=='string'||stats.reason.length>300)return 'INVALID_METRICS';
   if(p.outcome==='completed'&&(!stats.won||p.rawScore!==50))return 'INVALID_COMPLETION';
   if(p.outcome!=='completed'&&(stats.won||p.rawScore!==0))return 'INVALID_COMPLETION';
   return null;
  },
  // Practice/mock proposal only. Production host must approve the award policy.
  reward(p){return p.outcome==='completed'&&p.rawScore===50?50:p.outcome==='failed'?-20:0;}
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=rules;else window.ZTMockRules=rules;
})();
