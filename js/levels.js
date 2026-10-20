// LEAF LEAP 3D — the levels of Leafy Land and its world map. Each level is a grid of blocks built with a few helpers:
// x runs along the course, z is depth (side to side), y counts up; plain ground is two blocks deep (you stand at y = 2).
import { T } from './game.js';

const CH = { X: T.GROUND, B: T.BRICK, '?': T.QCOIN, L: T.QLEAF, F: T.QFLOWER, '1': T.Q1UP, U: T.USED, H: T.HARD, '-': T.CLOUD, N: T.NOTE, v: T.LAVA, o: T.COIN, S: T.STONE, '.': T.EMPTY };
function level(id, name, theme, w, d, h, build) {
  const tiles = new Uint8Array(w * h * d), ents = [], mid = Math.floor(d / 2);
  const lv = { id, name, theme, w, h, d, tiles, ents, start: [2, 2, mid], goal: null, check: null, path: [], camYaw: 0, arena: null, pipes: [] };
  const set = (x, y, z, t) => { if (x >= 0 && x < w && y >= 0 && y < h && z >= 0 && z < d) tiles[(y * d + z) * w + x] = t; };
  const fill = (x0, y0, z0, x1, y1, z1, t) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, t); };
  const stone = theme === 'fort' || theme === 'castle';
  build({
    mid, set, fill,
    // a slab of ground, solid from the bottom up to top - 1
    ground: (x0, x1, z0 = 0, z1 = d - 1, top = 2, t = stone || theme === 'cave' ? T.STONE : T.GROUND) => fill(x0, 0, z0, x1, top - 1, z1, t),
    hole: (x0, x1, z0 = 0, z1 = d - 1) => fill(x0, 0, z0, x1, h - 1, z1, T.EMPTY),
    lava: (x0, x1, z0 = 0, z1 = d - 1) => { fill(x0, 0, z0, x1, h - 1, z1, T.EMPTY); fill(x0, 0, z0, x1, 0, z1, T.LAVA); },
    row: (x, y, z, s, axis = 'x') => [...s].forEach((c, i) => { if (c !== ' ') { if (axis === 'x') set(x + i, y, z, CH[c]); else set(x, y, z + i, CH[c]); } }),
    // a pipe two blocks square and hgt tall, standing on the ground at base (with a biting plant inside, maybe)
    pipe: (x, z, hgt, plant, base = 2) => { fill(x, base, z, x + 1, base + hgt - 2, z + 1, T.PIPE); fill(x, base + hgt - 1, z, x + 1, base + hgt - 1, z + 1, T.PIPETOP); lv.pipes.push({ x, z, base, hgt }); if (plant) ents.push({ t: 'p', x, y: base + hgt, z }); },
    // steps of hard blocks going up (or down) along x, across z0..z1
    stairs: (x, z0, z1, n, down = false, base = 2) => { for (let i = 0; i < n; i++) fill(x + i, base, z0, x + i, base + (down ? n - i : i + 1) - 1, z1, T.HARD); },
    coins: (x, y, z, n, axis = 'x') => { for (let i = 0; i < n; i++) set(axis === 'x' ? x + i : x, y, axis === 'x' ? z : z + i, T.COIN); },
    ring: (cx, y, cz, r = 2) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; set(Math.round(cx + Math.cos(a) * r), y, Math.round(cz + Math.sin(a) * r), T.COIN); } },
    e: (t, x, z, y = 2) => ents.push({ t, x, y, z }),
    start: (x, z = mid, y = 2) => { lv.start = [x, y, z]; },
    goal: (x, z = mid, y = 2.8) => { lv.goal = [x, y, z]; },
    check: (x, z = mid, y = 2) => { lv.check = [x, y, z]; },
    way: (x, z) => lv.path.push([x, z]),
    arena: (x) => { lv.arena = x; },
    cam: (yaw) => { lv.camYaw = yaw; },
  });
  if (!lv.path.length) lv.path.push([w, mid]);
  // indoors, the camera stays under the ceiling
  if (theme === 'cave') lv.ceil = 10; else if (stone) lv.ceil = 11;
  return lv;
}

