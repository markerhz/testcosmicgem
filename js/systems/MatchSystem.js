/**
 * MatchSystem — ตรวจจับ match + วางแผนการเคลียร์ + ลูกกวาดพิเศษ
 *
 * ✅ v0.2.1: findMatches, hasPossibleMove
 * ✅ v0.2.3: planClears (เรียง 4 = ☄️ ดาวหาง, เรียง 5 = 🌟 โนวา) + expandClears (ระเบิดลูกโซ่, โนวาล้างสี)
 * ✅ v0.5.x: Square 2x2 = 🚀 จรวด (ล่าเป้าหมาย AI) — เพิ่ม detector แยก ไม่แก้ engine เดิม
 * ✅ v0.5.x (rename): เดิมเรียง 4/5 ใช้ชื่อ "จรวด" — ย้ายชื่อ/รูปลักษณ์ "จรวด" ไปให้ตัวล่าเป้าหมาย (เดิมคือปลา)
 *    ส่วนตัวทำลายแถว/คอลัมน์เปลี่ยนชื่อเป็น "ดาวหาง (Comet)" แทน — พฤติกรรมเดิมทุกประการ แค่เปลี่ยนสกิน/ชื่อ
 *
 * Priority การตรวจจับ (กันสร้างไอเทมผิด): Match5 → T/L → Square → Match4 → Match3
 */
import { Candy } from '../board/Candy.js';
import { LineMatchDetector } from './detectors/LineMatchDetector.js';
import { SquareDetector } from './detectors/SquareDetector.js';
import { ShapeDetector } from './detectors/ShapeDetector.js';

export class MatchSystem {
  /**
   * @param {import('../board/Board.js').Board} board
   */
  constructor(board) {
    this.board = board;
  }

  /**
   * หา match ทั้งหมดบนกระดาน — run แนวนอน/แนวตั้ง (>=3) + บล็อก 2x2 (square)
   * @returns {Array<{cells: import('../board/Cell.js').Cell[], length:number, type:number, orient:'h'|'v'|'square'}>}
   */
  findMatches() {
    return [...LineMatchDetector.find(this.board), ...SquareDetector.find(this.board)];
  }

  /**
   * รวมทุก group เป็นรายการช่องแบบไม่ซ้ำ (ช่องที่อยู่ทั้งแถวและคอลัมน์นับครั้งเดียว)
   * @param {Array} matches ผลจาก findMatches()
   * @returns {import('../board/Cell.js').Cell[]}
   */
  collectCells(matches) {
    const set = new Set();
    for (const g of matches) for (const cell of g.cells) set.add(cell);
    return Array.from(set);
  }

