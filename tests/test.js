/**
 * เทสต์ลอจิกเกม (ไม่แตะ DOM) — รัน: node tests/test.js
 * ต้องรันจากโฟลเดอร์ราก และมี package.json {"type":"module"} หรือรันผ่าน npm test
 */
import { Board } from '../js/board/Board.js';
import { Candy } from '../js/board/Candy.js';
import { MatchSystem } from '../js/systems/MatchSystem.js';
import { GravitySystem } from '../js/systems/GravitySystem.js';
import { ScoreSystem } from '../js/systems/ScoreSystem.js';
import { Effects } from '../js/engine/Effects.js';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}

/** rng แบบ seed ได้ (LCG) — ให้ผลซ้ำได้ทุกเครื่อง */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** ตั้งชนิดลูกกวาดทั้งกระดานจาก array ของ string เช่น '01230123' */
function setTypes(board, rows) {
  for (let row = 0; row < board.size; row++) {
    for (let col = 0; col < board.size; col++) {
      const ch = rows[row][col];
      board.getCell(col, row).candy = ch === '.' ? null : new Candy(+ch);
    }
  }
}

/** แถวเติมที่หมุนต่างกัน → ไม่มี match แนวไหนเลย */
const rot = (i) => { const s = '01230123'; return s.slice(i % 4) + s.slice(0, i % 4); };
const fillers = (first) => [first, rot(1), rot(2), rot(3), rot(1), rot(2), rot(3), rot(1)];

console.log('--- Board: กระดานตั้งต้น ---');
{
  let clean = true;
  for (let i = 0; i < 30; i++) {
    const b = new Board(lcg(i * 999 + 1));
    if (new MatchSystem(b).findMatches().length > 0) clean = false;
  }
  ok(clean, 'สุ่ม 30 กระดาน ไม่มี match ตั้งต้นเลย');
}

console.log('--- MatchSystem.findMatches ---');
const board = new Board(lcg(42));
const match = new MatchSystem(board);
const gravity = new GravitySystem(board);
{
  setTypes(board, fillers('00045123'));
  const m = match.findMatches();
  ok(m.length === 1 && m[0].length === 3 && m[0].orient === 'h', 'เจอ match แนวนอน 3 ตัว');
}
{
  const rows = fillers(rot(0));
  rows[0] = '5' + rot(0).slice(1);
  rows[1] = '5' + rot(1).slice(1);
  rows[2] = '5' + rot(2).slice(1);
  setTypes(board, rows);
  const m = match.findMatches();
  ok(m.some((g) => g.orient === 'v' && g.length === 3 && g.type === 5), 'เจอ match แนวตั้ง 3 ตัว');
}
{
  setTypes(board, fillers('00001123'));
  const m = match.findMatches();
  ok(m.some((g) => g.length === 4), 'เจอ match 4 ตัว');
}
{
  setTypes(board, fillers(rot(0)));
  ok(match.findMatches().length === 0, 'กระดานไม่มี match → ว่าง');
}
{
  // รูปตัว L: แถว 0 มี 000 + คอลัมน์ 0 มี 0,0,0 → ช่องมุมนับครั้งเดียว
  const rows = fillers('00032103');
  rows[1] = '0' + rot(1).slice(1);
  rows[2] = '0' + rot(2).slice(1);
  setTypes(board, rows);
  const m = match.findMatches();
  const cells = match.collectCells(m);
  ok(m.length === 2 && cells.length === 5, 'รูปตัว L: 2 groups รวมช่องไม่ซ้ำ = 5 (ได้ ' + cells.length + ')');
}

