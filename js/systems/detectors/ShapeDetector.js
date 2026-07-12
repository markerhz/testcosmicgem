/**
 * ShapeDetector — หารูป T/L จากจุดตัดของ run แนวนอนกับแนวตั้ง
 * (T/L → 💣 Bomb ตาม Gameplay Rules ใหม่)
 */
export class ShapeDetector {
  /**
   * @param {Array<{cells:import('../../board/Cell.js').Cell[], orient:'h'|'v'}>} lineGroups ผลจาก LineMatchDetector
   * @returns {Set<import('../../board/Cell.js').Cell>} เซลล์ที่เป็นจุดตัด (T/L pivot)
   */
  static findPivots(lineGroups) {
    const hCells = new Set(), vCells = new Set();
    for (const g of lineGroups) {
      const set = g.orient === 'h' ? hCells : vCells;
      for (const cell of g.cells) set.add(cell);
    }
    const pivots = new Set();
    for (const cell of hCells) if (vCells.has(cell)) pivots.add(cell);
    return { pivots, hCells, vCells };
  }
}