  /**
   * วางแผนการเคลียร์: ช่องไหนแตก + ลูกกวาดพิเศษเกิดที่ไหน
   * เรียง 5+ = 🌟 โนวา | T/L = 💣 ระเบิด | Square 2x2 = 🚀 จรวด | เรียง 4 = ☄️ ดาวหาง | เรียง 3 = ธรรมดา
   * ตัวพิเศษเกิดตรงช่องที่ผู้เล่นสลับ (ถ้าอยู่ในกลุ่มนั้น) ไม่งั้นเกิดตรงกลาง/ช่องแรกของกลุ่ม
   * @param {Array} matches ผลจาก findMatches()
   * @param {import('../board/Cell.js').Cell|null} swapCell ช่องที่ผู้เล่นเพิ่งสลับ
   * @returns {{clear: Set<import('../board/Cell.js').Cell>, spawns: Array<{cell:object, type:number, special:string}>}}
   */
  planClears(matches, swapCell = null) {
    const clear = new Set();
    const spawns = [];
    const lineGroups = matches.filter((g) => g.orient !== 'square');
    const squareGroups = matches.filter((g) => g.orient === 'square');

    for (const g of matches) for (const cell of g.cells) clear.add(cell);

    const { pivots } = ShapeDetector.findPivots(lineGroups);
    const consumed = new Set();
    const spotOf = (g) => (swapCell && g.cells.includes(swapCell)) ? swapCell : g.cells[Math.floor(g.length / 2)];

    // 1) เรียง 5+ (เส้นตรง) = 🌟 โนวา ล้างทั้งสี
    for (const g of lineGroups) {
      if (g.length >= 5) {
        spawns.push({ cell: spotOf(g), type: g.type, special: 'nova' });
        for (const c of g.cells) consumed.add(c);
      }
    }
    // 2) รูป L/T (จุดตัดแนวนอน×แนวตั้ง) = 💣 ระเบิด 3x3
    for (const cell of pivots) {
      if (consumed.has(cell)) continue;
      spawns.push({ cell, type: cell.candy.type, special: 'bomb' });
      consumed.add(cell);
    }
    // 3) บล็อก 2x2 = 🚀 จรวด (ล่าเป้าหมาย) — ข้ามถ้าช่องถูกใช้ไปแล้วโดยโนวา/ระเบิด
    for (const g of squareGroups) {
      if (g.cells.some((c) => consumed.has(c))) continue;
      const spot = (swapCell && g.cells.includes(swapCell)) ? swapCell : g.cells[0];
      spawns.push({ cell: spot, type: g.type, special: 'rocket' });
      for (const c of g.cells) consumed.add(c);
    }
    // 4) เรียง 4 (เส้นตรงล้วน ไม่แตะจุดตัด/ไม่ทับ square) = ☄️ ดาวหาง (นอน=ล้างแถว, ตั้ง=ล้างคอลัมน์)
    for (const g of lineGroups) {
      if (g.length !== 4) continue;
      if (g.cells.some((c) => pivots.has(c) || consumed.has(c))) continue;
      const spot = spotOf(g);
      if (consumed.has(spot)) continue;
      spawns.push({ cell: spot, type: g.type, special: g.orient === 'h' ? 'cometH' : 'cometV' });
      consumed.add(spot);
    }
    return { clear, spawns };
  }

  /**
   * เลือกเป้าหมายให้ 🚀 จรวด (ล่าเป้าหมาย) — ลำดับความสำคัญ: Mission > Obstacle > ตัวพิเศษ > เม็ดสุ่ม
   * เกมยังไม่มีระบบ Mission/Obstacle (คิวของ v0.6+ ตาม CURRENT_SPRINT.md) — เผื่อ hook ไว้ล่วงหน้า
   * ถ้าอนาคตมีระบบเหล่านั้น ให้ผูก this.findMissionTarget / this.findObstacleTarget
   * โดยไม่ต้องแก้ฟังก์ชันนี้เลย (Open/Closed)
   * @param {import('../board/Cell.js').Cell|null} originCell ช่องต้นทางของจรวด (กันเลือกตัวเอง)
   * @param {Set<import('../board/Cell.js').Cell>} clear ช่องที่กำลังจะแตกอยู่แล้ว (กันเลือกซ้ำ)
   * @param {() => number} [rng]
   * @returns {import('../board/Cell.js').Cell|null}
   */
  pickRocketTarget(originCell, clear, rng = Math.random) {
    const missionTarget = this.findMissionTarget ? this.findMissionTarget(clear) : null;
    if (missionTarget) return missionTarget;
    const obstacleTarget = this.findObstacleTarget ? this.findObstacleTarget(clear) : null;
    if (obstacleTarget) return obstacleTarget;

    const specials = [];
    const normals = [];
    this.board.forEachCell((c) => {
      if (!c.candy || clear.has(c) || c === originCell) return;
      (c.candy.special ? specials : normals).push(c);
    });
    const pool = specials.length ? specials : normals;
    if (!pool.length) return null;
    return pool[Math.floor(rng() * pool.length)];
  }

  /**
   * ยิงจรวดล่าเป้าหมายหลายลูกพร้อมกัน (ใช้ตอนคอมโบ rocket+rocket / rocket+รวมร่างอื่น) — แก้ Set clear โดยตรง
   * @param {number} count จำนวนจรวดที่จะยิง
   * @param {import('../board/Cell.js').Cell|null} originCell
   * @param {Set<import('../board/Cell.js').Cell>} clear
   * @param {() => number} [rng]
   */
  launchRockets(count, originCell, clear, rng = Math.random) {
    for (let i = 0; i < count; i++) {
      const target = this.pickRocketTarget(originCell, clear, rng);
      if (target) clear.add(target);
    }
  }

