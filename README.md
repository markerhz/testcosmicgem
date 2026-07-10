# 💎 GemVerse

Modern Indie Match-3 Roguelite — HTML5 Canvas ล้วน ไม่ใช้เฟรมเวิร์ก ไม่ใช้ไลบรารี

GemVerse ไม่ใช่ Candy Crush อีกเกม — มันคือ **Tiny Living Universe**:
กระดานคือเครื่องขุดคริสตัล UI คือแผงควบคุมยานอวกาศ ทุกอย่างต้องรู้สึกมีชีวิต

## 📌 สถานะการพัฒนา

**Sprint 2 ปิดแล้ว** — เป้าหมายถัดไป: **Version 0.5**

Sprint 2 ส่งมอบ: สถาปัตยกรรม GemArt (แยกอาร์ตจากเอนจิน), เจม 6 ทรงเอกลักษณ์,
วัสดุแร่ธรรมชาติ, ศูนย์ allocation ต่อเฟรม — ดู `docs/SPRINT_REVIEW.md`

## ✨ ฟีเจอร์ที่มีแล้ว

- Match-3 ครบวงจร: swap (แตะ/ปัด), match, gravity, cascade, สลับกลับเมื่อพลาด, กันเกมตัน
- คะแนนแบบ chips × mult — คอมโบต่อเนื่องดันตัวคูณ
- เจมพิเศษ: เรียง 4 = 💣 ระเบิด 3x3 (ลูกโซ่ได้), เรียง 5 = 🌟 โนวาล้างทั้งสี
- Game feel: hit-stop, pop 2 จังหวะ, fall ตามระยะจริง, จอสั่น, พาร์ติเคิล, เสียง WebAudio สังเคราะห์
- **เจม 6 ชนิด ทรงเอกลักษณ์** (Ruby Core, Nova Crystal, Emerald Pulse, Meteor Shard, Nebula Prism, Solar Core) วัสดุแร่ procedural — จำได้จาก silhouette โดยไม่พึ่งสี
- พื้นหลังจักรวาลพารัลแลกซ์ + CRT overlay, 60 FPS บนมือถือ (ศูนย์ allocation ต่อเฟรม)

## 📁 โครงสร้าง repository

```
testcosmicgem/
├── index.html / css/style.css
├── js/
│   ├── main.js            # จุดเริ่มต้น
│   ├── engine/
│   │   ├── Game.js        # state machine + ลูปหลัก + เชื่อมทุกระบบ
│   │   ├── Renderer.js    # จัดฉาก/เฟรม (ไม่รู้วิธีวาดเจม)
│   │   ├── GemArt.js      # 🎨 งานอาร์ตเจมทั้งหมด — ศิลปินแก้ไฟล์นี้ไฟล์เดียว
│   │   ├── Input.js       # แตะ/ปัด → พิกัดช่อง
│   │   ├── Animation.js   # tween กลาง (Promise-based, รองรับ delay)
│   │   ├── Effects.js     # พาร์ติเคิล/เลขลอย/จอสั่น (ข้อมูลล้วน)
│   │   └── Sfx.js         # เสียงสังเคราะห์ WebAudio
│   ├── board/             # Board / Cell / Candy (ข้อมูลล้วน)
│   └── systems/           # Match / Gravity / Score / Save (กติกา)
├── tests/test.js          # 51 เทสต์ ไม่แตะ DOM
└── docs/                  # BIBLE, SPRINT, CHANGELOG, ART_REVIEW, KNOWN_ISSUES ฯลฯ
```

สถาปัตยกรรมหลัก: **Gameplay ↮ Rendering แยกขาด** | Renderer → GemArt → Gem Drawing
เปลี่ยนงานศิลป์ (รวม sprite sheet ในอนาคต) โดยไม่แตะโค้ดเกม

## 🚀 Build / Run

ไม่มีขั้น build — ES Modules ต้องรันผ่านเว็บเซิร์ฟเวอร์:

```bash
python3 -m http.server 8000   # หรือ npx serve .
```

เปิด `http://localhost:8000` — หรือใช้ GitHub Pages ได้ทันที

ทดสอบ: `npm test` (Node ล้วน ไม่ต้องมีเบราว์เซอร์)

## 🔁 Development workflow

1. อ่าน `CLAUDE.md` + `docs/CURRENT_SPRINT.md` ก่อนเริ่มทุก task
2. หนึ่ง task = หนึ่งเรื่อง = commit เล็ก — ไม่แตะไฟล์นอกขอบเขต
3. รัน `npm test` ก่อน commit เสมอ (51 เทสต์ต้องผ่าน)
4. งานอาร์ตแก้ที่ `GemArt.js` เท่านั้น / ห้าม redesign เกมหรือสถาปัตยกรรมโดยไม่ได้รับมอบหมาย
5. จบ task: อัปเดต `docs/CHANGELOG.md` แล้วรายงาน Summary / Files / Tests / Next

## 🗺️ Roadmap ปัจจุบัน

- **v0.5** (ถัดไป) — Sprint 3: special gem palette sync, gem idle identity, CI, เก็บ technical debt
- v0.6 — Tiny Universe Foundation
- v0.7 — Crew Framework
- v0.8 — Ship Modules
- v0.9 — Galaxy Expedition
- v1.0 — Public Demo

ข้อจำกัดที่รู้อยู่: `docs/KNOWN_ISSUES.md`
