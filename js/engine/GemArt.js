/**
 * GemArt — 🎨 งานอาร์ตเจมทั้งหมด (TASK-008: Gem Art Overhaul v2)
 *
 * ยกเครื่องจาก 16x16 แรเงาแบน → 32x32 เจียระไนจริง:
 *   - ทุกเจมประกอบจาก "เหลี่ยม" (facet) ที่คำนวณความสว่างจากมุมตกกระทบแสงจริง
 *     ทิศแสงร่วมทั้งจักรวาล: บน-ซ้าย
 *   - จานสี jewel-tone 6 โทนต่อเจม (เงาลึก→แกนสว่าง) ลึกแบบอัญมณี ไม่ใช่ลูกอม
 *   - โครงต่อเจม: shape (ทรง) → facet (แสงต่อเหลี่ยม) → finish ร่วม → detail เฉพาะตัว
 *
 * สถาปัตยกรรมเดิมทุกประการ: Renderer → GemArt → Gem Drawing
 * interface เดิม: drawGem / selectionGlow / PALETTE / spriteData / bombOverlayData / novaData / cometBeamData / rocketOverlayData
 * sprite sheet อนาคตแทนที่ buildSprites() จุดเดียว
 */
export class GemArt {
  /** ขนาดสไปรต์พิกเซล (32x32 — ขยายลง cell 60px ≈ 1.9 เท่า) */
  static SPRITE = 32;

  /**
   * จานสีอัญมณี 6 โทน: dd=เงาลึกสุด d=เงา m=เนื้อ l=รับแสง s=ไฮไลต์ c=แกน/ประกาย
   * (Game.js ใช้แค่ .m สำหรับสีพาร์ติเคิล — key เดิมครบ ไม่กระทบใคร)
   */
  static PALETTE = [
    { dd: '#5c0e28', d: '#a01840', m: '#e83a64', l: '#ff7290', s: '#ffd4e0', c: '#ffeaf0' }, // 0 Ruby Core
    { dd: '#6e4404', d: '#b8820e', m: '#f4b830', l: '#ffdd66', s: '#fff6d0', c: '#ffffff' }, // 1 Nova Crystal
    { dd: '#0a4426', d: '#178a4c', m: '#2ecc7a', l: '#72ecac', s: '#d4ffe6', c: '#f4fff8' }, // 2 Emerald Pulse
    { dd: '#123a68', d: '#2560a0', m: '#3f9ade', l: '#84d4ff', s: '#e0f6ff', c: '#ffffff' }, // 3 Meteor Shard
    { dd: '#3a1866', d: '#6c34ac', m: '#a45cec', l: '#cc9cfa', s: '#efe0ff', c: '#ffd8f8' }, // 4 Nebula Prism
    { dd: '#663404', d: '#a05a10', m: '#e08a1e', l: '#ffc14e', s: '#ffedc0', c: '#fff8e4' }, // 5 Solar Core
  ];
  /** สีเส้นขอบ (ดำอมม่วงอุ่น — ลายเซ็น GemVerse) */
  static OUTLINE = '#221728';

  /** ทิศแสงร่วมทั้งเซ็ต (หน่วยเวกเตอร์ ชี้ "ไปหา" แหล่งแสงบน-ซ้าย) */
  static LX = -0.7071;
  static LY = -0.7071;

  /**
   * จังหวะชีวิตต่อเจม — ลอยในอวกาศคนละจังหวะ (independent timing)
   *   floatAmp/floatSpeed — ลอยขึ้นลง (px logical / คาบ ms)
   *   glowSpeed           — ออร่าด้านหลังเต้น
   */
  static ANIM = [
    { floatAmp: 1.8, floatSpeed: 830, glowSpeed: 620 },  // Ruby หนัก ลอยช้า
    { floatAmp: 2.4, floatSpeed: 640, glowSpeed: 460 },  // Nova เบา ระยิบเร็ว
    { floatAmp: 1.6, floatSpeed: 920, glowSpeed: 700 },  // Emerald นิ่งสุขุม
    { floatAmp: 2.1, floatSpeed: 720, glowSpeed: 540 },  // Meteor พริ้ว
    { floatAmp: 2.0, floatSpeed: 780, glowSpeed: 500 },  // Nebula ไหลลอย
    { floatAmp: 1.7, floatSpeed: 870, glowSpeed: 580 },  // Solar มั่นคง
  ];