  /**
   * ขยายการเคลียร์: ระเบิดกวาด 3x3 (ลูกโซ่ได้), โนวาที่โดนลูกหลงล้างสีสุ่ม 1 สี,
   * ดาวหางกวาดทั้งแถว/คอลัมน์, จรวดล่าเป้าหมาย 1 ตัว — แก้ไข Set ที่ส่งเข้ามาโดยตรง
   * @param {Set<import('../board/Cell.js').Cell>} clear
   * @param {() => number} [rng]
   * @returns {{bombs:number, novas:number, comets:number, rockets:number}} จำนวนตัวพิเศษที่ทำงานในสเต็ปนี้
   */
  expandClears(clear, rng = Math.random) {
    let bombs = 0, novas = 0, comets = 0, rockets = 0;
    const processed = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const cell of Array.from(clear)) {
        if (processed.has(cell)) continue;
        processed.add(cell);
        const candy = cell.candy;
        if (!candy) continue;
        if (candy.special === 'bomb') {
          bombs++;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const n = this.board.getCell(cell.col + dc, cell.row + dr);
              if (n && n.candy && !clear.has(n)) { clear.add(n); changed = true; }
            }
          }
        } else if (candy.special === 'nova') {
          novas++;
          const target = Math.floor(rng() * Candy.TYPE_COUNT);
          this.board.forEachCell((c) => {
            if (c.candy && c.candy.type === target && !c.candy.special && !clear.has(c)) {
              clear.add(c); changed = true;
            }
          });
        } else if (candy.special === 'cometH' || candy.special === 'cometV') {
          comets++;
          const N = this.board.size;
          for (let i = 0; i < N; i++) {
            if (candy.special === 'cometH') {                  // ดาวหางแนวนอน → ล้างทั้งแถว
              const a = this.board.getCell(i, cell.row);
              if (a && a.candy && !clear.has(a)) { clear.add(a); changed = true; }
            } else {                                           // ดาวหางแนวตั้ง → ล้างทั้งคอลัมน์
              const b = this.board.getCell(cell.col, i);
              if (b && b.candy && !clear.has(b)) { clear.add(b); changed = true; }
            }
          }
        } else if (candy.special === 'rocket') {
          rockets++;
          const target = this.pickRocketTarget(cell, clear, rng);
          if (target) { clear.add(target); changed = true; }
        }
      }
    }
    return { bombs, novas, comets, rockets };
  }

  /**
   * กระดานมีตาเดินที่เป็นไปได้เหลือไหม (กันเกมตัน)
   * ลองสลับทุกคู่ขวา/ล่างบนตารางชนิด (ไม่แตะกระดานจริง) แล้วเช็คว่าเกิด run >= 3 หรือบล็อก 2x2
   * @returns {boolean}
   */
  hasPossibleMove() {
    const N = this.board.size;
    // ตารางชนิดเบาๆ ไว้ลองสลับ
    const t = [];
    for (let row = 0; row < N; row++) {
      t[row] = [];
      for (let col = 0; col < N; col++) {
        const cell = this.board.getCell(col, row);
        t[row][col] = (cell && cell.candy) ? cell.candy.type : -1;
      }
    }
    const hasRunOrSquare = () => {
      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N - 2; col++) {
          const v = t[row][col];
          if (v >= 0 && t[row][col + 1] === v && t[row][col + 2] === v) return true;
        }
      }
      for (let col = 0; col < N; col++) {
        for (let row = 0; row < N - 2; row++) {
          const v = t[row][col];
          if (v >= 0 && t[row + 1][col] === v && t[row + 2][col] === v) return true;
        }
      }
      for (let row = 0; row < N - 1; row++) {
        for (let col = 0; col < N - 1; col++) {
          const v = t[row][col];
          if (v >= 0 && t[row][col + 1] === v && t[row + 1][col] === v && t[row + 1][col + 1] === v) return true;
        }
      }
      return false;
    };
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        for (const [dc, dr] of [[1, 0], [0, 1]]) {
          const c2 = col + dc, r2 = row + dr;
          if (c2 >= N || r2 >= N) continue;
          const tmp = t[row][col]; t[row][col] = t[r2][c2]; t[r2][c2] = tmp;
          const found = hasRunOrSquare();
          t[r2][c2] = t[row][col]; t[row][col] = tmp; // สลับกลับ
          if (found) return true;
        }
      }
    }
    return false;
  }
}
