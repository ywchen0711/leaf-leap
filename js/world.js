// LEAF LEAP 3D — Leafy Land as one open world. A 256 × 256 island of hills, beaches, forest and a snowy mountain,
// with every course from the old world map set into it where it belongs: the meadow path, the rolling hills and the
// pipe grove on the ground; the cloud bridges and the sky gym up in the sky (cloud stairs climb to them); the coral
// bay under the sea; the cave tunnelling through the mountain; the fortress inside a castle in a lava moat; and the
// airship, waiting above the sea for a cloud stair that only appears once the fortress has fallen.
// Mushroom Village in the west has the Mushroom Houses, the spade panel and a row of warp pipes to every course.
import { T } from './game.js';
import { LEVELS } from './levels.js';

export const W = 256, D = 256, H = 72, GY = 17, SEA = 16;   // you stand at y = GY on flat land; water fills up to y = SEA
// where each course is set: its corner in the world and how high its ground sits
export const COURSES = {
  '1-1': { ox: 26, oz: 132, oy: GY - 2, region: ['草原小路', 'Meadow Path'] },
  '1-2': { ox: 44, oz: 36, oy: GY - 2, region: ['起伏山丘', 'Rolling Hills'] },
  '1-4': { ox: 112, oz: 90, oy: GY - 2, region: ['水管森林', 'Pipe Grove'] },
  '1-3': { ox: 64, oz: 112, oy: 33, region: ['天空雲橋', 'Cloud Bridges'] },
  '1-6': { ox: 92, oz: 58, oy: 46, region: ['雲上運動場', 'Sky Gym'] },
  '1-W': { ox: 44, oz: 200, oy: GY - 12, region: ['海底灣', 'Coral Bay'] },
  '1-5': { ox: 112, oz: 16, oy: GY - 2, region: ['地底洞窟', 'Underground Cave'], inside: 'mountain' },
  '1-F': { ox: 140, oz: 160, oy: GY - 2, region: ['石頭堡壘', 'Stone Fortress'], inside: 'castle' },
  '1-A': { ox: 136, oz: 230, oy: 40, region: ['飛行船', 'The Airship'] },
};
export const ORDER = ['1-1', '1-2', '1-3', '1-4', '1-F', '1-W', '1-5', '1-6', '1-A'];

