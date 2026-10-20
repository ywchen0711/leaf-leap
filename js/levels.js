// LEAF LEAP — the levels of Leafy Land and its world map. Each level is built with a few helpers; y counts up from
// the bottom, and plain ground is two tiles deep (you stand at y = 2).
import { T } from './game.js';

const CH = { X: T.GROUND, B: T.BRICK, '?': T.QCOIN, L: T.QLEAF, F: T.QFLOWER, '1': T.Q1UP, U: T.USED, H: T.HARD, '-': T.CLOUD, N: T.NOTE, v: T.LAVA, o: T.COIN, S: T.STONE, '.': T.EMPTY };
function level(id, name, theme, w, h, build) {
  const tiles = new Uint8Array(w * h), ents = [];
  const lv = { id, name, theme, w, h, tiles, ents, start: [2, 2], goal: null, check: null, checkY: 2 };
  const set = (x, y, t) => { if (x >= 0 && x < w && y >= 0 && y < h) tiles[y * w + x] = t; };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
  build({
    set, fill,
    ground: (x0, x1, top = 2, t = theme === 'fort' || theme === 'castle' ? T.STONE : T.GROUND) => fill(x0, 0, x1, top - 1, t),
    row: (x, y, s) => [...s].forEach((c, i) => { if (c !== ' ') set(x + i, y, CH[c]); }),
    // a pipe two tiles wide, hgt tall, standing on the ground at base (with a biting plant inside, maybe)
    pipe: (x, hgt, plant, base = 2) => { for (let y = base; y < base + hgt - 1; y++) { set(x, y, T.PIPE); set(x + 1, y, T.PIPE); } set(x, base + hgt - 1, T.PIPETOP); set(x + 1, base + hgt - 1, T.PIPETOP); if (plant) ents.push({ t: 'p', x, y: base + hgt }); },
    // steps of hard blocks going up (or down) from the ground
    stairs: (x, n, down = false, base = 2) => { for (let i = 0; i < n; i++) fill(x + i, base, x + i, base + (down ? n - i : i + 1) - 1, T.HARD); },
    e: (t, x, y = 2) => ents.push({ t, x, y }),
    coins: (x, y, n) => { for (let i = 0; i < n; i++) set(x + i, y, T.COIN); },
    start: (x, y = 2) => { lv.start = [x, y]; },
    goal: (x, y = 2.8) => { lv.goal = [x, y]; },
    check: (x, y = 2) => { lv.check = x; lv.checkY = y; },
    arena: (x) => { lv.arena = x; },
  });
  return lv;
}

