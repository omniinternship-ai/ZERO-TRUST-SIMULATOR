# V0.0.3 Google Login

ใช้โปรเจกต์และ publishable key เดิมใน `js/supabase-config.js` และ session storage key เดิม `zt-player-auth` ไม่มี service-role key ในหน้าเว็บ

หน้า Start Game มี Google Login, สถานะบัญชี, ออกจากระบบ และ Guest เมื่อกลับจาก Google จะแสดงบัญชี แล้วกด Start Game เข้าเกม ใช้ Supabase JS PKCE และจดจำ session

## การตั้งค่าบนบริการ
- Supabase Authentication > Providers > Google: เปิดใช้งานและตั้ง Google Client ID / Client Secret ใน Dashboard เท่านั้น
- Google OAuth authorized redirect URI: https://jlixqfraseqtwcanihao.supabase.co/auth/v1/callback
- Supabase Authentication > URL Configuration > Redirect URLs: เพิ่ม URL หน้า V003 ที่เปิดจริง เช่น http://127.0.0.1:8766/ZERO%20TRUST%20SIMULATOR.V0.0.3/ZERO%20TRUST%20SIMULATOR/index.html และ URL production เมื่อเผยแพร่
- ทดสอบผ่าน HTTP/HTTPS ไม่ใช่ file://

การเชื่อมต่อนี้ใช้ Auth เดิม ไม่เปลี่ยน schema.sql / RLS หรือ submit_result เดิมซึ่งรับเฉพาะ kai-v1 จำนวน 10 คำตอบ คะแนน V003 และโบนัส BlockTown ยังเป็น localStorage; ไม่ได้ส่งคะแนนเหล่านี้เข้า RPC เดิมเพราะโครงสร้างต่างกัน

ตรวจ syntax และ mock auth ผ่านแล้ว ยังไม่ได้ทดสอบลงชื่อเข้าใช้ Google จริง: เครื่องตรวจ resolve โดเมน Supabase เดิมไม่สำเร็จ ต้องตรวจสถานะโปรเจกต์และการตั้งค่า provider/redirect ข้างต้น
