/**
 * SplashScene — จอเปิด (art เนี้ยบ) + TAP TO START
 * render ลง mount (.slot) ; แตะครั้งแรก = ปลุก AudioContext แล้วเข้า Command Room
 */
export function createSplashScene({ mount, sfx, onStart }) {
  return {
    enter() {
      mount.innerHTML =
        '<div class="splash">' +
          '<div class="crystal"><div class="halo"></div><div class="body"></div><div class="fl"></div><div class="sh"></div><div class="sp"></div></div>' +
          '<h1 class="logo">GEMVERSE</h1>' +
          '<p class="tagline">A Tiny Cozy Universe</p>' +
          '<p class="prompt">TAP TO START</p>' +
          '<p class="ver">v0.5.0</p>' +
        '</div>';
      const go = () => {
        if (sfx && sfx.ensureCtx) sfx.ensureCtx();
        if (sfx && sfx.swap) sfx.swap();
        onStart();
      };
      mount.querySelector('.splash').addEventListener('pointerdown', go, { once: true });
    },
    exit() { mount.innerHTML = ''; },
  };
}