console.log('--- GravitySystem ---');
{
  setTypes(board, fillers(rot(0)));
  board.getCell(0, 7).candy = null;
  board.getCell(0, 6).candy = null; // เจาะรูล่างคอลัมน์ 0
  const falls = gravity.applyGravity();
  ok(board.getCell(0, 7).candy !== null && board.getCell(0, 6).candy !== null, 'ลูกกวาดหล่นลงเติมล่าง');
  ok(board.getCell(0, 0).candy === null && board.getCell(0, 1).candy === null, 'ช่องว่างขึ้นไปบนสุด');
  ok(falls.length === 6 && falls.every((f) => f.col === 0 && f.toRow > f.fromRow), 'รายการหล่นถูกต้อง (6 ช่อง)');
  const spawned = gravity.refill(lcg(7));
  ok(spawned.length === 2 && board.getCell(0, 0).candy && board.getCell(0, 1).candy, 'เติมครบ 2 ช่อง');
  let full = true;
  board.forEachCell((c) => { if (!c.candy) full = false; });
  ok(full, 'หลัง refill ไม่มีช่องว่างเหลือ');
}

console.log('--- Cascade จำลองครบลูป (ไม่มีอนิเมชัน) ---');
{
  const rows = fillers(rot(0));
  rows[6] = '32101230';
  rows[7] = '22231032'; // 222 ที่คอลัมน์ 0-2
  setTypes(board, rows);
  let matches = match.findMatches();
  ok(matches.length === 1, 'มี match เริ่มต้น 1 group');
  let rounds = 0;
  const rng = lcg(123);
  while (matches.length > 0 && rounds < 20) {
    for (const cell of match.collectCells(matches)) cell.candy = null;
    gravity.applyGravity();
    gravity.refill(rng);
    matches = match.findMatches();
    rounds++;
  }
  ok(rounds >= 1 && rounds < 20, 'cascade จบใน ' + rounds + ' รอบ (ไม่วนไม่รู้จบ)');
  let full = true;
  board.forEachCell((c) => { if (!c.candy) full = false; });
  ok(full && match.findMatches().length === 0, 'จบแล้วกระดานเต็ม + นิ่ง (ไม่มี match ค้าง)');
}

console.log('--- ScoreSystem (chips × mult) ---');
{
  const score = new ScoreSystem();
  const cells3 = [{}, {}, {}]; // 3 เม็ด
  const r1 = score.addMatchScore(cells3, { chain: 1 });
  ok(r1.chips === 30 && r1.mult === 1 && r1.gained === 30, 'chain 1: 3 เม็ด = 30 (ได้ ' + r1.gained + ')');
  const r2 = score.addMatchScore(cells3, { chain: 2 });
  ok(r2.mult === 1.5 && r2.gained === 45, 'chain 2: mult 1.5 → 45 (ได้ ' + r2.gained + ')');
  const r3 = score.addMatchScore([{}, {}, {}, {}], { chain: 3 });
  ok(r3.mult === 2 && r3.gained === 80, 'chain 3: 4 เม็ด × mult 2 = 80 (ได้ ' + r3.gained + ')');
  ok(score.score === 155 && score.totalScore === 155, 'คะแนนสะสมถูกต้อง (155)');
  score.reset();
  ok(score.score === 0 && score.totalScore === 155, 'reset ล้างเฉพาะคะแนนรอบ ไม่ล้างคะแนนรวม');
}

console.log('--- hasPossibleMove (กันเกมตัน) ---');
{
  // กระดานที่ "ตันสนิท": แถวคู่สลับสี 0/1, แถวคี่สลับสี 2/3
  const rows = [];
  for (let r = 0; r < 8; r++) {
    rows.push(r % 2 === 0 ? '01010101' : '23232323');
  }
  setTypes(board, rows);
  ok(match.hasPossibleMove() === false, 'กระดานตันจริง → ตรวจเจอว่าไม่มีตาเดิน');
}
{
  const rows = fillers(rot(0));
  rows[0] = '00103123';
  setTypes(board, rows);
  ok(match.hasPossibleMove() === true, 'มีตาเดิน 1 จุด → เจอ');
}
{
  let allMovable = true;
  for (let i = 0; i < 20; i++) {
    const b = new Board(lcg(i * 77 + 5));
    if (!new MatchSystem(b).hasPossibleMove()) allMovable = false;
  }
  ok(allMovable, 'กระดานสุ่ม 20 อัน มีตาเดินทุกอัน');
}
{
  const b = new Board(lcg(31337));
  b.fillRandom();
  ok(new MatchSystem(b).findMatches().length === 0, 'reshuffle แล้วไม่มี match ตั้งต้น');
}
{
  // ตาเดินที่มีอยู่เพียงจุดเดียว = สลับแล้วเกิด "square 2x2" ล้วนๆ ไม่มี run เส้นตรงเลย
  // (กันรีเกรสชัน: เดิม hasPossibleMove เช็คแค่ run 3 เส้นตรง จะมองข้ามตาเดินแบบนี้)
  const rows = fillers(rot(0));
  rows[0] = '55230123';
  rows[1] = '54501230';
  setTypes(board, rows);
  ok(match.hasPossibleMove() === true, 'ตาเดินที่สร้าง square 2x2 ล้วนๆ ก็ต้องนับว่า "มีตาเดิน" ด้วย');
}

