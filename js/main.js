/**
 * SweetVerse Cosmic v0.2.4 Alpha — จุดเริ่มต้นของเกม
 * สร้าง Game แล้วเริ่มลูปหลัก
 */
import { Game } from './engine/Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.start();
