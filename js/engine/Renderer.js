/**
 * Renderer — งานวาดทั้งหมดอยู่ที่นี่ที่เดียว
 *
 * 🕹️ อาร์ตสไตล์: 8-bit pixel art + ฟีล CRT (แบบ Balatro)
 * - สไปรต์ลูกกวาด 16x16 px สร้างด้วยโค้ดล้วน (ไม่ต้องมีไฟล์ภาพ)
 *   แล้วขยาย 4 เท่าแบบไม่เกลี่ยพิกเซล (imageSmoothing = false)
 * - เส้นสแกน (scanlines) + ขอบจอมืด (vignette) ซ้อนทับแบบ CRT
 * - ดาวพื้นหลังกะพริบแบบขั้นบันได (quantized) ให้ฟีลเรโทร
 *
 * ใช้พิกัด "logical" คงที่ 512x512 (8 ช่อง x 64px) แล้วสเกลตอนวาด
 */
export class Renderer {
  /** ขนาด logical ของกระดาน (px) */
  static LOGICAL = 512;
  /** ขนาดช่อง (px logical) */
  static CELL = 64;
  /** ระยะห่างระหว่างลูกกวาด (px logical) — กันกระดานดูอัดแน่นเกินไป */
  static GAP = 4;
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
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buildSprites();
    this.buildBackground();
    this.buildCRTOverlay();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // =====================================================
  // สไปรต์พิกเซล 16x16 (สร้างด้วยกติกาต่อพิกเซล — pure function เทสต์ได้)
  // =====================================================

