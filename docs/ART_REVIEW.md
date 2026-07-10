# ART REVIEW

## Current Status

เจมทั้ง 6 เป็น procedural pixel art 16x16 (ขยาย 4 เท่า) ทรงเอกลักษณ์ครบ: Ruby Core (หกเหลี่ยมหนัก), Nova Crystal (ดาวแฉก), Emerald Pulse (คริสตัลงอกออร์แกนิก), Meteor Shard (สะเก็ดแตก), Nebula Prism (ปริซึมไหลเบี้ยว), Solar Core (กลมร่องกลไก) — แยกได้จาก silhouette ล้วนโดยไม่พึ่งสี

## What improved (TASK-005)

- จานสีจากนีออนอาร์เคด → แร่ธรรมชาติโทนอุ่นหม่น
- พาสวัสดุร่วม: rim light / contact shadow / specular ทิศแสงบน-ซ้ายเดียวกันทั้งเซ็ต
- เหลี่ยมผลึก dither อสมมาตรต่อชนิด + รอยร้าว Ruby/Meteor
- Glow เบาลง แกน Nova เลิกขาวจ้า — ไม่มี harsh bloom

## Remaining issues

- ความละเอียด 16x16 จำกัดรายละเอียด facet — ขึ้น 24x24 หรือ 32x32 จะได้อีกขั้น
- Emerald ยังอ่านเป็น "แท่งเหลี่ยม" มากกว่า "ผลึกธรรมชาติ" ที่ระยะไกล
- ตัวพิเศษ (bomb/nova overlay) ยังใช้สีชุดเก่า จัดจ้ากว่าเจมใหม่เล็กน้อย
- Idle animation ยังเป็น breathe แบบเดียวกันทุกเจม

## Future direction

- ยกตัวพิเศษให้เข้าจานสีแร่ (task เล็ก)
- Idle identity ต่อเจม (float/rotation/sparkle จังหวะต่างกัน) — โครง PROFILES รองรับแล้ว
- เมื่ออาร์ตนิ่ง: บันทึกเป็น sprite sheet จริงผ่าน interface `buildSprites()` เดิม

## Recommendation

ทำ special-gem palette sync ก่อน (งานเล็กเก็บความ consistent) แล้วค่อย idle identity — จากนั้นอาร์ตฝั่งเจมถือว่าพร้อมสำหรับ v0.6