export const LEVELS = {
  // 1-1: the basics — blocks, Mushlings, pipes and a couple of pits
  '1-1': level('1-1', ['草原小路', 'Meadow Path'], 'grass', 130, 12, 16, (b) => {
    const m = b.mid;
    b.ground(0, 129); b.hole(38, 40); b.hole(86, 88);
    b.ground(14, 20, 8, 11, 4); b.coins(14, 4, 9, 7); b.ground(60, 66, 0, 3, 4); b.ring(63, 5, 1.5, 1.4);
    b.row(9, 6, m, '?'); b.row(14, 6, m, 'B?BLB'); b.row(16, 10, m, '?');
    b.e('g', 21, m); b.pipe(25, m - 1, 2); b.e('g', 28, 3); b.pipe(32, 8, 3); b.e('g', 34, m + 2); b.e('g', 35, m);
    b.coins(37, 6, m, 5);
    b.row(46, 6, m, 'BB?BB'); b.row(48, 10, m, '1'); b.e('k', 52, m); b.e('g', 56, 3); b.e('g', 57, 8);
    b.check(58);
    b.stairs(72, 0, 11, 3); b.stairs(75, 0, 11, 3, true); b.coins(72, 7, m, 6); b.e('w', 80, m); b.row(81, 6, m, '?F?');
    b.coins(85, 6, m, 5); b.pipe(94, 3, 2, true); b.e('k', 100, m + 2); b.row(104, 6, m, 'BB?BB'); b.ring(106, 9, m, 2);
    b.e('g', 108, 4); b.e('g', 109, 7);
    b.stairs(113, 0, 11, 4); b.fill(117, 2, 0, 118, 5, 11, T.HARD); b.goal(124);
  }),
  // 1-2: rolling hills — terraces, turtles and a note-block pad
  '1-2': level('1-2', ['起伏山丘', 'Rolling Hills'], 'grass', 140, 12, 16, (b) => {
    const m = b.mid;
    b.ground(0, 139); b.ground(30, 50, 0, 11, 4); b.ground(36, 44, 0, 4, 6); b.coins(37, 7, 2, 7);
    b.e('g', 14, m); b.e('k', 22, m); b.row(18, 6, m, 'B?B'); b.row(26, 7, m, 'L');
    b.e('k', 40, 8, 4); b.e('g', 46, m, 4); b.hole(55, 57);
    b.fill(62, 1, 2, 66, 1, 8, T.NOTE); b.coins(62, 9, m, 5); b.e('k', 70, m);
    b.check(78);
    b.e('w', 84, 4); b.e('w', 88, 8); b.row(92, 6, m, 'B?B?B'); b.pipe(98, m - 1, 3, true);
    b.ground(104, 118, 0, 11, 4); b.e('k', 110, 4, 4); b.row(110, 8, m, '?F?'); b.hole(120, 121);
    b.e('g', 126, m); b.e('g', 128, 3);
    b.stairs(130, 0, 11, 3); b.goal(135);
  }),
  // 1-3: sky islands — clouds bridge some gaps, winged Mushlings flutter about
  '1-3': level('1-3', ['天空雲橋', 'Cloud Bridges'], 'sky', 130, 10, 18, (b) => {
    const m = b.mid;
    b.ground(0, 18, 1, 8); b.ground(22, 38, 1, 8); b.ground(42, 58, 1, 8); b.ground(62, 84, 1, 8); b.ground(88, 104, 1, 8); b.ground(108, 129, 1, 8);
    b.fill(19, 1, 3, 21, 1, 6, T.CLOUD); b.fill(59, 1, 3, 61, 1, 6, T.CLOUD); b.fill(105, 1, 3, 107, 1, 6, T.CLOUD);
    b.fill(12, 6, 3, 17, 6, 6, T.CLOUD); b.coins(12, 7, m, 6); b.e('w', 30, m); b.row(33, 6, m, '?L?');
    b.e('w', 48, 3); b.e('g', 52, m); b.fill(46, 9, 3, 51, 9, 6, T.CLOUD); b.coins(46, 10, m, 6);
    b.check(66); b.e('k', 72, m); b.e('w', 78, 6); b.row(74, 6, m, 'B?BB'); b.ring(82, 7, m, 2);
    b.e('w', 94, m); b.e('w', 99, 3); b.row(96, 6, m, '1'); b.fill(98, 8, 3, 103, 8, 6, T.CLOUD); b.coins(98, 9, m, 6);
    b.e('g', 114, m); b.e('k', 118, 6); b.stairs(120, 1, 8, 3); b.goal(126);
  }),
  // 1-4: the pipe grove — biting plants and pipes to hop across
  '1-4': level('1-4', ['水管森林', 'Pipe Grove'], 'grass', 130, 12, 16, (b) => {
    const m = b.mid;
    b.ground(0, 129);
    b.pipe(12, m - 1, 2); b.pipe(18, 2, 3, true); b.pipe(18, 8, 3, true); b.e('g', 24, m); b.pipe(28, m - 1, 2, true); b.row(32, 6, m, '?F?'); b.e('g', 36, 3);
    b.pipe(40, m - 1, 3); b.coins(40, 6, m, 2); b.pipe(46, 1, 3, true); b.pipe(46, 9, 3, true); b.e('k', 52, m);
    b.check(58);
    b.pipe(62, m - 1, 2, true); b.pipe(68, 3, 3); b.pipe(68, 7, 3); b.e('w', 74, m); b.pipe(80, m - 1, 2, true); b.row(84, 6, m, 'BLB');
    b.pipe(90, m - 1, 3, true); b.pipe(96, m - 1, 3); b.coins(96, 7, m, 2); b.e('g', 102, 4); b.e('g', 103, 7);
    b.pipe(108, m - 1, 2, true); b.e('k', 114, m);
    b.stairs(118, 0, 11, 3); b.goal(125);
  }),
  // 1-F: the fortress — stone halls, small lava pits, and a stomping brute at the end
  '1-F': level('1-F', ['石頭堡壘', 'Stone Fortress'], 'fort', 110, 10, 14, (b) => {
    const m = b.mid;
    b.ground(0, 109); b.fill(0, 11, 0, 109, 13, 9, T.STONE);
    b.lava(18, 19); b.lava(34, 36); b.lava(56, 57); b.lava(70, 72);
    b.e('g', 12, m); b.row(24, 6, m, 'BFB'); b.e('k', 28, m); b.fill(42, 2, 0, 43, 4, 5, T.STONE); b.e('g', 48, 3); b.e('g', 50, 7);
    b.check(52); b.row(62, 6, m, '?L?'); b.e('k', 66, m); b.fill(78, 8, 0, 82, 10, 9, T.STONE);
    // the brute's hall
    b.fill(86, 7, 0, 86, 10, 9, T.STONE); b.e('B', 100, m); b.arena(90);
  }),
  // 1-5: the cave — a low ceiling, brick rows and turtles
  '1-5': level('1-5', ['地底洞窟', 'Underground Cave'], 'cave', 130, 10, 14, (b) => {
    const m = b.mid;
    b.ground(0, 129); b.hole(44, 46); b.hole(88, 90); b.fill(0, 10, 0, 129, 13, 9, T.BRICK);
    b.e('g', 14, m); b.row(10, 6, m, '?L??'); b.fill(20, 6, 2, 25, 6, 7, T.BRICK); b.coins(20, 7, m, 6); b.e('k', 28, m); b.e('g', 32, 3);
    b.pipe(36, m - 1, 3, true); b.e('g', 40, 7); b.coins(43, 5, m, 4);
    b.check(50); b.row(54, 6, m, 'BB?BB?BB'); b.e('k', 58, 3); b.e('k', 64, 7); b.stairs(70, 0, 9, 3); b.stairs(73, 0, 9, 3, true);
    b.e('g', 80, m); b.e('g', 82, 3); b.row(84, 6, m, 'F'); b.coins(87, 5, m, 5);
    b.e('k', 96, m); b.pipe(102, m - 1, 2, true); b.row(108, 6, m, 'B1B'); b.e('g', 112, 4); b.e('w', 116, m);
    b.stairs(118, 0, 9, 3); b.goal(125);
  }),
  // 1-6: the sky gym — note blocks and clouds, high above the trees
  '1-6': level('1-6', ['雲上運動場', 'Sky Gym'], 'sky', 140, 10, 18, (b) => {
    const m = b.mid;
    b.ground(0, 16, 1, 8); b.ground(20, 32, 1, 8); b.ground(36, 50, 1, 8); b.ground(53, 72, 1, 8); b.ground(76, 92, 1, 8); b.ground(95, 112, 1, 8); b.ground(115, 139, 1, 8);
    b.fill(17, 1, 3, 19, 1, 6, T.CLOUD); b.fill(24, 2, 3, 27, 2, 6, T.NOTE); b.coins(24, 9, m, 4); b.e('w', 30, m); b.fill(33, 1, 3, 35, 1, 6, T.CLOUD);
    b.row(40, 6, m, '?L?'); b.e('k', 45, m); b.fill(51, 1, 3, 52, 1, 6, T.CLOUD); b.e('w', 60, 3); b.e('w', 66, 6); b.fill(58, 9, 3, 63, 9, 6, T.CLOUD); b.coins(58, 10, m, 6);
    b.check(78); b.fill(73, 1, 3, 75, 1, 6, T.CLOUD); b.fill(82, 2, 2, 86, 2, 7, T.NOTE); b.coins(82, 10, m, 5); b.e('g', 90, m);
    b.fill(93, 1, 3, 94, 1, 6, T.CLOUD); b.e('k', 102, m); b.row(106, 6, m, 'BFB'); b.fill(113, 1, 3, 114, 1, 6, T.CLOUD); b.e('w', 122, m); b.e('w', 127, 3);
    b.e('g', 132, m); b.stairs(133, 1, 8, 3); b.goal(138);
  }),
  // 1-C: the Turtle King's castle — lava, stone, and the king himself
  '1-C': level('1-C', ['龜王城', 'Turtle King Castle'], 'castle', 120, 10, 14, (b) => {
    const m = b.mid;
    b.ground(0, 119); b.fill(0, 11, 0, 119, 13, 9, T.STONE);
    for (const x0 of [16, 30, 46, 60, 78]) b.lava(x0, x0 + 1);
    b.row(22, 6, m, 'BLB'); b.e('g', 26, m); b.fill(36, 2, 0, 38, 3, 9, T.STONE); b.e('k', 42, 3);
    b.check(52); b.row(55, 6, m, '?F?'); b.e('w', 57, m); b.fill(66, 2, 0, 67, 4, 4, T.STONE); b.fill(66, 2, 6, 67, 4, 9, T.STONE); b.e('g', 72, 3); b.e('g', 74, 7); b.row(84, 6, m, '?1?');
    b.fill(92, 6, 0, 92, 10, 9, T.STONE); b.e('K', 108, m - 1); b.arena(96);
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
