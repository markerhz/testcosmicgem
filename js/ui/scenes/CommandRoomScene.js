/**
 * CommandRoomScene — เมนูหลัก "ห้องบังคับการยาน" (art เนี้ยบ, static เฟส 1)
 * Crystal Core = EXPLORE (เผยเกม) ; hotspot อื่น = toast "เร็วๆ นี้"
 */
export function createCommandRoomScene({ mount, sfx, onExplore }) {
  let toastTid = 0;
  const obj = (id, icon, label, led) =>
    '<div class="obj" data-id="' + id + '">' + icon + '<span>' + label + '</span>' + (led ? '<i class="led"></i>' : '') + '</div>';
  return {
    enter() {
      mount.innerHTML =
        '<div class="command">' +
          '<div class="cr-hud"><span class="chip">❤ <b>5</b></span><span class="chip">◆ <b>1,250</b></span><span class="chip">⦿ <b>25,300</b></span></div>' +
          '<div class="win">' +
            '<div class="stars"></div>' +
            '<span class="rivet" style="left:16px;top:122px"></span><span class="rivet" style="right:16px;top:122px"></span>' +
            '<span class="rivet" style="left:34px;top:46px"></span><span class="rivet" style="right:34px;top:46px"></span>' +
            '<div class="planet"></div>' +
            '<div class="bubble">Ready for another mission?</div>' +
            '<div class="dais"></div>' +
            '<div class="crystal"><div class="halo"></div><div class="body"></div><div class="fl"></div><div class="sh"></div><div class="sp"></div></div>' +
          '</div>' +
          '<div class="rows">' +
            '<div class="col">' + obj('event','🎁','Event',true) + obj('daily','📅','Daily',false) + obj('inbox','✉','Inbox',false) + '</div>' +
            '<div class="col">' + obj('crew','🤖','Crew',false) + obj('shop','📦','Shop',true) + obj('settings','⚙','Settings',false) + '</div>' +
          '</div>' +
          '<button class="explore">🚀 EXPLORE</button>' +
          '<div class="floor"><span>🪴</span><span>☕</span><span>🐈</span></div>' +
          '<div class="rug"></div>' +
          '<div class="toast" hidden></div>' +
        '</div>';
      const el = mount.querySelector('.command');
      el.querySelector('.explore').addEventListener('click', () => { if (sfx && sfx.nova) sfx.nova(); onExplore(); });
      el.querySelectorAll('.obj').forEach((b) => b.addEventListener('click', () => {
        if (sfx && sfx.select) sfx.select();
        const t = el.querySelector('.toast');
        t.textContent = b.getAttribute('data-id').toUpperCase() + ' — เร็วๆ นี้';
        t.hidden = false; clearTimeout(toastTid); toastTid = setTimeout(() => { t.hidden = true; }, 1400);
      }));
    },
    exit() { mount.innerHTML = ''; },
  };
}
