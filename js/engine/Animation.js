/**
 * Animation — ตัวจัดการ tween กลาง
 * ใครอยากขยับค่าอะไรแบบนุ่มๆ (offsetX, scale ฯลฯ) มาขอที่นี่
 * Game เรียก update(dt) ทุกเฟรม
 */

/** ฟังก์ชัน easing มาตรฐาน */
export const Easing = {
  linear: (t) => t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

class Tween {
  /**
   * @param {object} target ออบเจกต์ที่จะขยับค่า
   * @param {Object<string,number>} props ค่าปลายทาง เช่น { offsetX: 0, offsetY: 0 }
   * @param {number} duration มิลลิวินาที
   * @param {(t:number)=>number} ease
   * @param {() => void} resolve เรียกเมื่อจบ
   */
  constructor(target, props, duration, ease, resolve) {
    this.target = target;
    this.duration = duration;
    this.ease = ease;
    this.resolve = resolve;
    this.elapsed = 0;
    this.from = {};
    this.to = props;
    for (const key of Object.keys(props)) this.from[key] = target[key];
  }

  /** @returns {boolean} true = จบแล้ว */
  update(dt) {
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const k = this.ease(t);
    for (const key of Object.keys(this.to)) {
      this.target[key] = this.from[key] + (this.to[key] - this.from[key]) * k;
    }
    if (t >= 1) {
      this.resolve();
      return true;
    }
    return false;
  }
}

export class Animation {
  constructor() {
    /** @type {Tween[]} */
    this.tweens = [];
  }

  /**
   * เริ่ม tween — คืน Promise ที่ resolve เมื่ออนิเมชันจบ
   * ทำให้ Game เขียนลำดับเหตุการณ์แบบ async/await ได้สะอาดๆ
   * @returns {Promise<void>}
   */
  tween(target, props, duration, ease = Easing.easeOutQuad) {
    return new Promise((resolve) => {
      this.tweens.push(new Tween(target, props, duration, ease, resolve));
    });
  }

  /** มีอนิเมชันวิ่งอยู่ไหม (ใช้ล็อกอินพุตได้) */
  get busy() {
    return this.tweens.length > 0;
  }

  /** เรียกทุกเฟรมจาก Game */
  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      if (this.tweens[i].update(dt)) this.tweens.splice(i, 1);
    }
  }
}
