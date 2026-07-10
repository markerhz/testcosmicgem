/**
 * Input — แปลง pointer event (เมาส์/ทัช) เป็นพิกัดช่องบนกระดาน
 * ไม่รู้กติกาเกม แค่บอกว่า "ผู้เล่นแตะช่องไหน" หรือ "ปัดจากช่องไหนไปช่องไหน" ผ่าน callback
 *
 * รองรับทั้ง 2 แบบ:
 *   - แตะ (tap): กดปล่อยโดยไม่ลากเกินระยะ threshold → onTap(pos)
 *   - ปัด (swipe): ลากเกิน threshold ในทิศ ซ้าย/ขวา/บน/ล่าง → onSwipe(from, to)
 */
export class Input {
  /** ระยะลาก (px หน้าจอจริง) ขั้นต่ำก่อนนับเป็นการปัด ไม่ใช่แตะ (ลดจาก 28 → ตอบสนองไวขึ้น) */
  static SWIPE_THRESHOLD = 18;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./Renderer.js').Renderer} renderer ใช้แปลงพิกัดหน้าจอ → ช่อง
   */
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;

    /** @type {(pos: {col:number,row:number}) => void} ตั้งค่าโดย Game */
    this.onTap = null;
    /** @type {(from: {col:number,row:number}, to: {col:number,row:number}) => void} ตั้งค่าโดย Game */
    this.onSwipe = null;

    /** ตำแหน่งเริ่มลาก (null = ไม่มีการกดค้าง) */
    this.startClient = null;
    this.startPos = null;
    this.swiped = false;

    canvas.addEventListener('pointerdown', (e) => this.handleDown(e));
    canvas.addEventListener('pointermove', (e) => this.handleMove(e));
    canvas.addEventListener('pointerup', (e) => this.handleUp(e));
    canvas.addEventListener('pointercancel', () => this.reset());
    canvas.addEventListener('pointerleave', (e) => this.handleUp(e));
  }

  handleDown(e) {
    e.preventDefault();
    const pos = this.renderer.screenToBoard(e.clientX, e.clientY);
    if (!pos) return;
    this.startClient = { x: e.clientX, y: e.clientY };
    this.startPos = pos;
    this.swiped = false;
  }

  handleMove(e) {
    if (!this.startClient || this.swiped) return;
    const dx = e.clientX - this.startClient.x;
    const dy = e.clientY - this.startClient.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < Input.SWIPE_THRESHOLD) return;

    // ลากเกิน threshold แล้ว → หาทิศทางหลัก (ซ้าย/ขวา/บน/ล่าง) แล้วยิง onSwipe ทันที
    let dCol = 0, dRow = 0;
    if (Math.abs(dx) > Math.abs(dy)) dCol = dx > 0 ? 1 : -1;
    else dRow = dy > 0 ? 1 : -1;

    const to = { col: this.startPos.col + dCol, row: this.startPos.row + dRow };
    if (to.col >= 0 && to.col <= 7 && to.row >= 0 && to.row <= 7) {
      this.swiped = true;
      if (this.onSwipe) this.onSwipe(this.startPos, to);
    }
  }

  handleUp(e) {
    if (!this.startClient) return;
    if (!this.swiped && this.onTap) this.onTap(this.startPos);
    this.reset();
  }

  reset() {
    this.startClient = null;
    this.startPos = null;
    this.swiped = false;
  }
}
