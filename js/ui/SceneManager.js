/**
 * SceneManager — สลับ "จอ" (scene) + ประวัติย้อนกลับ + lifecycle
 *
 * เฟส 0 (UI Roadmap): ฐานรากที่ทุกจอพึ่ง — ไม่แตะ gameplay/Renderer/Game เดิม
 * ออกแบบให้ core เป็นลอจิกล้วน (register/go/replace/back/current) เทสใน Node ได้
 * ตัว scene เป็น object ที่มี hook ไม่บังคับ: enter(params) / exit()
 * ฝั่ง DOM ให้ scene จัดการเองใน enter/exit (แสดง/ซ่อน element) — SceneManager ไม่ผูก DOM
 */
export class SceneManager {
  constructor() {
    /** @type {Map<string, {enter?:Function, exit?:Function}>} */
    this.scenes = new Map();
    /** ประวัติ (สแต็ก) ของ {id, params} ที่ทับกันมา */
    this.stack = [];
    /** @type {{id:string, scene:object, params:object}|null} */
    this.current = null;
  }

  /** ลงทะเบียนจอ */
  register(id, scene) {
    if (!id) throw new Error('SceneManager.register: id ว่าง');
    this.scenes.set(id, scene || {});
    return this;
  }

  has(id) { return this.scenes.has(id); }

  /** เข้า scene ใหม่ (ดันของเดิมลงประวัติ) */
  go(id, params = {}) {
    const scene = this.scenes.get(id);
    if (!scene) throw new Error('SceneManager.go: ไม่พบ scene "' + id + '"');
    if (this.current) {
      if (this.current.scene.exit) this.current.scene.exit();
      this.stack.push({ id: this.current.id, params: this.current.params });
    }
    this.current = { id, scene, params };
    if (scene.enter) scene.enter(params);
    return this.current;
  }

  /** แทนที่ scene ปัจจุบันโดยไม่เก็บประวัติ (เช่น Splash → Menu) */
  replace(id, params = {}) {
    const scene = this.scenes.get(id);
    if (!scene) throw new Error('SceneManager.replace: ไม่พบ scene "' + id + '"');
    if (this.current && this.current.scene.exit) this.current.scene.exit();
    this.current = { id, scene, params };
    if (scene.enter) scene.enter(params);
    return this.current;
  }

  /** ย้อนกลับจอก่อนหน้า (คืน null ถ้าไม่มีประวัติ) */
  back() {
    if (this.stack.length === 0) return null;
    if (this.current && this.current.scene.exit) this.current.scene.exit();
    const prev = this.stack.pop();
    const scene = this.scenes.get(prev.id);
    this.current = { id: prev.id, scene, params: prev.params };
    if (scene.enter) scene.enter(prev.params);
    return this.current;
  }

  currentId() { return this.current ? this.current.id : null; }
  depth() { return this.stack.length; }
  /** ล้างประวัติ (เช่นกลับเมนูหลักแล้วเริ่มใหม่) */
  clearHistory() { this.stack.length = 0; }
}
