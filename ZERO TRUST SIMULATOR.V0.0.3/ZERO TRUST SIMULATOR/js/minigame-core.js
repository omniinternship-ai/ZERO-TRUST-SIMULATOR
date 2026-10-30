(function(root){
 'use strict';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function stable(value){return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}
 function validate(m,ctx){
  if(!m||typeof m!=='object'||Array.isArray(m)||m.channel!=='zt-minigame'||m.version!==1||m.type!=='result')return 'INVALID_PROTOCOL';
  if(m.gameId!==ctx.gameId||m.sessionId!==ctx.sessionId||m.runId!==ctx.runId)return 'INVALID_SESSION';
  if(typeof m.eventId!=='string'||!UUID.test(m.eventId))return 'INVALID_EVENT_ID';
  const p=m.payload;if(!p||typeof p!=='object'||Array.isArray(p)||!['completed','failed','abandoned'].includes(p.outcome))return 'INVALID_OUTCOME';
  if(!Number.isSafeInteger(p.rawScore)||!Number.isSafeInteger(p.durationMs)||p.durationMs<0||p.durationMs>86400000)return 'INVALID_SCORE_OR_DURATION';
  const v=p.metrics;if(!v||typeof v!=='object'||Array.isArray(v)||stable(p).length>5000)return 'INVALID_METRICS';
  if(m.gameId==='color-sort-puzzle'){
   for(const [key,max] of [['levelsCompleted',13],['totalMoves',1000000],['undoCount',1000000],['resetCount',1000000],['timeRemainingSec',600]])if(!Number.isSafeInteger(v[key])||v[key]<0||v[key]>max)return 'INVALID_METRICS';
   const points=[7,7,7,7,7,8,8,8,8,8,8,8,9];const expected=points.slice(0,v.levelsCompleted).reduce((a,b)=>a+b,0);
   if(p.rawScore!==expected||(p.outcome==='completed'&&v.levelsCompleted!==13))return 'INVALID_COMPLETION';
  }else if(m.gameId==='thai-checkers'){
   if(typeof v.won!=='boolean'||typeof v.reason!=='string'||v.reason.length>300)return 'INVALID_METRICS';
   for(const [key,max] of [['moves',100000],['playerCaptures',8],['aiCaptures',8],['playerKings',8],['aiKings',8]])if(!Number.isSafeInteger(v[key])||v[key]<0||v[key]>max)return 'INVALID_METRICS';
   if(p.outcome==='completed'?(p.rawScore!==50||!v.won):(p.rawScore!==0||v.won))return 'INVALID_COMPLETION';
  }else return 'UNKNOWN_GAME';
  return null;
 }
 function reward(game,p){if(game==='thai-checkers')return p.outcome==='completed'?50:p.outcome==='failed'?-20:0;return p.rawScore>=100?20:p.rawScore>=60?10:p.rawScore>=30?5:0;}
 function commit(options,m){
  const stats=options.loadStats(),fingerprint=stable(m.payload);
  if(!Array.isArray(stats.history)||!Number.isSafeInteger(stats.minigameScore)||stats.minigameScore<0||!Number.isSafeInteger(stats.missionScore))throw Error('INVALID_LOCAL_STATISTICS');
  const previous=stats.history.find(r=>r.externalProtocol===1&&r.game===m.gameId&&r.runId===m.runId);
  if(previous){if(previous.eventId!==m.eventId)throw Error('ROUND_ALREADY_FINISHED');if(previous.resultFingerprint!==fingerprint)throw Error('RESULT_CHANGED');return {status:'accepted',awardedPoints:previous.points,persisted:'local',duplicate:true};}
  const proposed=reward(m.gameId,m.payload),delta=Math.max(-stats.minigameScore,proposed)||0;
  if(!Number.isSafeInteger(stats.minigameScore+delta)||!Number.isSafeInteger(stats.missionScore+stats.minigameScore+delta))throw Error('SCORE_OVERFLOW');
  stats.minigameScore+=delta;stats.totalScore=stats.missionScore+stats.minigameScore;
  stats.history.push({type:'minigame',game:m.gameId,points:delta,timestamp:Date.now(),externalProtocol:1,runId:m.runId,eventId:m.eventId,sessionId:m.sessionId,rawScore:m.payload.rawScore,resultFingerprint:fingerprint});
  const encoded=JSON.stringify(stats);if(new TextEncoder().encode(encoded).length>2000000)throw Error('STATISTICS_STORAGE_FULL');
  options.storage.setItem('zerotrust_player_stats_v1',encoded);
  try{options.update?.(stats);}catch(error){console.warn('Score persisted; UI refresh delayed',error);}
  return {status:'accepted',awardedPoints:delta,persisted:'local',duplicate:false};
 }
 const api=Object.freeze({validate,reward,commit});root.ZTMiniGameCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