  constructor(cellSize, gap) {
    this.CELL = cellSize;
    this.GAP = gap;
    this.buildSprites();
  }

  // =====================================================
  // เครื่องมือแสง (ใช้ร่วมทุกเจม)
  // =====================================================

  /** ความสว่างของเหลี่ยมจากเวกเตอร์ตั้งฉาก (nx,ny ชี้ออกนอกเหลี่ยม) → 0..1 */
  static facetBright(nx, ny) {
    const n = Math.hypot(nx, ny) || 1;
    return Math.max(0, Math.min(1, 0.52 + 0.55 * ((nx / n) * GemArt.LX + (ny / n) * GemArt.LY)));
  }

  /** แปลงความสว่าง 0..1 → โทนสีในจานสี */
  static toneAt(P, b) {
    if (b < 0.18) return P.dd;
    if (b < 0.38) return P.d;
    if (b < 0.62) return P.m;
    if (b < 0.85) return P.l;
    return P.s;
  }

  /**
   * ฐานความสว่างสไตล์ "แก้วคริสตัล" (TASK-010) — ใช้ร่วมทุกเจม:
   * ขอบในหนามืด (เนื้อแก้วหนา) → เนื้อกลางสว่าง → แถบแสงทแยงพาด (caustic)
   */
  static glassBright(dx, dy, mv) {
    let b = 0.58;
    if (mv > 0.72) b = 0.14;        // ขอบในมืด
    else if (mv > 0.55) b = 0.34;   // ไล่เข้าหาขอบ
    const band = dx + dy;
    if (band > -8 && band < -4 && mv <= 0.72) b = 0.95; // แถบแสงทแยง
    return b;
  }

  /** ดาวจิ๋วในเนื้อเจม — จักรวาลถูกขังไว้ข้างใน (ความอวกาศ) */
  static stardust(grid, P, pts) {
    for (const [x, y, big] of pts) {
      GemArt.dot(grid, x, y, '#ffffff');
      if (big) {
        GemArt.dot(grid, x + 1, y, P.s);
        GemArt.dot(grid, x - 1, y, P.s);
        GemArt.dot(grid, x, y + 1, P.s);
        GemArt.dot(grid, x, y - 1, P.s);
      }
    }
  }

  // =====================================================
  // โปรไฟล์ต่อเจม: shape → mv (0 กลาง … 1 ขอบ, >1 นอกตัว) | facet → ความสว่าง 0..1
  // =====================================================