console.log('--- ลูกกวาดพิเศษ: planClears ---');
{
  setTypes(board, fillers('00001123'));
  const m = match.findMatches();
  const swapCell = board.getCell(0, 0);
  const { clear, spawns } = match.planClears(m, swapCell);
  ok(clear.size === 4, 'เรียง 4 → เคลียร์ 4 ช่อง');
  ok(spawns.length === 1 && spawns[0].special === 'cometH' && spawns[0].cell === swapCell,
    'เรียง 4 แนวนอน → ☄️ ดาวหางแถว เกิดตรงช่องที่สลับ');
}
{
  setTypes(board, fillers('00000123'));
  const m = match.findMatches();
  const { spawns } = match.planClears(m, null);
  ok(spawns.length === 1 && spawns[0].special === 'nova', 'เรียง 5 → 🌟 โนวา');
  ok(spawns[0].cell === board.getCell(2, 0), 'ไม่ได้สลับ → เกิดกลางแถว');
}

{
  // เรียง 4 แนวตั้ง → ☄️ ดาวหางคอลัมน์
  const rr = fillers(rot(0)).map((r) => r.split(''));
  for (let r = 0; r < 4; r++) rr[r][3] = '5';
  setTypes(board, rr.map((row) => row.join('')));
  const m = match.findMatches();
  const { spawns } = match.planClears(m, board.getCell(3, 0));
  ok(spawns.length === 1 && spawns[0].special === 'cometV', 'เรียง 4 แนวตั้ง → ☄️ ดาวหางคอลัมน์');
}
{
  // รูป L (000 นอน + 000 ตั้ง ตัดที่มุม) → 💣 ระเบิดที่จุดตัด
  const rows = fillers('00032103');
  rows[1] = '0' + rot(1).slice(1);
  rows[2] = '0' + rot(2).slice(1);
  setTypes(board, rows);
  const m = match.findMatches();
  const { spawns } = match.planClears(m, null);
  ok(spawns.some((sp) => sp.special === 'bomb' && sp.cell === board.getCell(0, 0)), 'รูป L/T → 💣 ระเบิดที่จุดตัด');
}