// ---------------------------------------------------------------- a little noise for the land
function hash2(x, z, s) { let h = (x * 374761393 + z * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, z, s) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, z, s) => noise(x, z, s) * 0.55 + noise(x * 2.1, z * 2.1, s + 7) * 0.3 + noise(x * 4.3, z * 4.3, s + 13) * 0.15;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function buildWorld() {
  const tiles = new Uint8Array(W * H * D), idx = (x, y, z) => (y * D + z) * W + x;
  const inb = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
  const get = (x, y, z) => (inb(x, y, z) ? tiles[idx(x, y, z)] : T.EMPTY);
  const set = (x, y, z, t) => { if (inb(x, y, z)) tiles[idx(x, y, z)] = t; };
  const fill = (x0, y0, z0, x1, y1, z1, t) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, t); };
  const W0 = { w: W, h: H, d: D, tiles, ents: [], goals: [], checks: [], pipes: [], warps: [], doors: [], signs: [], flags: [], world: true, theme: 'grass', start: [20, GY, 112], stairs: {}, regions: [] };
  const rnd = mulberry(20241024);

  // ---------------------------------------------------------------- the lie of the land
  const rects = Object.entries(COURSES).map(([id, c]) => ({ id, ...c, w: LEVELS[id].w, d: LEVELS[id].d, h: LEVELS[id].h }));
  const outside = (x, z, r, m) => { const dx = Math.max(r.ox - m - x, 0, x - (r.ox + r.w - 1 + m)), dz = Math.max(r.oz - m - z, 0, z - (r.oz + r.d - 1 + m)); return Math.hypot(dx, dz); };
  const heightMap = new Int16Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const n = fbm(x / 38, z / 38, 1), edge = Math.min(x, z, W - 1 - x, D - 1 - z);
    let h = GY + Math.round(n * 3.2);                                   // the meadow: gentle swells
    h += Math.round(smooth(80, 30, z) * fbm(x / 22, z / 22, 4) * 7);     // the hills to the north
    // the mountain in the north-east, high enough to hold the cave
    const mx = smooth(96, 118, x) * smooth(48, 30, z), ridge = 1 - Math.abs(noise(x / 26, z / 26, 9) * 2 - 1);
    h += Math.round(mx * (16 + ridge * 14));
    // the south coast: down to the sea bed of the bay
    const coast = smooth(178, 196, z); h = Math.round(h + (9 + n * 3 - h) * coast);
    // and the island's shores all round
    const shore = smooth(13, 2, edge); h = Math.round(h + (8 - h) * shore);
    // flat where the ground courses run, blending into the hills around them
    for (const r of rects) if (!r.inside && r.oy === GY - 2) { const o = outside(x, z, r, 3); if (o < 10) h = Math.round(GY + (h - GY) * smooth(0, 10, o)); }
    // the village and the castle grounds are flat
    { const o = Math.hypot(Math.max(0, x - 42), Math.max(0, 86 - z, z - 130)); if (o < 12) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    { const o = Math.hypot(Math.max(0, 128 - x), Math.max(0, 148 - z, z - 196)); if (o < 12 && coast < 0.6) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    heightMap[z * W + x] = h;
  }
  // the courses set in the mountain need it to be solid above them
  for (const r of rects) if (r.inside === 'mountain') for (let z = r.oz - 3; z < r.oz + r.d + 3; z++) for (let x = r.ox - 2; x < Math.min(W - 6, r.ox + r.w + 2); x++) heightMap[z * W + x] = Math.max(heightMap[z * W + x], r.oy + r.h + 4);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = heightMap[z * W + x], sandy = h <= SEA + 1 && (z > 170 || Math.min(x, z, W - 1 - x, D - 1 - z) < 16);
    for (let y = 0; y < h; y++) set(x, y, z, y < h - 4 ? T.STONE : sandy ? T.SAND : y >= 40 && y === h - 1 ? T.SNOW : h > 36 && y < h - 1 ? T.STONE : T.GROUND);
    for (let y = h; y <= SEA; y++) set(x, y, z, T.WATER);
  }

  // ---------------------------------------------------------------- the castle and its lava moat, before the fortress goes in
  { const r = rects.find((q) => q.id === '1-F'), x0 = r.ox - 4, x1 = r.ox + r.w + 3, z0 = r.oz - 4, z1 = r.oz + r.d + 3;
    for (let z = z0 - 5; z <= z1 + 5; z++) for (let x = x0 - 5; x <= x1 + 5; x++) { if (x >= x0 && x <= x1 && z >= z0 && z <= z1) continue; fill(x, 1, z, x, GY - 2, z, T.STONE); set(x, GY - 1, z, T.LAVA); fill(x, GY, z, x, H - 1, z, T.EMPTY); }
    fill(x0, 1, z0, x1, r.oy + r.h + 3, z1, T.STONE);
    for (let x = x0; x <= x1; x += 2) { set(x, r.oy + r.h + 4, z0, T.STONE); set(x, r.oy + r.h + 4, z1, T.STONE); }
    for (let z = z0; z <= z1; z += 2) { set(x0, r.oy + r.h + 4, z, T.STONE); set(x1, r.oy + r.h + 4, z, T.STONE); }
    // the drawbridge over the moat, and the gate into the fortress
    fill(x0 - 6, GY - 1, r.oz + 3, x0 - 1, GY - 1, r.oz + r.d - 4, T.PLANK);
    fill(x0, GY, r.oz + 2, r.ox - 1, GY + 3, r.oz + r.d - 3, T.EMPTY); fill(x0, GY - 2, r.oz + 2, r.ox - 1, GY - 1, r.oz + r.d - 3, T.STONE);
    W0.castle = { x0, x1, z0, z1, top: r.oy + r.h + 4 };
  }
  // the tunnel into the mountain, to the cave
  { const r = rects.find((q) => q.id === '1-5'); for (let x = r.ox - 16; x < r.ox; x++) { fill(x, GY, r.oz + 2, x, GY + 5, r.oz + r.d - 3, T.EMPTY); fill(x, GY - 2, r.oz + 2, x, GY - 1, r.oz + r.d - 3, T.STONE); } }

  // ---------------------------------------------------------------- set the courses in
  for (const r of rects) {
    const L = LEVELS[r.id];
    for (let z = 0; z < L.d; z++) for (let x = 0; x < L.w; x++) {
      const wx = x + r.ox, wz = z + r.oz;
      for (let y = 0; y < L.h; y++) { let t = L.tiles[(y * L.d + z) * L.w + x]; if (r.id === '1-W' && t === T.GROUND) t = T.SAND; if (t === T.EMPTY && !r.inside && y + r.oy <= SEA && r.id !== '1-W') t = get(wx, y + r.oy, wz) === T.WATER ? T.WATER : T.EMPTY; set(wx, y + r.oy, wz, t); }
      // under the course: a pit where the course has a hole (all the way down), solid ground where it has ground
      const bottom = L.tiles[(0 * L.d + z) * L.w + x];
      if (r.oy > 0 && (r.oy <= GY)) for (let y = 0; y < r.oy; y++) set(wx, y, wz, bottom === T.EMPTY ? T.EMPTY : r.id === '1-W' ? T.SAND : T.STONE);
      // over open courses on the ground, nothing hangs above (the hills were flattened); in the sky, nothing below is touched
      if (!r.inside && r.oy <= GY) for (let y = r.oy + L.h; y < H; y++) set(wx, y, wz, T.EMPTY);
    }
    // the water course's sea runs on beyond its own walls
    for (const e of L.ents) W0.ents.push({ ...e, x: e.x + r.ox, y: e.y + r.oy, z: e.z + r.oz, region: r.id });
    for (const p of L.pipes) W0.pipes.push({ x: p.x + r.ox, z: p.z + r.oz, base: p.base + r.oy, hgt: p.hgt });
    if (L.goal) W0.goals.push({ x: L.goal[0] + r.ox, y: L.goal[1] + r.oy, z: L.goal[2] + r.oz, w: 1, h: 1, d: 1, z0: r.oz, z1: r.oz + L.d, region: r.id });
    if (L.check) W0.checks.push({ x: L.check[0] + r.ox, y: L.check[1] + r.oy, z: L.check[2] + r.oz, z0: r.oz, z1: r.oz + L.d, region: r.id });
    W0.checks.push({ x: L.start[0] + r.ox, y: L.start[1] + r.oy, z: L.start[2] + r.oz, z0: r.oz, z1: r.oz + L.d, region: r.id, start: true });
    W0.regions.push({ id: r.id, name: r.region, theme: L.theme, box: [r.ox - 3, r.oy - 3, r.oz - 3, r.ox + L.w + 3, r.oy + L.h + 4, r.oz + L.d + 3] });
  }
  // shores of the bay course meet the beach
  const surf = (x, z) => { for (let y = H - 1; y >= 0; y--) { const t = get(x, y, z); if (t !== T.EMPTY && t !== T.WATER && t !== T.COIN) return y + 1; } return 0; };

  // ---------------------------------------------------------------- pipes, warps and signs
  const pipe = (x, z, base, hgt, warp) => { fill(x, base, z, x + 1, base + hgt - 2, z + 1, T.PIPE); fill(x, base + hgt - 1, z, x + 1, base + hgt - 1, z + 1, T.PIPETOP); const p = { x, z, base, hgt, warp }; W0.pipes.push(p); if (warp) W0.warps.push(p); return p; };
  const clearAbove = (x0, z0, x1, z1, y0) => fill(x0, y0, z0, x1, Math.min(H - 1, y0 + 6), z1, T.EMPTY);
  // every course: a pipe by the start (back to the village) and one after the goal
  for (const r of rects) {
    const L = LEVELS[r.id], sx = L.start[0] + r.ox, sz = L.start[2] + r.oz, sy = L.start[1] + r.oy;
    let px, pz, pb;
    if (r.oy <= GY && !r.inside && r.id !== '1-W') { px = r.ox - 5; pz = sz - 1; pb = surf(px, pz); fill(px - 1, GY - 1, pz - 1, px + 2, pb - 1, pz + 2, T.GROUND); pb = surf(px, pz); }
    else if (r.id === '1-W') { px = r.ox + 4; pz = r.oz + 1; pb = sy; }
    else if (r.inside === 'mountain') { px = r.ox - 20; pz = sz - 1; pb = surf(px, pz); }
    else if (r.inside === 'castle') { px = W0.castle.x0 - 12; pz = sz - 1; pb = surf(px, pz); }
    else { px = r.ox; pz = r.oz + 1; pb = sy; }
    clearAbove(px, pz, px + 1, pz + 1, pb);
    pipe(px, pz, pb, 2, { kind: 'home', region: r.id });
    W0.signs.push({ x: px + 1, y: pb + 2.6, z: pz + 1, text: r.region, id: r.id });
    // after the goal (or beside the boss), a pipe home
    const gx = (L.goal ? Math.min(L.w - 2, L.goal[0] + 4) : L.w - 6) + r.ox, gz = r.oz + 1, gb = r.inside ? r.oy + 2 : surf(gx, gz);
    if (gb > 0 && gx < W - 2) { clearAbove(gx, gz, gx + 1, gz + 1, gb); pipe(gx, gz, gb, 2, { kind: 'home', region: r.id, end: true }); }
  }
  // the village: a row of warp pipes, one to each course (they open once you have been there)
  ORDER.forEach((id, i) => { const x = 4 + i * 3, z = 122; pipe(x, z, GY, 2, { kind: 'to', region: id }); W0.signs.push({ x: x + 1, y: GY + 2.6, z: z + 1, text: COURSES[id].region, id, hub: true }); });

  // ---------------------------------------------------------------- Mushroom Village
  const house = (x0, z0, id, roofT = T.ROOF) => {
    fill(x0, GY, z0, x0 + 6, GY + 3, z0 + 5, T.WALL); fill(x0 + 1, GY, z0 + 1, x0 + 5, GY + 3, z0 + 4, T.EMPTY);
    for (let k = 0; k < 4; k++) fill(x0 - 1 + k, GY + 4 + k, z0 - 1 + k, x0 + 7 - k, GY + 4 + k, z0 + 6 - k, roofT);
    // the door, facing south onto the square
    fill(x0 + 3, GY, z0 + 5, x0 + 3, GY + 1, z0 + 5, T.EMPTY); set(x0 + 3, GY + 2, z0 + 5, T.HARD); set(x0 + 2, GY + 1, z0 + 5, T.HARD); set(x0 + 4, GY + 1, z0 + 5, T.HARD);
    if (id) W0.doors.push({ x: x0 + 3, y: GY, z: z0 + 5, id });
  };
  house(8, 94, 'house'); house(30, 92, null, T.HARD); house(18, 94, null, T.BRICK);
  house(36, 56, 'house2');
  // the spade panel: a green square to step on
  fill(24, GY - 1, 104, 27, GY - 1, 107, T.SPADE); W0.spade = { x0: 24, z0: 104, x1: 27, z1: 107 };
  W0.signs.push({ x: 25.9, y: GY + 2.2, z: 103.5, text: ['黑桃翻牌', 'Spade Panel'] });
  // a fence round the square, a few ? blocks to try, and a tutorial row of coins
  for (let x = 2; x < 40; x += 2) { set(x, GY, 89, T.HARD); set(x, GY, 129, T.HARD); }
  for (const [x, t] of [[12, T.QCOIN], [13, T.BRICK], [14, T.QLEAF], [15, T.BRICK], [16, T.QCOIN]]) set(x, GY + 3, 110, t);
  for (let i = 0; i < 8; i++) set(26 + i, GY + 1, 116, T.COIN);
  // the village square's checkpoint: where you start, and come back to
  W0.checks.push({ x: 18, y: GY, z: 112, z0: 100, z1: 125, region: 'village', start: true, home: true });
  W0.regions.push({ id: 'village', name: ['蘑菇村', 'Mushroom Village'], theme: 'map', box: [0, 0, 86, 44, H, 130] });

  // ---------------------------------------------------------------- cloud stairs up to the sky courses (and, later, to the airship)
  const stair = (from, to, key) => {
    const [fx, fy, fz] = from, [tx, ty, tz] = to, dist = Math.hypot(tx - fx, tz - fz), steps = Math.max(Math.ceil((ty - fy) / 2.4), Math.ceil(dist / 4.2));
    const cells = [];
    for (let i = 1; i <= steps; i++) { const k = i / steps, x = Math.round(fx + (tx - fx) * k), z = Math.round(fz + (tz - fz) * k), y = Math.round(fy + (ty - fy) * k) - 1; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) cells.push([x + dx, y, z + dz]); }
    W0.stairs[key] = cells; return cells;
  };
  for (const c of stair([58, GY, 118], [COURSES['1-3'].ox + 3, COURSES['1-3'].oy + 2, COURSES['1-3'].oz + 5], '1-3')) set(...c, T.CLOUD);
  for (const c of stair([84, surf(84, 70), 72], [COURSES['1-6'].ox + 3, COURSES['1-6'].oy + 2, COURSES['1-6'].oz + 5], '1-6')) set(...c, T.CLOUD);
  // the airship's stair is only drawn in once the fortress is beaten (see openAirship)
  stair([W0.castle.x0 + 10, GY, W0.castle.z1 + 9], [COURSES['1-A'].ox + 3, COURSES['1-A'].oy + 8, COURSES['1-A'].oz + 4], '1-A');
  W0.regions.push({ id: 'mountain', name: ['雪峰山', 'Snowcap Mountain'], theme: 'grass', box: [96, 0, 0, W, H, 48] });
  W0.regions.push({ id: 'beach', name: ['南方海灘', 'South Beach'], theme: 'water', box: [0, 0, 176, W, H, D] });
  W0.regions.push({ id: 'castle', name: ['熔岩城', 'Lava Castle'], theme: 'fort', box: [W0.castle.x0 - 12, 0, W0.castle.z0 - 12, W0.castle.x1 + 12, H, W0.castle.z1 + 12] });

  // ---------------------------------------------------------------- trees, coins and wandering baddies across the open land
  const busy = (x, z, m = 5) => rects.some((r) => outside(x, z, r, m) < 0.5) || (x < 46 && z > 84 && z < 134) || (W0.castle && x > W0.castle.x0 - 14 && x < W0.castle.x1 + 14 && z > W0.castle.z0 - 14 && z < W0.castle.z1 + 14) || W0.warps.some((p) => Math.abs(p.x - x) < 4 && Math.abs(p.z - z) < 4) || Object.values(W0.stairs).some((cells) => cells.some(([cx, , cz]) => Math.abs(cx - x) < 3 && Math.abs(cz - z) < 3));
  for (let i = 0; i < 260; i++) {
    const x = 8 + Math.floor(rnd() * (W - 16)), z = 8 + Math.floor(rnd() * (D - 16)), g = surf(x, z);
    if (busy(x, z) || g <= SEA + 1 || g > 34 || get(x, g - 1, z) !== T.GROUND) continue;
    const hgt = 4 + Math.floor(rnd() * 3); fill(x, g, z, x, g + hgt - 1, z, T.LOG);
    const r = 2 + (rnd() < 0.3 ? 1 : 0);
    for (let dy = -1; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz + dy * dy * 1.4 <= r * r + 1 && get(x + dx, g + hgt + dy, z + dz) === T.EMPTY) set(x + dx, g + hgt + dy, z + dz, T.LEAVES);
  }
  for (let i = 0; i < 46; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z);
    if (busy(x, z, 3) || g <= SEA + 1 || g > 30 || get(x, g, z) !== T.EMPTY) continue;
    const k = rnd(); W0.ents.push({ t: k < 0.55 ? 'g' : k < 0.8 ? 'k' : 'w', x, y: g, z, region: 'meadow', roam: true });
  }
  for (let i = 0; i < 40; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z);
    if (busy(x, z, 3) || g <= SEA || g > 32) continue;
    if (rnd() < 0.5) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; set(Math.round(x + Math.cos(a) * 2), g + 2, Math.round(z + Math.sin(a) * 2), T.COIN); } }
    else { const q = [T.QCOIN, T.QCOIN, T.QLEAF, T.QFLOWER, T.Q1UP][Math.floor(rnd() * 5)]; set(x, g + 3, z, T.BRICK); set(x + 1, g + 3, z, q); set(x + 2, g + 3, z, T.BRICK); }
  }
  W0.heightMap = heightMap; W0.surf = surf;
  return W0;
}
// once the fortress is beaten: the cloud stair to the airship
export function airshipCells(W0) { return W0.stairs['1-A'] || []; }
// which part of the world a point is in (the courses first, they sit inside the bigger places)
export function regionAt(W0, x, y, z) {
  for (const r of W0.regions) { const [x0, y0, z0, x1, y1, z1] = r.box; if (x >= x0 && x < x1 && y >= y0 && y < y1 && z >= z0 && z < z1) return r; }
  return { id: 'meadow', name: ['葉葉草原', 'Leafy Meadow'], theme: 'grass' };
}
