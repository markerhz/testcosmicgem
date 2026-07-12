/**
 * App — ตัวเชื่อม SceneManager กับจอ UI (เฟส 1)
 * overlay (#scene-root) ทับเกมที่รันอยู่ใต้ ; EXPLORE = ซ่อน overlay เผยเกม
 * ไม่แตะ logic เกม/Renderer — เกมวาดอยู่ใต้ overlay ตั้งแต่ต้น
 */
import { SceneManager } from './SceneManager.js';
import { createSplashScene } from './scenes/SplashScene.js';
import { createCommandRoomScene } from './scenes/CommandRoomScene.js';

export class App {
  constructor({ root, game, sfx }) {
    this.root = root;
    this.game = game;
    this.sfx = sfx;
    this.sm = new SceneManager();
    this.sm.register('splash', createSplashScene({
      root, sfx, onStart: () => this.sm.replace('commandRoom'),
    }));
    this.sm.register('commandRoom', createCommandRoomScene({
      root, sfx, onExplore: () => this.revealGame(), onHotspot: () => {},
    }));
  }

  start() { this.sm.go('splash'); }

  /** ซ่อน overlay เผยเกม + รีไซซ์ canvas ให้พอดีจอตอนเผย */
  revealGame() {
    if (this.sm.current && this.sm.current.scene.exit) this.sm.current.scene.exit();
    this.root.style.display = 'none';
    if (this.game && this.game.renderer && this.game.renderer.resize) this.game.renderer.resize();
  }
}
