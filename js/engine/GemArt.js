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

  /** จานสี 8-bit ต่อชนิด: m=หลัก l=อ่อน d=เข้ม s=รอง */
  static PALETTE = [
    { m: '#e8404f', l: '#ff8090', d: '#9c2033', s: '#ffe0b0' }, // 0 ดาวเคราะห์วงแหวน
    { m: '#ffd84d', l: '#fff0a0', d: '#b8912a', s: '#ffffff' }, // 1 ดาวประกาย
    { m: '#4fe87f', l: '#a0ffc0', d: '#2a9c50', s: '#eafff2' }, // 2 คริสตัล
    { m: '#4da8ff', l: '#a0d8ff', d: '#2a6ab8', s: '#f0f8ff' }, // 3 จันทร์เสี้ยว
    { m: '#b46cff', l: '#d9b3ff', d: '#6c3ab8', s: '#ffffff' }, // 4 วงโคจร
    { m: '#ff6b1a', l: '#ff9e5e', d: '#a63e00', s: '#fff2e0' }, // 5 ดาวหาง (ส้มเข้ม ไม่กลืนกับเหลือง)
  ];
  /** สีเส้นขอบสไปรต์ (ดำอมม่วงแบบ Balatro) */
  static OUTLINE = '#1a1030';

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
   * คืนตารางสี 16x16 ของเจมชนิดนั้น (null = โปร่งใส)
   * @param {number} type 0..5
   * @returns {(string|null)[][]} grid[y][x]
   */
  static spriteData(type) {
    const P = GemArt.PALETTE[type];
    const O = GemArt.OUTLINE;
    const S = GemArt.SPRITE;
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 7.5, dy = y - 7.5;
        const r2 = dx * dx + dy * dy;
        let col = null;

        // ทรงกลมพื้นฐาน (รัศมี 7.4 — เต็มช่องเกือบสุด): ขอบนอก + แสงบน-ซ้าย + เงาล่าง-ขวา
        if (r2 <= 54.76) {
          if (r2 > 40.96) col = O;
          else col = (dx + dy < -3.5) ? P.l : (dx + dy > 4.5 ? P.d : P.m);
        }

        // ---- ลายประจำชนิด ----
        switch (type) {
          case 0: // วงแหวนดาวเคราะห์พาดกลาง
            if (y === 8) col = (col === null) ? P.s : (col === O ? O : P.s);
            if (y === 9 && col !== null && col !== O) col = P.d;
            break;
          case 1: // ดาวประกายกากบาท
            if (col !== null && col !== O) {
              const ax = Math.abs(dx), ay = Math.abs(dy);
              if ((ax < 1 && ay < 4.5) || (ay < 1 && ax < 4.5) || (ax < 2 && ay < 2)) col = P.s;
            }
            break;
          case 2: { // คริสตัลเพชร
            const man = Math.abs(dx) + Math.abs(dy);
            if (col !== null && col !== O) {
              if (man <= 4) col = P.s;
              else if (man <= 5) col = P.l;
            }
            break;
          }
          case 3: { // จันทร์เสี้ยว (วงกลมสว่าง โดนวงเงากินมุมบนขวา)
            if (col !== null && col !== O) {
              if (r2 <= 25) col = P.s;
              const cx = x - 9.5, cy = y - 5.5;
              if (cx * cx + cy * cy <= 20 && col === P.s) col = P.m;
            }
            break;
          }
          case 4: { // วงโคจร + ดวงจันทร์เล็ก
            if (col !== null && col !== O) {
              const r = Math.sqrt(r2);
              if (Math.abs(r - 5.2) <= 0.75) col = P.s;
            }
            const mx = x - 13, my = y - 7;
            if (mx * mx + my * my <= 2 && col !== null && col !== O) col = P.l;
            break;
          }
          case 5: { // ดาวหาง: หัวสว่าง + หางเฉียงล่างซ้าย
            const hx = x - 10, hy = y - 5;
            if (hx * hx + hy * hy <= 6.25 && col !== null && col !== O) col = P.s;
            const t = ((10 - x) + (y - 5)) / 2;      // ระยะตามแนวหาง
            const off = (10 - x) - (y - 5);          // ระยะเบี่ยงข้างหาง
            if (t >= 1 && t <= 5.5 && Math.abs(off) <= (5.5 - t) / 2) {
              col = (col === null) ? P.l : (col === O ? O : P.l);
            }
            break;
          }
        }
        grid[y][x] = col;
      }
    }
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
    grad.addColorStop(0, color + 'b0');
    grad.addColorStop(0.5, color + '30');
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
