# หมากฮอสไทย เวอร์ชันส่งมอบ 1.0.1

Game ID: thai-checkers
Protocol: zt-minigame/1

## เปิดเกม
เปิด index.html ผ่าน static HTTP server เช่นรัน `python -m http.server 8780 --bind 127.0.0.1` ในโฟลเดอร์ thai-checkers แล้วเปิด http://127.0.0.1:8780/index.html
เปิด test-host.html ที่โฟลเดอร์เดียวกันเพื่อทดสอบ iframe, pause/resume, replay และ duplicate result ด้วยคะแนนจำลอง ไม่ต้องมี Simulation หรือ Supabase

## กติกา
กระดาน 8×8 ฝ่ายละ 8 ตัว ผู้เล่นหมากดำเดินก่อน เบี้ยเดินและกินไปข้างหน้า บังคับกินเมื่อมีตากิน มีการกินต่อเนื่องและเข้าฮอสเมื่อถึงแถวสุดท้าย ฮอสเดินทแยงระยะไกล และกินโดยลงช่องแรกหลังตัวที่ถูกกินตามกฎที่ implementation นี้ใช้ แต่ละฝ่ายมีเวลา 300 วินาที ผู้เล่นชนะเมื่อ AI หมากหมด ถูกขัง หรือหมดเวลา ผู้เล่นแพ้เมื่อเงื่อนไขเดียวกันเกิดกับตนหรือยอมแพ้

## ไฟล์
- index.html, style.css: หน้าจอเกม
- game.js: กติกา AI เสียงสังเคราะห์ และ lifecycle
- sdk.js: handshake/result/ack/replay ตาม zt-minigame/1
- manifest.json: metadata มาตรฐาน Mini Game Studio
- host-rules.js, test-host.html, test-host.js: โฮสต์ทดสอบเท่านั้น
- tests/thai-checkers.test.cjs: ทดสอบ engine และ lifecycle ด้วย mock DOM

ไม่มี dependency ภายนอก รูปแบบกระดานใช้ CSS เสียงใช้ Web Audio ไม่มีไฟล์เสียงที่ต้องดาวน์โหลด ส่วนชื่อผู้พัฒนาและข้อมูลที่มาคงจากต้นฉบับ ผู้ส่งต้องรับรองสิทธิ์ซอร์สและทรัพยากรก่อนใช้งานจริง

## คะแนนแยกสองชนิด
- rawScore สำหรับส่งผล: ชนะ = 50, แพ้/ยอมแพ้/หมดเวลา = 0 อยู่ในช่วง 0–50 เป็นจำนวนเต็ม
- คะแนนฝึกในเกมเดี่ยว: ชนะ +50, แพ้ -20 เก็บเฉพาะ key zt_thai_checkers_score ไม่แก้ key คะแนนของ Simulation
- ข้อเสนอรางวัลของ mock host: completed +50, failed -20, abandoned 0 เป็นข้อเสนอ ยังไม่ได้อนุมัติสำหรับอันดับจริง ห้ามนำ rawScore 0 ไปตีความเป็น -20 เองโดยไม่มีนโยบายฝั่ง host
- โหมด iframe ไม่แก้ยอดคะแนนฝึก เกมส่งผลเพียงครั้งเดียวต่อรอบ ส่งซ้ำใช้ eventId เดิม และ replay ต้องรอ runId ใหม่จาก host
- metrics: won boolean, moves จำนวนเต็มไม่ติดลบ, playerCaptures/aiCaptures/playerKings/aiKings จำนวนเต็ม 0–8, reason string ไม่เกิน 300 ตัวอักษร
- durationMs เป็นเวลาจากเริ่มถึงจบรอบ รวมเวลาพักได้ จึงใช้เพดาน 24 ชั่วโมงใน mock validator ไม่ถือเป็นหลักฐานป้องกันโกง

## การเปลี่ยนจากต้นฉบับ
1. ปรับ manifest ให้ตรงชุด Skill และหน้า Studio เวอร์ชัน 1.0.1
2. แยก rawScore ไม่ติดลบออกจากแต้มฝึก/ข้อเสนอรางวัล
3. กัน endGame ซ้ำไม่เพิ่มแต้ม/ส่งผลซ้ำ
4. รอ host init ก่อนเริ่มเกมใน iframe และรอ host ออกรอบใหม่เมื่อ replay
5. พัก input/เวลา/เสียง จัดการ AI ที่รออยู่เมื่อกลับมาเล่น และยกเลิก async move ของรอบเก่าเมื่อ stop/เปลี่ยนรอบ
6. ตรวจผู้เล่นฝ่ายถัดไปว่ามีตาเดินหลังสลับ turn เพื่อไม่ตัดสินแพ้ฝ่ายที่เพิ่งเดินผิดจังหวะ
7. เพิ่มข้อความรับผลและปุ่มส่งผลเดิมใหม่เมื่อไม่ได้ ack

## ทดสอบ
รัน `node tests/thai-checkers.test.cjs`
ตรวจผ่าน: กติกาเริ่มต้น บังคับกิน เข้าฮอส ฮอสบิน การลงหลังกิน ชนะ/แพ้ ยอมแพ้ กันจบซ้ำ พัก input รอ handshake แยกคะแนนฝึก/host และขอ replay ใหม่
ตรวจ syntax และแพ็กเกจด้วย ZIP inspector ของ Mini Game Studio แล้ว
ข้อจำกัด: unit tests ใช้ DOM/Audio จำลอง ยังไม่ได้ทดสอบภาพ/เสียงจริงทุกหน้าจอ หรือส่งคะแนนจริงเข้า Simulation/Supabase

## ส่งขึ้นระบบ
GitHub: ใช้โฟลเดอร์ thai-checkers นี้วางใน Mini-Games/ ของ Simulation ที่ใช้งานจริง ไม่อัปโหลดโฟลเดอร์ Thai checkers ชั้นนอกที่มี Skill ปะปน
Studio: ส่งแพ็กเกจ thai-checkers-1.0.1.zip ที่จัดไว้ใน Ready-to-Upload ซึ่งมีไฟล์เกมจริงพร้อม manifest/HANDOFF และโฮสต์ทดสอบ ไม่มี tests หรือ Skill ปะปน
การอัปโหลดไม่เพิ่มเมนูเกมและไม่เชื่อมคะแนนจริงอัตโนมัติ ผู้ดูแลต้องเพิ่ม game registry และ production host adapter ภายหลัง
ต้นฉบับเก็บอยู่ Mini-Games/Thai checkers/games/thai-checkers โดยไม่แก้ไข
