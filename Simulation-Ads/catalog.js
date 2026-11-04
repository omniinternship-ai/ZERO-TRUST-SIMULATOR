// One row per simulated campaign. Destinations are internal route keys.
window.SimulationAdCatalog = [
  { id: 'shot-premiere', advertiser: 'SHOT', title: 'คลิกเลย! รางวัลใหญ่รออยู่', cta: 'คลิกเลย', body: 'เปิดคลังซีรีส์แล้วเลือกตอนที่อยากดู', destination: 'shot-series', placements: ['video', 'minigame'], weight: 2 },
  { id: 'game-break', advertiser: 'Mini Game Arcade', title: 'ลุ้นรางวัลใหญ่! สิทธิ์พิเศษรอคุณอยู่', cta: 'ลองลุ้นเลย', body: 'เลือกเกมสั้น ๆ จากคลังมินิเกม', destination: 'minigames', placements: ['video', 'minigame'], weight: 2 },
  { id: 'blocktown-trip', advertiser: 'BlockTown', title: 'ด่วน! เปิดกล่องลุ้นรางวัลใหญ่', cta: 'เปิดกล่องเลย', body: 'สำรวจเมืองและฝึกจับกลโกงเติมเงิน', destination: 'blocktown', placements: ['video', 'minigame'], weight: 1 }
];
