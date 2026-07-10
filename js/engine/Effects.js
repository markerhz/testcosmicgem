/**
 * Effects — พาร์ติเคิล, ตัวเลขคะแนนลอย, จอสั่น
 *
 * เป็น "ข้อมูลล้วน" เหมือน Board/Candy: ไม่แตะ canvas เอง
 * Renderer เป็นคนวาด, Game เป็นคนเรียก spawn ตอนเกิดเหตุการณ์ (แตก/ระเบิด/โนวา)
 * ทำให้เทสต์ลอจิก (นับจำนวน, การหมดอายุ, การสลาย) ได้แบบ pure ใน Node เหมือนระบบอื่น
 */

/** แรงโน้มถ่วงพาร์ติเคิล (px logical / s²) */
const GRAVITY = 420;

export class Effects {
  constructor() {
    /** @type {Array<{x:number,y:number,vx:number,vy:number,life:number,maxLife:number,color:string,size:number}>} */
    this.particles = [];
    /** @type {Array<{x:number,y:number,vy:number,life:number,maxLife:number,text:string,color:string,big:boolean}>} */
    this.floaters = [];

    this.shakeTime = 0;     // เวลาที่เหลือของการสั่น (ms)
    this.shakeDuration = 0; // ระยะเวลารวมของการสั่นชุดปัจจุบัน (ms) — ใช้คิดสัดส่วนสลาย
    this.shakeMag = 0;      // แอมพลิจูดตั้งต้น (px logical)
  }

  /**
   * ระเบิดพาร์ติเคิลจากจุดหนึ่ง (ตอนลูกกวาดแตก)
   * @param {number} x พิกัด logical
   * @param {number} y พิกัด logical
   * @param {string} color
   * @param {number} count จำนวนพาร์ติเคิล
   * @param {() => number} [rng] ใส่เองได้เพื่อเทสต์
   * @param {number} [power] ตัวคูณความแรง (ความเร็ว/ขนาด) — คอมโบสูง/ตัวพิเศษส่งค่า > 1
   */
  burst(x, y, color, count = 8, rng = Math.random, power = 1) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const speed = (60 + rng() * 120) * power;
      const maxLife = 260 + rng() * 220;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40 * power, // เหวี่ยงขึ้นเล็กน้อยก่อนตกตามแรงโน้มถ่วง
        life: maxLife,
        maxLife,
        color,
        size: rng() < (power > 1.3 ? 0.5 : 0.3) ? 4 : 2,
      });
    }
  }

  /**
   * เลขคะแนนลอยขึ้น (ตอนคิดคะแนนจบสเต็ป)
   * @param {number} x
   * @param {number} y
   * @param {string} text เช่น "+80"
   * @param {string} [color]
   * @param {boolean} [big] ตัวใหญ่ (ใช้กับข้อความ COMBO / คะแนนก้อนโต)
   */
  floatText(x, y, text, color = '#ffffff', big = false) {
    this.floaters.push({ x, y, vy: big ? -40 : -55, life: big ? 900 : 700, maxLife: big ? 900 : 700, text, color, big });
  }

  /**
   * สั่นจอ (ตอนระเบิด/โนวาทำงาน หรือคอมโบสูง)
   * @param {number} magnitude px logical
   * @param {number} duration ms
   */
  shake(magnitude, duration) {
    // เอฟเฟกต์แรงกว่าทับของเดิมได้ แต่ไม่ให้ของเบากว่ามาตัดของแรงที่กำลังเล่นอยู่
    if (magnitude >= this.shakeMag || this.shakeTime <= 0) {
      this.shakeMag = magnitude;
      this.shakeDuration = duration;
      this.shakeTime = duration;
    }
  }

  /** ออฟเซ็ตจอสั่นปัจจุบัน (px logical) — สลายเชิงเส้นตามเวลาที่เหลือ */
  get shakeOffset() {
    if (this.shakeTime <= 0 || this.shakeDuration <= 0) return { x: 0, y: 0 };
    const k = this.shakeTime / this.shakeDuration;
    const m = this.shakeMag * k;
    return { x: (Math.random() * 2 - 1) * m, y: (Math.random() * 2 - 1) * m };
  }

  /** มีเอฟเฟกต์กำลังเล่นอยู่ไหม (เผื่ออยากรู้เฉยๆ ไม่ได้ใช้ล็อกอินพุต) */
  get busy() {
    return this.particles.length > 0 || this.floaters.length > 0 || this.shakeTime > 0;
  }

  /** เรียกทุกเฟรมจาก Game (เหมือน Animation.update) */
  update(dt) {
    const s = dt / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += GRAVITY * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) { this.floaters.splice(i, 1); continue; }
      f.y += f.vy * s;
    }

    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);
  }
}
