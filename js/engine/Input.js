/**
 * Input — แปลง pointer event (เมาส์/ทัช) เป็นพิกัดช่องบนกระดาน
 * ไม่รู้กติกาเกม แค่บอกว่า "ผู้เล่นแตะช่องไหน" ผ่าน callback
 */
export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./Renderer.js').Renderer} renderer ใช้แปลงพิกัดหน้าจอ → ช่อง
   */
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;

    /** @type {(pos: {col:number,row:number}) => void} ตั้งค่าโดย Game */
    this.onTap = null;

    canvas.addEventListener('pointerdown', (e) => this.handlePointer(e));
  }

  handlePointer(e) {
    e.preventDefault();
    if (!this.onTap) return;
    const pos = this.renderer.screenToBoard(e.clientX, e.clientY);
    if (pos) this.onTap(pos);
  }
}
