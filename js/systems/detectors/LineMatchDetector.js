/**
 * LineMatchDetector — หา "run" แนวนอน/แนวตั้งที่ชนิดเดียวกันติดกัน >= 3
 * แยกออกมาจาก MatchSystem (v0.2.x) เพื่อให้เพิ่ม detector ชนิดใหม่ (เช่น SquareDetector)
 * ได้โดยไม่ต้องแก้ไฟล์นี้ — Open/Closed
 */
export class LineMatchDetector {
  /**
   * @param {import('../../board/Board.js').Board} board
   * @returns {Array<{cells: import('../../board/Cell.js').Cell[], length:number, type:number, orient:'h'|'v'}>}
   */
  static find(board) {
    const N = board.size;
    const groups = [];

    // ชนิดของช่อง (-1 = ว่าง/จับคู่ไม่ได้ — โนวาไม่มีสี จับคู่แบบปกติไม่ได้)
    const typeAt = (col, row) => {
      const cell = board.getCell(col, row);
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
          for (let i = 0; i < len; i++) cells.push(board.getCell(col + i, row));
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
          for (let i = 0; i < len; i++) cells.push(board.getCell(col, row + i));
          groups.push({ cells, length: len, type: t, orient: 'v' });
        }
        row += len;
      }
    }
    return groups;
  }
}
