# Short Series / SHOT
เว็บซีรีส์แนวตั้งแยกจาก Simulation พร้อมหน้าผู้ชมและ SHOT Studio สำหรับจัดการเนื้อหา

- ผู้ชม: index.html — ค้นหา เลือกหมวด บันทึกรายการโปรด และรับชมตอนที่เผยแพร่
- หลังบ้าน: admin/index.html — Google Login, เพิ่มซีรีส์/โปสเตอร์/รายละเอียด อัปโหลดวิดีโอ และเลือกสถานะร่างหรือเผยแพร่
- วิดีโอ MP4/WebM สูงสุด 50 MiB ต่อไฟล์ เก็บใน Supabase Storage แบบ private
- รายละเอียดเก็บใน shorts_series และ shorts_episodes สิทธิ์อัปโหลดตรวจจาก shorts_admins และ RLS
- ยังไม่ได้เชื่อมไอคอนใน Simulation และยังไม่ได้เผยแพร่ขึ้น GitHub

## เริ่มใช้งาน
อ่าน SETUP-ADMIN.md แล้วรัน supabase/short-series.sql ใน Supabase โปรเจกต์เดิม จากนั้นกำหนดบัญชีแอดมินและเพิ่ม Redirect URL สำหรับหน้าหลังบ้าน
config.js ใช้ publishable key สำหรับเว็บ ห้ามใส่ service_role key หรือ Client Secret
เปิดผ่าน HTTP/HTTPS สำหรับ Google Login; file:// ใช้เข้าสู่ระบบไม่ได้

หากยังเชื่อมตารางไม่ได้ หน้าผู้ชมจะแจ้งโหมดตัวอย่างพร้อมซีรีส์จำลอง เมื่อเชื่อมสำเร็จจะแสดงเฉพาะเนื้อหาจริงที่เผยแพร่

## GitHub Pages
Repository เดิม: อัปโหลดทั้งโฟลเดอร์ Short-Series แล้วเปิด /Short-Series/ และ /Short-Series/admin/index.html
Repository ใหม่: อัปโหลดไฟล์ภายในโฟลเดอร์นี้ที่ราก แล้วปรับ Redirect URL ให้ตรงกับที่อยู่จริง

## ตรวจสอบ
node tests/admin.test.cjs
node tests/service.test.cjs
ทดสอบฟอร์ม สิทธิ์ฝั่งหน้าเว็บ และการเชื่อม API ด้วย mocks แล้ว การอัปโหลดจริงและนโยบายฐานข้อมูลต้องทดสอบหลังติดตั้ง SQL และกำหนดแอดมิน