  static PROFILES = [
    { // 0 — Ruby Core: ทับทิมเจียรหกเหลี่ยม หน้าตัด (table) กลาง + แกนหลอมอุ่น
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        return Math.max(ax / 12.8, (0.5 * ax + ay) / 14.6);
      },
      facet(dx, dy, mv) {
        let b = GemArt.glassBright(dx, dy, mv);
        if (mv < 0.5 && b < 0.9) b += 0.06;                         // หน้าตัดกลางใสขึ้น
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 17, 3.0, P.c, P.l);            // แกนเรืองอุ่น
        GemArt.stardust(grid, P, [[9, 12, false], [22, 9, true], [20, 22, false]]);
      },
    },
    { // 1 — Nova Crystal: ดาว 4 แฉกเจียรคม สันแฉกรับแสง แกนขาวเรือง
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        return (ax + ay + 1.25 * Math.min(ax, ay)) / 19.2;
      },
      facet(dx, dy, mv) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        let b = GemArt.glassBright(dx, dy, mv) + (0.18 - mv * 0.3); // แกนสว่างไล่สู่ปลาย
        if (Math.min(ax, ay) < 1.6 && mv > 0.3) b += 0.2;           // สันแฉกสว่าง
        if (mv < 0.26) b = 0.95;                                     // แกนกลาง
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 15.5, 2.6, P.c, P.s);
        GemArt.stardust(grid, P, [[15, 5, false], [5, 15, false], [24, 18, false]]);
      },
    },
    { // 2 — Emerald Pulse: มรกตเจียรขั้นบันได (step cut) + ปุ่มงอกออร์แกนิก + เส้นแร่
      shape(dx, dy) {
        const ay = Math.abs(dy);
        const bump = (dx < 0 && dy > -3 && dy < 6) ? 2.2 : 0;       // งอกฝั่งซ้าย
        const ax = Math.abs(dx) - (dx < 0 ? bump : 0);
        return Math.max(ax / 9.6, ay / 13.6, (ax + ay) / 19.2);
      },
      facet(dx, dy, mv) {
        let b = GemArt.glassBright(dx, dy, mv);
        const step = Math.floor((dy + 16) / 4.6) % 4;
        if (b > 0.2 && b < 0.9) b += [0.08, -0.06, 0.03, -0.1][step]; // ขั้นบันไดจางๆ ใต้ผิวแก้ว
        return b;
      },
      detail(grid, P) {
        for (let y = 7; y <= 24; y++) {                              // เส้นแร่เรืองกลางลำ
          const vx = 15 + ((y % 8 < 4) ? 0 : 2) - ((y % 16 < 8) ? 1 : 0);
          GemArt.dot(grid, vx, y, P.c);
        }
        GemArt.stardust(grid, P, [[10, 9, false], [21, 20, true]]);
      },
    },
    { // 3 — Meteor Shard: สะเก็ดน้ำแข็ง 5 ระนาบตัด — แต่ละระนาบคือเหลี่ยมจริง มีสันแตกระหว่างระนาบ
      shape(dx, dy, x, y) {
        const j = ((x * 7 + y * 13) % 3) * 0.5;                      // ขอบหยาบ deterministic
        const cuts = GemArt.meteorCuts(dx, dy);
        let mx = -Infinity;
        for (const c of cuts) if (c.v > mx) mx = c.v;
        return 1 + (mx + j) / 10.8;
      },
      facet(dx, dy, mv) {
        const cuts = GemArt.meteorCuts(dx, dy);
        let best = 0, second = 1;
        if (cuts[second].v > cuts[best].v) { best = 1; second = 0; }
        for (let i = 2; i < cuts.length; i++) {
          if (cuts[i].v > cuts[best].v) { second = best; best = i; }
          else if (cuts[i].v > cuts[second].v) second = i;
        }
        let b = GemArt.glassBright(dx, dy, mv);
        if (b > 0.2 && b < 0.9) b += (GemArt.facetBright(cuts[best].nx, cuts[best].ny) - 0.5) * 0.34; // ระนาบใต้ผิวแก้ว
        if (cuts[best].v - cuts[second].v > -1.4) b -= 0.2;          // สันแตกระหว่างระนาบ
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 17, 13, 3.0, P.c, P.l);               // แกนเรืองเย็น
        GemArt.stardust(grid, P, [[12, 10, false], [10, 22, false], [21, 17, true]]);
      },
    },
    { // 4 — Nebula Prism: ผลึกไหลออร์แกนิก แสงหมุนวนในเนื้อเหมือนหมอกจักรวาล
      shape(dx, dy) {
        const nx = dx + dy * 0.3;
        return Math.pow(Math.abs(nx) / 11.8, 1.7) + Math.pow(Math.abs(dy) / 13.4, 1.7);
      },
      facet(dx, dy, mv) {
        let b = GemArt.glassBright(dx, dy, mv);
        const th = Math.atan2(dy, dx);
        if (b > 0.2 && b < 0.9) b += Math.sin(th * 2.2 + mv * 6.5) * 0.14; // หมอกหมุนวนใต้ผิว
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 14, 16, 4.4, P.l, null);              // เรืองในกว้าง
        GemArt.paintCore(grid, 14, 16, 2.2, P.c, null);              // ใจกลางชมพูเนบิวลา
        GemArt.stardust(grid, P, [[8, 9, false], [22, 12, true], [19, 23, false], [10, 21, false]]);
      },
    },
    { // 5 — Solar Core: แกนกลมวิศวกรรม เหลี่ยมรัศมี 12 ช่อง + วงแหวนกลึง + แกนทองคำ
      shape(dx, dy) {
        return Math.hypot(dx, dy) / 13.6;
      },
      facet(dx, dy, mv) {
        const r = mv * 13.6;
        let b = GemArt.glassBright(dx, dy, mv);
        if ((Math.abs(r - 8.4) < 0.8 || Math.abs(r - 11.2) < 0.7) && b < 0.9) b = 0.22; // วงแหวนกลึง
        else if (mv < 0.32 && b < 0.9) b += 0.16;                    // หน้าปัดกลางสว่าง
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 15.5, 3.0, P.c, P.s);           // แกนทองสว่าง
        GemArt.stardust(grid, P, [[9, 10, false], [22, 20, false]]);
      },
    },
  ];

  /** ระนาบตัดของ Meteor Shard (แชร์ระหว่าง shape/facet) — v<=0 คือด้านใน */
  static meteorCuts(dx, dy) {
    return [
      { v: 0.95 * dx + 0.45 * dy - 10.6, nx: 0.95, ny: 0.45 },
      { v: -0.85 * dx + 0.55 * dy - 10.2, nx: -0.85, ny: 0.55 },
      { v: 0.15 * dx - 1.0 * dy - 12.4, nx: 0.15, ny: -1.0 },
      { v: -0.55 * dx - 0.95 * dy - 11.8, nx: -0.55, ny: -0.95 },
      { v: 1.0 * dx - 0.5 * dy - 11.2, nx: 1.0, ny: -0.5 },
    ];
  }

  // =====================================================
  // ตัวช่วยกลาง
  // =====================================================

  /** จุดเดียวบนเนื้อเจม (ข้ามขอบ/นอกตัว) */
  static dot(grid, x, y, col) {
    if (grid[y] && grid[y][x] && grid[y][x] !== GemArt.OUTLINE) grid[y][x] = col;
  }

  /** แกนกลม: สีในสุด + วงรอบ เฉพาะบนเนื้อเจม */
  static paintCore(grid, cx, cy, r, colInner, colOuter) {
    const S = GemArt.SPRITE;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const c = grid[y][x];
      if (!c || c === GemArt.OUTLINE) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) grid[y][x] = colInner;
      else if (colOuter && d <= r + 1.4) grid[y][x] = colOuter;
    }
  }

  /**
   * พาสเก็บงานร่วม (finish): เงาสัมผัสขอบล่าง-ขวา, ขอบรับแสงบน-ซ้าย, ประกายเพชร
   * ทำให้ทุกเจม "เคลือบ" ด้วยภาษาแสงเดียวกัน
   */
  static applyFinish(grid, P) {
    const S = GemArt.SPRITE;
    const O = GemArt.OUTLINE;
    const body = (y, x) => y >= 0 && y < S && x >= 0 && x < S && grid[y][x] !== null && grid[y][x] !== O;
    const hard = (y, x) => y < 0 || y >= S || x < 0 || x >= S || grid[y][x] === O || grid[y][x] === null;

    const writes = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!body(y, x)) continue;
      const tl = hard(y - 1, x) || hard(y, x - 1);
      const br = hard(y + 1, x) || hard(y, x + 1);
      if (tl && !br) writes.push([y, x, P.s]);
      else if (br && !tl) writes.push([y, x, P.dd]);
    }
    for (const [y, x, c] of writes) grid[y][x] = c;

    // ประกายเพชร: จุดขาว 1+2 px ที่ตำแหน่งบนซ้ายสุดของเนื้อเจม
    let best = null, bv = Infinity;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (body(y, x) && x + y < bv) { bv = x + y; best = { x, y }; }
    }
    if (best) {
      const bx = best.x + 2, by = best.y + 2;
      GemArt.dot(grid, bx, by, '#ffffff');
      GemArt.dot(grid, bx + 1, by, P.s);
      GemArt.dot(grid, bx, by + 1, P.s);
    }
  }

  // =====================================================
  // ประกอบสไปรต์
  // =====================================================

  /**
   * ตารางสี 32x32 ของเจมชนิดนั้น (null = โปร่งใส)
   * @param {number} type 0..5
   */
  static spriteData(type) {
    const P = GemArt.PALETTE[type];
    const S = GemArt.SPRITE;
    const prof = GemArt.PROFILES[type];
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 15.5, dy = y - 15.5;
        const mv = prof.shape(dx, dy, x, y);
        if (mv > 1) { grid[y][x] = null; continue; }
        if (mv > 0.9) { grid[y][x] = GemArt.OUTLINE; continue; }
        const b = Math.max(0, Math.min(1, prof.facet(dx, dy, mv)));
        grid[y][x] = GemArt.toneAt(P, b);
      }
    }
    GemArt.applyFinish(grid, P);
    if (prof.detail) prof.detail(grid, P);
    return grid;
  }

  /**
   * ชั้นระเบิดวางทับเจม — 2 เฟรม: ทรงกลมโลหะเข้ม + แกนแม็กม่าเต้น + ชนวนประกาย
   * @param {number} frame 0|1
   */
  static bombOverlayData(frame) {
    const S = GemArt.SPRITE;
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 15.5, dy = y - 15.5;
        const r = Math.hypot(dx, dy);
        const lit = dx + dy;              // ทิศแสงบน-ซ้าย: ค่ายิ่งลบ = ยิ่งโดนแสง
        let col = null;
        if (r <= 7.9) {
          // ลูกแก้วเงา: ไล่โทนตามมุมแสง (rim สว่างบน-ซ้าย → เนื้อ → เงาล่าง-ขวา)
          col = '#2c1e26';                                   // เนื้อเข้ม
          if (lit < -2) col = '#4c3a48';                     // ด้านรับแสง
          if (lit < -6) col = '#75596c';                     // rim สว่าง
          if (lit > 5) col = '#180f16';                      // เงาลึกล่าง-ขวา
          if (r > 7.0) col = '#140c12';                      // ขอบมืดตัดทรงให้กลมคม
        }
        // แกนแม็กม่าเต้น + วงเรืองร้อนรอบแกน (สว่างขึ้น อ่านชัดบนเซ็ต glassy)
        const coreR = frame === 0 ? 3.6 : 5.2;
        if (r <= coreR + 1.4) col = frame === 0 ? '#c8641e' : '#ff9a2e'; // ฮาโลร้อน
        if (r <= coreR) col = frame === 0 ? '#ff9e34' : '#ffd24e';       // แม็กม่า
        if (r <= coreR * 0.5) col = '#fff6d2';                           // ใจกลางขาวร้อน
        // สเปกคูลาร์แก้ว: จุดขาว/ไฮไลต์บน-ซ้าย ให้ผิวมันวาว
        if (r <= 7.9) {
          if (Math.hypot(dx + 3.4, dy + 3.4) <= 1.3) col = '#ffffff';
          else if (Math.hypot(dx + 4.4, dy + 4.4) <= 1.0) col = '#e8d4ea';
        }
        const fx = x - 24, fy = y - 7;                                   // ประกายชนวน
        if (fx * fx + fy * fy <= (frame === 0 ? 1.6 : 3.4)) col = '#ffffff';
        grid[y][x] = col;
      }
    }
    return grid;
  }

  /**
   * โนวา — ดาว 4 แฉกขาวร้อน ขอบสีรุ้งพาสเทลหมุนวน 3 เฟรม (เข้าจานสีแร่)
   * @param {number} frame 0..2
   */
  static novaData(frame) {
    const S = GemArt.SPRITE;
    // ดาว 8 แฉกหมุนวน + ขอบรุ้งพาสเทล — "อลังกว่าเจม" และแยกจากเจม Nova (4 แฉก) ชัดเจน
    const EDGE = ['#ffd1f0', '#c9e8ff', '#fff3c4'][frame];
    const MID = ['#f4a8d8', '#96c8f0', '#f2d886'][frame];
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 15.5, dy = y - 15.5;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        // แฉกหลัก 4 ทิศ (แนวแกน) — ยาว
        const m1 = ax + ay + 1.3 * Math.min(ax, ay);
        // แฉกรอง 4 ทิศ (แนวทแยง) — สั้นกว่า เกิดเป็น 8 แฉก
        const u = (dx + dy) * 0.7071, v = (dx - dy) * 0.7071;
        const au = Math.abs(u), av = Math.abs(v);
        const m2 = au + av + 1.3 * Math.min(au, av);
        let col = null;
        if (m1 <= 19 || m2 <= 12.5) col = MID;
        if ((m1 <= 19 && m1 > 14.5) || (m2 <= 12.5 && m2 > 9)) col = EDGE; // ขอบรุ้ง
        const core = Math.min(m1, m2 + 3);
        if (core <= 9) col = '#ffffff';
        // สันแฉกขาวทั้งแนวแกนและแนวทแยง
        if (col && ((Math.min(ax, ay) < 1.2 && Math.max(ax, ay) < 15 && m1 > 9) ||
                    (Math.min(au, av) < 1.1 && Math.max(au, av) < 10 && m2 > 9))) col = '#ffffff';
        grid[y][x] = col;
      }
    }
    return grid;
  }

  /**
   * ชั้นดาวหางวางทับเจม — บีมทิศเดียว + หัวดาวหางกลมเรืองแสง 2 ปลาย 2 เฟรม (แทนที่หัวลูกศรเดิม)
   * vertical=false → พุ่งแนวนอน (ล้างแถว) | vertical=true → พุ่งแนวตั้ง (ล้างคอลัมน์)
   * โทนพลังงานฟ้า-ขาว (ธีมดาวหางน้ำแข็ง) แยกจากระเบิดอุ่น/โนวารุ้ง/จรวดขาวเงิน
   */
  static cometBeamData(frame, vertical) {
    const S = GemArt.SPRITE;
    const CORE = '#ffffff';
    const BEAM = frame === 0 ? '#8fecff' : '#c8f6ff';
    const EDGE = '#2f9fd8';
    const headR = frame === 0 ? 3.4 : 3.9; // หัวดาวหางเต้นเบาๆ
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 15.5, dy = y - 15.5;
        const a = vertical ? dy : dx;   // ตามแนวลำแสง
        const b = vertical ? dx : dy;   // ตั้งฉากลำแสง
        const A = Math.abs(a), B = Math.abs(b);
        let col = null;
        if (B <= 2.2 && A <= 12) col = EDGE;                                    // ขอบหาง
        if (B <= 1.3 && A <= 12) col = BEAM;                                    // แกนหาง
        // หัวดาวหางกลมเรืองแสงทั้ง 2 ปลาย + แฉกรัศมีเล็กๆ
        for (const end of [-1, 1]) {
          const hx = end * 13, hy = 0;
          const ex = vertical ? hy : hx, ey = vertical ? hx : hy;
          const hd = Math.hypot(dx - ex, dy - ey);
          if (hd <= headR) col = BEAM;
          if (hd <= headR - 1.3) col = CORE;
          // แฉกรัศมี 4 ทิศรอบหัว
          const rax = Math.abs(dx - ex), ray = Math.abs(dy - ey);
          if ((rax < 0.9 && ray < headR + 2) || (ray < 0.9 && rax < headR + 2)) {
            if (hd <= headR + 2) col = col || BEAM;
          }
        }
        if (Math.hypot(dx, dy) <= 2.4) col = CORE;                             // แกนกลางขาวร้อน
        grid[y][x] = col;
      }
    }
    return grid;
  }

  /**
   * ชั้นจรวดวางทับเจม — ลำตัวทรงกระบอก + จมูกแหลม + ครีบ 2 ข้าง + เปลวไฟท้าย 2 เฟรม (โทนเงิน-แดง)
   * ใช้กับตัวพิเศษ AI ล่าเป้าหมาย (เดิมคือปลา — เปลี่ยนสกินตามคำขอ พฤติกรรมเดิมทุกอย่าง)
   * @param {number} frame 0|1
   */
  static rocketOverlayData(frame) {
    const S = GemArt.SPRITE;
    const HULL = '#e7ecf2';
    const HULL_DARK = '#9aa6b4';
    const NOSE = '#e0464f';
    const WINDOW = '#7fd8ff';
    const FLAME_A = frame === 0 ? '#ffd35c' : '#ff9a3c';
    const FLAME_B = frame === 0 ? '#ff9a3c' : '#ffd35c';
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 16, dy = y - 15;
        let col = null;
        // ลำตัวทรงกระบอก (แนวตั้ง หัวชี้ขึ้น)
        if (Math.abs(dx) <= 3.4 && dy >= -8 && dy <= 6) {
          col = HULL;
          if (dx > 1.2) col = HULL_DARK;
        }
        // จมูกจรวด (กรวยแหลมด้านบน)
        if (dy < -8 && dy >= -13 && Math.abs(dx) <= (dy + 13) * 0.68) col = NOSE;
        // หน้าต่าง
        if (Math.hypot(dx, dy + 1) <= 1.6) col = WINDOW;
        if (Math.hypot(dx - 0.5, dy + 1.5) <= 0.6) col = '#ffffff';
        // ครีบ 2 ข้างด้านล่าง
        if (dy >= 3 && dy <= 7 && dx <= -3.4 && dx >= -3.4 - (dy - 3) * 1.1) col = HULL_DARK;
        if (dy >= 3 && dy <= 7 && dx >= 3.4 && dx <= 3.4 + (dy - 3) * 1.1) col = HULL_DARK;
        // เปลวไฟท้าย (แกว่งสีตามเฟรม)
        if (dy > 6 && dy <= 11 && Math.abs(dx) <= (11 - dy) * 0.9) col = FLAME_A;
        if (dy > 6 && dy <= 9 && Math.abs(dx) <= (9 - dy) * 0.7) col = FLAME_B;
        grid[y][x] = col;
      }
    }
    return grid;
  }

  // =====================================================
  // canvas ประกอบครั้งเดียว (ศูนย์ allocation ต่อเฟรม — คงจาก TASK-003)
  // =====================================================

  static gridToCanvas(grid) {
    const S = GemArt.SPRITE;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (grid[y][x]) { g.fillStyle = grid[y][x]; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }

  static buildGlowSprite(color) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, color + 'aa');   // ออร่าชัดขึ้น — "เงาวิ้ง" หลังเจม
    grad.addColorStop(0.45, color + '38');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
  }

  buildSprites() {
    this.sprites = [];
    for (let type = 0; type < GemArt.PALETTE.length; type++) {
      this.sprites.push(GemArt.gridToCanvas(GemArt.spriteData(type)));
    }
    this.bombOverlays = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.bombOverlayData(f)));
    this.novaFrames = [0, 1, 2].map((f) => GemArt.gridToCanvas(GemArt.novaData(f)));
    this.cometH = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.cometBeamData(f, false)));
    this.cometV = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.cometBeamData(f, true)));
    this.rocketOverlays = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.rocketOverlayData(f)));
    this.glowSprites = GemArt.PALETTE.map((p) => GemArt.buildGlowSprite(p.m));
    this.novaGlow = GemArt.buildGlowSprite('#ffffff');
  }

  get selectionGlow() {
    return this.novaGlow;
  }

  // =====================================================
  // วาดเจม 1 เม็ด — ลอยในอวกาศ + ออร่าวิ้งเต้น
  // (คณิตล้วนต่อเฟรม ไม่มี allocation — คงมาตรฐาน TASK-003)
  // =====================================================

  drawGem(ctx, cell, time = 0) {
    const C = this.CELL;
    const candy = cell.candy;
    const A = GemArt.ANIM[candy.type];

    const phase = (cell.col * 340 + cell.row * 260);
    // ลอยไร้แรงโน้มถ่วง: โยกขึ้นลงเป็นหลัก + เอียงซ้ายขวาเบาๆ คนละจังหวะต่อเม็ด
    const floatY = Math.sin((time + phase) / A.floatSpeed) * A.floatAmp * Math.min(1, candy.scale);
    const floatX = Math.sin((time + phase) / (A.floatSpeed * 1.6) + 1.7) * A.floatAmp * 0.45 * Math.min(1, candy.scale);

    // 🔍 ความคม (TASK-010): วาดที่ 2 เท่าของสไปรต์เป๊ะ (32→64) ไม่มี breathe บิดสเกล
    // ระยะห่างระหว่างเม็ดมาจากขอบโปร่งใสในตัวสไปรต์เอง — พิกเซลทุกเม็ดขนาดเท่ากันเสมอ
    const base = C * candy.scale;
    if (base <= 0) return;
    const width = base * candy.scaleX;
    const height = base * candy.scaleY;
    const cx = cell.col * C + C / 2 + candy.offsetX + floatX;
    const cy = cell.row * C + C / 2 + candy.offsetY + floatY;
    // ปัดพิกัดเป็นจำนวนเต็ม — กันพิกเซลเหลื่อมครึ่งช่อง (ต้นเหตุภาพ "เบลอๆ" เดิม)
    const px = Math.round(cx - width / 2);
    const py = Math.round(cy - height / 2);

    // ออร่าวิ้งด้านหลัง: ใหญ่ขึ้น + อัลฟาเต้นตามจังหวะของเจมชนิดนั้น
    const pulse = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin((time + phase) / A.glowSpeed));
    const glowSize = base * 1.75;
    const glow = candy.special === 'nova' ? this.novaGlow : this.glowSprites[candy.type];
    ctx.globalAlpha = pulse;
    ctx.drawImage(glow, cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize);
    ctx.globalAlpha = 1;

    if (candy.special === 'nova') {
      const frame = Math.floor(time / 150) % 3;
      ctx.drawImage(this.novaFrames[frame], px, py, width, height);
      return;
    }
    ctx.drawImage(this.sprites[candy.type], px, py, width, height);
    if (candy.special === 'bomb') {
      const frame = Math.floor(time / 250) % 2;
      ctx.drawImage(this.bombOverlays[frame], px, py, width, height);
    } else if (candy.special === 'cometH') {
      const frame = Math.floor(time / 220) % 2;
      ctx.drawImage(this.cometH[frame], px, py, width, height);
    } else if (candy.special === 'cometV') {
      const frame = Math.floor(time / 220) % 2;
      ctx.drawImage(this.cometV[frame], px, py, width, height);
    } else if (candy.special === 'rocket') {
      const frame = Math.floor(time / 260) % 2;
      ctx.drawImage(this.rocketOverlays[frame], px, py, width, height);
    }
  }
}
