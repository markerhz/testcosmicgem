/**
 * Cell — ช่อง 1 ช่องบนกระดาน
 * รู้ตำแหน่งตัวเอง และถือ Candy ไว้ 1 เม็ด (หรือว่าง = null)
 */
export class Cell {
  /**
   * @param {number} col คอลัมน์ (0..N-1)
   * @param {number} row แถว (0..N-1)
   * @param {import('./Candy.js').Candy|null} candy
   */
  constructor(col, row, candy = null) {
    this.col = col;
    this.row = row;
    this.candy = candy;
  }

  /** ช่องนี้ติดกับอีกช่องแบบบน/ล่าง/ซ้าย/ขวา ไหม */
  isAdjacentTo(other) {
    return Math.abs(this.col - other.col) + Math.abs(this.row - other.row) === 1;
  }

  get isEmpty() {
    return this.candy === null;
  }
}
