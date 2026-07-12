/**
 * Sfx — เสียงเอฟเฟกต์สังเคราะห์ด้วย WebAudio ล้วน (ไม่มีไฟล์เสียง)
 * สอดคล้องกับปรัชญาโปรเจกต์: สไปรต์สร้างด้วยโค้ด → เสียงก็สร้างด้วยโค้ด
 *
 * ปรัชญาเสียง (AUDIO_GUIDE): อุ่น / กลไก / นุ่ม / ผ่อนคลาย
 *   Machine = soft hum, tick, light clunk | Crystal = heavy impact, soft shimmer
 *   Never arcade. Never casino.
 * เทคนิคหลักที่ทำให้ "ไม่ arcade": ทุกเสียงผ่าน lowpass ตัดความบาดหู
 *   + มี attack สั้นๆ (ไม่ใช่คลิกทันที) + ใช้ sine/triangle เป็นหลัก
 *
 * AudioContext ต้องถูกสร้าง/resume หลัง gesture ผู้ใช้ (ข้อจำกัดเบราว์เซอร์)
 */
export class Sfx {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} มาสเตอร์ — คุมระดับรวมกันแตกเวลาเสียงซ้อน */
    this.master = null;
    this.muted = false;
  }

  /** สร้าง/ปลุก AudioContext + มาสเตอร์บัส (ต้องเรียกหลัง gesture ผู้ใช้) */
  ensureCtx() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
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

  /** ปลายทางของทุกเสียง (มาสเตอร์ถ้ามี ไม่งั้น destination) */
  _out() { return this.master || this.ctx.destination; }

  /**
   * โทนอุ่น 1 เสียง: osc → lowpass → gain(attack/decay) → master
   * attack สั้นๆ กันเสียง "คลิก" หัวโน้ต ให้ฟีลนุ่มแบบกลไก ไม่ใช่บี๊บอาร์เคด
   * @param {object} o
   * @param {number} o.freq Hz
   * @param {number} o.dur วินาที (ช่วง decay)
   * @param {OscillatorType} [o.type='sine']
   * @param {number} [o.gain=0.2] พีคเกน
   * @param {number} [o.when=0] หน่วงเริ่ม (วินาที)
   * @param {number} [o.attack=0.008] เวลาไต่ขึ้น (วินาที)
   * @param {number} [o.cutoff] ความถี่ตัด lowpass (ดีฟอลต์ = 4x freq, เพดาน 6kHz)
   * @param {number} [o.glideTo] ถ้ากำหนด จะไถลความถี่ไปค่านี้ (เสียง clunk/impact)
   */
  voice(o) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.when || 0);
    const dur = o.dur;
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.glideTo), t0 + dur);
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, o.cutoff || o.freq * 4);
    lp.Q.value = 0.6;
    const peak = o.gain == null ? 0.2 : o.gain;
    const atk = o.attack == null ? 0.008 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + atk + dur);
    osc.connect(lp); lp.connect(g); g.connect(this._out());
    osc.start(t0);
    osc.stop(t0 + atk + dur + 0.03);
  }

  /**
   * เสียงเสียดสี/แรงกระแทกนุ่ม: white noise → lowpass → gain
   * cutoff ต่ำ = ทุ้มอุ่น (clunk/rumble) ไม่ใช่ "ฉู่" แหลมแบบอาร์เคด
   */
  noise(dur = 0.16, gain = 0.14, cutoff = 1400, when = 0) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const size = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(lp); lp.connect(g); g.connect(this._out());
    src.start(t0);
  }

  // ---- เสียงประจำเหตุการณ์ (คำศัพท์: tick / clunk / impact / shimmer) ----

  /** แตะเลือกช่อง — "tick" กลไกเบาๆ */
  select() {
    this.voice({ freq: 620, dur: 0.05, type: 'triangle', gain: 0.06, cutoff: 2200, attack: 0.004 });
  }

  /** สลับ 2 ช่อง — "light clunk" ทุ้มอุ่น + เสียดสีเบา */
  swap() {
    this.voice({ freq: 300, dur: 0.10, type: 'sine', gain: 0.16, glideTo: 210, cutoff: 1200 });
    this.noise(0.05, 0.05, 900);
  }

  /** สลับแล้วไม่ match → "unh" ทุ้มลงต่ำนุ่มๆ (ปฏิเสธแบบไม่บาดหู ไม่ใช่ buzzer) */
  invalid() {
    this.voice({ freq: 240, dur: 0.14, type: 'sine', gain: 0.14, glideTo: 150, cutoff: 900 });
    this.voice({ freq: 200, dur: 0.16, type: 'triangle', gain: 0.06, glideTo: 130, cutoff: 800, when: 0.05 });
  }

  /** คริสตัลแตก 1 สเต็ป — ฉ่ำ/สะใจ แต่ยังอุ่น (lowpass คุมไม่บาดหู)
   *  ชั้นเสียง: (1) รอยแตก transient (2) ตุบเบสน้ำหนัก (3) กระดิ่งคริสตัล
   *  (4) ประกายฮาร์โมนิก major-third+octave เป็นเพย์ออฟ (5) คอมโบสูง = บานประกายอีกชั้น */
  pop(chain = 1) {
    const step = Math.min(chain - 1, 8);
    const base = 300 + step * 40;                        // ไต่พิตช์ตามคอมโบ (escalation)
    // (1) รอยแตกคริสตัล — noise สั้นคม ยิ่งคอมโบยิ่งใส
    this.noise(0.045, 0.13, 2600 + step * 420);
    // (2) น้ำหนักการแตก — sub thump "ตุบ" ให้สะใจ
    this.voice({ freq: 150, dur: 0.13, type: 'sine', gain: 0.17, glideTo: 80, cutoff: 700 });
    // (3) ตัวกระดิ่งคริสตัล (body) อุ่น
    this.voice({ freq: base, dur: 0.16, type: 'triangle', gain: 0.18, glideTo: base * 0.86, cutoff: base * 6 });
    // (4) ประกายฮาร์โมนิก (5th + octave) — เพย์ออฟใสๆ ไม่บาดหู
    this.voice({ freq: base * 1.5, dur: 0.20, type: 'sine', gain: 0.10, when: 0.02, cutoff: 6000, attack: 0.006 });
    this.voice({ freq: base * 2, dur: 0.24, type: 'sine', gain: 0.06, when: 0.03, cutoff: 6000, attack: 0.010 });
    // (5) คอมโบสูงบานประกายพิเศษอีกชั้น
    if (chain >= 4) this.voice({ freq: base * 3, dur: 0.26, type: 'triangle', gain: 0.055, when: 0.05, cutoff: 6000, attack: 0.02 });
  }

  /** ระเบิด 3x3 — "ป๊อปตัวใหญ่": ยืม DNA ของ pop มาขยาย (แคร็กคม + ตุบพันช์ + กระดิ่งคริสตัล
   *  + ประกายบานเป็นคอร์ดขึ้น) ให้สว่างสะใจ ไม่ตุ่นรัมเบิล แต่ยังหนักกว่า pop ชัดเจน */
  bomb() {
    // แคร็กหัวระเบิดคมสว่าง (เหมือน pop แต่แรงกว่า)
    this.noise(0.06, 0.22, 4200);
    // ตุบเบสพันช์หนักแน่น (ไม่ยืดจนตุ่น)
    this.voice({ freq: 190, dur: 0.20, type: 'sine', gain: 0.30, glideTo: 60, cutoff: 1100 });
    // ตัวกระดิ่งคริสตัลใหญ่ (body แบบ pop)
    this.voice({ freq: 300, dur: 0.20, type: 'triangle', gain: 0.22, glideTo: 250, cutoff: 2600 });
    // ประกายบานเป็นคอร์ดไล่ขึ้น 3 โน้ต — เพย์ออฟสะใจแบบ pop
    [400, 600, 900].forEach((f, i) =>
      this.voice({ freq: f, dur: 0.26, type: 'sine', gain: 0.12, when: 0.02 + i * 0.02, cutoff: 6000, attack: 0.005 }));
    // ประกายค้างสูง (shimmer tail) ให้ปลายฉ่ำ
    this.voice({ freq: 1400, dur: 0.34, type: 'triangle', gain: 0.07, when: 0.08, cutoff: 6000, attack: 0.02 });
    // หางน้ำหนักเบาๆ (ไม่ตุ่น)
    this.noise(0.18, 0.09, 1000, 0.05);
  }

  /** ซูเปอร์โนวา — คริสตัลบานเป็นคอร์ดอุ่น + ประกายสูงค้างยาว (relaxing bloom ไม่ใช่แฟนแฟร์คาสิโน) */
  nova() {
    [523, 659, 784, 1047].forEach((f, i) =>            // C major bloom (root/3rd/5th/oct)
      this.voice({ freq: f, dur: 0.55, type: 'sine', gain: 0.12, when: i * 0.045, attack: 0.02, cutoff: 5000 }));
    this.voice({ freq: 1568, dur: 0.7, type: 'triangle', gain: 0.05, when: 0.10, attack: 0.05, cutoff: 6000 }); // shimmer ค้าง
  }

  /** ดาวหาง (Comet Streak) — โทนกวาดขึ้น + ลมฟู่ + ประกายปลาย (พลังงาน ไม่ใช่เลเซอร์อาร์เคด) */
  comet() {
    this.voice({ freq: 240, dur: 0.16, type: 'triangle', gain: 0.16, glideTo: 880, cutoff: 3200, attack: 0.006 });
    this.noise(0.16, 0.12, 2400);
    this.voice({ freq: 1000, dur: 0.20, type: 'sine', gain: 0.08, when: 0.05, cutoff: 6000, attack: 0.01 });
  }

  /** จรวด (ล่าเป้าหมาย) — จุดชนวน + ทะยานขึ้น + กระแทกเบาตอนพุ่งชนเป้า */
  rocket() {
    this.noise(0.05, 0.10, 2600, 0);          // ประกายจุดชนวน
    this.voice({ freq: 260, dur: 0.14, type: 'sawtooth', gain: 0.13, glideTo: 620, cutoff: 2200, attack: 0.008, when: 0.01 });
    this.voice({ freq: 520, dur: 0.09, type: 'triangle', gain: 0.09, when: 0.11, cutoff: 3000 }); // กระแทกตอนถึงเป้า
  }

  /** เม็ดตกลงจอด/เครื่องขุดปล่อยเม็ด — "light clunk" กลไกเบาๆ (game feel: น้ำหนักการตก)
   *  @param {number} n จำนวนจุดลงจอด — ยิ่งเยอะยิ่งหนักขึ้นนิด (คุมเพดานไว้) */
  land(n = 1) {
    const g = Math.min(0.14, 0.06 + n * 0.012);
    this.voice({ freq: 190, dur: 0.09, type: 'sine', gain: g, glideTo: 120, cutoff: 900 });
    this.noise(0.04, g * 0.4, 700);
  }
}
