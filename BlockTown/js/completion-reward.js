(() => {
'use strict';
const STATS='zerotrust_player_stats_v1',PROGRESS='zerotrust_blocktown_v1',REWARD_ID='blocktown-topup-v1:completion',POINTS=20;
function completed(){try{const a=JSON.parse(localStorage.getItem(PROGRESS));return Array.isArray(a)&&a.length===5&&a.every(n=>Number.isInteger(n)&&(n===0||n===1));}catch(_){return false;}}
function commit(){
if(!completed())return {awarded:false,reason:'incomplete'};
try{
 const raw=localStorage.getItem(STATS);const stats=raw?JSON.parse(raw):{totalScore:0,missionScore:0,minigameScore:0,counts:{safest:0,low_safety:0,risky:0,scammed:0},history:[]};
 if(!stats||typeof stats!=='object'||Array.isArray(stats)||!Array.isArray(stats.history))throw new Error('invalid stats');
 if(stats.history.some(e=>e.rewardId===REWARD_ID))return {awarded:false,reason:'already-awarded',points:POINTS};
 const mission=stats.missionScore===undefined?(stats.totalScore||0):stats.missionScore,mini=stats.minigameScore||0;
 if(!Number.isFinite(mission)||!Number.isFinite(mini))throw new Error('invalid scores');
 const updated={...stats,missionScore:mission+POINTS,minigameScore:mini,totalScore:mission+POINTS+mini,history:[...stats.history,{type:'blocktown_completion',game:'blocktown',scenarioId:'blocktown-topup-v1',rewardId:REWARD_ID,points:POINTS,timestamp:Date.now()}]};
 // Reward marker and score are written together; a failed write never marks the reward claimed.
 localStorage.setItem(STATS,JSON.stringify(updated));return {awarded:true,points:POINTS};
}catch(_){return {awarded:false,reason:'storage-error'};}
}
async function award(){const result=typeof navigator!=='undefined'&&navigator.locks?.request?await navigator.locks.request(REWARD_ID,commit):commit();window.dispatchEvent(new CustomEvent('zerotrust:blocktown:reward',{detail:result}));window.PlayerStatsManager?.updateUI();const notice=document.getElementById('rewardNotice');if(notice){notice.textContent=result.awarded?'✓ จบ BlockTown ได้รับ +20 คะแนนแล้ว':result.reason==='already-awarded'?'✓ รับรางวัลจบภารกิจ 20 คะแนนแล้ว':result.reason==='storage-error'?'บันทึกคะแนนไม่ได้ กรุณาเปิดเกมอีกครั้งเพื่อลองใหม่':'';}return result;}
window.BlockTownCompletionReward=Object.freeze({award});
window.addEventListener('zerotrust:game:complete',award);
window.addEventListener('storage',e=>{if(e.key===STATS)window.PlayerStatsManager?.updateUI();if(e.key===PROGRESS)award();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',award);else award();
})();
