# KNOWN_ISSUES

อัปเดตล่าสุด: ปิด Sprint 2 (TASK-007)

## Current limitations

- ความละเอียดเจม 16x16 (ขยาย 4 เท่า) — จำกัดรายละเอียด facet/รอยร้าว
- เทสต์เป็นลอจิกล้วน ยังไม่มี visual regression test นอกจาก silhouette mask
- ฟอนต์โหลดจาก Google Fonts — ต้องออนไลน์ครั้งแรก เสี่ยง FOUT บนเน็ตช้า
- ไม่มี CI — เทสต์ต้องรันมือ (`npm test`) ก่อน commit

## Temporary procedural gem graphics

เจมทั้ง 6 เป็น procedural pixel art ชั่วคราว (สร้างด้วยโค้ดใน `GemArt.js`)
คุณภาพระดับ prototype ที่ "ใช้ได้จริง" แต่ยังไม่ใช่งานอาร์ตโปรดักชัน

## Future production sprite replacement

เมื่อได้งานอาร์ตจริง: แทนที่ `GemArt.buildSprites()` ให้โหลด sprite sheet
แทนการ generate — interface อื่นคงเดิมทั้งหมด ไม่ต้องแตะ Renderer/Game
(ดูหมายเหตุใน `js/engine/GemArt.js` หัวไฟล์)

## Remaining art improvements

- ตัวพิเศษ (bomb overlay / nova) ยังใช้สีชุดเก่าที่จัดจ้ากว่าจานสีแร่ใหม่
- Emerald Pulse อ่านเป็นแท่งเหลี่ยมที่ระยะไกล ควรเพิ่มความออร์แกนิก
- Idle animation ยังเป็น breathe แบบเดียวกันทุกเจม (โครง PROFILES พร้อมแล้ว)
- Selection glow ใช้ glow ขาวกลาง อาจปรับตามสีเจมที่เลือก

## Technical debt

- `Game.FALL_DURATION` ค่าคงที่ตาย ไม่ถูกใช้แล้ว (fall คิดตามระยะจริง)
- `Effects.shakeOffset` คืน object ใหม่ทุกเฟรม — จุด allocation สุดท้ายที่เหลือ
- `tests/test.js` ไฟล์เดียว 300+ บรรทัด — ควรแยกตามระบบเมื่อโตกว่านี้
- ~~เลขเวอร์ชัน/ชื่อไม่ sync~~ ✅ แก้แล้ว (TASK-013): index/package/GDD → GemVerse v0.5.0 ตรงกันทั้ง repo

## Known low priority issues

- hit-stop หยุดพาร์ติเคิลพื้นหลังด้วย (สั้นมากจนไม่สังเกต — ถ้าจะแก้ต้องแยกชั้น update)
- `ctx.save/restore` ต่อดาวตกต่อเฟรม (ถูกแล้ว แต่รีดได้อีกด้วย setTransform ตรง)
- reshuffle ตอนกระดานตันเกิดทันทีไม่มีอนิเมชันบอกผู้เล่น
