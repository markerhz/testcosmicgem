/**
 * GravitySystem — แรงโน้มถ่วง: ลูกกวาดหล่นเติมช่องว่าง + เกิดใหม่จากด้านบน
 *
 * ✅ v0.2.1: implement แล้ว (พอร์ตจากลอจิกที่ผ่านเทสต์)
 * ระบบนี้แก้ "ข้อมูล" อย่างเดียว — อนิเมชันการหล่นเป็นหน้าที่ของ Game
 */
import { Candy } from '../board/Candy.js';

export class GravitySystem {
  /**
   * @param {import('../board/Board.js').Board} board
   */
  constructor(board) {
    this.board = board;
  }

  /**
   * ทำให้ลูกกวาดหล่นลงล่าง เติมช่องว่างในแต่ละคอลัมน์
   * @returns {Array<{col:number, fromRow:number, toRow:number}>} รายการที่หล่น (ไว้ทำอนิเมชัน)
   */
  applyGravity() {
    const N = this.board.size;
    const falls = [];
    for (let col = 0; col < N; col++) {
      let writeRow = N - 1; // ตำแหน่งล่างสุดที่ยังว่างให้เขียน
      for (let row = N - 1; row >= 0; row--) {
        const cell = this.board.getCell(col, row);
        if (cell.candy) {
          if (writeRow !== row) {
            this.board.getCell(col, writeRow).candy = cell.candy;
            cell.candy = null;
            falls.push({ col, fromRow: row, toRow: writeRow });
          }
          writeRow--;
        }
      }
    }
    return falls;
  }

  /**
   * เติมลูกกวาดใหม่ในช่องว่างที่เหลือ (บนสุดของแต่ละคอลัมน์)
   * @param {() => number} [rng]
   * @returns {Array<{col:number, row:number}>} ช่องที่ถูกเติม (ไว้ทำอนิเมชัน spawn)
   */
  refill(rng) {
    const N = this.board.size;
    const spawned = [];
    for (let col = 0; col < N; col++) {
      for (let row = 0; row < N; row++) {
        const cell = this.board.getCell(col, row);
        if (!cell.candy) {
          cell.candy = Candy.random(rng || this.board.rng);
          spawned.push({ col, row });
        }
      }
    }
    return spawned;
  }
}
