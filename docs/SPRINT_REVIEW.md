# Sprint 2 Summary

Engineering Review — TASK-006 (2026-07-11)

## Achievements

- **TASK-002** แยกงานอาร์ตเจมทั้งหมดออกจาก Renderer เป็น `GemArt.js` — พิสูจน์ pixel-identical 100% ก่อนรับงาน
- **TASK-003** ศูนย์ allocation ต่อเฟรมในชั้นพื้นหลัง/ดาวตก (~112 → 0 ต่อเฟรม)
- **TASK-004** เจม 6 ทรงเอกลักษณ์ผ่านระบบ rendering profile ต่อเจม — แยกได้จาก silhouette โดยไม่พึ่งสี
- **TASK-005** วัสดุแร่: จานสีธรรมชาติ, พาสวัสดุกลาง (rim light / contact shadow / facet dither / specular), รอยร้าว, glow เบาลง
- เทสต์โต 47 → 51 ข้อ ผ่านตลอดทุก task / Renderer ไม่ถูกแตะเลยใน TASK-004–005 = สถาปัตยกรรมทำงานจริง

## Architecture improvements

- Renderer 532 → 332 บรรทัด เหลือหน้าที่จัดฉากอย่างเดียว
- เส้นแบ่งชัด: Gameplay (Game/Board/Systems) → ไม่รู้จักอาร์ต | Renderer → ไม่รู้วิธีวาดเจม | GemArt → งานศิลป์ล้วน
- Interface พร้อม sprite sheet อนาคต: แทน `buildSprites()` จุดเดียว

## Performance improvements

- เส้นทางวาดต่อเฟรม: ไม่มี gradient/Path2D/สตริงสี allocation — ลดแรงกด GC บนมือถือ
- สไปรต์/glow ทั้งหมด prebuild ครั้งเดียว ตอน constructor

## Technical debt

- `Game.FALL_DURATION` เป็นค่าคงที่ตาย (ไม่ถูกใช้แล้วตั้งแต่ fall ตามระยะ)
- `Effects.shakeOffset` ยังคืน object ใหม่ทุกเฟรม (จุด alloc สุดท้ายที่เหลือ)
- ตัวพิเศษ (bomb/nova overlay) ยังใช้สีชุดเก่าที่จัดกว่าจานสีแร่ใหม่
- เทสต์รวมไฟล์เดียว 300+ บรรทัด — ควรแยกตามระบบเมื่อโตกว่านี้
- ฟอนต์พึ่ง Google Fonts (ออนไลน์เท่านั้น) — เสี่ยง FOUT บนมือถือ/ออฟไลน์

## Known risks

- **เวอร์ชันเอกสารไม่ตรงกัน**: CURRENT_SPRINT ระบุ v0.4, package.json/README ระบุ v0.4.1, CHANGELOG ใช้หัว "v0.5.0-dev" — ต้อง sync ก่อนประกาศ v0.5
- ณ เวลารีวิว TASK-005 ยังไม่ถูกอัปโหลดขึ้น repo (โค้ดอยู่ในชุดส่งมอบแล้ว) — ระวังลำดับการอัปโหลด
- ไม่มี CI — เทสต์รันมือเท่านั้น ถ้าลืมรันก่อน commit จะไม่มีตัวจับ
- ยังไม่มี visual regression test นอกจาก silhouette mask (การเปลี่ยนสี/วัสดุตรวจไม่เจอ)

## Lessons learned

- การพิสูจน์ pixel-identical ก่อน refactor (TASK-002) ทำให้รับงานได้โดยไม่ต้องเปิดเบราว์เซอร์
- แยก art ออกก่อน (TASK-002) แล้วค่อยแก้ art (TASK-004/005) ทำให้ 2 task หลังแตะไฟล์เดียวจบ — ยืนยันคุณค่าของลำดับงานจาก audit
- เทสต์ silhouette mask จับ "เอกลักษณ์ทรง" เป็นตัวเลขได้ ใช้ต่อได้ทุกครั้งที่แก้อาร์ต

## Recommendations for Sprint 3

1. **Version sync + tag v0.5** — แก้ CURRENT_SPRINT/package/README ให้ตรงกัน แล้วประกาศ v0.5
2. **Special palette sync** — จูน bomb/nova เข้าจานสีแร่ (งานเล็ก ปิดความ consistent)
3. **Gem idle identity** — float/rotation/sparkle จังหวะต่างต่อเจมผ่าน PROFILES ที่มีอยู่
4. **CI** — GitHub Action รัน `npm test` ทุก push (ไฟล์เดียว ~15 บรรทัด)
5. เก็บ debt เล็ก: ลบ `FALL_DURATION`, scratch object ใน `shakeOffset`

## Readiness for Version 0.5

**พร้อม** เมื่ออัปโหลด TASK-005 + sync เวอร์ชันแล้ว — เกมเพลย์เสถียร (เทสต์ 51/51), ประสิทธิภาพสะอาด, เอกลักษณ์ภาพชัดเจน
