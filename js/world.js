// LEAF LEAP 3D — Leafy Land as one open world, 576 × 576 blocks. In the middle-west lies the old heartland: Mushroom
// Village, the meadows and hills, the mountain with its cave, the Lava Castle and Coral Bay, with every course of the
// old world map set where it belongs (cloud stairs climb to the sky courses; the airship's stair appears when the
// fortress falls). Around it: the Frostpeak snowfields to the north, the Giant Mushroom Forest to the north-east, the
// Sunsand Desert with its pyramid and desert town to the east, Mount Ember to the south-east, and the Southern Isles
// with a lighthouse and a shipwreck. Hidden all over it are secret stars: on the tallest treetop and the highest peak,
// inside invisible blocks, under an X you must ground-pound, behind cracked brick walls, at the end of sets of eight
// red coins, down unmarked pipes, under the sea. Old stone tablets whisper riddles about where to look.
import { T } from './game.js?v=6';
import { LEVELS } from './levels.js?v=6';

export const W = 576, D = 576, H = 80, GY = 17, SEA = 16;   // you stand at y = GY on flat land; water fills up to y = SEA
export const OX = 40, OZ = 150;                              // where the old heartland sits in the big world
const B = (zh, en) => [zh, en];
// where each course is set: its corner in the world and how high its ground sits
export const COURSES = {
  '1-1': { ox: 26 + OX, oz: 132 + OZ, oy: GY - 2, region: B('草原小路', 'Meadow Path') },
  '1-2': { ox: 44 + OX, oz: 36 + OZ, oy: GY - 2, region: B('起伏山丘', 'Rolling Hills') },
  '1-4': { ox: 112 + OX, oz: 90 + OZ, oy: GY - 2, region: B('水管森林', 'Pipe Grove') },
  '1-3': { ox: 64 + OX, oz: 112 + OZ, oy: 33, region: B('天空雲橋', 'Cloud Bridges') },
  '1-6': { ox: 92 + OX, oz: 58 + OZ, oy: 46, region: B('雲上運動場', 'Sky Gym') },
  '1-W': { ox: 44 + OX, oz: 200 + OZ, oy: GY - 12, region: B('海底灣', 'Coral Bay') },
  '1-5': { ox: 112 + OX, oz: 16 + OZ, oy: GY - 2, region: B('地底洞窟', 'Underground Cave'), inside: 'mountain' },
  '1-F': { ox: 140 + OX, oz: 160 + OZ, oy: GY - 2, region: B('石頭堡壘', 'Stone Fortress'), inside: 'castle' },
  '1-A': { ox: 136 + OX, oz: 230 + OZ, oy: 40, region: B('飛行船', 'The Airship') },
};
export const ORDER = ['1-1', '1-2', '1-3', '1-4', '1-F', '1-W', '1-5', '1-6', '1-A'];
// the lands beyond the heartland: each has a warp pipe at its landmark (it opens once you have been there)
export const LANDS = {
  snow: { name: B('霜峰雪原', 'Frostpeak Snowfields'), theme: 'sky', sky: 'snow' },
  forest: { name: B('巨菇森林', 'Giant Mushroom Forest'), theme: 'grass', sky: 'grass' },
  desert: { name: B('烈陽沙漠', 'Sunsand Desert'), theme: 'airship', sky: 'desert' },
  volcano: { name: B('餘燼火山', 'Mount Ember'), theme: 'fort', sky: 'volcano' },
  isles: { name: B('南方群島', 'Southern Isles'), theme: 'water', sky: 'water' },
};
export const PLACES = { ...Object.fromEntries(Object.entries(COURSES).map(([id, c]) => [id, { name: c.region }])), ...LANDS };
export const LAND_ORDER = ['snow', 'forest', 'desert', 'volcano', 'isles'];
const BIOME = ['core', 'snow', 'forest', 'desert', 'volcano', 'isles'];