console.log('--- ลูกกวาดพิเศษ: Square 2x2 → 🚀 จรวด ---');
{
  // บล็อก 2x2 สีเดียวกัน (คอลัมน์ 0-1, แถว 0-1) โดยไม่มี run 3 เส้นตรงเลย
  const sq = fillers('55234012');
  sq[1] = '55340123';
  setTypes(board, sq);
  const m = match.findMatches();
  const squareGroup = m.find((g) => g.orient === 'square');
  ok(!!squareGroup && squareGroup.type === 5 && squareGroup.length === 4, 'ตรวจพบบล็อก 2x2 เป็น square group ชนิด 5');
  ok(m.every((g) => g.orient === 'square'), 'ไม่มี run เส้นตรงปนมาด้วย (เฉพาะ square เท่านั้น)');

  const { clear, spawns } = match.planClears(m, board.getCell(1, 1));
  ok(clear.size === 4, 'square เคลียร์ 4 ช่อง');
  ok(spawns.length === 1 && spawns[0].special === 'rocket' && spawns[0].cell === board.getCell(1, 1),
    'บล็อก 2x2 → 🚀 จรวด เกิดตรงช่องที่สลับ');
}
{
  // priority: ถ้า square ทับช่องที่ T/L (bomb) ใช้ไปแล้ว ต้องไม่เกิดจรวดซ้ำที่ช่องนั้น (unit-test ตรงที่ planClears)
  setTypes(board, fillers(rot(0)));
  const pivotCell = board.getCell(2, 2);
  const hGroup = { cells: [board.getCell(1, 2), pivotCell, board.getCell(3, 2)], length: 3, type: 0, orient: 'h' };
  const vGroup = { cells: [board.getCell(2, 1), pivotCell, board.getCell(2, 3)], length: 3, type: 0, orient: 'v' };
  const squareGroup = {
    cells: [pivotCell, board.getCell(3, 2), board.getCell(2, 3), board.getCell(3, 3)],
    length: 4, type: 0, orient: 'square',
  };
  const { spawns } = match.planClears([hGroup, vGroup, squareGroup], null);
  const bombCount = spawns.filter((sp) => sp.special === 'bomb').length;
  const rocketCount = spawns.filter((sp) => sp.special === 'rocket').length;
  ok(bombCount === 1 && rocketCount === 0, 'ลำดับความสำคัญ T/L (bomb) มาก่อน square ที่ทับช่องเดียวกัน');
}

console.log('--- ลูกกวาดพิเศษ: expandClears ---');
{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'bomb';
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0.99);
  ok(clear.size === 9 && info.bombs === 1, '💣 กวาด 3x3 = 9 ช่อง (ได้ ' + clear.size + ')');
}
{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'bomb';
  board.getCell(4, 3).candy.special = 'bomb'; // ระเบิดติดกัน → ลูกโซ่
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0.99);
  ok(info.bombs === 2 && clear.size === 12, 'ระเบิดลูกโซ่ กวาด 12 ช่อง (ได้ ' + clear.size + ')');
}
{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'nova';
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0); // สุ่มได้สี 0 เสมอ
  let count0 = 0;
  board.forEachCell((c) => { if (c.candy && c.candy.type === 0 && !c.candy.special) count0++; });
  ok(info.novas === 1 && clear.size === 1 + count0, '🌟 โดนลูกหลง → ล้างสีสุ่มทั้งกระดาน (' + clear.size + ' ช่อง)');
}
{
  setTypes(board, fillers('00032103'));
  board.getCell(1, 0).candy.special = 'nova'; // กลางแถว 000 เป็นโนวา
  ok(match.findMatches().length === 0, 'โนวาไม่จับคู่แบบปกติ');
}

{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'cometH';
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0.99);
  ok(info.comets === 1 && clear.size === 8, '☄️ แนวนอน ล้างทั้งแถว = 8 ช่อง (ได้ ' + clear.size + ')');
}
{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'cometV';
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0.99);
  ok(info.comets === 1 && clear.size === 8, '☄️ แนวตั้ง ล้างทั้งคอลัมน์ = 8 ช่อง (ได้ ' + clear.size + ')');
}

console.log('--- ลูกกวาดพิเศษ: 🚀 จรวด (AI เลือกเป้าหมาย) ---');
{
  setTypes(board, fillers(rot(0)));
  board.getCell(3, 3).candy.special = 'rocket';
  const clear = new Set([board.getCell(3, 3)]);
  const info = match.expandClears(clear, () => 0);
  ok(info.rockets === 1 && clear.size === 2, '🚀 พุ่งไปยังเป้าหมาย 1 ตัว (ได้ ' + clear.size + ' ช่อง)');
}
{
  // AI priority: มีตัวพิเศษอื่นอยู่บนกระดาน → จรวดต้องเลือกตัวพิเศษก่อนเม็ดสุ่มธรรมดา
  setTypes(board, fillers(rot(0)));
  board.getCell(2, 2).candy.special = 'bomb';
  const target = match.pickRocketTarget(null, new Set(), () => 0);
  ok(target === board.getCell(2, 2), 'AI จรวด: เลือกตัวพิเศษก่อนเม็ดสุ่ม (ยังไม่มี Mission/Obstacle)');
}
{
  // ไม่มีตัวพิเศษอื่นเลย → ตกไปเลือกเม็ดสุ่มธรรมดา (ต้องไม่ null)
  setTypes(board, fillers(rot(0)));
  const target = match.pickRocketTarget(board.getCell(0, 0), new Set(), () => 0);
  ok(!!target && !target.candy.special, 'AI จรวด: ไม่มีตัวพิเศษ → เลือกเม็ดสุ่มธรรมดาแทน');
}
{
  setTypes(board, fillers(rot(0)));
  board.getCell(1, 1).candy.special = 'bomb';
  const clear = new Set();
  match.launchRockets(3, null, clear, () => 0.5);
  ok(clear.size === 3, 'launchRockets ยิงจรวดตามจำนวนที่กำหนด ไม่ซ้ำช่อง (ได้ ' + clear.size + ')');
}

