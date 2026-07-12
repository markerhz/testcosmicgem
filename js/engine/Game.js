/**
 * Game — หัวใจของเกม เชื่อมทุกส่วนเข้าด้วยกัน
 *
 *   Input   → บอกว่าผู้เล่นแตะช่องไหน
 *   Board   → เก็บข้อมูลกระดาน/ลูกกวาด
 *   Animation → tween ค่าให้นุ่ม
 *   Renderer  → วาดทุกอย่าง
 *   Systems   → กติกาเกม (v0.2.0 ยังเป็นโครงเปล่า)
 *
 * ลูปหลัก: requestAnimationFrame → update(dt) → draw
 */
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Animation, Easing } from './Animation.js';
import { Effects } from './Effects.js';
import { Sfx } from './Sfx.js';
import { Board } from '../board/Board.js';
import { Candy } from '../board/Candy.js';
import { MatchSystem } from '../systems/MatchSystem.js';
import { GravitySystem } from '../systems/GravitySystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';

/** สถานะของเกม */
const State = {
  IDLE: 'idle',       // รออินพุต
  ANIMATING: 'animating', // กำลังเล่นอนิเมชัน ห้ามรับอินพุต
};

export class Game {
  /** ระยะเวลาอนิเมชันสลับ (ms) */
  static SWAP_DURATION = 160;
  /** ระยะเวลาอนิเมชันแตก (ms) */
  static POP_DURATION = 180;
  /** ระยะเวลาอนิเมชันหล่น (ms) — เหลือไว้เป็นค่าอ้างอิง (TASK 001: ใช้เวลาตามระยะจริงใน dropAndRefill) */
  static FALL_DURATION = 260;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.animation = new Animation();
    this.effects = new Effects();
    this.board = new Board();

    // ---- Systems ----
    this.matchSystem = new MatchSystem(this.board);
    this.gravitySystem = new GravitySystem(this.board);
    this.scoreSystem = new ScoreSystem();
    this.saveSystem = new SaveSystem();
    this.sfx = new Sfx();

    // ---- Input ----
    this.input = new Input(canvas, this.renderer);
    this.input.onTap = (pos) => this.handleTap(pos);
    this.input.onSwipe = (from, to) => this.handleSwipe(from, to);

    /** @type {import('../board/Cell.js').Cell|null} ช่องที่เลือกอยู่ */
    this.selected = null;
    this.state = State.IDLE;
    this.lastTime = 0;

    /** hit-stop: หยุดอนิเมชัน/เอฟเฟกต์สั้นๆ ตอนอิมแพกต์ใหญ่ (ยังวาดต่อ) — จูซคลาสสิก */
    this.freezeTime = 0;

