/**
 * Sfx — เสียงเอฟเฟกต์สังเคราะห์ด้วย WebAudio ล้วน (ไม่มีไฟล์เสียง)
 * สอดคล้องกับปรัชญาโปรเจกต์: สไปรต์สร้างด้วยโค้ด → เสียงก็สร้างด้วยโค้ดเหมือนกัน
 *
 * AudioContext ต้องถูกสร้าง/resume หลังอินพุตจากผู้ใช้ (ข้อจำกัดเบราว์เซอร์)
 * เรียก ensureCtx() ตอนแตะจอครั้งแรกก็พอ (Game เรียกให้ทุกครั้งที่ tap อยู่แล้ว ราคาถูก)
 */
export class Sfx {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.muted = false;
  }

  /** สร้าง/ปลุก AudioContext (ต้องเรียกหลัง gesture ของผู้ใช้) */
  ensureCtx() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * เสียงโทนเดียว: oscillator + envelope decay แบบ exponential
   * @param {number} freq Hz
   * @param {number} duration วินาที
   * @param {OscillatorType} type
   * @param {number} gainStart 0..1
   * @param {number} when หน่วงเวลาเริ่ม (วินาที) ใช้ทำคอร์ด/อาร์เพจโจ
   */
  tone(freq, duration, type = 'sine', gainStart = 0.2, when = 0) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(gainStart, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** ระเบิดเสียงสัญญาณรบกวน (white noise) ห่อ envelope — ใช้กับระเบิด/ระเบิดลูกโซ่ */
  noiseBurst(duration = 0.18, gainStart = 0.2) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  // ---- เสียงประจำเหตุการณ์ ----

  /** แตะเลือกช่อง */
  select() { this.tone(520, 0.05, 'square', 0.08); }

  /** สลับ 2 ช่อง */
  swap() { this.tone(440, 0.08, 'triangle', 0.14); }

  /** สลับแล้วไม่เกิด match → สลับกลับ */
  invalid() { this.tone(160, 0.14, 'square', 0.1); }

  /** ลูกกวาดแตก 1 สเต็ป — เสียงสูงขึ้นตามคอมโบ (chain) */
  pop(chain = 1) {
    const freq = 300 + Math.min(chain - 1, 8) * 55;
    this.tone(freq, 0.11, 'square', 0.16);
    this.tone(freq * 1.5, 0.09, 'sine', 0.06, 0.02);
  }

  /** ระเบิด 3x3 ทำงาน */
  bomb() {
    this.tone(90, 0.28, 'sawtooth', 0.22);
    this.noiseBurst(0.16, 0.18);
  }

  /** ซูเปอร์โนวาทำงาน — คอร์ดไล่เสียงกว้าง */
  nova() {
    [660, 880, 1100].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.14, i * 0.035));
    this.tone(1320, 0.5, 'triangle', 0.08, 0.07);
  }
}
