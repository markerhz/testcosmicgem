/**
 * Candy — ลูกกวาด 1 เม็ด
 * เก็บเฉพาะ "ข้อมูล" (ชนิด + สถานะอนิเมชัน) ไม่วาดเอง
 * การวาดเป็นหน้าที่ของ Renderer
 */
export class Candy {
  /** จำนวนชนิดลูกกวาดทั้งหมด */
  static TYPE_COUNT = 6;

  /**
   * @param {number} type ชนิดลูกกวาด (0 ถึง TYPE_COUNT-1)
   */
  constructor(type) {
    this.type = type;

    // สถานะอนิเมชัน (หน่วยพิกเซล logical) — Animation เป็นคน tween ค่าเหล่านี้
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;

    // ชนิดพิเศษ (bomb / nova) — จะใช้งานจริงใน v0.2.x
    this.special = null;
  }

  /**
   * สุ่มลูกกวาดใหม่
   * @param {() => number} [rng] ฟังก์ชันสุ่ม (ใส่เองได้เพื่อเทสต์)
   */
  static random(rng = Math.random) {
    return new Candy(Math.floor(rng() * Candy.TYPE_COUNT));
  }
}