// ---------------------------------------------------------------- a little noise for the land
function hash2(x, z, s) { let h = (x * 374761393 + z * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function noise(x, z, s) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, z, s) => noise(x, z, s) * 0.55 + noise(x * 2.1, z * 2.1, s + 7) * 0.3 + noise(x * 4.3, z * 4.3, s + 13) * 0.15;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// the landmarks of the new lands
const VOLC = [462, 478], PYR = [482, 214], TOWN = [404, 296], OASIS = [446, 334], LAKE = [150, 62], ICEMT = [262, 44];
const ISLES = [[86, 474, 15], [156, 506, 9], [224, 466, 9], [286, 522, 11], [112, 544, 8], [200, 548, 7]];

export function buildWorld() {
  const tiles = new Uint8Array(W * H * D), idx = (x, y, z) => (y * D + z) * W + x;
  const inb = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
  const get = (x, y, z) => (inb(x, y, z) ? tiles[idx(x, y, z)] : T.EMPTY);
  const set = (x, y, z, t) => { if (inb(x, y, z)) tiles[idx(x, y, z)] = t; };
  const fill = (x0, y0, z0, x1, y1, z1, t) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, t); };
  const W0 = { w: W, h: H, d: D, tiles, ents: [], goals: [], checks: [], pipes: [], warps: [], doors: [], signs: [], hints: [], secrets: [], secretAt: {}, reds: [], world: true, theme: 'grass', start: [20 + OX, GY, 112 + OZ], stairs: {}, regions: [] };
  const rnd = mulberry(20241024);
  const reserved = new Uint8Array(W * D), reserve = (x0, z0, x1, z1) => { for (let z = Math.max(0, z0); z <= Math.min(D - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) reserved[z * W + x] = 1; };

  // ---------------------------------------------------------------- the lie of the land
  const rects = Object.entries(COURSES).map(([id, c]) => ({ id, ...c, w: LEVELS[id].w, d: LEVELS[id].d, h: LEVELS[id].h }));
  const outside = (x, z, r, m) => { const dx = Math.max(r.ox - m - x, 0, x - (r.ox + r.w - 1 + m)), dz = Math.max(r.oz - m - z, 0, z - (r.oz + r.d - 1 + m)); return Math.hypot(dx, dz); };
  const heightMap = new Int16Array(W * D), biome = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const cx = x - OX, cz = z - OZ, n = fbm(x / 38, z / 38, 1), edge = Math.min(x, z, W - 1 - x, D - 1 - z);
    // the heartland, as it was: meadows, hills to the north, the mountain to the north-east, the bay to the south
    let h = GY + Math.round(n * 3.2);
    h += Math.round(smooth(80, 30, cz) * smooth(-60, -10, cz) * fbm(x / 22, z / 22, 4) * 7);
    const mx = smooth(96, 118, cx) * smooth(48, 30, cz) * smooth(-40, 0, cz) * smooth(300, 270, cx), ridge = 1 - Math.abs(noise(x / 26, z / 26, 9) * 2 - 1);
    h += Math.round(mx * (16 + ridge * 14));
    const bay = smooth(178, 196, cz) * smooth(300, 280, cx); h = Math.round(lerp(h, 9 + n * 3, bay));
    // the snowfields: rolling white land and sharp peaks
    const north = smooth(140, 104, z) * smooth(360, 330, x);
    if (north > 0) { const pk = Math.pow(Math.max(0, 1 - Math.abs(noise(x / 34, z / 34, 21) * 2 - 1) - 0.25), 2) * 70; const sh = GY + 2 + Math.round(fbm(x / 30, z / 30, 20) * 7 + pk); h = Math.round(lerp(h, sh, north)); }
    // the east: the mushroom forest, the desert and the volcano
    const east = smooth(312, 346, x);
    if (east > 0) {
      const forestH = GY + Math.round(n * 4), dune = GY + Math.round((Math.sin(x / 13 + noise(x / 40, z / 40, 31) * 4) * 0.5 + 0.5) * 5 * fbm(x / 24, z / 24, 32));
      const dv = Math.hypot(x - VOLC[0], z - VOLC[1]), volcH = dv < 13 ? GY + 28 : GY + Math.max(0, Math.round(46 - dv * 0.62 + fbm(x / 9, z / 9, 41) * 3));
      const eh = lerp(lerp(forestH, dune, smooth(132, 172, z)), Math.max(dune, volcH), smooth(392, 430, z));
      h = Math.round(lerp(h, eh, east));
    }
    // the southern sea and its islands
    const south = smooth(410, 446, z) * (1 - smooth(310, 350, x));
    if (south > 0) { let sh = 8 + n * 3; for (const [ix, iz, ir] of ISLES) { const d = Math.hypot(x - ix, z - iz); if (d < ir + 6) sh = Math.max(sh, GY + 2.5 - Math.max(0, d - ir * 0.55) * 1.1); } h = Math.round(lerp(h, sh, south)); }
    // the edge of the world is the open sea
    h = Math.round(lerp(h, 7, smooth(22, 3, edge)));
    // flat where the ground courses run, blending into the hills around them
    for (const r of rects) if (!r.inside && r.oy === GY - 2) { const o = outside(x, z, r, 3); if (o < 10) h = Math.round(GY + (h - GY) * smooth(0, 10, o)); }
    { const o = Math.hypot(Math.max(0, cx - 42), Math.max(0, 86 - cz, cz - 130)) + Math.max(0, -cx); if (o < 12) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    { const o = Math.hypot(Math.max(0, 128 - cx, cx - 300), Math.max(0, 148 - cz, cz - 196)); if (o < 12 && bay < 0.6) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    { const o = Math.hypot(x - TOWN[0], z - TOWN[1]) - 18; if (o < 10) h = Math.round(GY + (h - GY) * smooth(0, 10, o)); }
    heightMap[z * W + x] = h;
    biome[z * W + x] = south > 0.5 ? 5 : east > 0.5 ? (z < 150 ? 2 : z > 412 ? 4 : 3) : north > 0.5 ? 1 : 0;
  }
  // the courses set in the mountain need it to be solid above them
  for (const r of rects) if (r.inside === 'mountain') for (let z = r.oz - 3; z < r.oz + r.d + 3; z++) for (let x = r.ox - 2; x < r.ox + r.w + 2; x++) heightMap[z * W + x] = Math.max(heightMap[z * W + x], r.oy + r.h + 4);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = heightMap[z * W + x], b = biome[z * W + x], low = h <= SEA + 1;
    for (let y = 0; y < h; y++) {
      let t = y < h - 4 ? T.STONE : T.GROUND;
      if (b === 3) t = y >= h - 3 ? T.SAND : T.SANDSTONE;
      else if (b === 4) t = T.BASALT;
      else if (b === 1) t = y === h - 1 ? T.SNOW : y >= h - 3 ? T.GROUND : T.STONE;
      else if (low || b === 5) t = y >= h - 3 ? T.SAND : T.STONE;
      else if (h > 36 && y < h - 1) t = T.STONE;
      if (y >= 42 && y === h - 1 && b !== 4) t = T.SNOW;
      set(x, y, z, t);
    }
    for (let y = h; y <= SEA; y++) set(x, y, z, T.WATER);
  }

  // ---------------------------------------------------------------- the castle and its lava moat, before the fortress goes in
  { const r = rects.find((q) => q.id === '1-F'), x0 = r.ox - 4, x1 = r.ox + r.w + 3, z0 = r.oz - 4, z1 = r.oz + r.d + 3;
    for (let z = z0 - 5; z <= z1 + 5; z++) for (let x = x0 - 5; x <= x1 + 5; x++) { if (x >= x0 && x <= x1 && z >= z0 && z <= z1) continue; fill(x, 1, z, x, GY - 2, z, T.STONE); set(x, GY - 1, z, T.LAVA); fill(x, GY, z, x, H - 1, z, T.EMPTY); }
    fill(x0, 1, z0, x1, r.oy + r.h + 3, z1, T.STONE);
    for (let x = x0; x <= x1; x += 2) { set(x, r.oy + r.h + 4, z0, T.STONE); set(x, r.oy + r.h + 4, z1, T.STONE); }
    for (let z = z0; z <= z1; z += 2) { set(x0, r.oy + r.h + 4, z, T.STONE); set(x1, r.oy + r.h + 4, z, T.STONE); }
    fill(x0 - 6, GY - 1, r.oz + 3, x0 - 1, GY - 1, r.oz + r.d - 4, T.PLANK);
    fill(x0, GY, r.oz + 2, r.ox - 1, GY + 3, r.oz + r.d - 3, T.EMPTY); fill(x0, GY - 2, r.oz + 2, r.ox - 1, GY - 1, r.oz + r.d - 3, T.STONE);
    W0.castle = { x0, x1, z0, z1, top: r.oy + r.h + 4 }; reserve(x0 - 16, z0 - 16, x1 + 16, z1 + 16);
  }
  // the tunnel into the mountain, to the cave
  { const r = rects.find((q) => q.id === '1-5'); for (let x = r.ox - 16; x < r.ox; x++) { fill(x, GY, r.oz + 2, x, GY + 5, r.oz + r.d - 3, T.EMPTY); fill(x, GY - 2, r.oz + 2, x, GY - 1, r.oz + r.d - 3, T.STONE); } }

  // ---------------------------------------------------------------- set the courses in
  for (const r of rects) {
    const L = LEVELS[r.id];
    for (let z = 0; z < L.d; z++) for (let x = 0; x < L.w; x++) {
      const wx = x + r.ox, wz = z + r.oz;
      for (let y = 0; y < L.h; y++) { let t = L.tiles[(y * L.d + z) * L.w + x]; if (r.id === '1-W' && t === T.GROUND) t = T.SAND; if (t === T.EMPTY && !r.inside && y + r.oy <= SEA && r.id !== '1-W') t = get(wx, y + r.oy, wz) === T.WATER ? T.WATER : T.EMPTY; set(wx, y + r.oy, wz, t); }
      const bottom = L.tiles[(0 * L.d + z) * L.w + x];
      if (r.oy > 0 && r.oy <= GY) for (let y = 0; y < r.oy; y++) set(wx, y, wz, bottom === T.EMPTY ? T.EMPTY : r.id === '1-W' ? T.SAND : T.STONE);
      if (!r.inside && r.oy <= GY) for (let y = r.oy + L.h; y < H; y++) set(wx, y, wz, T.EMPTY);
    }
    for (const e of L.ents) W0.ents.push({ ...e, x: e.x + r.ox, y: e.y + r.oy, z: e.z + r.oz, region: r.id });
    for (const p of L.pipes) W0.pipes.push({ x: p.x + r.ox, z: p.z + r.oz, base: p.base + r.oy, hgt: p.hgt });
    if (L.goal) W0.goals.push({ x: L.goal[0] + r.ox, y: L.goal[1] + r.oy, z: L.goal[2] + r.oz, w: 1, h: 1, d: 1, z0: r.oz, z1: r.oz + L.d, region: r.id });
    if (L.check) W0.checks.push({ x: L.check[0] + r.ox, y: L.check[1] + r.oy, z: L.check[2] + r.oz, z0: r.oz, z1: r.oz + L.d, region: r.id });
    W0.checks.push({ x: L.start[0] + r.ox, y: L.start[1] + r.oy, z: L.start[2] + r.oz, z0: r.oz, z1: r.oz + L.d, region: r.id, start: true });
    W0.regions.push({ id: r.id, name: r.region, theme: L.theme, box: [r.ox - 3, r.oy - 3, r.oz - 3, r.ox + L.w + 3, r.oy + L.h + 4, r.oz + L.d + 3] });
    reserve(r.ox - 6, r.oz - 6, r.ox + L.w + 6, r.oz + L.d + 6);
  }
  const surf = (x, z) => { for (let y = H - 1; y >= 0; y--) { const t = get(x, y, z); if (t !== T.EMPTY && t !== T.WATER && t !== T.COIN && t !== T.HIDDEN) return y + 1; } return 0; };

  // ---------------------------------------------------------------- pipes, warps and signs
  const pipe = (x, z, base, hgt, warp) => { fill(x, base, z, x + 1, base + hgt - 2, z + 1, T.PIPE); fill(x, base + hgt - 1, z, x + 1, base + hgt - 1, z + 1, T.PIPETOP); const p = { x, z, base, hgt, warp }; W0.pipes.push(p); if (warp) W0.warps.push(p); reserve(x - 3, z - 3, x + 4, z + 4); return p; };
  const clearAbove = (x0, z0, x1, z1, y0) => fill(x0, y0, z0, x1, Math.min(H - 1, y0 + 6), z1, T.EMPTY);
  for (const r of rects) {
    const L = LEVELS[r.id], sz = L.start[2] + r.oz, sy = L.start[1] + r.oy;
    let px, pz, pb;
    if (r.oy <= GY && !r.inside && r.id !== '1-W') { px = r.ox - 5; pz = sz - 1; pb = surf(px, pz); fill(px - 1, GY - 1, pz - 1, px + 2, pb - 1, pz + 2, T.GROUND); pb = surf(px, pz); }
    else if (r.id === '1-W') { px = r.ox + 4; pz = r.oz + 1; pb = sy; }
    else if (r.inside === 'mountain') { px = r.ox - 20; pz = sz - 1; pb = surf(px, pz); }
    else if (r.inside === 'castle') { px = W0.castle.x0 - 12; pz = sz - 1; pb = surf(px, pz); }
    else { px = r.ox; pz = r.oz + 1; pb = sy; }
    clearAbove(px, pz, px + 1, pz + 1, pb);
    pipe(px, pz, pb, 2, { kind: 'home', region: r.id });
    W0.signs.push({ x: px + 1, y: pb + 2.6, z: pz + 1, text: r.region, id: r.id });
    const gx = (L.goal ? Math.min(L.w - 2, L.goal[0] + 4) : L.w - 6) + r.ox, gz = r.oz + 1, gb = r.inside ? r.oy + 2 : surf(gx, gz);
    if (gb > 0 && gx < W - 2) { clearAbove(gx, gz, gx + 1, gz + 1, gb); pipe(gx, gz, gb, 2, { kind: 'home', region: r.id, end: true }); }
  }
  // the village: a row of warp pipes to each course, and a second row to each of the far lands
  ORDER.forEach((id, i) => { const x = 4 + OX + i * 3, z = 122 + OZ; pipe(x, z, GY, 2, { kind: 'to', region: id }); W0.signs.push({ x: x + 1, y: GY + 2.6, z: z + 1, text: COURSES[id].region, id, hub: true }); });
  LAND_ORDER.forEach((id, i) => { const x = 8 + OX + i * 5, z = 102 + OZ; pipe(x, z, GY, 2, { kind: 'to', region: id }); W0.signs.push({ x: x + 1, y: GY + 2.6, z: z + 1, text: LANDS[id].name, id, hub: true }); });

  // ---------------------------------------------------------------- buildings
  const house = (x0, z0, id, roofT = T.ROOF, wallT = T.WALL) => {
    fill(x0, GY, z0, x0 + 6, GY + 3, z0 + 5, wallT); fill(x0 + 1, GY, z0 + 1, x0 + 5, GY + 3, z0 + 4, T.EMPTY);
    for (let k = 0; k < 4; k++) fill(x0 - 1 + k, GY + 4 + k, z0 - 1 + k, x0 + 7 - k, GY + 4 + k, z0 + 6 - k, roofT);
    fill(x0 + 3, GY, z0 + 5, x0 + 3, GY + 1, z0 + 5, T.EMPTY); set(x0 + 3, GY + 2, z0 + 5, T.HARD); set(x0 + 2, GY + 1, z0 + 5, T.HARD); set(x0 + 4, GY + 1, z0 + 5, T.HARD);
    if (id) W0.doors.push({ x: x0 + 3, y: GY, z: z0 + 5, id });
    reserve(x0 - 2, z0 - 2, x0 + 8, z0 + 8);
  };
  house(8 + OX, 94 + OZ, 'house'); house(30 + OX, 92 + OZ, null, T.HARD); house(18 + OX, 94 + OZ, null, T.BRICK);
  house(36 + OX, 56 + OZ, 'house2');
  fill(24 + OX, GY - 1, 108 + OZ, 27 + OX, GY - 1, 111 + OZ, T.SPADE); W0.spade = { x0: 24 + OX, z0: 108 + OZ, x1: 27 + OX, z1: 111 + OZ };
  W0.signs.push({ x: 25.9 + OX, y: GY + 2.2, z: 107.5 + OZ, text: B('黑桃翻牌', 'Spade Panel') });
  for (let x = 2 + OX; x < 40 + OX; x += 2) { set(x, GY, 89 + OZ, T.HARD); set(x, GY, 129 + OZ, T.HARD); }
  for (const [x, t] of [[12, T.QCOIN], [13, T.BRICK], [14, T.QLEAF], [15, T.BRICK], [16, T.QCOIN]]) set(x + OX, GY + 3, 114 + OZ, t);
  for (let i = 0; i < 8; i++) set(26 + i + OX, GY + 1, 118 + OZ, T.COIN);
  W0.checks.push({ x: 18 + OX, y: GY, z: 112 + OZ, z0: 100 + OZ, z1: 125 + OZ, region: 'village', start: true, home: true });
  W0.regions.push({ id: 'village', name: B('蘑菇村', 'Mushroom Village'), theme: 'map', box: [OX - 40, 0, 86 + OZ, 44 + OX, H, 130 + OZ] });
  reserve(OX - 4, 86 + OZ, OX + 48, 132 + OZ);

  // ---------------------------------------------------------------- cloud stairs up to the sky courses (and, later, to the airship)
  const stair = (from, to, key, t = T.CLOUD) => {
    const [fx, fy, fz] = from, [tx, ty, tz] = to, dist = Math.hypot(tx - fx, tz - fz), steps = Math.max(Math.ceil((ty - fy) / 2.2), Math.ceil(dist / 4.2));
    const cells = [];
    for (let i = 1; i <= steps; i++) { const k = i / steps, x = Math.round(fx + (tx - fx) * k), z = Math.round(fz + (tz - fz) * k), y = Math.round(fy + (ty - fy) * k) - 1; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) cells.push([x + dx, y, z + dz]); reserve(x - 3, z - 3, x + 3, z + 3); }
    W0.stairs[key] = cells; if (t) for (const c of cells) if (get(...c) === T.EMPTY) set(...c, t); return cells;
  };
  stair([58 + OX, GY, 118 + OZ], [COURSES['1-3'].ox + 3, COURSES['1-3'].oy + 2, COURSES['1-3'].oz + 5], '1-3');
  stair([84 + OX, surf(84 + OX, 72 + OZ), 72 + OZ], [COURSES['1-6'].ox + 3, COURSES['1-6'].oy + 2, COURSES['1-6'].oz + 5], '1-6');
  stair([W0.castle.x0 + 10, GY, W0.castle.z1 + 9], [COURSES['1-A'].ox + 3, COURSES['1-A'].oy + 8, COURSES['1-A'].oz + 4], '1-A', 0);
  W0.regions.push({ id: 'mountain', name: B('雪峰山', 'Snowcap Mountain'), theme: 'grass', box: [96 + OX, 0, OZ - 20, 300, H, 48 + OZ] });
  W0.regions.push({ id: 'bay', name: B('珊瑚海岸', 'Coral Coast'), theme: 'water', box: [OX, 0, 176 + OZ, 300, H, 410] });
  W0.regions.push({ id: 'castle', name: B('熔岩城', 'Lava Castle'), theme: 'fort', box: [W0.castle.x0 - 12, 0, W0.castle.z0 - 12, W0.castle.x1 + 12, H, W0.castle.z1 + 12] });

  // ---------------------------------------------------------------- secrets: the helpers
  const secret = (id, land, x, y, z, kind = 'free') => { W0.secrets.push({ id, land, x, y, z, kind }); reserve(x - 2, z - 2, x + 2, z + 2); if (kind !== 'free') W0.secretAt[x + ',' + y + ',' + z] = id; };
  const star = (id, land, x, y, z) => secret(id, land, x, y, z, 'free');
  const hidden = (id, land, x, y, z) => { set(x, y, z, T.HIDDEN); secret(id, land, x, y, z, 'block'); };
  const xmark = (id, land, x, z) => { const y = surf(x, z) - 1; set(x, y, z, T.XMARK); secret(id, land, x, y, z, 'pound'); return y; };
  const reds = (id, land, pts, center) => { for (const [x, , z] of pts) reserve(x - 2, z - 2, x + 2, z + 2); W0.reds.push({ id, coins: pts, center }); W0.secrets.push({ id, land, x: center[0], y: center[1], z: center[2], kind: 'red' }); };
  const hint = (x, z, zh, en) => { const y = surf(x, z); fill(x, y, z, x, y + 1, z, T.STONE); W0.hints.push({ x: x + 0.5, y: y + 2, z: z + 0.5, text: B(zh, en) }); W0.signs.push({ x: x + 0.5, y: y + 2.9, z: z + 0.5, text: B('古老的石碑', 'Old tablet') }); reserve(x - 1, z - 1, x + 1, z + 1); };
  // a little hut of stone with a cracked brick door; a star inside
  const vault = (id, land, x0, z0, wallT = T.STONE) => {
    const y0 = surf(x0 + 3, z0 + 3); fill(x0, y0 - 1, z0, x0 + 6, y0 + 4, z0 + 6, wallT); fill(x0 + 1, y0, z0 + 1, x0 + 5, y0 + 3, z0 + 5, T.EMPTY);
    fill(x0 + 2, y0, z0 + 6, x0 + 4, y0 + 1, z0 + 6, T.BRICK);
    for (let i = 0; i < 6; i++) set(x0 + 1 + (i % 3) * 2, y0, z0 + 2 + Math.floor(i / 3), T.COIN);
    star(id, land, x0 + 3, y0 + 1, z0 + 2); reserve(x0 - 2, z0 - 2, x0 + 8, z0 + 9); return y0;
  };
  // a room far away, reached only down an unmarked pipe; a pipe inside takes you back
  const bonus = (id, land, from, room, cloudy) => {
    const [fx, fz] = from, fb = surf(fx, fz); clearAbove(fx, fz, fx + 1, fz + 1, fb);
    const [rx, ry, rz] = room; fill(rx, ry - 1, rz, rx + 13, ry - 1, rz + 13, cloudy ? T.CLOUD : T.HARD);
    for (let z = rz; z <= rz + 13; z++) for (let x = rx; x <= rx + 13; x++) if (x === rx || z === rz || x === rx + 13 || z === rz + 13) fill(x, ry, z, x, ry + 4, z, cloudy ? T.CLOUD : T.STONE);
    if (!cloudy) fill(rx, ry + 5, rz, rx + 13, ry + 5, rz + 13, T.STONE);
    fill(rx + 1, ry, rz + 1, rx + 12, ry + 4, rz + 12, T.EMPTY);
    for (let z = rz + 3; z <= rz + 10; z += 2) for (let x = rx + 3; x <= rx + 10; x += 2) set(x, ry + 1, z, T.COIN);
    star(id, land, rx + 7, ry + 2, rz + 11);
    const back = pipe(rx + 2, rz + 2, ry, 2, { kind: 'secret', to: [fx + 0.5, fb + 2, fz + 2.6] });
    pipe(fx, fz, fb, 2, { kind: 'secret', to: [back.x + 3.5, ry, back.z + 0.5] });
    reserve(rx - 2, rz - 2, rx + 16, rz + 16);
  };
  const tree = (x, z, kind = 'oak', g = surf(x, z)) => {
    if (kind === 'palm') { const hgt = 5 + Math.floor(rnd() * 3); for (let i = 0; i < hgt; i++) set(x + (i > 3 ? 1 : 0), g + i, z, T.LOG); const tx = x + (hgt > 4 ? 1 : 0), ty = g + hgt; set(tx, ty, z, T.LEAVES); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) set(tx + dx, ty - (Math.abs(dx) + Math.abs(dz) > 1 ? 1 : 0), z + dz, T.LEAVES); return ty; }
    if (kind === 'pine') { const hgt = 6 + Math.floor(rnd() * 4); fill(x, g, z, x, g + hgt - 1, z, T.LOG); for (let k = 0; k < hgt - 1; k++) { const r = Math.max(0, Math.floor((hgt - k) / 2.6)); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r && get(x + dx, g + 2 + k, z + dz) === T.EMPTY) set(x + dx, g + 2 + k, z + dz, k === hgt - 2 || (k % 2 === 0 && r > 0) ? T.SNOW : T.LEAVES); } return g + hgt + 1; }
    const hgt = 4 + Math.floor(rnd() * 3); fill(x, g, z, x, g + hgt - 1, z, T.LOG);
    const r = 2 + (rnd() < 0.3 ? 1 : 0);
    for (let dy = -1; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz + dy * dy * 1.4 <= r * r + 1 && get(x + dx, g + hgt + dy, z + dz) === T.EMPTY) set(x + dx, g + hgt + dy, z + dz, T.LEAVES);
    return g + hgt + r + 1;
  };

  // ---------------------------------------------------------------- the heartland's secrets
  hidden('village-sky', 'core', 26 + OX, GY + 4, 110 + OZ);
  hint(30 + OX, 112 + OZ, '黑桃廣場的正上方，空氣裡藏著東西。跳起來頂頂看。', 'Right above the spade square, the air hides something. Jump and bump it.');
  bonus('heaven', 'core', [16 + OX, 90 + OZ + 1], [70, 66, 36], true);
  hint(12 + OX, 92 + OZ, '小屋後面那根沒有名牌的水管，通往雲端的寶庫。', 'The unmarked pipe behind the house leads to a vault in the clouds.');
  { const cx = 100 + OX, cz = 150 + OZ; for (const [dx, dz] of [[-5, -3], [5, -3], [0, 5]]) tree(cx + dx, cz + dz); xmark('three-trees', 'core', cx, cz);
    hint(cx - 9, cz, '三棵樹圍成的三角形中央，用力蹬地。', 'Where three trees make a triangle, pound the ground in the middle.'); reserve(cx - 10, cz - 8, cx + 8, cz + 8); }
  { const c = W0.castle; star('castle-roof', 'core', c.x0 + 30, c.top + 1, c.z0 + 1); star('moat-pillar', 'core', c.x1 + 3, GY + 2, c.z1 + 3); fill(c.x1 + 2, 1, c.z1 + 2, c.x1 + 4, GY + 1, c.z1 + 4, T.STONE); }
  vault('mountain-vault', 'core', 92 + OX, 52 + OZ);
  hint(88 + OX, 62 + OZ, '山腳下的石屋，裂開的磚門要用尾巴甩開。', 'The stone hut at the foot of the mountain: swing your tail at its cracked brick door.');
  star('bay-floor', 'core', 30 + OX, surf(30 + OX, 230 + OZ), 230 + OZ);
  { const c = COURSES['1-4']; const pts = [[0, 0], [20, -8], [40, 0], [60, 14], [80, 18], [100, 14], [120, 0], [128, 16]].map(([dx, dz]) => { const x = c.ox + dx, z = c.oz + dz + (dz < 0 ? -2 : 14); return [x, surf(x, z) + 1, z]; }); reds('grove-reds', 'core', pts, [c.ox + 60, surf(c.ox + 60, c.oz - 6), c.oz - 6]); }
  { const a = COURSES['1-A'], mx = a.ox + 33, mz = a.oz + 1; fill(mx, a.oy + 9, mz, mx, a.oy + 19, mz, T.LOG); fill(mx - 1, a.oy + 20, mz - 1, mx + 1, a.oy + 20, mz + 1, T.PLANK); star('airship-mast', 'core', mx, a.oy + 21, mz); }
  { const x = 120 + OX, z = 196 + OZ; xmark('beach-x', 'core', x, z); hint(x - 6, z - 6, '沙灘上的 X，代表寶藏。', 'X marks the spot on the beach.'); }
  { const cx = 150 + OX, cz = 120 + OZ, cy = 68; fill(cx - 8, cy - 1, cz - 8, cx + 8, cy - 1, cz + 8, T.CLOUD); fill(cx - 3, cy, cz - 3, cx + 3, cy + 5, cz + 3, T.WALL); fill(cx - 2, cy, cz - 2, cx + 2, cy + 4, cz + 2, T.EMPTY); fill(cx, cy, cz + 3, cx, cy + 1, cz + 3, T.EMPTY); for (let k = 0; k < 3; k++) fill(cx - 4 + k, cy + 6 + k, cz - 4 + k, cx + 4 - k, cy + 6 + k, cz + 4 - k, T.CAPGOLD);
    star('cloud-castle', 'core', cx, cy + 1, cz); const s6 = COURSES['1-6']; stair([s6.ox + 132, s6.oy + 2, s6.oz + 5], [cx, cy, cz + 7], 'sky-castle'); }

  // ---------------------------------------------------------------- Frostpeak Snowfields
  { const [lx, lz] = LAKE; for (let z = lz - 24; z <= lz + 24; z++) for (let x = lx - 30; x <= lx + 30; x++) { const d = Math.hypot((x - lx) / 1.25, z - lz); if (d < 24) { fill(x, GY - 3, z, x, GY - 2, z, T.WATER); set(x, GY - 1, z, T.ICE); fill(x, GY, z, x, H - 1, z, T.EMPTY); } }
    hidden('lake-sky', 'snow', lx, GY + 4, lz); hint(lx - 32, lz, '結冰的湖正中央，跳起來頂頂看。', 'In the very middle of the frozen lake, jump and bump the air.'); reserve(lx - 34, lz - 26, lx + 32, lz + 26); }
  { const [mx, mz] = ICEMT; for (let z = mz - 24; z <= mz + 24; z++) for (let x = mx - 24; x <= mx + 24; x++) { const d = Math.hypot(x - mx, z - mz); if (d < 24) { const top = Math.round(GY + (24 - d) * 1.3); for (let y = GY - 1; y < top; y++) set(x, y, z, y === top - 1 ? T.SNOW : d < 6 ? T.ICE : T.STONE); } }
    fill(mx - 1, GY, mz + 6, mx + 1, GY + 2, mz + 24, T.EMPTY); fill(mx - 5, GY, mz - 4, mx + 5, GY + 4, mz + 6, T.EMPTY); fill(mx - 5, GY - 1, mz - 4, mx + 5, GY - 1, mz + 6, T.ICE);
    star('ice-cave', 'snow', mx, GY + 1, mz - 2); star('ice-summit', 'snow', mx, Math.round(GY + 24 * 1.3) + 2, mz); for (let i = 0; i < 6; i++) W0.ents.push({ t: 'b', x: mx - 3 + i, y: GY + 3, z: mz + 2, region: 'snow' });
    reserve(mx - 26, mz - 26, mx + 26, mz + 26); }
  { const ix = 210, iz = 96, iy = surf(ix, iz); for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) for (let y = 0; y <= 4; y++) { const d = Math.hypot(x, z, y * 1.1); if (d <= 4.6 && d > 3.4) set(ix + x, iy + y, iz + z, T.SNOW); } fill(ix, iy, iz + 3, ix, iy + 1, iz + 4, T.EMPTY); star('igloo', 'snow', ix, iy, iz); reserve(ix - 6, iz - 6, ix + 6, iz + 6);
    const pts = []; for (let i = 0; i < 8; i++) { const x = 60 + i * 22, z = 108 - (i % 2) * 14; pts.push([x, surf(x, z) + 1, z]); } reds('snow-reds', 'snow', pts, [140, surf(140, 112), 112]);
    const px = 300, pz = 110; tree(px, pz, 'pine'); xmark('pine-x', 'snow', px + 2, pz); hint(px - 5, pz + 4, '孤單的松樹腳下埋著東西。', 'Something is buried at the foot of the lonely pine.'); reserve(px - 6, pz - 4, px + 4, pz + 6);
    let best = [0, 0, 0]; for (let z = 20; z < 130; z += 2) for (let x = 20; x < 330; x += 2) { if (reserved[z * W + x]) continue; const h = heightMap[z * W + x]; if (h > best[2]) best = [x, z, h]; } star('peak', 'snow', best[0], best[2] + 2, best[1]); }
  W0.places = { snow: [120, 118] };

  // ---------------------------------------------------------------- Giant Mushroom Forest
  { const caps = [T.ROOF, T.CAPBLUE, T.CAPGOLD], made = [];
    for (let i = 0; i < 90 && made.length < 34; i++) {
      const x = 350 + Math.floor(rnd() * 200), z = 24 + Math.floor(rnd() * 110);
      if (made.some((m) => Math.hypot(m.x - x, m.z - z) < 14) || reserved[z * W + x]) continue;
      const g = surf(x, z), hgt = 6 + Math.floor(rnd() * 12), r = 3 + Math.floor(rnd() * 4), ct = caps[Math.floor(rnd() * 3)];
      fill(x - 1, g, z - 1, x + 1, g + hgt - 1, z + 1, T.STEM);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dz); if (d <= r + 0.3) set(x + dx, g + hgt, z + dz, ct); if (d <= r + 1.3 && d > r - 0.7) set(x + dx, g + hgt - 1, z + dz, ct); }
      made.push({ x, z, top: g + hgt + 1, r });
    }
    made.sort((a, b) => b.top - a.top);
    star('tall-mushroom', 'forest', made[0].x, made[0].top + 1, made[0].z);
    const pts = made.slice(1, 9).map((m) => [m.x, m.top, m.z]); reds('cap-reds', 'forest', pts, [made[9].x, made[9].top, made[9].z]);
    hint(made[9].x + made[9].r + 3, made[9].z, '藍色的菇傘會彈人。在八朵菇傘上找紅色金幣。', 'Blue caps bounce you. Find the red coins on eight caps.');
    for (const m of made) reserve(m.x - m.r - 1, m.z - m.r - 1, m.x + m.r + 1, m.z + m.r + 1);
    const rx = 470, rz = 90, rg = surf(rx, rz); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = Math.round(rx + Math.cos(a) * 5), z = Math.round(rz + Math.sin(a) * 5); set(x, rg, z, T.STEM); set(x, rg + 1, z, T.ROOF); } hidden('fairy-ring', 'forest', rx, rg + 4, rz); reserve(rx - 7, rz - 7, rx + 7, rz + 7);
    const hx = 420, hz = 120, hg = surf(hx, hz); fill(hx - 3, hg, hz - 3, hx + 3, hg + 14, hz + 3, T.STEM); fill(hx - 2, hg, hz - 2, hx + 2, hg + 4, hz + 2, T.EMPTY); fill(hx - 1, hg, hz + 3, hx + 1, hg + 1, hz + 3, T.BRICK);
    for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) if (Math.hypot(dx, dz) <= 8.3) set(hx + dx, hg + 15, hz + dz, T.ROOF);
    star('hollow-stem', 'forest', hx, hg + 1, hz - 1); hint(hx + 6, hz + 8, '最粗的那朵菇，腳下的磚門裂開了。', 'The fattest mushroom of all has a cracked brick door at its foot.'); reserve(hx - 9, hz - 9, hx + 9, hz + 10);
    const xx = 520, xz = 40; xmark('forest-x', 'forest', xx, xz); hint(xx - 4, xz + 4, '森林的東北角，有個奇怪的記號。', 'In the north-east corner of the forest, a strange mark.');
    bonus('forest-vault', 'forest', [390, 60], [500, 4, 20]);
    W0.places.forest = [380, 80]; }

  // ---------------------------------------------------------------- Sunsand Desert
  { const [px, pz] = PYR, g = surf(px, pz);
    for (let k = 0; k < 11; k++) { const r = 20 - k * 2; fill(px - r, g + k * 2 - 1, pz - r, px + r, g + k * 2, pz + r, T.SANDSTONE); }
    fill(px - 1, g, pz + 4, px + 1, g + 2, pz + 21, T.EMPTY); fill(px - 1, g, pz + 20, px + 1, g + 1, pz + 20, T.BRICK);
    fill(px - 4, g, pz - 4, px + 4, g + 4, pz + 4, T.EMPTY); for (let i = 0; i < 9; i++) set(px - 3 + (i % 3) * 3, g, pz - 3 + Math.floor(i / 3) * 3, T.COIN);
    star('pyramid-heart', 'desert', px, g + 1, pz); star('pyramid-top', 'desert', px, g + 23, pz);
    hint(px + 4, pz + 25, '金字塔的入口被磚頭封住了。跳起來甩尾巴，上下兩排都要打開。', 'The pyramid’s door is bricked up. Spin your tail, jumping too: both rows must go.');
    reserve(px - 22, pz - 22, px + 22, pz + 26);
    const [tx, tz] = TOWN; house(tx - 12, tz - 10, 'house3', T.CAPGOLD, T.SANDSTONE); house(tx + 4, tz - 10, null, T.ROOF, T.SANDSTONE); house(tx - 4, tz + 6, null, T.CAPGOLD, T.SANDSTONE);
    hidden('town-sky', 'desert', tx + 7, GY + 12, tz - 7); hint(tx - 2, tz - 2, '鎮上最高的屋頂再往上，還有東西。', 'Higher still than the town’s tallest roof, there is something.');
    W0.places.desert = [tx, tz + 2];
    const [ox, oz] = OASIS; for (let z = oz - 13; z <= oz + 13; z++) for (let x = ox - 13; x <= ox + 13; x++) { const d = Math.hypot(x - ox, z - oz); if (d < 11) { fill(x, 8, z, x, 10, z, T.SAND); fill(x, 11, z, x, SEA, z, T.WATER); fill(x, SEA + 1, z, x, H - 1, z, T.EMPTY); } }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; tree(Math.round(ox + Math.cos(a) * 13), Math.round(oz + Math.sin(a) * 13), 'palm'); }
    star('oasis-floor', 'desert', ox, 12, oz); reserve(ox - 15, oz - 15, ox + 15, oz + 15);
    const pts = []; for (let i = 0; i < 8; i++) { const x = 360 + i * 24, z = 380 - (i % 3) * 10; pts.push([x, surf(x, z) + 1, z]); } reds('dune-reds', 'desert', pts, [440, surf(440, 392), 392]);
    const sx = 540, sz = 300, sg = surf(sx, sz); fill(sx - 3, sg, sz - 3, sx + 3, sg + 5, sz + 3, T.STONE); for (const [dx, dy] of [[-1, 3], [1, 3]]) set(sx + dx, sg + dy, sz + 3, T.EMPTY); fill(sx - 1, sg + 1, sz + 3, sx + 1, sg + 1, sz + 3, T.EMPTY);
    xmark('skull-x', 'desert', sx, sz + 6); hint(sx - 5, sz + 8, '骷髏岩看著的地方。', 'Where the skull rock is looking.'); reserve(sx - 6, sz - 5, sx + 6, sz + 10);
    const mx = 500, mz = 380, mg = surf(mx, mz); for (let z = -9; z <= 9; z++) for (let x = -9; x <= 9; x++) { const ring = Math.max(Math.abs(x), Math.abs(z)); if (ring % 3 === 0 && ring > 0 && !(x === (ring % 6 === 0 ? ring : -ring) && Math.abs(z) < 2) && !(z === (ring % 6 === 0 ? -ring : ring) && Math.abs(x) < 2)) fill(mx + x, mg, mz + z, mx + x, mg + 2, mz + z, T.CACTUS); }
    star('cactus-maze', 'desert', mx, mg, mz); reserve(mx - 11, mz - 11, mx + 11, mz + 11);
    const ex = 380, ez = 200, eg = surf(ex, ez); fill(ex - 4, eg, ez - 4, ex + 4, eg + 13, ez + 4, T.SANDSTONE); for (let k = 0; k < 14; k++) { const a = k * 0.75; set(Math.round(ex + Math.cos(a) * 6), eg + k, Math.round(ez + Math.sin(a) * 6), T.SANDSTONE); }
    star('mesa', 'desert', ex, eg + 15, ez); reserve(ex - 8, ez - 8, ex + 8, ez + 8); }

  // ---------------------------------------------------------------- Mount Ember
  { const [vx, vz] = VOLC;
    for (let z = vz - 13; z <= vz + 13; z++) for (let x = vx - 13; x <= vx + 13; x++) if (Math.hypot(x - vx, z - vz) < 12.5) { set(x, GY + 27, z, T.LAVA); fill(x, GY + 28, z, x, H - 1, z, T.EMPTY); }
    fill(vx - 1, GY + 26, vz - 1, vx + 1, GY + 31, vz + 1, T.BASALT); star('crater', 'volcano', vx, GY + 33, vz);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; fill(Math.round(vx + Math.cos(a) * 7), GY + 27, Math.round(vz + Math.sin(a) * 7), Math.round(vx + Math.cos(a) * 7), GY + 28, Math.round(vz + Math.sin(a) * 7), T.BASALT); }
    hint(vx + 20, vz - 22, '火山口裡的石柱，從熔岩上的石頭跳過去。', 'The pillar in the crater: hop across the stones in the lava.');
    const tz = vz + 30; for (let z = vz + 8; z <= tz; z++) { const y0 = GY + Math.max(0, Math.round(46 - Math.hypot(0, z - vz) * 0.62)) - 6; fill(vx - 1, Math.max(GY, y0 - 4), z, vx + 1, Math.max(GY, y0 - 4) + 3, z, T.EMPTY); }
    fill(vx - 4, GY, vz + 4, vx + 4, GY + 4, vz + 10, T.EMPTY); star('lava-tube', 'volcano', vx, GY + 1, vz + 6); for (let i = 0; i < 4; i++) W0.ents.push({ t: 'b', x: vx - 2 + i, y: GY + 4, z: vz + 12 + i * 4, region: 'volcano' });
    const pts = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.round(vx + Math.cos(a) * 24), z = Math.round(vz + Math.sin(a) * 24); pts.push([x, surf(x, z) + 1, z]); } reds('ember-reds', 'volcano', pts, [vx + 30, surf(vx + 30, vz), vz]);
    const ax = vx - 40, az = vz + 40; xmark('ash-x', 'volcano', ax, az); hint(ax + 5, az - 4, '灰燼原上有個燒焦的記號。', 'A scorched mark in the ash field.');
    const ox2 = vx + 50, oz2 = vz - 40, og = surf(ox2, oz2); fill(ox2 - 1, og, oz2 - 1, ox2 + 1, og + 18, oz2 + 1, T.BASALT); for (let k = 0; k < 36; k++) { const a = k * (Math.PI * 2 / 12); set(Math.round(ox2 + Math.cos(a) * 3), og + Math.floor(k / 2), Math.round(oz2 + Math.sin(a) * 3), T.BASALT); }
    star('obsidian', 'volcano', ox2, og + 20, oz2);
    reserve(vx - 52, vz - 52, vx + 56, vz + 56);
    W0.places.volcano = [vx - 34, vz - 20]; }

  // ---------------------------------------------------------------- Southern Isles
  { const [lx, lz] = ISLES[0], lg = surf(lx, lz);
    for (let y = 0; y < 20; y++) fill(lx - 1, lg + y, lz - 1, lx + 1, lg + y, lz + 1, Math.floor(y / 3) % 2 ? T.ROOF : T.WALL);
    for (let k = 0; k < 40; k++) { const a = k * (Math.PI * 2 / 12); set(Math.round(lx + Math.cos(a) * 3), lg + Math.floor(k / 2), Math.round(lz + Math.sin(a) * 3), T.HARD); }
    star('lighthouse', 'isles', lx, lg + 22, lz); W0.places.isles = [lx + 6, lz + 8];
    const sx = 236, sz = 500; fill(sx, 7, sz, sx + 13, 9, sz + 4, T.PLANK); fill(sx + 1, 8, sz + 1, sx + 12, 9, sz + 3, T.EMPTY); fill(sx + 1, 8, sz + 1, sx + 12, 9, sz + 3, T.WATER); fill(sx + 6, 10, sz + 2, sx + 6, 15, sz + 2, T.LOG); star('shipwreck', 'isles', sx + 9, 8, sz + 2);
    const tx2 = 128, tz2 = 470; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; fill(Math.round(tx2 + Math.cos(a) * 5), 8, Math.round(tz2 + Math.sin(a) * 5), Math.round(tx2 + Math.cos(a) * 5), 13, Math.round(tz2 + Math.sin(a) * 5), T.STONE); } star('sunken-ring', 'isles', tx2, 10, tz2);
    for (let i = 0; i < 10; i++) W0.ents.push({ t: 'f', x: 120 + i * 18, y: 11, z: 480 + (i % 3) * 20, region: 'isles' });
    const [p3x, p3z] = ISLES[3], top = tree(p3x, p3z, 'palm'); hidden('palm-sky', 'isles', p3x + 1, top + 3, p3z); hint(p3x - 4, p3z + 4, '最大棵的椰子樹，樹頂再上面。', 'Above the top of the tallest palm.');
    const [b5x, b5z] = ISLES[5]; xmark('sandbar-x', 'isles', b5x, b5z); hint(b5x + 2, b5z - 3, '最小的沙洲上，蹬一下。', 'Pound the smallest sandbar.');
    bonus('sunken-vault', 'isles', [ISLES[2][0], ISLES[2][1]], [20, 3, 540]);
    for (const [x, z, r] of ISLES) { reserve(x - 2, z - 2, x + 2, z + 2); for (let k = 0; k < 2; k++) { const a = rnd() * 6.3, tx = Math.round(x + Math.cos(a) * r * 0.5), tz = Math.round(z + Math.sin(a) * r * 0.5); if (!reserved[tz * W + tx] && surf(tx, tz) > SEA + 1) tree(tx, tz, 'palm'); } }
    const pts = []; ISLES.forEach(([x, z, r], i) => { pts.push([x + 3, surf(x + 3, z) + 1, z]); if (i < 2) pts.push([x - 3, surf(x - 3, z + 3) + 1, z + 3]); }); reds('isle-reds', 'isles', pts.slice(0, 8), [lx + 5, surf(lx + 5, lz + 5), lz + 5]);
  }
  for (const id of LAND_ORDER) { const [x, z] = W0.places[id], b = surf(x, z); clearAbove(x, z, x + 1, z + 1, b); const under = get(x, b - 1, z); fill(x - 1, b - 1, z - 1, x + 2, b - 1, z + 2, under === T.WATER || under === T.EMPTY ? T.SAND : under); pipe(x, z, b, 2, { kind: 'home', region: id }); W0.signs.push({ x: x + 1, y: b + 2.6, z: z + 1, text: LANDS[id].name, id }); W0.checks.push({ x: x - 1, y: b, z: z + 3, z0: z - 4, z1: z + 6, region: id, start: true }); }

  // ---------------------------------------------------------------- trees, cacti, coins and wandering baddies across the open land
  const bio = (x, z) => BIOME[biome[z * W + x]];
  for (let i = 0; i < 2600; i++) {
    const x = 8 + Math.floor(rnd() * (W - 16)), z = 8 + Math.floor(rnd() * (D - 16)), g = surf(x, z), b = bio(x, z);
    if (reserved[z * W + x] || g <= SEA + 1 || g > 44) continue;
    const top = get(x, g - 1, z);
    if (b === 'desert') { if (top === T.SAND && rnd() < 0.35) { const hgt = 2 + Math.floor(rnd() * 3); fill(x, g, z, x, g + hgt - 1, z, T.CACTUS); if (rnd() < 0.6) { set(x + 1, g + 1, z, T.CACTUS); set(x + 1, g + 2, z, T.CACTUS); } } continue; }
    if (b === 'volcano' || b === 'isles') continue;
    if (b === 'snow') { if (top === T.SNOW || top === T.GROUND) tree(x, z, 'pine', g); continue; }
    if (top !== T.GROUND) continue;
    if (b === 'forest' && rnd() < 0.4) continue;
    tree(x, z, 'oak', g);
  }
  const KINDS = { core: ['g', 'g', 'k', 'w', 'g'], snow: ['g', 's', 'k', 'w', 's'], forest: ['g', 'k', 'w', 'g', 'k'], desert: ['c', 'c', 'g', 's', 'k'], volcano: ['s', 'g', 'b', 's', 'k'], isles: ['k', 'g'] };
  for (let i = 0; i < 520; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z), b = bio(x, z);
    if (reserved[z * W + x] || g <= SEA + 1 || g > 42 || get(x, g, z) !== T.EMPTY) continue;
    const ks = KINDS[b], t = ks[Math.floor(rnd() * ks.length)];
    W0.ents.push({ t, x, y: t === 'b' ? g + 4 : g, z, region: b, skin: b, roam: true });
  }
  for (let i = 0; i < 200; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z);
    if (reserved[z * W + x] || g <= SEA || g > 40) continue;
    if (rnd() < 0.5) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; set(Math.round(x + Math.cos(a) * 2), g + 2, Math.round(z + Math.sin(a) * 2), T.COIN); } }
    else { const q = [T.QCOIN, T.QCOIN, T.QLEAF, T.QFLOWER, T.Q1UP, T.QTANOOKI][Math.floor(rnd() * 6)]; set(x, g + 3, z, T.BRICK); set(x + 1, g + 3, z, q); set(x + 2, g + 3, z, T.BRICK); }
  }
  // the tallest tree in the heartland wears a star
  { let best = null; for (let z = OZ + 10; z < OZ + 180; z += 1) for (let x = OX + 10; x < OX + 250; x += 1) { const s = surf(x, z); if (get(x, s - 1, z) !== T.LEAVES) continue; if (!best || s > best[2]) best = [x, z, s]; } if (best) star('tall-tree', 'core', best[0], best[2] + 1, best[1]); }
  W0.heightMap = heightMap; W0.biome = biome; W0.surf = surf;
  return W0;
}
// once the fortress is beaten: the cloud stair to the airship
export function airshipCells(W0) { return W0.stairs['1-A'] || []; }
// which part of the world a point is in (the courses first, they sit inside the bigger places)
export function regionAt(W0, x, y, z) {
  for (const r of W0.regions) { const [x0, y0, z0, x1, y1, z1] = r.box; if (x >= x0 && x < x1 && y >= y0 && y < y1 && z >= z0 && z < z1) return r; }
  const b = W0.biome ? BIOME[W0.biome[Math.max(0, Math.min(W - 1, Math.floor(z))) * W + Math.max(0, Math.min(W - 1, Math.floor(x)))]] : 'core';
  if (b !== 'core' && LANDS[b]) return { id: b, name: LANDS[b].name, theme: LANDS[b].theme, sky: LANDS[b].sky };
  return { id: 'meadow', name: B('葉葉草原', 'Leafy Meadow'), theme: 'grass' };
}
export const SECRET_LANDS = { core: B('葉葉國中心', 'The Heartland'), ...Object.fromEntries(Object.entries(LANDS).map(([k, v]) => [k, v.name])) };
