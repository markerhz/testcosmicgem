# Roadmap — GemVerse

หลักการ: **หนึ่งเวอร์ชัน = หนึ่งเป้าหมาย** ไม่ขยาย scope นอกแผน
(แผนระยะยาว 6 ระยะ: Foundation → Identity → Gameplay → Tiny Universe → Rebrand → Public Demo)

## ระยะที่ 1 — Foundation ✅ เสร็จแล้ว

ประวัติ: v0.1 swap prototype → v0.2 สถาปัตยกรรม ES6 + match/cascade/คะแนน/ตัวพิเศษ/เอฟเฟกต์
→ v0.3–0.4 swipe, HUD, พารัลแลกซ์, game feel → Sprint 2: GemArt architecture, ศูนย์ allocation,
เทสต์ 51 ข้อ, review process (รายละเอียดใน CHANGELOG.md / SPRINT_REVIEW.md)

## v0.5 — Visual Identity (กำลังทำ ~60%)

เป้าหมาย: ทำให้เกมเริ่มมี "ตัวตน" — เห็นภาพเดียวก็รู้ว่าเกมนี้

- [x] ออกแบบ Crystal ใหม่ทั้ง 6 ชนิด (ทรงเอกลักษณ์ + เจียระไน 32x32)
- [x] Animation ต่อ Crystal มีเอกลักษณ์ (ลอย/ออร่า/ประกาย คนละจังหวะ)
- [x] Particle และ Glow (ออร่าวิ้งเต้น + ประกายโคจร)
- [ ] Sprite / Pixel Art ระดับ Production (รอบขัดเกลาสุดท้าย)
- [ ] Background และ Lighting ยกระดับ
- [ ] UI ธีม Tiny Universe (แผงควบคุมยาน)
- [ ] เสียงและ Game Feel รอบเก็บ

## v0.6 — Gameplay Foundation

เป้าหมาย: เพิ่มความสนุก

- ระบบพื้นที่สำรวจ (Expedition) — ทำเป็นโครง config (พื้นหลัง+แร่+ความยาก) เผื่อ v0.9 เพิ่มพื้นที่ได้โดยไม่เพิ่มระบบ
- Crystal แต่ละชนิดมีบทบาทมากขึ้น / Special Crystal เพิ่มเติม
- Combo และ Chain ลึกขึ้น / ปรับสมดุลคะแนน / ปรับความยาก
- 🔧 โครงพื้นฐานที่ต้องเข้าในเวอร์ชันนี้: **Save (localStorage)** — จำเป็นก่อน Ship Progression + **CI รัน npm test**

## v0.7 — Living Ship

เป้าหมาย: ยานเป็น "บ้าน"

- หน้าเข้าเกมเป็นยานอวกาศ / ห้องควบคุม
- Aura Loom (เครื่องขุดผลึก — หัวใจของยาน)
- หน้าต่างดูอวกาศ / หุ่นยนต์ผู้ช่วย / ของตกแต่ง / บรรยากาศมีชีวิต

## v0.8 — Ship Progression

เป้าหมาย: ผู้เล่นรู้สึกว่ากำลังพัฒนายาน

- อัปเกรดเครื่องขุด / พลังงาน / คลังเก็บ / เครื่องยนต์
- ปลดล็อกห้องใหม่ / ยานเปลี่ยนรูปลักษณ์ตามการอัปเกรด

## v0.9 — Galaxy Exploration + Rebrand

เป้าหมาย: ขยายโลก + ตัวตนสุดท้ายก่อน demo

- พื้นที่ใหม่ (เพิ่ม config จากโครง v0.6): Asteroid Belt, Frozen Moon, Nebula Field, Ancient Ruins, Solar Storm — แต่ละที่มีพื้นหลัง/แร่/ความยาก/เอฟเฟกต์ต่างกัน
- 🏷️ Rebrand ต้องจบในเวอร์ชันนี้ (ชื่อเกมสุดท้าย, โลโก้, Title Screen) — ก่อนทำ store assets ใน v1.0

## v1.0 — Public Demo

เป้าหมาย: เวอร์ชันให้คนเล่นจริง

- เกมเพลย์หลักสมบูรณ์ / งานภาพ Production / เสียงครบ / UI สมบูรณ์
- ปรับสมดุล / แก้บั๊กหลัก / Steam Capsule + Store Assets / ปล่อย Demo เก็บ Feedback

## หลัง v1.0 (พิจารณาตามลำดับ)

Crew, ภารกิจ, เนื้อเรื่อง, เหตุการณ์สุ่ม, Achievements, Cloud Save, Steam / Android

## หมายเหตุวิศวกรรม

- Offline First เสมอ — ออนไลน์เป็นแค่ตัวเสริม ห้ามพึ่งเซิร์ฟเวอร์
- อนาคต Anti-cheat: เซิร์ฟเวอร์ตรวจ seed + moves + replay — ไม่เชื่อคะแนนจาก client
