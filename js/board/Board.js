/**
 * Board — กระดาน 8x8
 * จัดการโครงสร้างข้อมูลของช่องและลูกกวาดเท่านั้น
 * ไม่รู้เรื่องการวาด ไม่รู้เรื่องกติกา match (นั่นคือหน้าที่ของ MatchSystem)
 */
import { Cell } from './Cell.js';
import { Candy } from './Candy.js';

export class Board {
  static SIZE = 8;

  /**
   * @param {() => number} [rng] ฟังก์ชันสุ่ม (ใส่เองได้เพื่อเทสต์)
   */
  constructor(rng = Math.random) {
    this.size = Board.SIZE;
    this.rng = rng;

    /** @type {Cell[][]} grid[row][col] */
    this.grid = [];
    for (let row = 0; row < this.size; row++) {
      this.grid[row] = [];
      for (let col = 0; col < this.size; col++) {
        this.grid[row][col] = new Cell(col, row);
      }
    }
    this.fillRandom();
  }

  /**
   * สุ่มลูกกวาดใหม่ทั้งกระดานแบบเลี่ยง match ตั้งต้น
   * (ห้ามซ้ำกับ 2 ช่องทางซ้าย/บน + ห้ามเกิดบล็อก 2x2 สีเดียวกัน — เข้าชุดกับ SquareDetector)
   * ใช้ทั้งตอนเริ่มเกมและตอนสับกระดาน (reshuffle)
   */
  fillRandom() {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        let candy;
        do {
          candy = Candy.random(this.rng);
        } while (
          (col >= 2 &&
            this.grid[row][col - 1].candy.type === candy.type &&
            this.grid[row][col - 2].candy.type === candy.type) ||
          (row >= 2 &&
            this.grid[row - 1][col].candy.type === candy.type &&
            this.grid[row - 2][col].candy.type === candy.type) ||
          (col >= 1 && row >= 1 &&
            this.grid[row][col - 1].candy.type === candy.type &&
            this.grid[row - 1][col].candy.type === candy.type &&
            this.grid[row - 1][col - 1].candy.type === candy.type)
        );
        this.grid[row][col].candy = candy;
      }
    }
  }

  /** @returns {Cell|null} */
  getCell(col, row) {
    if (col < 0 || col >= this.size || row < 0 || row >= this.size) return null;
    return this.grid[row][col];
  }

  /** วนทุกช่อง */
  forEachCell(fn) {
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        fn(this.grid[row][col]);
      }
    }
  }

  /**
   * สลับลูกกวาดระหว่าง 2 ช่อง (เฉพาะข้อมูล — อนิเมชันจัดการที่ Game)
   * @param {Cell} a
   * @param {Cell} b
   */
  swapCandies(a, b) {
    const tmp = a.candy;
    a.candy = b.candy;
    b.candy = tmp;
  }
}