export const LEVELS = {
  // 1-1: the basics — blocks, walkers, pipes and a couple of small gaps
  '1-1': level('1-1', ['草原小路', 'Meadow Path'], 'grass', 160, 15, (b) => {
    b.ground(0, 44); b.ground(47, 99); b.ground(103, 159);
    b.row(9, 6, '?'); b.row(13, 6, 'B?BLB'); b.row(15, 10, '?');
    b.e('g', 19); b.pipe(23, 2); b.e('g', 28); b.pipe(31, 3); b.e('g', 36); b.e('g', 38);
    b.coins(43, 6, 5);
    b.row(52, 6, 'BBB?BBB'); b.row(55, 10, '?'); b.coins(52, 7, 0);
    b.e('k', 61); b.e('g', 65); b.e('g', 67);
    b.check(71);
    b.stairs(75, 3); b.stairs(78, 3, true); b.coins(75, 7, 6);
    b.e('w', 86); b.row(89, 6, '?F?'); b.e('g', 95);
    b.coins(100, 6, 3);
    b.pipe(110, 2, true); b.e('k', 118); b.row(121, 6, 'BB?BB'); b.coins(121, 9, 5);
    b.e('g', 130); b.e('g', 132);
    b.stairs(138, 4); b.fill(142, 2, 144, 5, T.HARD); b.stairs(145, 4, true);
    b.goal(153);
  }),
  // 1-2: rolling hills — turtles, note blocks and coin arcs
  '1-2': level('1-2', ['起伏山丘', 'Rolling Hills'], 'grass', 170, 15, (b) => {
    b.ground(0, 30); b.ground(31, 50, 4); b.ground(51, 70); b.ground(74, 110); b.ground(111, 125, 4); b.ground(126, 169);
    b.e('g', 14); b.e('k', 22); b.row(18, 6, 'B?B'); b.row(26, 7, 'L');
    b.e('k', 38, 4); b.e('g', 44, 4); b.coins(34, 8, 4);
    b.row(55, 2, 'NNN'); b.coins(55, 9, 3); b.e('k', 62);
    b.coins(71, 6, 3);
    b.check(80);
    b.e('w', 86); b.e('w', 90); b.row(93, 6, 'B?B?B'); b.pipe(100, 3, true);
    b.e('k', 116, 4); b.row(115, 8, '?F?');
    b.e('g', 130); b.e('g', 133); b.e('k', 140);
    b.row(145, 2, 'NN'); b.coins(144, 9, 4);
    b.stairs(152, 3); b.goal(162);
  }),
  // 1-3: sky bridges — clouds to walk on over small gaps, and winged walkers
  '1-3': level('1-3', ['天空雲橋', 'Cloud Bridges'], 'sky', 170, 16, (b) => {
    b.ground(0, 20); b.ground(24, 40); b.ground(44, 60); b.ground(63, 90); b.ground(94, 120); b.ground(123, 169);
    b.row(16, 5, '------'); b.coins(16, 6, 6); b.row(21, 2, '---'); b.e('w', 30); b.row(34, 6, '?L?');
    b.row(40, 2, '----'); b.e('w', 50); b.e('g', 55); b.row(52, 9, '-----'); b.coins(52, 10, 5);
    b.row(60, 2, '---'); b.check(66);
    b.e('k', 72); b.e('w', 80); b.row(76, 6, 'B?BB'); b.row(86, 6, '-----'); b.row(90, 2, '----');
    b.e('w', 102); b.e('w', 108); b.row(98, 5, '1'); b.row(104, 8, '------'); b.coins(104, 9, 6);
    b.row(120, 2, '---'); b.e('g', 130); b.e('k', 138);
    b.stairs(150, 3); b.goal(160);
  }),
  // 1-4: the pipe maze — biting plants and pipes to hop across
  '1-4': level('1-4', ['水管森林', 'Pipe Grove'], 'grass', 160, 15, (b) => {
    b.ground(0, 159);
    b.pipe(14, 2); b.pipe(20, 3, true); b.e('g', 25); b.pipe(29, 2, true); b.row(33, 6, '?F?'); b.e('g', 38);
    b.pipe(43, 4); b.coins(43, 7, 2); b.pipe(49, 3, true); b.e('k', 55);
    b.check(62);
    b.pipe(66, 2, true); b.pipe(72, 3); b.e('w', 78); b.pipe(84, 2, true); b.row(88, 6, 'BLB');
    b.pipe(94, 3, true); b.pipe(100, 4); b.coins(100, 8, 2); b.e('g', 106); b.e('g', 108);
    b.pipe(114, 2, true); b.pipe(120, 3, true); b.e('k', 126); b.pipe(132, 2);
    b.stairs(140, 3); b.goal(152);
  }),
  // 1-F: the fortress — stone halls, small lava pits, and a stomping brute at the end
  '1-F': level('1-F', ['石頭堡壘', 'Stone Fortress'], 'fort', 120, 15, (b) => {
    b.ground(0, 119); b.fill(0, 12, 119, 14, T.STONE);
    b.fill(18, 0, 19, 1, T.LAVA); b.fill(34, 0, 36, 1, T.LAVA); b.fill(56, 0, 57, 1, T.LAVA); b.fill(70, 0, 72, 1, T.LAVA);
    for (const x of [18, 19, 34, 35, 36, 56, 57, 70, 71, 72]) b.set(x, 1, T.LAVA);
    b.e('g', 12); b.row(24, 6, 'BFB'); b.e('k', 28); b.fill(42, 2, 43, 4, T.STONE); b.e('g', 48); b.e('g', 50);
    b.check(53); b.row(62, 6, '?L?'); b.e('k', 66); b.fill(78, 9, 82, 11, T.STONE);
    // the brute's hall
    b.fill(88, 7, 88, 11, T.STONE); b.e('B', 104); b.arena(90); b.fill(118, 2, 119, 11, T.STONE);
  }),
  // 1-5: the cave — a low ceiling, brick rows and turtles
  '1-5': level('1-5', ['地底洞窟', 'Underground Cave'], 'cave', 160, 15, (b) => {
    b.ground(0, 50); b.ground(53, 100); b.ground(104, 159); b.fill(0, 12, 159, 14, T.BRICK);
    b.e('g', 14); b.row(10, 6, '?L??'); b.row(20, 6, 'BBBBBB'); b.coins(20, 7, 6); b.e('k', 28); b.e('g', 32);
    b.pipe(38, 3, true); b.e('g', 44); b.coins(50, 5, 4);
    b.check(58); b.row(62, 7, 'BB?BB?BB'); b.e('k', 66); b.e('k', 74); b.stairs(80, 3); b.stairs(83, 3, true);
    b.e('g', 90); b.e('g', 92); b.row(95, 6, 'F'); b.coins(100, 5, 5);
    b.e('k', 110); b.pipe(116, 2, true); b.row(122, 6, 'B1B'); b.e('g', 128); b.e('w', 134);
    b.stairs(140, 3); b.goal(152);
  }),
  // 1-6: the cloud gym — note blocks and clouds, high above the trees
  '1-6': level('1-6', ['雲上運動場', 'Sky Gym'], 'sky', 170, 18, (b) => {
    b.ground(0, 18); b.ground(22, 34); b.ground(38, 52); b.ground(55, 75); b.ground(79, 96); b.ground(99, 118); b.ground(121, 140); b.ground(143, 169);
    b.row(19, 2, '---'); b.row(26, 5, 'NNN'); b.coins(26, 9, 3); b.e('w', 30); b.row(35, 2, '---');
    b.row(42, 6, '?L?'); b.e('k', 47); b.row(52, 3, '---'); b.e('w', 62); b.e('w', 68); b.row(60, 9, '------'); b.coins(60, 10, 6);
    b.check(81); b.row(76, 2, '---'); b.row(84, 5, 'N N N'); b.coins(84, 10, 5); b.e('g', 92);
    b.row(97, 2, '--'); b.e('k', 106); b.row(110, 6, 'BFB'); b.row(118, 3, '---'); b.e('w', 126); b.e('w', 132);
    b.row(140, 2, '---'); b.e('g', 150); b.stairs(155, 3); b.goal(163);
  }),
  // 1-C: the Turtle King's castle — lava, stone, and the king himself
  '1-C': level('1-C', ['龜王城', 'Turtle King Castle'], 'castle', 140, 15, (b) => {
    b.ground(0, 139); b.fill(0, 12, 139, 14, T.STONE);
    for (const [x0, x1] of [[16, 18], [30, 32], [46, 48], [60, 62], [78, 80]]) { b.fill(x0, 0, x1, 1, T.LAVA); }
    b.e('k', 12); b.row(22, 6, 'BLB'); b.e('g', 26); b.fill(36, 2, 38, 3, T.STONE); b.e('k', 42);
    b.check(52); b.row(55, 6, '?F?'); b.e('w', 58); b.fill(66, 2, 67, 4, T.STONE); b.e('g', 72); b.e('g', 74); b.row(84, 6, '?1?');
    b.fill(96, 6, 96, 11, T.STONE); b.e('K', 124); b.arena(98); b.fill(138, 2, 139, 11, T.STONE);
  }),
};

// the world map: the path from node to node, in order; houses never block the way
export const MAP = {
  name: ['葉葉國', 'Leafy Land'],
  nodes: [
    { id: 'start', kind: 'start', x: 1, y: 7 },
    { id: '1-1', kind: 'level', x: 3, y: 7, label: '1' },
    { id: '1-2', kind: 'level', x: 5, y: 7, label: '2' },
    { id: '1-3', kind: 'level', x: 7, y: 7, label: '3' },
    { id: 'house', kind: 'house', x: 7, y: 5 },
    { id: '1-4', kind: 'level', x: 5, y: 5, label: '4' },
    { id: '1-F', kind: 'fort', x: 3, y: 5 },
    { id: '1-5', kind: 'level', x: 3, y: 3, label: '5' },
    { id: '1-6', kind: 'level', x: 5, y: 3, label: '6' },
    { id: '1-C', kind: 'castle', x: 8, y: 3 },
  ],
};
