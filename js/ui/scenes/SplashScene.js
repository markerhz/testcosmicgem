/**
 * SplashScene — จอเปิด GemVerse + "TAP TO START"
 * รวม Splash + Press-Anywhere: แตะครั้งแรก = ปลุก AudioContext แล้วเข้า Command Room
 * DOM/CSS ล้วน (ไม่แตะ canvas/เกม) — ผูกกับ SceneManager ผ่าน enter/exit
 */
export function createSplashScene({ root, sfx, onStart }) {
  let el = null;
  return {
    enter() {
      root.style.display = 'block';
      el = document.createElement('div');
      el.className = 'scene scene-splash';
      el.innerHTML =
        '<div class="sky"></div>' +
        '<div class="splash-inner">' +
          '<div class="core-mini"></div>' +
          '<h1 class="logo">GEMVERSE</h1>' +
          '<p class="tagline">A Tiny Cozy Universe</p>' +
          '<p class="prompt">TAP TO START</p>' +
          '<p class="ver">v0.5.0</p>' +
        '</div>';
      root.appendChild(el);
      const go = () => {
        if (sfx && sfx.ensureCtx) sfx.ensureCtx();
        if (sfx && sfx.swap) sfx.swap();
        onStart();
      };
      el.addEventListener('pointerdown', go, { once: true });
    },
    exit() { if (el) { el.remove(); el = null; } },
  };
}
