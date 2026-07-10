/**
 * GemArt — 🎨 งานวาด "เจม" ทั้งหมดอยู่ที่นี่ที่เดียว (แยกออกจาก Renderer — TASK-002)
 *
 * สถาปัตยกรรม:  Renderer → GemArt → Gem Drawing
 *   - Renderer ไม่รู้วิธีวาดเจมอีกต่อไป แค่เรียก gemArt.drawGem(ctx, cell, time)
 *   - sprite sheet ในอนาคตเสียบที่นี่ได้โดยไม่แตะ Renderer:
 *     แทนที่ buildSprites() ให้โหลดภาพจริงแทนการ generate จาก spriteData()
 *   - โค้ดวาดทั้งหมดย้ายมาจาก Renderer เดิมแบบตรงตัว — ภาพเหมือนเดิม 100%
 *
 * เลเยอร์ต่อเจม 1 เม็ด (ล่างขึ้นบน): Glow → Base Sprite → Special Overlay (ระเบิด/โนวา)
 */
export class GemArt {
  /** ขนาดสไปรต์พิกเซล (16x16 ขยาย 4 เท่า = 64) */
  static SPRITE = 16;

  /**
   * จานสีแร่ธรรมชาติ (TASK-005): ลดความจัดจ้าน อุ่นขึ้น คุมโทนเดียวกันทั้งเซ็ต
   * m=เนื้อหลัก l=รับแสง d=ในเงา s=แกน/ไฮไลต์ — ทุกสีถูกดึงเข้าหาโทนอุ่นเล็กน้อย
   * คอนทราสต์มาจากช่วง l↔d ที่กว้าง ไม่ใช่ความสว่างจัด (เลี่ยงฟีลพลาสติก/อาร์เคด)
   */
  static PALETTE = [
    { m: '#c4505c', l: '#e28a8e', d: '#7c3040', s: '#f2cfae' }, // 0 Ruby Core — ทับทิมอมดินอุ่น
    { m: '#d4b154', l: '#ecd598', d: '#8f7330', s: '#f8f1da' }, // 1 Nova Crystal — โทแพซทองหม่น
    { m: '#5aad76', l: '#98cfaa', d: '#2f6e4b', s: '#dbeee2' }, // 2 Emerald Pulse — มรกตขุ่นธรรมชาติ
    { m: '#5d8fbe', l: '#98bcdc', d: '#365d88', s: '#e0ecf7' }, // 3 Meteor Shard — น้ำแข็งเทาฟ้าเย็น
    { m: '#9873b8', l: '#c0a4d8', d: '#634683', s: '#ece2f5' }, // 4 Nebula Prism — แอเมทิสต์ควันหม่น
    { m: '#cd8039', l: '#e6a869', d: '#8b511d', s: '#f4e2c4' }, // 5 Solar Core — แอมเบอร์อุ่นลึก
  ];
  /** สีเส้นขอบสไปรต์ (ดำอมม่วงอุ่น) */
  static OUTLINE = '#221728';

  /**
   * @param {number} cellSize ขนาดช่อง (px logical) — Renderer ส่งมา
   * @param {number} gap ระยะห่างระหว่างเจม (px logical)
   */
  constructor(cellSize, gap) {
    this.CELL = cellSize;
    this.GAP = gap;
    this.buildSprites();
  }

  // =====================================================
  // ข้อมูลสไปรต์ (pure function — เทสต์ใน Node ได้)
  // =====================================================