console.log('--- ลูกกวาดพิเศษ: โบนัสคะแนน ---');
{
  const score = new ScoreSystem();
  const r = score.addMatchScore(new Array(9).fill({}), { chain: 1, bombs: 1, novas: 0 });
  ok(r.chips === 140 && r.gained === 140, '9 เม็ด + ระเบิด 1 = 140 chips (ได้ ' + r.chips + ')');
  const r2 = score.addMatchScore(new Array(10).fill({}), { chain: 2, bombs: 0, novas: 1 });
  ok(r2.chips === 200 && r2.mult === 1.5 && r2.gained === 300, 'โนวา +100, chain 2 → 300 (ได้ ' + r2.gained + ')');
  const r3 = score.addMatchScore(new Array(5).fill({}), { chain: 1, rockets: 1 });
  ok(r3.chips === 110 && r3.gained === 110, '🚀 จรวด +60 chips (ได้ ' + r3.chips + ')');
}

console.log('--- Effects: พาร์ติเคิล/เลขลอย/จอสั่น (v0.2.4) ---');
{
  const fx = new Effects();
  fx.burst(10, 20, '#ff0000', 8, lcg(1));
  ok(fx.particles.length === 8, 'burst สร้างพาร์ติเคิลครบจำนวน (ได้ ' + fx.particles.length + ')');
  ok(fx.particles.every((p) => p.life === p.maxLife), 'พาร์ติเคิลเริ่มที่ life เต็ม');
}
{
  const fx = new Effects();
  fx.burst(0, 0, '#fff', 3, lcg(2));
  for (let i = 0; i < 60; i++) fx.update(500); // เวลาผ่านไปเกิน maxLife แน่นอน
  ok(fx.particles.length === 0, 'พาร์ติเคิลหมดอายุแล้วถูกลบออกหมด');
}
{
  const fx = new Effects();
  fx.floatText(5, 5, '+80', '#ffd84d');
  ok(fx.floaters.length === 1 && fx.floaters[0].text === '+80', 'floatText สร้างเลขลอยถูกข้อความ');
  const y0 = fx.floaters[0].y;
  fx.update(100);
  ok(fx.floaters[0].y < y0, 'เลขลอยขึ้น (y ลดลง) หลัง update');
  fx.update(1000);
  ok(fx.floaters.length === 0, 'เลขลอยหมดอายุแล้วถูกลบออก');
}
{
  const fx = new Effects();
  ok(fx.shakeOffset.x === 0 && fx.shakeOffset.y === 0, 'ไม่มีจอสั่น = ออฟเซ็ต 0');
  fx.shake(10, 200);
  const off = fx.shakeOffset;
  ok(Math.abs(off.x) <= 10 && Math.abs(off.y) <= 10, 'จอสั่นอยู่ในขอบเขตแอมพลิจูด (ได้ x=' + off.x.toFixed(1) + ')');
  fx.update(200);
  ok(fx.shakeOffset.x === 0 && fx.shakeOffset.y === 0, 'จอสั่นหมดเวลาแล้วออฟเซ็ตกลับเป็น 0');
}
{
  const fx = new Effects();
  fx.shake(5, 300);
  fx.update(250); // เหลือเวลาน้อย → แอมพลิจูดสลายลงมากแล้ว
  fx.shake(20, 300); // สั่นแรงกว่าเข้ามาทับ ต้องชนะ
  ok(fx.shakeMag === 20 && fx.shakeTime === 300, 'จอสั่นที่แรงกว่าทับของเดิมที่กำลังสลายได้');
}