  /**
   * คืนตารางสี 16x16 ของลูกกวาดชนิดนั้น (null = โปร่งใส)
   * เป็น static pure function → เทสต์รูปทรงใน node ได้
   * @param {number} type 0..5
   * @returns {(string|null)[][]} grid[y][x]
   */
  static spriteData(type) {
    const P = Renderer.PALETTE[type];
    const O = Renderer.OUTLINE;
    const S = Renderer.SPRITE;
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
    const S = Renderer.SPRITE;
    const grid = [];
    for (let y = 0; y < S; y++) {
      grid[y] = [];
      for (let x = 0; x < S; x++) {
        const dx = x - 7.5, dy = y - 7.5;
        const r2 = dx * dx + dy * dy;
        let col = null;
        if (r2 <= 12.25) col = Renderer.OUTLINE;              // แกนดำ r3.5
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
    const S = Renderer.SPRITE;
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

  /** แปลงตารางสีเป็น offscreen canvas */
  static gridToCanvas(grid) {
    const S = Renderer.SPRITE;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (grid[y][x]) { g.fillStyle = grid[y][x]; g.fillRect(x, y, 1, 1); }
    }
    return c;
  }

  /** เรนเดอร์สไปรต์ทั้งหมด: ลูกกวาด 6 ชนิด + ชั้นระเบิด 2 เฟรม + โนวา 3 เฟรม */
  buildSprites() {
    /** @type {HTMLCanvasElement[]} */
    this.sprites = [];
    for (let type = 0; type < Renderer.PALETTE.length; type++) {
      this.sprites.push(Renderer.gridToCanvas(Renderer.spriteData(type)));
    }
    this.bombOverlays = [0, 1].map((f) => Renderer.gridToCanvas(Renderer.bombOverlayData(f)));
    this.novaFrames = [0, 1, 2].map((f) => Renderer.gridToCanvas(Renderer.novaData(f)));
    this.glowSprites = Renderer.PALETTE.map((p) => Renderer.buildGlowSprite(p.m));
    this.novaGlow = Renderer.buildGlowSprite('#ffffff');
  }

  /**
   * เรืองแสงนุ่มๆ (radial gradient สีเดียวกับลูกกวาด) วาดใต้ลูกกวาดแต่ละเม็ด
   * เพิ่มความ "พรีเมียม" ให้ฟีล modern pixel art ไม่ใช่ retro ล้วนๆ
   * (ต่างจากสไปรต์ที่คมกริบไม่เกลี่ยพิกเซล — อันนี้ตั้งใจให้เบลอ)
   * @param {string} color สี hex หลักของลูกกวาดชนิดนั้น
   * @returns {HTMLCanvasElement}
   */
  static buildGlowSprite(color) {
    const S = 64; // ความละเอียดสูงกว่าสไปรต์ปกติ เพื่อให้ gradient เนียน
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, color + 'b0'); // อัลฟา ~69%
    grad.addColorStop(0.5, color + '30'); // อัลฟา ~19%
    grad.addColorStop(1, color + '00'); // โปร่งใสสุด
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    return c;
  }

  // =====================================================
  // พื้นหลัง + CRT overlay (เตรียมครั้งเดียว)
  // =====================================================

  buildBackground() {
    const L = Renderer.LOGICAL;
    const bg = document.createElement('canvas');
    bg.width = L; bg.height = L;
    const g = bg.getContext('2d');
    g.fillStyle = '#0a0e1e';
    g.fillRect(0, 0, L, L);
    // เนบิวลาแบบ dither พิกเซล (จุด 4px โปรยเป็นกลุ่ม แทน gradient เนียนๆ)
    const clusters = [
      [130, 100, 90, 'rgba(123,92,255,.22)'],
      [400, 380, 110, 'rgba(77,184,255,.16)'],
      [420, 90, 70, 'rgba(232,64,79,.14)'],
    ];
    for (const [cx, cy, cr, color] of clusters) {
      g.fillStyle = color;
      for (let i = 0; i < 260; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * cr;
        const px = Math.floor((cx + Math.cos(a) * d) / 4) * 4;
        const py = Math.floor((cy + Math.sin(a) * d) / 4) * 4;
        g.fillRect(px, py, 4, 4);
      }
    }
    this.background = bg;

    /** ดาวพิกเซล (ตำแหน่งล็อกกับกริด 4px ให้คมแบบ 8-bit) */
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * (L / 4)) * 4,
        y: Math.floor(Math.random() * (L / 4)) * 4,
        size: Math.random() < 0.25 ? 8 : 4,
        phase: Math.floor(Math.random() * 3),
      });
    }
  }

  /** เส้นสแกน + ขอบจอมืด ซ้อนทับให้ฟีลจอ CRT */
  buildCRTOverlay() {
    const L = Renderer.LOGICAL;
    const c = document.createElement('canvas');
    c.width = L; c.height = L;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < L; y += 4) g.fillRect(0, y, L, 2);
    const v = g.createRadialGradient(L / 2, L / 2, L * 0.42, L / 2, L / 2, L * 0.75);
    v.addColorStop(0, 'transparent');
    v.addColorStop(1, 'rgba(5,0,15,.4)');
    g.fillStyle = v;
    g.fillRect(0, 0, L, L);
    this.crt = c;
  }

  // =====================================================
  // ขนาดจอ + แปลงพิกัด
  // =====================================================

  /** ปรับขนาด canvas ให้พอดีจอ (mobile-first) และคมชัดบน retina */
  resize() {
    const maxW = Math.min(window.innerWidth * 0.94, 512);
    const maxH = window.innerHeight - 150;
    const cssSize = Math.max(240, Math.min(maxW, maxH));
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.width = cssSize + 'px';
    this.canvas.style.height = cssSize + 'px';
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);

    this.scale = this.canvas.width / Renderer.LOGICAL;
    // สำคัญมากสำหรับ 8-bit: ห้ามเกลี่ยพิกเซล (ต้องตั้งใหม่ทุกครั้งที่ resize)
    this.ctx.imageSmoothingEnabled = false;
  }

  /** แปลงพิกัดหน้าจอ → ช่องบนกระดาน (null ถ้าอยู่นอกกระดาน) */
  screenToBoard(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const lx = (clientX - rect.left) / rect.width * Renderer.LOGICAL;
    const ly = (clientY - rect.top) / rect.height * Renderer.LOGICAL;
    const col = Math.floor(lx / Renderer.CELL);
    const row = Math.floor(ly / Renderer.CELL);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return { col, row };
  }

  // =====================================================
  // วาดต่อเฟรม
  // =====================================================

  /**
   * วาด 1 เฟรม
   * @param {import('../board/Board.js').Board} board
   * @param {import('../board/Cell.js').Cell|null} selected
   * @param {number} time เวลาปัจจุบัน (ms)
   * @param {import('./Effects.js').Effects|null} [effects] พาร์ติเคิล/เลขลอย/จอสั่น (v0.2.4)
   */
  draw(board, selected, time, effects = null) {
    const ctx = this.ctx;
    const L = Renderer.LOGICAL;
    const shake = effects ? effects.shakeOffset : { x: 0, y: 0 };
    ctx.setTransform(this.scale, 0, 0, this.scale, shake.x * this.scale, shake.y * this.scale);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(-shake.x - 4, -shake.y - 4, L + 8, L + 8);
    ctx.drawImage(this.background, 0, 0);

    // ดาวกะพริบแบบขั้นบันได 3 ระดับ (ฟีลเรโทร ไม่เฟดเนียน)
    const STEPS = [0.25, 0.55, 0.95];
    for (const s of this.stars) {
      const a = STEPS[(Math.floor(time / 300) + s.phase) % 3];
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(s.x, s.y, s.size === 8 ? 3 : 2, s.size === 8 ? 3 : 2);
    }

    board.forEachCell((cell) => {
      if (cell.candy) this.drawCandy(cell, time);
    });

    if (selected) this.drawSelection(selected, time);

    if (effects) {
      this.drawParticles(effects);
      this.drawFloaters(effects);
    }

    // CRT ปิดท้ายทับทุกอย่าง (คงที่ ไม่ขยับตามจอสั่น ให้ฟีลกล้องสั่นในตู้ CRT จริง)
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.drawImage(this.crt, 0, 0);
  }

  /** วาดพาร์ติเคิลแบบพิกเซล (สี่เหลี่ยมจางลงตามอายุ ไม่เกลี่ยพิกเซล) */
  drawParticles(effects) {
    const ctx = this.ctx;
    for (const p of effects.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  }

  /** วาดเลขคะแนนลอยขึ้น ด้วยฟอนต์พิกเซลตัดขอบดำ */
  drawFloaters(effects) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = "12px 'Press Start 2P', monospace";
    for (const f of effects.floaters) {
      const alpha = Math.max(0, Math.min(1, f.life / f.maxLife / 0.4));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = Renderer.OUTLINE;
      ctx.fillText(f.text, f.x + 1, f.y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /** วาดลูกกวาดจากสไปรต์ (ขยาย 4 เท่า คมกริบ) — ตัวพิเศษมีเฟรมกะพริบ + หายใจเบาๆ + เรืองแสง */
  drawCandy(cell, time = 0) {
    const C = Renderer.CELL;
    const candy = cell.candy;

    // หายใจเบาๆ: 1.00 → 1.03 → 1.00 วนลูป เฟสต่างกันตามตำแหน่งช่อง ไม่ให้ทั้งกระดานหายใจพร้อมกัน
    const phase = (cell.col * 340 + cell.row * 260);
    const breathe = 1 + 0.03 * (0.5 + 0.5 * Math.sin((time + phase) / 900));

    const size = (C - Renderer.GAP) * candy.scale * breathe;
    const px = cell.col * C + C / 2 + candy.offsetX - size / 2;
    const py = cell.row * C + C / 2 + candy.offsetY - size / 2;
    if (size <= 0) return;

    // เรืองแสงนุ่มๆ ใต้ลูกกวาด (ใหญ่กว่าตัวเม็ดเล็กน้อย ให้ฟีลเรืองออกมา)
    const glowSize = size * 1.55;
    const gx = cell.col * C + C / 2 + candy.offsetX - glowSize / 2;
    const gy = cell.row * C + C / 2 + candy.offsetY - glowSize / 2;
    const glow = candy.special === 'nova' ? this.novaGlow : this.glowSprites[candy.type];
    this.ctx.drawImage(glow, gx, gy, glowSize, glowSize);

    if (candy.special === 'nova') {
      // โนวา: ดาวเรืองแสงสีหมุนวน 3 เฟรม
      const frame = Math.floor(time / 150) % 3;
      this.ctx.drawImage(this.novaFrames[frame], px, py, size, size);
      return;
    }
    this.ctx.drawImage(this.sprites[candy.type], px, py, size, size);
    if (candy.special === 'bomb') {
      // ระเบิด: สีเดิม + แกนไฟเต้นตุบๆ 2 เฟรม
      const frame = Math.floor(time / 250) % 2;
      this.ctx.drawImage(this.bombOverlays[frame], px, py, size, size);
    }
  }

  /** กรอบเลือก: เรืองแสงพัลส์นุ่มๆ (แทนการกะพริบ on/off แข็งๆ แบบเดิม) + มุมพิกเซล 4 มุม */
  drawSelection(cell, time) {
    const ctx = this.ctx;
    const C = Renderer.CELL;
    const x = cell.col * C, y = cell.row * C;

    // เรืองแสงพัลส์: อัลฟาไล่ขึ้นลงนุ่มๆ แทนการกะพริบ ให้ "เด่นทันที" แต่ไม่กระตุก
    const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time / 260));
    const glowSize = C * 1.7;
    ctx.globalAlpha = pulse;
    ctx.drawImage(this.novaGlow, x + C / 2 - glowSize / 2, y + C / 2 - glowSize / 2, glowSize, glowSize);
    ctx.globalAlpha = 1;

    // มุมพิกเซลหนา 4 มุม เรืองสว่างคงที่ (ไม่กะพริบ) ให้อ่านตำแหน่งได้ชัดเจนตลอด
    const t = 4, len = 18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 2, len, t); ctx.fillRect(x + 2, y + 2, t, len);
    ctx.fillRect(x + C - 2 - len, y + 2, len, t); ctx.fillRect(x + C - 2 - t, y + 2, t, len);
    ctx.fillRect(x + 2, y + C - 2 - t, len, t); ctx.fillRect(x + 2, y + C - 2 - len, t, len);
    ctx.fillRect(x + C - 2 - len, y + C - 2 - t, len, t); ctx.fillRect(x + C - 2 - t, y + C - 2 - len, t, len);
  }
}
