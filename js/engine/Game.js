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
import { Animation } from './Animation.js';
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
  /** ระยะเวลาอนิเมชันหล่น (ms) */
  static FALL_DURATION = 260;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.animation = new Animation();
    this.effects = new Effects();
    this.board = new Board();

    // ---- Systems (v0.2.0: โครงเปล่า พร้อมเสียบลอจิกใน v0.2.x) ----
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

    this.animation.update(dt);
    this.effects.update(dt);
    this.renderer.draw(this.board, this.selected, time, this.effects);

    requestAnimationFrame((t) => this.loop(t));
  }

  // =====================================================
  // การเลือก + สลับ (ฟีเจอร์หลักของ v0.2.0)
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

    const hasNova = a.candy.special === 'nova' || b.candy.special === 'nova';
    this.sfx.swap();
    await this.animateSwap(a, b);

    if (hasNova) {
      // โนวาเป็น match ในตัวเอง — ทำงานทันทีไม่ต้องเช็ค
      await this.activateNovaSwap(a, b);
    } else {
      const matches = this.matchSystem.findMatches();
      if (matches.length === 0) {
        // ไม่เกิด match → สลับกลับ
        this.sfx.invalid();
        await this.animateSwap(a, b);
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

  /** สลับข้อมูล + เลื่อนภาพนุ่มๆ (เรียกซ้ำ = สลับกลับ) */
  animateSwap(a, b) {
    const C = Renderer.CELL;
    const dx = (b.col - a.col) * C;
    const dy = (b.row - a.row) * C;

    // สลับข้อมูลทันที แล้วตั้ง offset ให้ "ภาพ" ยังอยู่ที่เดิม จากนั้น tween เข้า 0
    this.board.swapCandies(a, b);
    b.candy.offsetX = -dx; b.candy.offsetY = -dy;
    a.candy.offsetX = dx;  a.candy.offsetY = dy;

    return Promise.all([
      this.animation.tween(a.candy, { offsetX: 0, offsetY: 0 }, Game.SWAP_DURATION),
      this.animation.tween(b.candy, { offsetX: 0, offsetY: 0 }, Game.SWAP_DURATION),
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
      await this.clearStep(clear, spawns, { chain, bombs: info.bombs, novas: info.novas });
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
    await this.clearStep(clear, [], { chain: 1, bombs: info.bombs, novas: info.novas + 1 });
    await this.dropAndRefill();

    // ต่อ cascade ตามปกติ (นับเป็นชั้น 2 ขึ้นไป)
    await this.resolveCascade(this.matchSystem.findMatches(), null, 2);
  }

  /**
   * 1 สเต็ปการแตก: อนิเมชันหด → ลบ → แปลงช่องเกิดตัวพิเศษ → คิดคะแนน
   * @param {Set} clear ช่องที่จะแตก
   * @param {Array<{cell:object, type:number, special:string}>} spawns ตัวพิเศษที่จะเกิด
   * @param {{chain:number, bombs:number, novas:number}} ctx
   */
  async clearStep(clear, spawns, ctx) {
    const spawnCells = new Set(spawns.map((s) => s.cell));
    const cells = Array.from(clear);
    const C = Renderer.CELL;

    // เอฟเฟกต์เสียง + จอสั่น ตามลำดับความแรง: โนวา > ระเบิด > pop ธรรมดา
    this.sfx.pop(ctx.chain);
    if (ctx.bombs) this.sfx.bomb();
    if (ctx.novas) this.sfx.nova();
    const shakeMag = (ctx.novas ? 10 : 0) + (ctx.bombs ? 6 : 0) + Math.min(cells.length, 10) * 0.3;
    if (shakeMag > 0) this.effects.shake(shakeMag, 220);

    // พาร์ติเคิลระเบิดสีลูกกวาดตัวเอง (จับสีก่อนลบข้อมูลทิ้ง)
    let sumX = 0, sumY = 0;
    for (const cell of cells) {
      const cx = cell.col * C + C / 2, cy = cell.row * C + C / 2;
      sumX += cx; sumY += cy;
      const type = cell.candy.special ? null : cell.candy.type;
      const color = type !== null ? Renderer.PALETTE[type].m : '#ffd84d';
      this.effects.burst(cx, cy, color, cell.candy.special ? 16 : 7);
    }

    // อนิเมชันแตก (ช่องที่จะกลายเป็นตัวพิเศษไม่ต้องหด)
    await Promise.all(
      cells
        .filter((cell) => !spawnCells.has(cell))
        .map((cell) => this.animation.tween(cell.candy, { scale: 0 }, Game.POP_DURATION))
    );
    for (const cell of cells) {
      if (!spawnCells.has(cell)) cell.candy = null;
    }

    // แปลงช่องเกิดตัวพิเศษ: ลูกกวาดใหม่สีเดิม + ติดตั้ง special
    for (const s of spawns) {
      const candy = new Candy(s.type);
      candy.special = s.special;
      s.cell.candy = candy;
    }

    // คิดคะแนน: นับทุกช่องที่ถูกเคลียร์ (รวมช่องที่แปลงเป็นตัวพิเศษ) + โบนัสระเบิด/โนวา
    const result = this.scoreSystem.addMatchScore(cells, ctx);
    this.updateHUD(result);

    // เลขคะแนนลอยขึ้นตรงจุดศูนย์กลางของกลุ่มที่แตก
    const color = result.mult > 1.5 ? '#ffd84d' : '#ffffff';
    this.effects.floatText(sumX / cells.length, sumY / cells.length, '+' + result.gained, color);
  }

  /** แรงโน้มถ่วง + เติมใหม่ พร้อมอนิเมชันหล่น */
  async dropAndRefill() {
    const C = Renderer.CELL;
    const tweens = [];

    const falls = this.gravitySystem.applyGravity();
    for (const f of falls) {
      const candy = this.board.getCell(f.col, f.toRow).candy;
      candy.offsetY = -(f.toRow - f.fromRow) * C; // ภาพยังอยู่ที่เดิม
      tweens.push(this.animation.tween(candy, { offsetY: 0 }, Game.FALL_DURATION));
    }
    const spawned = this.gravitySystem.refill();
    for (const s of spawned) {
      const candy = this.board.getCell(s.col, s.row).candy;
      candy.offsetY = -(s.row + 1.5) * C; // spawn จากเหนือกระดาน
      tweens.push(this.animation.tween(candy, { offsetY: 0 }, Game.FALL_DURATION));
    }
    await Promise.all(tweens);
  }
}
