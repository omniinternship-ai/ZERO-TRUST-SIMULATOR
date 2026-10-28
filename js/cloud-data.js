(() => {
  'use strict';
  function account() {
    const client = window.ZeroTrustAuth?.getClient();
    const user = window.ZeroTrustAuth?.getUser();
    if (!client || !user || user.is_anonymous) throw new Error('กรุณาเข้าสู่ระบบก่อน');
    return { client, user };
  }
  async function load() {
    const {client,user} = account();
    const {data,error} = await client.from('v003_player_data').select('*').eq('player_id',user.id).maybeSingle();
    if(error) throw error;
    return data;
  }
  async function save(snapshot, expectedRevision) {
    const {client} = account();
    if(!Number.isSafeInteger(expectedRevision) || expectedRevision<0) throw new Error('ต้องระบุ revision ที่โหลดล่าสุด');
    const {data,error} = await client.rpc('save_v003_player_data', {
      p_stats:snapshot.stats, p_progression:snapshot.progression,
      p_blocktown_answers:snapshot.blocktownAnswers, p_expected_revision:expectedRevision
    });
    if(error) throw error;
    return data;
  }
  function snapshot() {
    const stats = window.PlayerStatsManager?.loadStats();
    if(!stats) throw new Error('ระบบสถิติยังไม่พร้อม');
    return {
      stats,
      progression:window.QuestProgressionManager?.loadProgression() || {},
      blocktownAnswers:JSON.parse(localStorage.getItem('zerotrust_blocktown_v1') || '[]')
    };
  }
  // Explicit API only: loading never overwrites local saves or switches account data.
  window.ZeroTrustCloudData = Object.freeze({load,save,snapshot});
})();
