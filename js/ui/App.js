/**
 * App — บูต SceneManager + คุม overlay UI (เฟส 1)
 * สร้างเฟรม (wrap/frame/space/slot) ครั้งเดียว → starfield ต่อเนื่องข้ามจอ
 * scene แต่ละตัว render ลง .slot ; EXPLORE = ซ่อน overlay เผยเกมที่รันอยู่ใต้
 */
import { SceneManager } from './SceneManager.js';
import { createSplashScene } from './scenes/SplashScene.js';
import { createCommandRoomScene } from './scenes/CommandRoomScene.js';

export class App {
  constructor({ root, game, sfx }) {
    this.root = root;
    this.game = game;
    this.sfx = sfx;
    this.root.innerHTML =
      '<div class="wrap"><div class="frame">' +
        '<div class="space"><div class="stars"></div><div class="dust"></div></div>' +
        '<div class="slot"></div>' +
      '</div></div>';
    this.mount = this.root.querySelector('.slot');

    this.sm = new SceneManager();
    this.sm.register('splash', createSplashScene({
      mount: this.mount, sfx, onStart: () => this.sm.replace('commandRoom'),
    }));
    this.sm.register('commandRoom', createCommandRoomScene({
      mount: this.mount, sfx, onExplore: () => this.revealGame(),
    }));
  }

  start() { this.root.style.display = 'block'; this.sm.go('splash'); }

  revealGame() {
    if (this.sm.current && this.sm.current.scene.exit) this.sm.current.scene.exit();
    this.root.style.display = 'none';
    if (this.game && this.game.renderer && this.game.renderer.resize) this.game.renderer.resize();
  }
}
