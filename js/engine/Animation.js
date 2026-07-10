/**
 * Animation — ตัวจัดการ tween กลาง
 * ใครอยากขยับค่าอะไรแบบนุ่มๆ (offsetX, scale ฯลฯ) มาขอที่นี่
 * Game เรียก update(dt) ทุกเฟรม
 */

/** ฟังก์ชัน easing มาตรฐาน */
export const Easing = {
  linear: (t) => t,
  easeOutQuad: (t) => t * (2 - t),
  easeInQuad: (t) => t * t,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  /** เด้งเลยเป้าหมายนิดนึงก่อนตกกลับที่ — ใช้ตอนลูกกวาดหล่นลงจอด (⑦ Landing Bounce) */
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    const p = t - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
  },
};

class Tween {
  /**
   * @param {object} target ออบเจกต์ที่จะขยับค่า
   * @param {Object<string,number>} props ค่าปลายทาง เช่น { offsetX: 0, offsetY: 0 }
   * @param {number} duration มิลลิวินาที
   * @param {(t:number)=>number} ease
   * @param {() => void} resolve เรียกเมื่อจบ
   */
  constructor(target, props, duration, ease, resolve, delay = 0) {
    this.target = target;
    this.duration = duration;
    this.ease = ease;
    this.resolve = resolve;
    this.elapsed = -delay; // delay = รอก่อนเริ่มขยับ (ใช้ทำ stagger/ripple)
    this.started = false;
    this.from = {};
    this.to = props;
  }

  /** @returns {boolean} true = จบแล้ว */
  update(dt) {
    this.elapsed += dt;
    if (this.elapsed < 0) return false; // ยังอยู่ในช่วง delay
    if (!this.started) {
      // จับค่าเริ่มต้นตอน "เริ่มขยับจริง" ไม่ใช่ตอนสร้าง — ค่าอาจถูกแก้ระหว่างรอ delay
      this.started = true;
      for (const key of Object.keys(this.to)) this.from[key] = this.target[key];
    }
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

/**
 * BumpTween — ขยับค่าขึ้นไปพีคกลางทาง แล้วกลับที่เดิม (รูประฆังคว่ำ sin)
 * ต่างจาก Tween ปกติที่ไปจาก "ค่าเริ่ม" ถึง "ค่าปลาย" ตรงๆ
 * ใช้กับ squash/stretch ตอนสลับลูกกวาด (⑦ Animation)
 */
class BumpTween {
  constructor(target, prop, peakDelta, duration, resolve) {
    this.target = target;
    this.prop = prop;
    this.base = target[prop];
    this.peakDelta = peakDelta;
    this.duration = duration;
    this.resolve = resolve;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const bump = Math.sin(Math.PI * t); // 0 → 1 → 0
    this.target[this.prop] = this.base + this.peakDelta * bump;
    if (t >= 1) {
      this.target[this.prop] = this.base;
      this.resolve();
      return true;
    }
    return false;
  }
}

export class Animation {
  constructor() {
    /** @type {Array<Tween|BumpTween>} */
    this.tweens = [];
  }

  /**
   * เริ่ม tween — คืน Promise ที่ resolve เมื่ออนิเมชันจบ
   * ทำให้ Game เขียนลำดับเหตุการณ์แบบ async/await ได้สะอาดๆ
   * @returns {Promise<void>}
   */
  tween(target, props, duration, ease = Easing.easeOutQuad, delay = 0) {
    return new Promise((resolve) => {
      this.tweens.push(new Tween(target, props, duration, ease, resolve, delay));
    });
  }

  /**
   * เริ่ม bump (พีคกลางทางแล้วกลับที่เดิม) — หลายพร็อพพร้อมกันได้
   * @param {object} target
   * @param {Object<string,number>} peakDeltas เช่น { scaleX: 0.18, scaleY: -0.12 }
   * @param {number} duration
   * @returns {Promise<void>}
   */
  bump(target, peakDeltas, duration) {
    const keys = Object.keys(peakDeltas);
    return Promise.all(
      keys.map((key) => new Promise((resolve) => {
        this.tweens.push(new BumpTween(target, key, peakDeltas[key], duration, resolve));
      }))
    );
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
