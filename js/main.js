/**
 * GemVerse — จุดเริ่มต้น
 * สร้างเกม + settings(เสียง) + App(Splash → Command Room → เผยเกม)
 */
import { Game } from './engine/Game.js';
import { SettingsStore } from './systems/SettingsStore.js';
import { applyAudioSettings } from './ui/AudioSettings.js';
import { App } from './ui/App.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

const settings = new SettingsStore(window.localStorage);
applyAudioSettings(game.sfx, settings);

game.start(); // เกมวาดอยู่ใต้ overlay

const app = new App({ root: document.getElementById('scene-root'), game, sfx: game.sfx });
app.start();
