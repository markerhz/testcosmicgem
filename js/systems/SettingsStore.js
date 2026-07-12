/**
 * SettingsStore — แหล่งความจริงเดียวของการตั้งค่า (audio/motion/haptics/lang + first-launch)
 *
 * เฟส 0 (UI Roadmap): Settings เต็ม + Options ด่วน อ่าน/เขียน store อันเดียวกัน
 * storage ฉีดเข้าได้ (localStorage ในเบราว์เซอร์ / stub ในเทส) — ลอจิกล้วน เทสใน Node ได้
 * ยังไม่ผูกกับ Sfx/เกม (จะ wire ในสเต็ปถัดไป) — ไม่แตะ gameplay
 */
export class SettingsStore {
  static DEFAULTS = {
    sound: true, music: true, ambient: true,
    sfxVol: 0.9, musicVol: 0.7,
    reducedMotion: false, haptics: true,
    lang: 'th',
    tutorialDone: false, // first-launch flag: false = ยังไม่เคยเล่น → เล่น Tutorial
  };

  /**
   * @param {{getItem:Function,setItem:Function}|null} storage เช่น window.localStorage หรือ stub
   * @param {string} key
   */
  constructor(storage = null, key = 'gemverse.settings.v1') {
    this.storage = storage;
    this.key = key;
    this._data = { ...SettingsStore.DEFAULTS };
    this._subs = [];
    this.load();
  }

  get(k) { return this._data[k]; }
  all() { return { ...this._data }; }

  set(k, v) {
    if (!(k in SettingsStore.DEFAULTS)) throw new Error('SettingsStore: คีย์ไม่รู้จัก "' + k + '"');
    if (this._data[k] === v) return v;
    this._data[k] = v;
    this.save();
    this._emit(k, v);
    return v;
  }

  toggle(k) { return this.set(k, !this._data[k]); }

  /** subscribe(fn) → คืนฟังก์ชัน unsubscribe. fn(key, value, allData) */
  subscribe(fn) {
    this._subs.push(fn);
    return () => { const i = this._subs.indexOf(fn); if (i >= 0) this._subs.splice(i, 1); };
  }

  _emit(k, v) { for (const fn of this._subs.slice()) fn(k, v, this._data); }

  load() {
    try {
      if (!this.storage) return;
      const raw = this.storage.getItem(this.key);
      if (raw) {
        const o = JSON.parse(raw);
        this._data = { ...SettingsStore.DEFAULTS, ...o };
      }
    } catch { /* เสียหาย → ใช้ default */ }
  }

  save() {
    try { if (this.storage) this.storage.setItem(this.key, JSON.stringify(this._data)); }
    catch { /* โหมดส่วนตัว/เต็ม → เงียบไว้ */ }
  }

  reset() {
    this._data = { ...SettingsStore.DEFAULTS };
    this.save();
    this._emit('*', null);
  }

  // ---- first-launch / tutorial ----
  isFirstLaunch() { return !this._data.tutorialDone; }
  markTutorialDone() { return this.set('tutorialDone', true); }
}
