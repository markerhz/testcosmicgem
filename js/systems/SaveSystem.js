/**
 * SaveSystem — บันทึก/โหลดความคืบหน้า
 *
 * ⚠️ v0.2.0 Alpha: โครงเปล่าตามแผน — ยังไม่ implement
 *
 * แผน:
 *   v0.4.0 — localStorage (ด่าน, คะแนนสูงสุด, Joker ที่ถือ)
 *   v0.5.0 — sync กับเซิร์ฟเวอร์ (ระบบออนไลน์)
 */
export class SaveSystem {
  static KEY = 'sweetverse-cosmic-save';

  /**
   * บันทึกสถานะเกม
   * @param {object} data สถานะที่จะบันทึก
   */
  save(data) {
    // TODO v0.4.0: localStorage.setItem(SaveSystem.KEY, JSON.stringify(data))
  }

  /**
   * โหลดสถานะเกมล่าสุด
   * @returns {object|null}
   */
  load() {
    // TODO v0.4.0
    return null;
  }

  clear() {
    // TODO v0.4.0
  }
}