  /**
   * โปรไฟล์การเรนเดอร์ต่อเจม (TASK-004) — แต่ละเจมมี "ทรง" (shape) + "รายละเอียด" (detail) ของตัวเอง
   * shape(dx,dy,x,y)  → { in: อยู่ในตัวเจมไหม, edge: อยู่บนเปลือก/ขอบไหม }
   * detail(grid,P)    → วาดลายเฉพาะตัวทับหลังแรเงาพื้นฐาน (แกน, ร่อง, เส้นแร่ ฯลฯ)
   * การแรเงาพื้นฐาน (แสงบนซ้าย/เงาล่างขวา) ใช้ร่วมกันใน spriteData — ไม่มีโค้ดวาดซ้ำ
   */
  static PROFILES = [
    { // 0 — Ruby Core: ผลึกหกเหลี่ยมหนัก เปลือกหินหนา แกนหลอมร้อน
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        const m = Math.max(ax / 6.4, (0.5 * ax + ay) / 7.4);
        return { in: m <= 1, edge: m > 0.72 }; // เปลือกหนาเป็นเอกลักษณ์
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 7.5, 8, 1.9, P.s, P.l); // แกนหลอมร้อนค่อนล่าง
        // รอยร้าวบนเปลือกหิน (ผลึกหนักผ่านอะไรมาเยอะ)
        for (const [cx, cy] of [[4, 4], [5, 5], [11, 10], [10, 11]]) {
          if (grid[cy] && grid[cy][cx] && grid[cy][cx] !== GemArt.OUTLINE) grid[cy][cx] = P.d;
        }
      },
    },
    { // 1 — Nova Crystal: ผลึกดาวแฉกแผ่รังสี แกนกลางสว่างจ้า
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        const m = ax + ay + 1.25 * Math.min(ax, ay);
        return { in: m <= 9.5, edge: m > 7.6 };
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 7.5, 7.5, 1.6, P.s, P.l); // แกนสว่างแบบแร่ ไม่ใช่ไฟขาวจ้า (no harsh bloom)
      },
    },
    { // 2 — Emerald Pulse: ผลึกธรรมชาติทรงสูง งอกเบี้ยวข้างซ้าย + เส้นแร่กลางลำ
      shape(dx, dy) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        const bump = (dx < 0 && dy > -2 && dy < 3) ? 1.2 : 0; // ปุ่มงอกออร์แกนิกฝั่งซ้าย
        const wid = 4.3 + bump;
        const inn = ay <= 6.9 && ax <= wid && ax + Math.max(0, ay - 4.2) * 1.3 <= wid + 2.2;
        const wid2 = wid - 1.15;
        const edge = !(ay <= 5.9 && ax <= wid2 && ax + Math.max(0, ay - 3.4) * 1.3 <= wid2 + 2.2);
        return { in: inn, edge };
      },
      detail(grid, P) {
        // เส้นแร่ (vein) คดเคี้ยวกลางลำ
        for (let y = 3; y <= 12; y++) {
          const vx = 7 + ((y % 4 < 2) ? 0 : 1);
          if (grid[y] && grid[y][vx] && grid[y][vx] !== GemArt.OUTLINE) grid[y][vx] = P.s;
        }
      },
    },
    { // 3 — Meteor Shard: สะเก็ดแหลมอสมมาตร ขอบแตกหยาบ แกนเรืองเย็น
      shape(dx, dy, x, y) {
        const j = ((x * 7 + y * 13) % 3) * 0.32; // ความหยาบของขอบ (deterministic)
        const cuts = [
          0.95 * dx + 0.45 * dy - 5.3,
          -0.85 * dx + 0.55 * dy - 5.1,
          0.15 * dx - 1.0 * dy - 6.2,
          -0.55 * dx - 0.95 * dy - 5.9,
          1.0 * dx - 0.5 * dy - 5.6,
        ];
        let maxCut = -Infinity;
        for (const c of cuts) if (c > maxCut) maxCut = c;
        return { in: maxCut + j <= 0, edge: maxCut + j > -1.45 };
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 8.5, 6.5, 1.7, P.s, P.l); // แกนเรืองเย็น
        // รอยร้าวเฉียงสั้นๆ
        for (const [cx, cy] of [[5, 9], [6, 10], [10, 9], [11, 10]]) {
          if (grid[cy] && grid[cy][cx] && grid[cy][cx] !== GemArt.OUTLINE) grid[cy][cx] = P.d;
        }
      },
    },
    { // 4 — Nebula Prism: ปริซึมออร์แกนิกเบี้ยว ทรงลื่นไหล เรืองในนุ่ม
      shape(dx, dy) {
        const nx = dx + dy * 0.3; // เอียงทั้งทรง = อสมมาตร
        const m = Math.pow(Math.abs(nx) / 5.9, 1.7) + Math.pow(Math.abs(dy) / 6.7, 1.7);
        return { in: m <= 1, edge: m > 0.66 };
      },
      detail(grid, P) {
        GemArt.paintCore(grid, 7, 8, 2.4, P.l, null);  // เรืองในกว้างนุ่ม
        GemArt.paintCore(grid, 7, 8, 1.1, P.s, null);
      },
    },
    { // 5 — Solar Core: ผลึกกลมหนาแน่น ร่องกลไกพาดขวาง แกนทองสว่าง
      shape(dx, dy) {
        const r2 = dx * dx + dy * dy;
        return { in: r2 <= 52, edge: r2 > 38 };
      },
      detail(grid, P) {
        // ร่องกลไก: แถวเว้นระยะสม่ำเสมอ (เฉพาะเนื้อใน ไม่ทับขอบ/แกน)
        for (const gy of [4, 7, 10]) {
          for (let x = 0; x < GemArt.SPRITE; x++) {
            const c = grid[gy] && grid[gy][x];
            if (c && c !== GemArt.OUTLINE) grid[gy][x] = P.d;
          }
        }
        GemArt.paintCore(grid, 7.5, 7.5, 1.8, P.s, P.l); // แกนทอง (ทับร่องได้)
      },
    },
  ];

  /**
   * พาสวัสดุกลาง (TASK-005) — ใช้ร่วมทุกเจมให้ "เป็นแร่จากจักรวาลเดียวกัน"
   * ลำดับ: ขอบรับแสง → เงาสัมผัส → เหลี่ยมผลึก dither → จุดสะท้อน
   * ทิศแสงร่วม: บน-ซ้าย เสมอ | seed ต่อชนิด = ลาย dither อสมมาตรไม่ซ้ำกัน (ฟีลมือทำ)
   * @param {(string|null)[][]} grid
   * @param {{m:string,l:string,d:string,s:string}} P
   * @param {number} seed
   */
  static applyMaterial(grid, P, seed) {
    const S = GemArt.SPRITE;
    const O = GemArt.OUTLINE;
    const isBody = (y, x) => y >= 0 && y < S && x >= 0 && x < S && grid[y][x] !== null && grid[y][x] !== O;
    const isEdge = (y, x) => y < 0 || y >= S || x < 0 || x >= S || grid[y][x] === O || grid[y][x] === null;

    // เก็บผลไว้ก่อนค่อยเขียน — กัน pass อ่านค่าที่เพิ่งแก้ของตัวเอง
    const writes = [];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (!isBody(y, x)) continue;
        const touchTL = isEdge(y - 1, x) || isEdge(y, x - 1); // ชิดเปลือกฝั่งรับแสง
        const touchBR = isEdge(y + 1, x) || isEdge(y, x + 1); // ชิดเปลือกฝั่งเงา
        if (touchTL && !touchBR) { writes.push([y, x, P.l]); continue; }  // ขอบรับแสง (rim light)
        if (touchBR && !touchTL) { writes.push([y, x, P.d]); continue; }  // เงาสัมผัสเปลือก
        // เหลี่ยมผลึกภายใน: dither ประปรายสองชั้น สว่าง/มืด — ให้ความลึกในเนื้อแร่
        if ((x * 3 + y * 5 + seed) % 11 === 0) writes.push([y, x, P.l]);
        else if ((x * 5 + y * 7 + seed) % 13 === 0) writes.push([y, x, P.d]);
      }
    }
    for (const [y, x, c] of writes) grid[y][x] = c;

    // จุดสะท้อนแสง 2 พิกเซล: หาเนื้อเจมจุดที่ "บนซ้ายสุด" ตามทิศแสงร่วม
    let best = null, bestV = Infinity;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (isBody(y, x) && !isEdge(y, x + 1) && x + y < bestV) { bestV = x + y; best = { x, y }; }
    }
    if (best) {
      grid[best.y][best.x] = P.s;
      if (isBody(best.y, best.x + 1)) grid[best.y][best.x + 1] = P.s;
    }
  }

  /** ตัวช่วยกลาง: ระบายแกนกลม (สีในสุด + วงรอบ) เฉพาะบนเนื้อเจม — ใช้ร่วมทุกโปรไฟล์ */
  static paintCore(grid, cx, cy, r, colInner, colOuter) {
    const S = GemArt.SPRITE;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const c = grid[y][x];
        if (!c || c === GemArt.OUTLINE) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) grid[y][x] = colInner;
        else if (colOuter && d <= r + 1) grid[y][x] = colOuter;
      }
    }
  }

  /**
   * คืนตารางสี 16x16 ของเจมชนิดนั้น (null = โปร่งใส)
   * ทรงมาจาก PROFILES[type].shape → แรเงากลางร่วมกัน → detail เฉพาะตัว
   * @param {number} type 0..5
   * @returns {(string|null)[][]} grid[y][x]
   */
  static spriteData(type) {
    const P = GemArt.PALETTE[type];
    const O = GemArt.OUTLINE;
    const S = GemArt.SPRITE;
    const prof = GemArt.PROFILES[type];
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 7.5, dy = y - 7.5;
        const { in: inside, edge } = prof.shape(dx, dy, x, y);
        if (!inside) { grid[y][x] = null; continue; }
        if (edge) { grid[y][x] = O; continue; }
        // แรเงาพื้นฐานร่วม: แสงบน-ซ้าย / เงาล่าง-ขวา
        grid[y][x] = (dx + dy < -2.5) ? P.l : (dx + dy > 3.5 ? P.d : P.m);
      }
    }
    GemArt.applyMaterial(grid, P, type * 17); // พาสวัสดุร่วม (TASK-005) — ก่อนลายเฉพาะตัว
    if (prof.detail) prof.detail(grid, P);
    return grid;
  }

  /**
   * ตารางสีของ "ชั้นระเบิด" ที่วางทับสไปรต์สีเดิม — 2 เฟรม (แกนเต้นตุบๆ)
   * @param {number} frame 0 หรือ 1
   * @returns {(string|null)[][]}
   */
  static bombOverlayData(frame) {
    const S = GemArt.SPRITE;
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 7.5, dy = y - 7.5;
        const r2 = dx * dx + dy * dy;
        let col = null;
        if (r2 <= 12.25) col = GemArt.OUTLINE;                // แกนดำ r3.5
        const coreR2 = frame === 0 ? 3 : 6;                   // แกนไฟเต้น
        if (r2 <= coreR2) col = frame === 0 ? '#ff6b1a' : '#ffd84d';
        // ประกายชนวนมุมขวาบน
        const fx = x - 12, fy = y - 3;
        if (fx * fx + fy * fy <= (frame === 0 ? 1 : 2.5)) col = '#ffffff';
        grid[y][x] = col;
      }
    }
    return grid;
  }

  /**
   * ตารางสีของโนวา — ดาว 4 แฉกเรืองแสง 3 เฟรม (สีหมุนวน)
   * @param {number} frame 0..2
   * @returns {(string|null)[][]}
   */
  static novaData(frame) {
    const S = GemArt.SPRITE;
    const MAIN = ['#ff4d6d', '#ffd84d', '#4da8ff'][frame];
    const EDGE = ['#b46cff', '#ff6b1a', '#5cff9c'][frame];
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const ax = Math.abs(x - 7.5), ay = Math.abs(y - 7.5);
        let col = null;
        const arm = (ax < 1.5 && ay < 7.5) || (ay < 1.5 && ax < 7.5); // แฉกยาว
        const body = ax + ay <= 5;                                     // ตัวเพชรกลาง
        if (arm || body) col = MAIN;
        if (ax + ay > 3.5 && ax + ay <= 5) col = EDGE;                 // ขอบเพชร
        if (ax + ay <= 2) col = '#ffffff';                             // แกนขาว
        grid[y][x] = col;
      }
    }
    return grid;
  }

  // =====================================================
  // ประกอบ canvas (เรียกครั้งเดียวตอนสร้าง — ไม่มี alloc ต่อเฟรม)
  // =====================================================

  /** แปลงตารางสีเป็น offscreen canvas */
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

  /**
   * เรืองแสงนุ่มๆ (radial gradient สีเดียวกับเจม) วาดใต้เจมแต่ละเม็ด
   * @param {string} color สี hex หลักของเจมชนิดนั้น
   * @returns {HTMLCanvasElement}
   */
  static buildGlowSprite(color) {
    const S = 64; // ความละเอียดสูงกว่าสไปรต์ปกติ เพื่อให้ gradient เนียน
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, color + '86');  // เบาลงจากเดิม (TASK-005: no harsh bloom)
    grad.addColorStop(0.5, color + '22');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
  }

  /** เรนเดอร์สไปรต์ทั้งหมด: เจม 6 ชนิด + ชั้นระเบิด 2 เฟรม + โนวา 3 เฟรม + glow */
  buildSprites() {
    /** @type {HTMLCanvasElement[]} */
    this.sprites = [];
    for (let type = 0; type < GemArt.PALETTE.length; type++) {
      this.sprites.push(GemArt.gridToCanvas(GemArt.spriteData(type)));
    }
    this.bombOverlays = [0, 1].map((f) => GemArt.gridToCanvas(GemArt.bombOverlayData(f)));
    this.novaFrames = [0, 1, 2].map((f) => GemArt.gridToCanvas(GemArt.novaData(f)));
    this.glowSprites = GemArt.PALETTE.map((p) => GemArt.buildGlowSprite(p.m));
    this.novaGlow = GemArt.buildGlowSprite('#ffffff');
  }

  /** glow สีขาวสำหรับกรอบเลือก (Renderer ใช้) */
  get selectionGlow() {
    return this.novaGlow;
  }

  // =====================================================
  // วาดเจม 1 เม็ด (ย้ายจาก Renderer.drawCandy — พฤติกรรมเดิมทุกประการ)
  // =====================================================

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../board/Cell.js').Cell} cell
   * @param {number} time เวลาปัจจุบัน (ms)
   */
  drawGem(ctx, cell, time = 0) {
    const C = this.CELL;
    const candy = cell.candy;

    // หายใจเบาๆ: 1.00 → 1.03 → 1.00 วนลูป เฟสต่างกันตามตำแหน่งช่อง ไม่ให้ทั้งกระดานหายใจพร้อมกัน
    const phase = (cell.col * 340 + cell.row * 260);
    const breathe = 1 + 0.03 * (0.5 + 0.5 * Math.sin((time + phase) / 900));

    const base = (C - this.GAP) * candy.scale * breathe;
    const width = base * candy.scaleX;
    const height = base * candy.scaleY;
    const px = cell.col * C + C / 2 + candy.offsetX - width / 2;
    const py = cell.row * C + C / 2 + candy.offsetY - height / 2;
    if (base <= 0) return;

    // เรืองแสงนุ่มๆ ใต้เจม (ใหญ่กว่าตัวเม็ดเล็กน้อย ให้ฟีลเรืองออกมา ไม่ยืด/บีบตาม)
    const glowSize = base * 1.55;
    const gx = cell.col * C + C / 2 + candy.offsetX - glowSize / 2;
    const gy = cell.row * C + C / 2 + candy.offsetY - glowSize / 2;
    const glow = candy.special === 'nova' ? this.novaGlow : this.glowSprites[candy.type];
    ctx.drawImage(glow, gx, gy, glowSize, glowSize);

    if (candy.special === 'nova') {
      // โนวา: ดาวเรืองแสงสีหมุนวน 3 เฟรม
      const frame = Math.floor(time / 150) % 3;
      ctx.drawImage(this.novaFrames[frame], px, py, width, height);
      return;
    }
    ctx.drawImage(this.sprites[candy.type], px, py, width, height);
    if (candy.special === 'bomb') {
      // ระเบิด: สีเดิม + แกนไฟเต้นตุบๆ 2 เฟรม
      const frame = Math.floor(time / 250) % 2;
      ctx.drawImage(this.bombOverlays[frame], px, py, width, height);
    }
  }
}
