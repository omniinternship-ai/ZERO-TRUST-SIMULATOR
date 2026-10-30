(() => {
  'use strict';
  const gameId='thai-checkers', embedded=window.parent!==window;
  const params=new URLSearchParams(location.search), host=params.get('hostOrigin');
  let validHost=false;
  try{validHost=!!host&&/^https?:$/.test(new URL(host).protocol)&&new URL(host).origin===host;}catch(_){}
  let sessionId=null,runId=null,callbacks={},pending=null,readyTimer=null;
  function envelope(type,payload={},eventId=crypto.randomUUID()) {return {channel:'zt-minigame',version:1,type,gameId,sessionId,runId,eventId,payload};}
  function send(message){if(validHost)window.parent.postMessage(message,host);}
  function ready(){send(envelope('ready',{gameVersion:'1.0.1'}));}
  window.addEventListener('message',event=>{
    if(!embedded||!validHost||event.source!==window.parent||event.origin!==host)return;
    const m=event.data;
    if(!m||m.channel!=='zt-minigame'||m.version!==1||m.gameId!==gameId)return;
    if(m.type==='init'){
      if(typeof m.sessionId!=='string'||typeof m.runId!=='string')return;
      if(m.sessionId===sessionId&&m.runId===runId)return;
      if(pending){clearInterval(pending.timer);pending.reject(Error('Round changed'));pending=null;}
      sessionId=m.sessionId;runId=m.runId;clearInterval(readyTimer);callbacks.start?.({embedded:true,runId});return;
    }
    if(m.sessionId!==sessionId||m.runId!==runId)return;
    if(m.type==='ack'&&pending&&m.eventId===pending.message.eventId){const p=pending;clearInterval(p.timer);pending=null;
      if(m.payload?.status==='accepted')p.resolve(m.payload);else p.reject(Error(m.payload?.reason||'Result rejected'));}
    if(m.type==='pause')callbacks.pause?.({reason:'host'});
    if(m.type==='resume')callbacks.resume?.();
    if(m.type==='stop')callbacks.stop?.();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)callbacks.pause?.({reason:'visibility'});});
  let finalMessage=null;
  window.ZTMiniGame={
    connect(handlers){callbacks=handlers;if(!embedded){callbacks.start?.({embedded:false});return;}
      if(!validHost){callbacks.error?.('Missing valid hostOrigin');return;}ready();readyTimer=setInterval(ready,1500);},
    async finish(payload){
      if(!embedded)return {status:'practice',awardedPoints:0};
      if(!sessionId||!runId)throw Error('Host not ready');
      if(pending)throw Error('Result is being sent');
      if(!finalMessage||finalMessage.runId!==runId)finalMessage=envelope('result',payload);
      return new Promise((resolve,reject)=>{let attempts=1;const p={message:finalMessage,resolve,reject};pending=p;
        p.timer=setInterval(()=>{if(++attempts>3){clearInterval(p.timer);pending=null;reject(Error('No acknowledgement; retry the same result'));return;}send(p.message);},1800);send(p.message);});
    },
    requestReplay(){if(embedded)send(envelope('replay-request'));else callbacks.start?.({embedded:false});}
  };
})();