console.log('--- Game Feel (TASK 001) ---');
{
  // burst power: พาร์ติเคิลแรงขึ้นตามตัวคูณ
  const fx = new Effects();
  fx.burst(0, 0, '#fff', 5, lcg(3), 1);
  const v1 = Math.max(...fx.particles.map((p) => Math.hypot(p.vx, p.vy)));
  const fx2 = new Effects();
  fx2.burst(0, 0, '#fff', 5, lcg(3), 2);
  const v2 = Math.max(...fx2.particles.map((p) => Math.hypot(p.vx, p.vy)));
  ok(v2 > v1 * 1.5, 'burst power 2 เร็วกว่า power 1 ชัดเจน');
}
{
  const fx = new Effects();
  fx.floatText(0, 0, 'COMBO x3', '#ffd84d', true);
  ok(fx.floaters[0].big === true && fx.floaters[0].maxLife === 900, 'floatText แบบ big อยู่นานกว่า + ติดธง big');
}
{
  // tween delay: ยังไม่ขยับระหว่างรอ แล้วค่อยวิ่งจนจบ
  const { Animation } = await import('../js/engine/Animation.js');
  const anim = new Animation();
  const obj = { x: 100 };
  let done = false;
  anim.tween(obj, { x: 0 }, 100, undefined, 80).then(() => { done = true; });
  anim.update(50);
  ok(obj.x === 100, 'ระหว่าง delay ค่ายังไม่ขยับ');
  anim.update(50); anim.update(90);
  await new Promise((r) => setTimeout(r, 0));
  ok(obj.x === 0 && done, 'หลัง delay tween วิ่งจนจบปกติ');
}

console.log('--- GemArt: ทรงเจมเอกลักษณ์ (TASK-004) ---');
{
  const { GemArt } = await import('../js/engine/GemArt.js');
  // mask ทรง (สนใจแค่ "มีพิกเซลไหม" ไม่สนสี) — วัดความต่างของ silhouette ล้วนๆ
  const mask = (t) => GemArt.spriteData(t).map((row) => row.map((c) => (c ? 1 : 0)).join('')).join('|');
  const masks = [0, 1, 2, 3, 4, 5].map(mask);
  let allDiff = true;
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
    if (masks[a] === masks[b]) allDiff = false;
  }
  ok(allDiff, 'ทรงทั้ง 6 ไม่ซ้ำกันเลย (เทียบ mask เป็นคู่ทุกคู่)');

  // ความต่างต้อง "มากพอ" ไม่ใช่ต่างแค่พิกเซลเดียว — นับจุดที่ mask ต่างกันขั้นต่ำ 12 จุด
  const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
  let minDiff = Infinity;
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) minDiff = Math.min(minDiff, diffCount(masks[a], masks[b]));
  ok(minDiff >= 12, 'คู่ที่คล้ายสุดยังต่างกัน >= 12 พิกเซล (ได้ ' + minDiff + ')');

  let allValid = true;
  for (let t = 0; t < 6; t++) {
    const g = GemArt.spriteData(t);
    let pixels = 0, outline = 0;
    for (const row of g) for (const c of row) {
      if (c) pixels++;
      if (c === GemArt.OUTLINE) outline++;
    }
    if (pixels < 60 || outline < 16) allValid = false;
  }
  ok(allValid, 'ทุกทรงมีเนื้อ >= 60 px และเปลือก >= 16 px (อ่านออกที่ขนาดเกมจริง)');

  ok(GemArt.PROFILES.length === 6 && GemArt.PROFILES.every((p) => typeof p.shape === 'function'),
    'ทุกเจมมี rendering profile ของตัวเอง (shape function ครบ 6)');
}

console.log('\nผลรวม: ' + pass + ' ผ่าน, ' + fail + ' ไม่ผ่าน');
process.exit(fail > 0 ? 1 : 0);