    // ---- HUD (DOM) ----
    this.scoreEl = document.getElementById('score');
    this.multEl = document.getElementById('mult');
    this.muteBtn = document.getElementById('mute');
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        const muted = this.sfx.toggleMute();
        this.muteBtn.textContent = muted ? '🔇' : '🔊';
        this.muteBtn.classList.toggle('muted', muted);
      });
    }
    this.updateHUD(null);
  }

  /**
   * อัปเดต HUD คะแนน
   * @param {{chips:number, mult:number, gained:number}|null} result ผลสเต็ปล่าสุด (null = ว่าง)
   */
  updateHUD(result) {
    if (this.scoreEl) this.scoreEl.textContent = this.scoreSystem.score;
    if (this.multEl) {
      this.multEl.textContent = result ? 'x' + result.mult.toFixed(1) : 'x1.0';
      this.multEl.classList.toggle('hot', !!result && result.mult > 1);
    }
  }

  /** เริ่มลูปหลัก */
  start() {
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(time) {
    const dt = Math.min(32, time - this.lastTime); // กันเฟรมกระโดดตอนสลับแท็บ
    this.lastTime = time;

    if (this.freezeTime > 0) {
      this.freezeTime -= dt; // hit-stop: โลกหยุดชั่วขณะ แต่ยังวาดเฟรมค้างไว้
    } else {
      this.animation.update(dt);
      this.effects.update(dt);
    }
    this.renderer.draw(this.board, this.selected, time, this.effects);

    requestAnimationFrame((t) => this.loop(t));
  }

  /** หยุดโลกสั้นๆ ตอนอิมแพกต์ — ของแรงกว่าทับของเบากว่า */
  hitStop(ms) {
    this.freezeTime = Math.max(this.freezeTime, ms);
  }

  // =====================================================
  // การเลือก + สลับ
  // =====================================================

  /** ผู้เล่นแตะช่อง (col,row) */
  handleTap(pos) {
    this.sfx.ensureCtx(); // ปลุก AudioContext (ต้องทำหลัง gesture ผู้ใช้เท่านั้น) — เรียกซ้ำได้ ราคาถูก
    if (this.state !== State.IDLE) return;
    const cell = this.board.getCell(pos.col, pos.row);
    if (!cell || cell.isEmpty) return;

    // ยังไม่ได้เลือกอะไร → เลือกช่องนี้
    if (!this.selected) {
      this.selected = cell;
      this.sfx.select();
      const C = this.renderer.constructor.CELL;
      this.effects.burst(cell.col * C + C / 2, cell.row * C + C / 2, '#ffffff', 5);
      return;
    }
    // แตะช่องเดิม → ยกเลิกการเลือก
    if (this.selected === cell) {
      this.selected = null;
      return;
    }
    // แตะช่องติดกัน → สลับ
    if (this.selected.isAdjacentTo(cell)) {
      const from = this.selected;
      this.selected = null;
      this.swap(from, cell);
      return;
    }
    // แตะช่องไกล → ย้ายการเลือกมาช่องใหม่ (spec: ไม่ติดกัน = ไม่สลับ)
    this.selected = cell;
  }

  /** ผู้เล่นปัดจากช่อง (col,row) ไปทิศติดกัน — สลับทันทีโดยไม่ต้องแตะ 2 ครั้ง */
  handleSwipe(fromPos, toPos) {
    this.sfx.ensureCtx();
    if (this.state !== State.IDLE) return;
    const from = this.board.getCell(fromPos.col, fromPos.row);
    const to = this.board.getCell(toPos.col, toPos.row);
    if (!from || !to || from.isEmpty || to.isEmpty) return;

    this.selected = null; // ปัดตัดการเลือกค้างจากแท็บก่อนหน้าทิ้ง
    this.swap(from, to);
  }

  /**
   * สลับลูกกวาด 2 ช่องพร้อมอนิเมชัน
   * โนวา → ล้างสีทันที | มี match → resolve cascade | ไม่มี → สลับกลับ
   */
  async swap(a, b) {
    this.state = State.ANIMATING;

    this.sfx.swap();
    await this.animateSwap(a, b);
    // หลังสลับ ตัวพิเศษย้ายไปอยู่ที่ cell a,b (สลับกัน)
    const sa = a.candy && a.candy.special, sb = b.candy && b.candy.special;

    if (sa && sb) {
      // ตัวพิเศษ 2 ตัวชนกัน = คอมโบรวมร่าง
      await this.activateSpecialSwap(a, b);
    } else if (sa === 'nova' || sb === 'nova') {
      // โนวาเดี่ยว + เม็ดปกติ = ล้างสีของอีกฝั่ง
      await this.activateNovaSwap(a, b);
    } else if (sa || sb) {
      // จรวด/ระเบิดเดี่ยว + เม็ดปกติ = จุดชนวนในที่
      await this.activateSpecialSwap(a, b);
    } else {
      const matches = this.matchSystem.findMatches();
      if (matches.length === 0) {
        // ไม่เกิด match → สลับกลับเร็วกว่าขาไป + สั่นจอเบาๆ บอกว่า "ไม่ได้นะ"
        this.sfx.invalid();
        this.effects.shake(2.5, 130);
        await this.animateSwap(a, b, Game.SWAP_DURATION * 0.75);
        this.state = State.IDLE;
        return;
      }
      // ตัวพิเศษเกิดตรงช่องปลายทางที่ผู้เล่นสลับไป (b)
      await this.resolveCascade(matches, b);
    }

    // กันเกมตัน: ถ้าไม่เหลือตาเดิน สับกระดานใหม่จนเดินได้
    if (!this.matchSystem.hasPossibleMove()) {
      let guard = 0;
      do {
        this.board.fillRandom();
      } while (!this.matchSystem.hasPossibleMove() && ++guard < 20);
    }

    this.state = State.IDLE;
  }

  /** สลับข้อมูล + เลื่อนภาพนุ่มๆ แบบ ease-in-out พร้อมบีบ/ยืดตามแนวสลับ (เรียกซ้ำ = สลับกลับ) */
  animateSwap(a, b, duration = Game.SWAP_DURATION) {
    const C = Renderer.CELL;
    const dx = (b.col - a.col) * C;
    const dy = (b.row - a.row) * C;
    const horizontal = dx !== 0;

    // สลับข้อมูลทันที แล้วตั้ง offset ให้ "ภาพ" ยังอยู่ที่เดิม จากนั้น tween เข้า 0
    this.board.swapCandies(a, b);
    b.candy.offsetX = -dx; b.candy.offsetY = -dy;
    a.candy.offsetX = dx;  a.candy.offsetY = dy;

    // ยืดตามแนวเคลื่อนที่ + บีบตามขวางเล็กน้อย (squash & stretch แบบการ์ตูนคลาสสิก)
    const stretchPeak = horizontal ? { scaleX: 0.16, scaleY: -0.12 } : { scaleX: -0.12, scaleY: 0.16 };

    return Promise.all([
      this.animation.tween(a.candy, { offsetX: 0, offsetY: 0 }, duration, Easing.easeInOutQuad),
      this.animation.tween(b.candy, { offsetX: 0, offsetY: 0 }, duration, Easing.easeInOutQuad),
      this.animation.bump(a.candy, stretchPeak, duration),
      this.animation.bump(b.candy, stretchPeak, duration),
    ]);
  }

  /**
   * ลูป cascade: วางแผนเคลียร์ → ขยาย (ระเบิด/โนวา) → แตก → หล่น → เติม → วนจนนิ่ง
   * @param {Array} matches ผลจาก findMatches() รอบแรก
   * @param {import('../board/Cell.js').Cell|null} swapCell ช่องที่ผู้เล่นสลับ (ให้ตัวพิเศษเกิดตรงนั้น)
   * @param {number} startChain ลำดับชั้นเริ่มต้น (nova swap ต่อที่ชั้น 2)
   */
  async resolveCascade(matches, swapCell = null, startChain = 1) {
    let chain = startChain;

    while (matches.length > 0) {
      const { clear, spawns } = this.matchSystem.planClears(matches, chain === startChain ? swapCell : null);
      const info = this.matchSystem.expandClears(clear);
      await this.clearStep(clear, spawns, { chain, bombs: info.bombs, novas: info.novas, comets: info.comets, rockets: info.rockets });
      await this.dropAndRefill();

      matches = this.matchSystem.findMatches();
      chain++;
    }
  }

  /**
   * สลับโนวา: ล้างสีของอีกฝั่งทั้งกระดาน (โนวา + โนวา = ล้างทั้งกระดาน!)
   * หลัง swap แล้ว a ถือลูกกวาดเดิมของ b และกลับกัน
   */
  async activateNovaSwap(a, b) {
    const novaCell = a.candy.special === 'nova' ? a : b;
    const otherCell = novaCell === a ? b : a;
    const clear = new Set([novaCell]);

    if (otherCell.candy.special === 'nova') {
      // โนวาคู่ = ล้างทั้งกระดาน
      this.board.forEachCell((c) => { if (c.candy) clear.add(c); });
    } else {
      const target = otherCell.candy.type;
      this.board.forEachCell((c) => {
        if (c.candy && c.candy.type === target && !c.candy.special) clear.add(c);
      });
    }

    // ตั้ง special ของโนวาเป็น null ก่อนขยาย — กันโนวาตัวเองยิงล้างสีสุ่มซ้ำ
    novaCell.candy.special = null;
    const info = this.matchSystem.expandClears(clear);
    await this.clearStep(clear, [], { chain: 1, bombs: info.bombs, novas: info.novas + 1, comets: info.comets, rockets: info.rockets });
    await this.dropAndRefill();

    // ต่อ cascade ตามปกติ (นับเป็นชั้น 2 ขึ้นไป)
    await this.resolveCascade(this.matchSystem.findMatches(), null, 2);
  }

  /**
   * สลับตัวพิเศษ 2 ตัว = ท่ารวมร่าง (ประยุกต์จาก Shopee/Candy Crush)
   * หรือ ตัวพิเศษเดี่ยว + เม็ดปกติ = จุดชนวนในที่
   * ศูนย์กลางเอฟเฟกต์อยู่ที่ cell b (ช่องปลายทางที่ผู้เล่นสลับไป)
   */
  async activateSpecialSwap(a, b) {
    const N = this.board.size;
    const clear = new Set();
    const sp1 = a.candy && a.candy.special, sp2 = b.candy && b.candy.special;
    const both = sp1 && sp2;
    const isNova = sp1 === 'nova' || sp2 === 'nova';
    const isComet = (s) => s === 'cometH' || s === 'cometV';
    const comets = [sp1, sp2].filter(isComet).length;
    const bombs = [sp1, sp2].filter((s) => s === 'bomb').length;
    const rocketCount = [sp1, sp2].filter((s) => s === 'rocket').length;
    const pivot = b;
    const add = (c, r) => { const cc = this.board.getCell(c, r); if (cc && cc.candy) clear.add(cc); };
    const addRow = (r) => { for (let i = 0; i < N; i++) add(i, r); };
    const addCol = (c) => { for (let i = 0; i < N; i++) add(c, i); };
    let rocketsFired = 0;

    if (both && isNova) {
      // โนวา + ตัวพิเศษใดๆ (รวมจรวด) = ล้างทั้งกระดาน
      this.board.forEachCell((c) => { if (c.candy) clear.add(c); });
    } else if (both && bombs === 2) {
      // ระเบิด + ระเบิด = 5x5
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add(pivot.col + dc, pivot.row + dr);
    } else if (both && comets >= 1 && bombs >= 1) {
      // ดาวหาง + ระเบิด = 3 แถว + 3 คอลัมน์ (กากบาทหนา)
      for (let d = -1; d <= 1; d++) { addRow(pivot.row + d); addCol(pivot.col + d); }
    } else if (both && comets === 2) {
      // ดาวหาง + ดาวหาง = ล้างแถว + คอลัมน์ (กากบาทเต็ม)
      addRow(pivot.row); addCol(pivot.col);
    } else if (both && rocketCount === 2) {
      // จรวด + จรวด = ยิงจรวดล่าเป้าหมาย 5 ลูกทั่วกระดาน (ตาม AI priority เดิม)
      this.matchSystem.launchRockets(5, pivot, clear);
      rocketsFired = 5;
    } else if (both && rocketCount >= 1 && comets >= 1) {
      // จรวด + ดาวหาง = จรวดแปลงร่างยิงลำแสง 3 เป้าหมาย (สุ่มแถว/คอลัมน์ต่อเป้า)
      for (let i = 0; i < 3; i++) {
        const t = this.matchSystem.pickRocketTarget(pivot, clear);
        if (!t) continue;
        if (Math.random() < 0.5) addRow(t.row); else addCol(t.col);
        rocketsFired++;
      }
    } else if (both && rocketCount >= 1 && bombs >= 1) {
      // จรวด + ระเบิด = จรวดระเบิด 3 ลูก กระจายไปตามเป้าหมาย
      for (let i = 0; i < 3; i++) {
        const t = this.matchSystem.pickRocketTarget(pivot, clear);
        if (!t) continue;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(t.col + dc, t.row + dr);
        rocketsFired++;
      }
    } else {
      // ตัวพิเศษเดี่ยว + เม็ดปกติ = จุดชนวนในที่
      const solo = sp1 ? a : b;
      const sp = solo.candy.special;
      if (sp === 'bomb') { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(solo.col + dc, solo.row + dr); }
      else if (sp === 'cometH') addRow(solo.row);
      else if (sp === 'cometV') addCol(solo.col);
      else if (sp === 'rocket') {
        const t = this.matchSystem.pickRocketTarget(solo, clear);
        if (t) { clear.add(t); rocketsFired = 1; }
      }
    }
    clear.add(a); clear.add(b);
    // ปิดสวิตช์ตัวพิเศษที่สลับ กันยิงซ้ำผิดตำแหน่ง (ตัวพิเศษอื่นในกองยังจุดชนวนต่อได้)
    if (a.candy) a.candy.special = null;
    if (b.candy) b.candy.special = null;

    const info = this.matchSystem.expandClears(clear);
    await this.clearStep(clear, [], {
      chain: 1,
      bombs: bombs + info.bombs,
      novas: (isNova ? 1 : 0) + info.novas,
      comets: comets + info.comets,
      rockets: rocketsFired + info.rockets,
    });
    await this.dropAndRefill();
    await this.resolveCascade(this.matchSystem.findMatches(), null, 2);
  }

  /**
   * 1 สเต็ปการแตก: อนิเมชัน 2 จังหวะ → ลบ → แปลงช่องเกิดตัวพิเศษ → คิดคะแนน
   * @param {Set} clear ช่องที่จะแตก
   * @param {Array<{cell:object, type:number, special:string}>} spawns ตัวพิเศษที่จะเกิด
   * @param {{chain:number, bombs:number, novas:number}} ctx
   */
  async clearStep(clear, spawns, ctx) {
    const spawnCells = new Set(spawns.map((s) => s.cell));
    const cells = Array.from(clear);
    const C = Renderer.CELL;

    // เอฟเฟกต์เสียง + จอสั่น ตามลำดับความแรง: โนวา > ระเบิด > จรวด > pop ธรรมดา
    this.sfx.pop(ctx.chain);
    if (ctx.bombs) this.sfx.bomb();
    if (ctx.comets) this.sfx.comet();
    if (ctx.rockets) this.sfx.rocket();
    if (ctx.novas) this.sfx.nova();
    const shakeMag = (ctx.novas ? 10 : 0) + (ctx.bombs ? 6 : 0) + (ctx.comets ? 5 : 0) + (ctx.rockets ? 4 : 0) + Math.min(cells.length, 10) * 0.3;
    if (shakeMag > 0) this.effects.shake(shakeMag, 220);

    // hit-stop ตอนอิมแพกต์ใหญ่: โนวา > ระเบิด > ดาวหาง > จรวด > คอมโบยาว
    if (ctx.novas) this.hitStop(90);
    else if (ctx.bombs) this.hitStop(60);
    else if (ctx.comets) this.hitStop(50);
    else if (ctx.rockets) this.hitStop(40);
    else if (ctx.chain >= 4) this.hitStop(45);

    // พาร์ติเคิลสีลูกกวาดตัวเอง — คอมโบสูง/ตัวพิเศษ = เยอะและแรงขึ้น
    const power = 1 + (ctx.chain - 1) * 0.15;
    let sumX = 0, sumY = 0;
    for (const cell of cells) {
      const cx = cell.col * C + C / 2, cy = cell.row * C + C / 2;
      sumX += cx; sumY += cy;
      const type = cell.candy.special ? null : cell.candy.type;
      const color = type !== null ? Renderer.PALETTE[type].m : '#ffd84d';
      this.effects.burst(cx, cy, color, cell.candy.special ? 18 : 6 + ctx.chain * 2, Math.random, cell.candy.special ? power + 0.5 : power);
    }

    // ป้าย COMBO กลางกระดานเมื่อ cascade ต่อเนื่อง
    if (ctx.chain >= 2) {
      this.effects.floatText(256, 205, 'COMBO x' + ctx.chain, '#ffd84d', true);
    }

    // อนิเมชันแตกแบบ 2 จังหวะ: พองขึ้นวูบ (anticipation) → หดหายแบบไล่คลื่น (ripple)
    const popping = cells.filter((cell) => !spawnCells.has(cell));
    await Promise.all(popping.map((cell) => this.animation.bump(cell.candy, { scale: 0.18 }, 70)));
    await Promise.all(
      popping.map((cell, i) =>
        this.animation.tween(cell.candy, { scale: 0 }, Game.POP_DURATION, Easing.easeInQuad, Math.min(i * 14, 140))
      )
    );
    for (const cell of popping) cell.candy = null;

    // แปลงช่องเกิดตัวพิเศษ: ลูกกวาดใหม่สีเดิม + ติดตั้ง special แบบ pop-in เด้งเข้า
    for (const s of spawns) {
      const candy = new Candy(s.type);
      candy.special = s.special;
      candy.scale = 0;
      s.cell.candy = candy;
      this.animation.tween(candy, { scale: 1 }, 220, Easing.easeOutBack);
    }

    // คิดคะแนน: นับทุกช่องที่ถูกเคลียร์ (รวมช่องที่แปลงเป็นตัวพิเศษ) + โบนัสระเบิด/โนวา
    const result = this.scoreSystem.addMatchScore(cells, ctx);
    this.updateHUD(result);

    // เลขคะแนนลอยขึ้นตรงจุดศูนย์กลางของกลุ่มที่แตก — ก้อนโตตัวใหญ่
    const color = result.mult > 1.5 ? '#ffd84d' : '#ffffff';
    this.effects.floatText(sumX / cells.length, sumY / cells.length, '+' + result.gained, color, result.gained >= 200);
  }

  /** แรงโน้มถ่วง + เติมใหม่: ระยะไกลใช้เวลานานขึ้นตามจริง + เด้งลงจอด + ฝุ่นตอนกระแทก */
  async dropAndRefill() {
    const C = Renderer.CELL;
    const tweens = [];
    /** เวลาไม่คงที่แล้ว — คิดตามระยะหล่น (แถว) ให้ฟีลแรงโน้มถ่วงจริง */
    const fallTime = (rows) => Math.min(140 + rows * 42, 380);
    const dustAt = []; // จุดที่จะปล่อยฝุ่นตอนลงจอด (เฉพาะหล่นไกล)

    const falls = this.gravitySystem.applyGravity();
    for (const f of falls) {
      const dist = f.toRow - f.fromRow;
      const candy = this.board.getCell(f.col, f.toRow).candy;
      candy.offsetY = -dist * C; // ภาพยังอยู่ที่เดิม
      tweens.push(this.animation.tween(candy, { offsetY: 0 }, fallTime(dist), Easing.easeOutBack));
      if (dist >= 2) dustAt.push({ x: f.col * C + C / 2, y: f.toRow * C + C * 0.82 });
    }
    const spawned = this.gravitySystem.refill();
    for (const s of spawned) {
      const dist = s.row + 1.5;
      const candy = this.board.getCell(s.col, s.row).candy;
      candy.offsetY = -dist * C; // spawn จากเหนือกระดาน
      // ไล่คอลัมน์ทีละนิดให้เหมือนเครื่องขุดปล่อยเม็ดเป็นคลื่น (Mining Machine feel)
      tweens.push(this.animation.tween(candy, { offsetY: 0 }, fallTime(dist), Easing.easeOutBack, s.col * 12));
    }
    await Promise.all(tweens);

    // เสียงลงจอดกลไกเบาๆ (game feel: น้ำหนักการตก) — ครั้งเดียวต่อคลื่น ไม่สแปม
    if (dustAt.length) this.sfx.land(dustAt.length);
    // ฝุ่นเบาๆ ตรงจุดลงจอด (จำกัดจำนวนกันรก)
    for (const d of dustAt.slice(0, 8)) {
      this.effects.burst(d.x, d.y, '#cfd8ff', 3, Math.random, 0.45);
    }
  }
}
