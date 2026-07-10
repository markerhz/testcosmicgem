/**
 * MatchSystem — ตรวจจับ match + วางแผนการเคลียร์ + ลูกกวาดพิเศษ
 *
 * ✅ v0.2.1: findMatches, hasPossibleMove
 * ✅ v0.2.3: planClears (เรียง 4 = 💣, เรียง 5 = 🌟) + expandClears (ระเบิดลูกโซ่, โนวาล้างสี)
 */
import { Candy } from '../board/Candy.js';

export class MatchSystem {
  /**
   * @param {import('../board/Board.js').Board} board
   */
  constructor(board) {
    this.board = board;
  }

  /**
   * หา match ทั้งหมดบนกระดาน — "run" แนวนอน/แนวตั้งที่ชนิดเดียวกันติดกัน >= 3
   * @returns {Array<{cells: import('../board/Cell.js').Cell[], length:number, type:number, orient:'h'|'v'}>}
   */
  findMatches() {
    const N = this.board.size;
    const groups = [];

    // ชนิดของช่อง (-1 = ว่าง/จับคู่ไม่ได้ — โนวาไม่มีสี จับคู่แบบปกติไม่ได้)
    const typeAt = (col, row) => {
      const cell = this.board.getCell(col, row);
      return (cell && cell.candy && cell.candy.special !== 'nova') ? cell.candy.type : -1;
    };

    // สแกนแนวนอน
    for (let row = 0; row < N; row++) {
      let col = 0;
      while (col < N) {
        const t = typeAt(col, row);
        let len = 1;
        while (col + len < N && t >= 0 && typeAt(col + len, row) === t) len++;
        if (t >= 0 && len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push(this.board.getCell(col + i, row));
          groups.push({ cells, length: len, type: t, orient: 'h' });
        }
        col += len;
      }
    }
    // สแกนแนวตั้ง
    for (let col = 0; col < N; col++) {
      let row = 0;
      while (row < N) {
        const t = typeAt(col, row);
        let len = 1;
        while (row + len < N && t >= 0 && typeAt(col, row + len) === t) len++;
        if (t >= 0 && len >= 3) {
          const cells = [];
          for (let i = 0; i < len; i++) cells.push(this.board.getCell(col, row + i));
          groups.push({ cells, length: len, type: t, orient: 'v' });
        }
        row += len;
      }
    }
    return groups;
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
   * เรียง 4 = 💣 ระเบิด | เรียง 5+ = 🌟 ซูเปอร์โนวา
   * ตัวพิเศษเกิดตรงช่องที่ผู้เล่นสลับ (ถ้าอยู่ในแถวนั้น) ไม่งั้นเกิดตรงกลางแถว
   * @param {Array} matches ผลจาก findMatches()
   * @param {import('../board/Cell.js').Cell|null} swapCell ช่องที่ผู้เล่นเพิ่งสลับ
   * @returns {{clear: Set<import('../board/Cell.js').Cell>, spawns: Array<{cell:object, type:number, special:string}>}}
   */
  planClears(matches, swapCell = null) {
    const clear = new Set();
    const spawns = [];
    for (const g of matches) {
      for (const cell of g.cells) clear.add(cell);
      if (g.length >= 4) {
        let spot = g.cells[Math.floor(g.length / 2)];
        if (swapCell && g.cells.includes(swapCell)) spot = swapCell;
        spawns.push({ cell: spot, type: g.type, special: g.length >= 5 ? 'nova' : 'bomb' });
      }
    }
    return { clear, spawns };
  }

  /**
   * ขยายการเคลียร์: ระเบิดกวาด 3x3 (ลูกโซ่ได้), โนวาที่โดนลูกหลงล้างสีสุ่ม 1 สี
   * แก้ไข Set ที่ส่งเข้ามาโดยตรง
   * @param {Set<import('../board/Cell.js').Cell>} clear
   * @param {() => number} [rng]
   * @returns {{bombs:number, novas:number}} จำนวนตัวพิเศษที่ทำงานในสเต็ปนี้
   */
  expandClears(clear, rng = Math.random) {
    let bombs = 0, novas = 0;
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
        }
      }
    }
    return { bombs, novas };
  }

  /**
   * กระดานมีตาเดินที่เป็นไปได้เหลือไหม (กันเกมตัน)
   * ลองสลับทุกคู่ขวา/ล่างบนตารางชนิด (ไม่แตะกระดานจริง) แล้วเช็คว่าเกิด run >= 3
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
    const hasRun = () => {
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
      return false;
    };
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        for (const [dc, dr] of [[1, 0], [0, 1]]) {
          const c2 = col + dc, r2 = row + dr;
          if (c2 >= N || r2 >= N) continue;
          const tmp = t[row][col]; t[row][col] = t[r2][c2]; t[r2][c2] = tmp;
          const found = hasRun();
          t[r2][c2] = t[row][col]; t[row][col] = tmp; // สลับกลับ
          if (found) return true;
        }
      }
    }
    return false;
  }
}
