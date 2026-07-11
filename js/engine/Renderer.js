/**
 * Renderer — ผู้จัดฉากและวาดเฟรม (TASK-002: ไม่รู้วิธีวาดเจมอีกต่อไป)
 *
 * หน้าที่ที่เหลือ: จัดการ canvas/ขนาดจอ, พื้นหลังอวกาศ, CRT overlay,
 * พาร์ติเคิล/เลขลอย, กรอบเลือก และ "สั่ง" GemArt ให้วาดเจมแต่ละเม็ด
 *
 * สถาปัตยกรรม:  Renderer → GemArt → Gem Drawing
 * งานอาร์ตเจมทั้งหมด (ทรง, สี, เลเยอร์, sprite) อยู่ใน GemArt.js
 * → เปลี่ยนงานศิลป์ในอนาคตแก้ GemArt ไฟล์เดียว ไม่แตะไฟล์นี้
 *
 * ใช้พิกัด "logical" คงที่ 512x512 (8 ช่อง x 64px) แล้วสเกลตอนวาด
 */
import { GemArt } from './GemArt.js';

export class Renderer {
  /** ขนาด logical ของกระดาน (px) */
  static LOGICAL = 512;
  /** ขนาดช่อง (px logical) */
  static CELL = 64;
  /** ระยะห่างระหว่างเจม (px logical) — กันกระดานดูอัดแน่นเกินไป */
  static GAP = 4;
  /** จานสีเจม — ชี้ไปที่ GemArt (คง API เดิมไว้ให้ Game.js ใช้เรื่องสีพาร์ติเคิล) */
  static PALETTE = GemArt.PALETTE;
  /** สีเส้นขอบ (ใช้ร่วมกับตัวหนังสือลอย) */
  static OUTLINE = GemArt.OUTLINE;
  /** สตริงสีดาวกะพริบ 3 ระดับ — คงที่ตลอดชีวิต ไม่ต้องประกอบสตริงใหม่ทุกเฟรม (TASK-003) */
  static STAR_STYLES = ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.95)'];
  /** ออฟเซ็ตศูนย์ที่ใช้ซ้ำเมื่อไม่มีจอสั่น — เลี่ยงสร้าง object ทุกเฟรม (TASK-003) */
  static NO_SHAKE = { x: 0, y: 0 };

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    /** งานอาร์ตเจมทั้งหมดอยู่ในโมดูลนี้ */
    this.gemArt = new GemArt(Renderer.CELL, Renderer.GAP);
    this.buildBackground();
    this.buildHearthLight();
    this.buildCRTOverlay();
    this.buildShootingStars();
    this.buildWindowLife();
    this.resize();
    window.addEventListener('resize', () => this.resize());
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
      // แสงอุ่นซึมขึ้นจากฐานกระดาน — "เตาไฟจักรวาล" ทำให้เจม jewel-tone อุ่นขึ้น (ART_BIBLE: warm amber)
      [256, 372, 150, 'rgba(255,176,92,.10)'],
      // เมฆเนบิวลาเย็นระยะไกลนอกหน้าต่าง — เพิ่มมิติ/ตัดกับโทนอุ่นให้เจมเด่น (นอกยานเท่านั้น)
      [300, 150, 82, 'rgba(96,214,196,.09)'],
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

    // ดาวเคราะห์ไกลๆ ลอยเบลอๆ มุมจอ (นิ่ง — ไกลมากจนแทบไม่ขยับ) ให้ความลึกฉากหลัง
    this.drawDistantPlanet(g, 452, 66, 34, '#b46cff', '#6c3ab8');
    this.drawDistantPlanet(g, 56, 452, 24, '#4da8ff', '#2a6ab8');

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

    /** ฝุ่นอวกาศ: จุดเล็กจางๆ จำนวนมาก ลอยเร็วกว่าดาว (เลเยอร์ใกล้กว่า = พารัลแลกซ์)
     *  อัลฟาคงที่ต่อเม็ด → ประกอบสตริงสีครั้งเดียวตรงนี้ ไม่ทำซ้ำทุกเฟรม (TASK-003) */
    this.dust = [];
    for (let i = 0; i < 40; i++) {
      const alpha = 0.08 + Math.random() * 0.14;
      this.dust.push({
        x: Math.random() * L,
        y: Math.random() * L,
        size: Math.random() < 0.2 ? 3 : 2,
        style: `rgba(255,255,255,${alpha})`,
      });
    }
  }

  /**
   * แสงอุ่น "เตาไฟจักรวาล" (ART_BIBLE §1: soft amber indirect lighting)
   * เตรียม radial glow อุ่นครั้งเดียวตอน constructor — ต่อเฟรมแค่ drawImage + คุมความเต้นด้วย globalAlpha
   * ให้เจม jewel-tone รู้สึกถูกส่องจากแหล่งอุ่นแหล่งเดียว ไม่ใช่นีออนแบน
   */
  buildHearthLight() {
    const L = Renderer.LOGICAL;
    const c = document.createElement('canvas');
    c.width = L; c.height = L;
    const g = c.getContext('2d');
    const cx = L / 2, cy = L * 0.46; // สูงกว่ากลางเล็กน้อย — ทิศแสงร่วมกับ GemArt (บน)
    const grad = g.createRadialGradient(cx, cy, L * 0.05, cx, cy, L * 0.62);
    grad.addColorStop(0, 'rgba(255,214,150,0.30)');
    grad.addColorStop(0.5, 'rgba(255,176,96,0.12)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, L, L);
    this.hearth = c;
  }

  /**
   * เตรียมดาวตกล่วงหน้า (TASK-003): gradient + Path2D สร้างครั้งเดียว
   * เคล็ด: นิยามหางดาวใน "พิกัดท้องถิ่น" (หัวอยู่ที่ 0,0 หางชี้สวนทิศบิน)
   * ตอนวาดแค่ translate ไปตำแหน่งจริง → gradient เดิมใช้ซ้ำได้ทุกเฟรม
   * ความจางคุมด้วย globalAlpha (คูณเชิงเส้นกับ gradient 0→1 = ผลเท่าสูตรเดิมเป๊ะ)
   */
  buildShootingStars() {
    const defs = [
      { period: 5200, delay: 0, flight: 650, x0: 40, y0: 20, x1: 280, y1: 180 },
      { period: 7800, delay: 3100, flight: 550, x0: 480, y0: 50, x1: 300, y1: 210 },
    ];
    const len = 24;
    this.shootingStars = defs.map((p) => {
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0;
      const norm = Math.hypot(dx, dy) || 1;
      const tx = -(dx / norm) * len, ty = -(dy / norm) * len; // ปลายหางในพิกัดท้องถิ่น
      const grad = this.ctx.createLinearGradient(tx, ty, 0, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      const path = new Path2D();
      path.moveTo(tx, ty);
      path.lineTo(0, 0);
      return { ...p, grad, path };
    });
  }

  /** วาดดาวเคราะห์ไกลๆ แบบง่าย (วงกลมนุ่ม + วงแหวนบาง) ลง context ที่ให้มา */
  drawDistantPlanet(g, cx, cy, r, colorMain, colorDark) {
    const grad = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, colorMain + '55');
    grad.addColorStop(1, colorDark + '22');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    // วงแหวนบางเฉียง 20 องศา
    g.strokeStyle = colorMain + '30';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(cx, cy, r * 1.5, r * 0.35, -0.35, 0, Math.PI * 2);
    g.stroke();
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
    v.addColorStop(1, 'rgba(24,8,6,.42)'); // ขอบอุ่นหม่น (เดิมม่วงเย็น) ให้ฟีลห้องโดยสารอบอุ่น
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
    const shake = effects ? effects.shakeOffset : Renderer.NO_SHAKE;
    ctx.setTransform(this.scale, 0, 0, this.scale, shake.x * this.scale, shake.y * this.scale);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(-shake.x - 4, -shake.y - 4, L + 8, L + 8);
    ctx.drawImage(this.background, 0, 0);

    // ฝุ่นอวกาศลอยช้าๆ แนวทแยง (เลเยอร์ใกล้กว่าดาว จึงลอยเร็วกว่าเล็กน้อย — พารัลแลกซ์)
    const driftDustX = ((time * 0.006) % L + L) % L;
    const driftDustY = ((time * 0.003) % L + L) % L;
    for (const d of this.dust) {
      const x = (d.x + driftDustX) % L;
      const y = (d.y + driftDustY) % L;
      ctx.fillStyle = d.style; // สตริงสีคงที่ ประกอบไว้ล่วงหน้า (TASK-003)
      ctx.fillRect(Math.floor(x), Math.floor(y), d.size, d.size);
    }

    // ดาวกะพริบแบบขั้นบันได 3 ระดับ (ฟีลเรโทร ไม่เฟดเนียน) + ลอยช้ากว่าฝุ่น (ไกลกว่า)
    const driftStarX = ((time * 0.0018) % L + L) % L;
    const driftStarY = ((time * 0.0009) % L + L) % L;
    const tick = Math.floor(time / 300);
    for (const s of this.stars) {
      const x = (s.x + driftStarX) % L;
      const y = (s.y + driftStarY) % L;
      ctx.fillStyle = Renderer.STAR_STYLES[(tick + s.phase) % 3]; // ตารางสตริงคงที่ (TASK-003)
      ctx.fillRect(x, y, s.size === 8 ? 3 : 2, s.size === 8 ? 3 : 2);
    }

    this.drawWindowLife(time);
    this.drawShootingStars(time);

    // แสงอุ่น "เตาไฟจักรวาล" เต้นช้าๆ ราวหัวใจ (ART_BIBLE §2: lights pulse like a heartbeat)
    // วาดใต้เจมด้วย 'lighter' → ส่องฉากหลังให้อุ่น แล้วเจมทับด้านบนจึงยังคม
    // คุมความสว่างด้วย globalAlpha ล้วน — คงหลักศูนย์ allocation ต่อเฟรม (TASK-003)
    const beat = 0.80 + 0.20 * (0.5 + 0.5 * Math.sin(time / 1500));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = beat;
    ctx.drawImage(this.hearth, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // เจมทุกเม็ด — มอบหมายให้ GemArt (Renderer ไม่รู้วิธีวาด)
    board.forEachCell((cell) => {
      if (cell.candy) this.gemArt.drawGem(ctx, cell, time);
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

  /**
   * ชีวิตในหน้าต่างอวกาศของเครื่องขุด (ART_BIBLE §4: window to space + §6: ambient)
   * เตรียมทุกอย่างครั้งเดียว — ต่อเฟรมเหลือคณิต + drawImage (คงศูนย์ allocation, TASK-003)
   *  • ดาวเทียมโบราณลอยผ่านช้ามาก (glacial) พร้อมไฟบีคอนกะพริบ
   *  • ฝนดาวตกจางๆ หลายเส้น (distant meteor shower) — แยกจากดาวตกเด่น 2 เส้นเดิม
   */
  buildWindowLife() {
    // — ดาวเทียมโบราณ (silhouette เข้มโทนมอสส์ + ปีกโซลาร์ + ขอบรับแสงบางๆ) —
    const sat = document.createElement('canvas');
    sat.width = 48; sat.height = 22;
    const sg = sat.getContext('2d');
    sg.fillStyle = '#0f1e1a';                 // ตัวถังเข้ม
    sg.fillRect(16, 6, 16, 10);
    sg.fillStyle = '#16302a';                 // แผงข้างสว่างขึ้นนิด
    sg.fillRect(18, 8, 12, 2); sg.fillRect(18, 12, 12, 2);
    sg.fillStyle = '#0c1815';                 // ปีกโซลาร์ซ้าย-ขวา
    sg.fillRect(2, 9, 12, 4); sg.fillRect(34, 9, 12, 4);
    sg.fillStyle = '#20463c';                 // ก้านต่อปีก
    sg.fillRect(13, 10, 4, 2); sg.fillRect(31, 10, 4, 2);
    sg.fillStyle = 'rgba(120,170,150,.5)';    // ขอบรับแสงบน (ทิศแสงร่วมกับทั้งฉาก)
    sg.fillRect(16, 6, 16, 1);
    this.satellite = sat;
    // เส้นทางลอย: ซ้าย→ขวา ช่วงบนของหน้าต่าง คาบ ~52s (glacial) — ตำแหน่งบีคอนสัมพัทธ์กับตัวถัง
    this.satelliteDef = { period: 52000, x0: -60, x1: 572, y: 74, bobAmp: 5, beakonX: 30, beakonY: 8 };

    // — ฝนดาวตกจางๆ: เตรียม gradient+Path2D ต่อเส้นครั้งเดียว (เหมือน shootingStars แต่สั้น/จางกว่า) —
    const defs = [
      { period: 4200, delay: 600,  flight: 520, x0: 120, y0: 10, x1: 250, y1: 120 },
      { period: 6100, delay: 2600, flight: 600, x0: 380, y0: 20, x1: 300, y1: 150 },
      { period: 5200, delay: 1500, flight: 560, x0: 60,  y0: 40, x1: 170, y1: 160 },
      { period: 7000, delay: 4200, flight: 640, x0: 460, y0: 30, x1: 360, y1: 170 },
    ];
    const len = 12;
    this.meteors = defs.map((p) => {
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0;
      const norm = Math.hypot(dx, dy) || 1;
      const tx = -(dx / norm) * len, ty = -(dy / norm) * len;
      const grad = this.ctx.createLinearGradient(tx, ty, 0, 0);
      grad.addColorStop(0, 'rgba(210,225,255,0)');
      grad.addColorStop(1, 'rgba(210,225,255,1)');
      const path = new Path2D();
      path.moveTo(tx, ty); path.lineTo(0, 0);
      return { ...p, grad, path };
    });
  }

  /**
   * วาดชีวิตในหน้าต่าง (ไกลสุด — วาดหลังดาว ก่อนดาวตกเด่น/เจม)
   * ทั้งหมดคณิตล้วน + drawImage/stroke จาก object ที่ prebuild แล้ว
   */
  drawWindowLife(time) {
    const ctx = this.ctx;
    // ฝนดาวตกจางๆ (จางกว่าดาวตกเด่นครึ่งหนึ่ง)
    for (const p of this.meteors) {
      const phase = (time + p.delay) % p.period;
      if (phase > p.flight) continue;
      const k = phase / p.flight;
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k;
      const a = (k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85)) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.grad;
      ctx.lineWidth = 1;
      ctx.stroke(p.path);
      ctx.restore();
    }
    // ดาวเทียมโบราณลอยผ่านช้ามาก
    const S = this.satelliteDef;
    const t = (time % S.period) / S.period;      // 0..1
    const x = S.x0 + (S.x1 - S.x0) * t;
    const y = S.y + Math.sin(t * Math.PI * 2) * S.bobAmp;
    // จางเข้า/ออกที่ขอบจอ ให้ค่อยๆ โผล่-ลับ ไม่วาบ
    const edge = Math.min(1, x / 60, (512 - x) / 60);
    const a = Math.max(0, edge) * 0.7;
    if (a > 0.01) {
      ctx.globalAlpha = a;
      ctx.drawImage(this.satellite, Math.round(x), Math.round(y));
      // ไฟบีคอนแดงกะพริบ (ชีวิตกลไก) — สว่าง-ดับเป็นจังหวะ
      const blink = 0.5 + 0.5 * Math.sin(time / 520);
      ctx.globalAlpha = a * blink;
      ctx.fillStyle = '#ff5a4a';
      ctx.fillRect(Math.round(x) + S.beakonX, Math.round(y) + S.beakonY, 2, 2);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * ดาวตก: เส้นแสงวิ่งทแยงจาง ๆ ผ่านจอเป็นระยะๆ (สุ่มแบบ deterministic จาก time)
   * TASK-003: ศูนย์ allocation ต่อเฟรม — gradient/Path2D สร้างครั้งเดียวใน buildShootingStars()
   * ต่อเฟรมเหลือแค่คณิตล้วน + translate ไปตำแหน่งจริง + คุมความจางด้วย globalAlpha
   */
  drawShootingStars(time) {
    const ctx = this.ctx;
    for (const p of this.shootingStars) {
      const phase = (time + p.delay) % p.period;
      if (phase > p.flight) continue;
      const k = phase / p.flight;
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y0 + (p.y1 - p.y0) * k;
      const alpha = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);

      ctx.save();
      ctx.translate(x, y);            // ย้ายเข้าพิกัดท้องถิ่นที่ gradient ถูกนิยามไว้
      ctx.globalAlpha = alpha;        // แทน stop สุดท้ายของ gradient เดิม (คูณเชิงเส้นเท่ากัน)
      ctx.strokeStyle = p.grad;
      ctx.lineWidth = 2;
      ctx.stroke(p.path);
      ctx.restore();
    }
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

  /** วาดเลขคะแนนลอยขึ้น ด้วยฟอนต์พิกเซลตัดขอบดำ — รองรับตัวใหญ่ (big) สำหรับ COMBO/คะแนนก้อนโต */
  drawFloaters(effects) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    for (const f of effects.floaters) {
      ctx.font = (f.big ? 20 : 12) + "px 'Press Start 2P', monospace";
      const alpha = Math.max(0, Math.min(1, f.life / f.maxLife / 0.4));
      ctx.globalAlpha = alpha;
      const o = f.big ? 2 : 1; // เงาหนาขึ้นตามขนาดตัวอักษร
      ctx.fillStyle = Renderer.OUTLINE;
      ctx.fillText(f.text, f.x + o, f.y + o);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /** กรอบเลือก: เรืองแสงพัลส์นุ่มๆ + มุมพิกเซล 4 มุม (ใช้ glow สีขาวจาก GemArt) */
  drawSelection(cell, time) {
    const ctx = this.ctx;
    const C = Renderer.CELL;
    const x = cell.col * C, y = cell.row * C;

    // เรืองแสงพัลส์: อัลฟาไล่ขึ้นลงนุ่มๆ แทนการกะพริบ ให้ "เด่นทันที" แต่ไม่กระตุก
    const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time / 260));
    const glowSize = C * 1.7;
    ctx.globalAlpha = pulse;
    ctx.drawImage(this.gemArt.selectionGlow, x + C / 2 - glowSize / 2, y + C / 2 - glowSize / 2, glowSize, glowSize);
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
