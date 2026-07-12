/**
 * CommandRoomScene — เมนูหลัก "ห้องบังคับการยาน" (เวอร์ชัน static เฟส 1)
 * โต้ตอบวัตถุในยานแทนปุ่มเมนู: Crystal Core = EXPLORE, หน้าต่าง/หุ่น/ลัง/คอนโซล = ทางเข้าโหมด
 * เฟส 1: ทำโครง + EXPLORE ใช้ได้จริง (เผยเกม), hotspot อื่น = แจ้ง "เร็วๆ นี้" (toast)
 */
export function createCommandRoomScene({ root, sfx, onExplore, onHotspot }) {
  let el = null;
  const tick = () => { if (sfx && sfx.select) sfx.select(); };
  return {
    enter() {
      root.style.display = 'block';
      el = document.createElement('div');
      el.className = 'scene scene-command';
      el.innerHTML =
        '<div class="cr-hud">' +
          '<span class="cr-chip">❤ 5</span>' +
          '<span class="cr-chip">◆ 1,250</span>' +
          '<span class="cr-chip">⦿ 25,300</span>' +
        '</div>' +
        '<div class="cr-stage">' +
          '<div class="cr-window"><div class="sky"></div>' +
            '<div class="cr-bubble">Ready for another mission?</div>' +
            '<div class="cr-core"></div>' +
          '</div>' +
          '<div class="cr-left">' +
            '<button class="hot" data-id="event">🎁<span>Event</span></button>' +
            '<button class="hot" data-id="daily">📅<span>Daily</span></button>' +
            '<button class="hot" data-id="inbox">✉<span>Inbox</span></button>' +
          '</div>' +
          '<div class="cr-right">' +
            '<button class="hot" data-id="crew">🤖<span>Crew</span></button>' +
            '<button class="hot" data-id="shop">📦<span>Shop</span></button>' +
            '<button class="hot" data-id="settings">⚙<span>Settings</span></button>' +
          '</div>' +
        '</div>' +
        '<button class="cr-explore">🚀 EXPLORE</button>' +
        '<div class="cr-toast" hidden></div>';
      root.appendChild(el);

      el.querySelector('.cr-explore').addEventListener('click', () => {
        if (sfx && sfx.nova) sfx.nova();
        onExplore();
      });
      el.querySelectorAll('.hot').forEach((b) => {
        b.addEventListener('click', () => {
          tick();
          const id = b.getAttribute('data-id');
          if (onHotspot) onHotspot(id);
          const t = el.querySelector('.cr-toast');
          t.textContent = id.toUpperCase() + ' — เร็วๆ นี้';
          t.hidden = false;
          clearTimeout(this._tid);
          this._tid = setTimeout(() => { t.hidden = true; }, 1400);
        });
      });
    },
    exit() { if (el) { el.remove(); el = null; } },
  };
}
