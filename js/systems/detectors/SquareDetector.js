/**
 * SquareDetector — หาบล็อก 2x2 ที่เป็นชนิดเดียวกันทั้ง 4 ช่อง
 * บล็อก 2x2 ไม่มีทาง "run >= 3" แนวเดียวได้เลย จึงต้องเป็น detector แยกต่างหาก
 * (Square 2x2 → 🚀 Rocket ตาม Gameplay Rules ใหม่)
 */
export class SquareDetector {
  /**
   * @param {import('../../board/Board.js').Board} board
   * @returns {Array<{cells: import('../../board/Cell.js').Cell[], length:4, type:number, orient:'square'}>}
   */
  static find(board) {
    const N = board.size;
    const groups = [];

    const typeAt = (col, row) => {
      const cell = board.getCell(col, row);
      return (cell && cell.candy && cell.candy.special !== 'nova') ? cell.candy.type : -1;
    };

    for (let row = 0; row < N - 1; row++) {
      for (let col = 0; col < N - 1; col++) {
        const t = typeAt(col, row);
        if (t < 0) continue;
        if (
          typeAt(col + 1, row) === t &&
          typeAt(col, row + 1) === t &&
          typeAt(col + 1, row + 1) === t
        ) {
          groups.push({
            cells: [
              board.getCell(col, row),
              board.getCell(col + 1, row),
              board.getCell(col, row + 1),
              board.getCell(col + 1, row + 1),
            ],
            length: 4,
            type: t,
            orient: 'square',
          });
        }
      }
    }
    return groups;
  }
}
