/**
 * GemVerse — จุดเริ่มต้นของเกม
 * สร้าง Game + settings (ขับระบบเสียง) แล้วเริ่มลูปหลัก
 */
import { Game } from './engine/Game.js';
import { SettingsStore } from './systems/SettingsStore.js';
import { applyAudioSettings } from './ui/AudioSettings.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// เฟส 0: ค่าตั้งค่า (คงอยู่ข้ามครั้งเล่นผ่าน localStorage) ขับระดับเสียงจริง
const settings = new SettingsStore(window.localStorage);
applyAudioSettings(game.sfx, settings);

game.start();
