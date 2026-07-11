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
 * interface เดิม: drawGem / selectionGlow / PALETTE / spriteData / bombOverlayData / novaData
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
    { dd: '#5a1428', d: '#a8244a', m: '#f04d74', l: '#ff85a2', s: '#ffd4e0', c: '#ffb27a' }, // 0 Ruby Core
    { dd: '#6b4408', d: '#c08812', m: '#ffc93e', l: '#ffe374', s: '#fff8d8', c: '#ffffff' }, // 1 Nova Crystal
    { dd: '#0e4a2c', d: '#1f8a50', m: '#37cd7f', l: '#7ff0b2', s: '#d8ffe8', c: '#f0fff8' }, // 2 Emerald Pulse
    { dd: '#173a61', d: '#3070ab', m: '#58a8e8', l: '#96d2fa', s: '#e0f3ff', c: '#ffffff' }, // 3 Meteor Shard
    { dd: '#44226b', d: '#7a41b4', m: '#b46ef0', l: '#d4a4fa', s: '#f3e4ff', c: '#ffd9f4' }, // 4 Nebula Prism
    { dd: '#6b3408', d: '#b86614', m: '#ffa032', l: '#ffc46a', s: '#ffedc8', c: '#fffbe8' }, // 5 Solar Core
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
   *   orbitSpeed          — ประกายดาวโคจรรอบเม็ด (ms ต่อเรเดียน)
   */
  static ANIM = [
    { floatAmp: 1.8, floatSpeed: 830, glowSpeed: 620, orbitSpeed: 940 },  // Ruby หนัก ลอยช้า
    { floatAmp: 2.4, floatSpeed: 640, glowSpeed: 460, orbitSpeed: 700 },  // Nova เบา ระยิบเร็ว
    { floatAmp: 1.6, floatSpeed: 920, glowSpeed: 700, orbitSpeed: 1080 }, // Emerald นิ่งสุขุม
    { floatAmp: 2.1, floatSpeed: 720, glowSpeed: 540, orbitSpeed: 820 },  // Meteor พริ้ว
    { floatAmp: 2.0, floatSpeed: 780, glowSpeed: 500, orbitSpeed: 760 },  // Nebula ไหลลอย
    { floatAmp: 1.7, floatSpeed: 870, glowSpeed: 580, orbitSpeed: 1000 }, // Solar มั่นคง
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
        if (mv < 0.52) { // หน้าตัดกลาง: สว่าง + แถบสะท้อนทแยง
          const streak = (dx + dy > -6 && dx + dy < -1) ? 0.22 : 0;
          return 0.66 + streak;
        }
        // มงกุฎรอบนอก: 6 เหลี่ยมตามขอบหกเหลี่ยม — normal ต่อเซกเตอร์
        const th = Math.atan2(dy, dx);
        const idx = Math.floor(((th + Math.PI) / (Math.PI / 3))) % 6;
        const na = -Math.PI + (idx + 0.5) * (Math.PI / 3);
        return GemArt.facetBright(Math.cos(na), Math.sin(na));
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 17, 3.2, P.c, P.l);           // แกนหลอมอุ่นค่อนล่าง
        for (const [cx, cy] of [[8, 8], [9, 9], [23, 21], [22, 22], [24, 20]]) {
          GemArt.dot(grid, cx, cy, P.dd);                           // รอยร้าวบนไหล่
        }
      },
    },
    { // 1 — Nova Crystal: ดาว 4 แฉกเจียรคม สันแฉกรับแสง แกนขาวเรือง
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        return (ax + ay + 1.25 * Math.min(ax, ay)) / 19.2;
      },
      facet(dx, dy, mv) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        let b = 0.82 - mv * 0.52;                                   // ไล่จากแกนสว่างสู่ปลายแฉก
        if (Math.min(ax, ay) < 1.6) b += 0.18;                      // สันกลางแฉกเป็นแนวรับแสง
        if (dx + dy > 3) b -= 0.16;                                  // ฝั่งเงา
        if (mv < 0.26) b = 0.95;                                     // แกนกลาง
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 15.5, 2.6, P.c, P.s);
        for (const [cx, cy] of [[15, 3], [16, 3], [3, 15], [3, 16]]) GemArt.dot(grid, cx, cy, P.s); // ประกายปลายแฉกฝั่งแสง
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
        // ขั้นบันไดแนวนอน: แต่ละขั้นสะท้อนแสงสลับกัน (เอกลักษณ์ emerald cut)
        const step = Math.floor((dy + 16) / 4.6) % 4;
        let b = [0.72, 0.5, 0.62, 0.42][step];
        b += dx < 0 ? 0.1 : -0.06;                                   // ฝั่งซ้ายรับแสง
        if (mv > 0.78) b -= 0.14;                                    // เหลี่ยมข้างมืดลง
        return b;
      },
      detail(grid, P) {
        for (let y = 6; y <= 25; y++) {                              // เส้นแร่คดเคี้ยวกลางลำ
          const vx = 15 + ((y % 8 < 4) ? 0 : 2) - ((y % 16 < 8) ? 1 : 0);
          GemArt.dot(grid, vx, y, P.c);
          if (y % 3 === 0) GemArt.dot(grid, vx + 1, y, P.s);
        }
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
      facet(dx, dy) {
        const cuts = GemArt.meteorCuts(dx, dy);
        let best = 0, second = 1;
        if (cuts[second].v > cuts[best].v) { best = 1; second = 0; }
        for (let i = 2; i < cuts.length; i++) {
          if (cuts[i].v > cuts[best].v) { second = best; best = i; }
          else if (cuts[i].v > cuts[second].v) second = i;
        }
        let b = GemArt.facetBright(cuts[best].nx, cuts[best].ny);    // แสงตามระนาบที่ใกล้สุด
        if (cuts[best].v - cuts[second].v > -1.4) b -= 0.22;         // สันแตกระหว่างระนาบ = ร่องมืด
        return b;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 17, 13, 3.0, P.c, P.l);               // แกนเรืองเย็น
        for (const [cx, cy] of [[10, 19], [11, 20], [12, 21], [20, 18], [21, 19]]) GemArt.dot(grid, cx, cy, P.dd);
      },
    },
    { // 4 — Nebula Prism: ผลึกไหลออร์แกนิก แสงหมุนวนในเนื้อเหมือนหมอกจักรวาล
      shape(dx, dy) {
        const nx = dx + dy * 0.3;
        return Math.pow(Math.abs(nx) / 11.8, 1.7) + Math.pow(Math.abs(dy) / 13.4, 1.7);
      },
      facet(dx, dy, mv) {
        const th = Math.atan2(dy, dx);
        const swirl = Math.sin(th * 2.2 + mv * 6.5) * 0.16;          // คลื่นหมุนในเนื้อ
        return 0.56 + swirl - (dx + dy) / 34;                        // ไล่สว่างบนซ้าย→เงาล่างขวา
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 14, 16, 4.6, P.l, null);              // เรืองในกว้าง
        GemArt.paintCore(grid, 14, 16, 2.2, P.c, null);              // ใจกลางชมพูเนบิวลา
      },
    },
    { // 5 — Solar Core: แกนกลมวิศวกรรม เหลี่ยมรัศมี 12 ช่อง + วงแหวนกลึง + แกนทองคำ
      shape(dx, dy) {
        return Math.hypot(dx, dy) / 13.6;
      },
      facet(dx, dy, mv) {
        const r = mv * 13.6;
        if (Math.abs(r - 8.2) < 0.9 || Math.abs(r - 11.2) < 0.8) return 0.2; // วงแหวนกลึงมืด
        if (mv < 0.32) {                                             // หน้าปัดกลาง
          return 0.8 + ((dx + dy < -2) ? 0.15 : 0);
        }
        const th = Math.atan2(dy, dx);
        const idx = Math.floor((th + Math.PI) / (Math.PI / 6)) % 12; // เหลี่ยมรัศมี 12 ช่อง
        const na = -Math.PI + (idx + 0.5) * (Math.PI / 6);
        return GemArt.facetBright(Math.cos(na), Math.sin(na)) * 0.85 + 0.08;
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 15.5, 15.5, 3.0, P.c, P.s);           // แกนทองสว่าง
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
        let col = null;
        if (r <= 7.4) col = GemArt.OUTLINE;                            // ทรงกลมโลหะ
        if (r <= 7.4 && dx + dy < -4) col = '#4a3a54';                 // ไฮไลต์โลหะ
        const coreR = frame === 0 ? 3.4 : 5.0;                         // แกนแม็กม่าเต้น
        if (r <= coreR) col = frame === 0 ? '#e0812a' : '#ffce54';
        if (r <= coreR * 0.45) col = '#fff3c4';
        const fx = x - 24, fy = y - 7;                                 // ประกายชนวน
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
    const EDGE = ['#ffd1f0', '#c9e8ff', '#fff3c4'][frame];
    const MID = ['#f4a8d8', '#96c8f0', '#f2d886'][frame];
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const ax = Math.abs(x - 15.5), ay = Math.abs(y - 15.5);
        const m = ax + ay + 1.3 * Math.min(ax, ay);
        let col = null;
        if (m <= 19) col = MID;
        if (m <= 19 && m > 14.5) col = EDGE;
        if (m <= 9) col = '#ffffff';
        if ((Math.min(ax, ay) < 1.2 && Math.max(ax, ay) < 15) && m > 9) col = '#ffffff'; // สันแฉกขาว
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

  /** ประกายดาวเล็ก (7x7 รูปบวก) โคจรรอบเจม — สร้างครั้งเดียว */
  static buildSparkleSprite() {
    const c = document.createElement('canvas');
    c.width = 7; c.height = 7;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(2, 3, 3, 1); g.fillRect(3, 2, 1, 3);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 3, 7, 1); g.fillRect(3, 0, 1, 7);
    return c;
  }

  buildSprites() {
    this.sprites = [];
    for (let type = 0; type < GemArt.PALETTE.length; type++) {
      this.sprites.push(GemArt.gridToCanvas(GemArt.spriteData(type)));
    }
    this.bombOverlays = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.bombOverlayData(f)));
    this.novaFrames = [0, 1, 2].map((f) => GemArt.gridToCanvas(GemArt.novaData(f)));
    this.glowSprites = GemArt.PALETTE.map((p) => GemArt.buildGlowSprite(p.m));
    this.novaGlow = GemArt.buildGlowSprite('#ffffff');
    this.sparkle = GemArt.buildSparkleSprite();
  }

  get selectionGlow() {
    return this.novaGlow;
  }

  // =====================================================
  // วาดเจม 1 เม็ด — ลอยในอวกาศ + ออร่าวิ้งเต้น + ประกายดาวโคจร
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
    const breathe = 1 + 0.02 * (0.5 + 0.5 * Math.sin((time + phase) / 900));

    const base = (C - this.GAP) * candy.scale * breathe;
    if (base <= 0) return;
    const width = base * candy.scaleX;
    const height = base * candy.scaleY;
    const cx = cell.col * C + C / 2 + candy.offsetX + floatX;
    const cy = cell.row * C + C / 2 + candy.offsetY + floatY;
    const px = cx - width / 2;
    const py = cy - height / 2;

    // ออร่าวิ้งด้านหลัง: ใหญ่ขึ้น + อัลฟาเต้นตามจังหวะของเจมชนิดนั้น
    const pulse = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin((time + phase) / A.glowSpeed));
    const glowSize = base * 1.75;
    const glow = candy.special === 'nova' ? this.novaGlow : this.glowSprites[candy.type];
    ctx.globalAlpha = pulse;
    ctx.drawImage(glow, cx - glowSize / 2, cy - glowSize / 2, glowSize, glowSize);
    ctx.globalAlpha = 1;

    // ประกายดาว 2 ดวงโคจรวงรีรอบเม็ด (อยู่หลังตัวเจม) — กะพริบเป็นจังหวะ
    for (let k = 0; k < 2; k++) {
      const blink = Math.sin((time + phase) / 210 + k * 2.4);
      if (blink < 0.35) continue; // ติดๆ ดับๆ = วิ้ง
      const ang = time / A.orbitSpeed + phase * 0.01 + k * Math.PI;
      const sx = cx + Math.cos(ang) * base * 0.58;
      const sy = cy + Math.sin(ang) * base * 0.40;
      const ss = 7 * (0.7 + 0.3 * blink);
      ctx.globalAlpha = blink;
      ctx.drawImage(this.sparkle, sx - ss / 2, sy - ss / 2, ss, ss);
      ctx.globalAlpha = 1;
    }

    if (candy.special === 'nova') {
      const frame = Math.floor(time / 150) % 3;
      ctx.drawImage(this.novaFrames[frame], px, py, width, height);
      return;
    }
    ctx.drawImage(this.sprites[candy.type], px, py, width, height);
    if (candy.special === 'bomb') {
      const frame = Math.floor(time / 250) % 2;
      ctx.drawImage(this.bombOverlays[frame], px, py, width, height);
    }
  }
}
