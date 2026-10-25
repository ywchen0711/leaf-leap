// LEAF LEAP 3D — Leafy Land as one open world, 816 × 816 blocks. In the middle-west lies the old heartland: Mushroom
// Village, the meadows and hills, the mountain with its cave, the Lava Castle and Coral Bay, with every course of the
// old world map set where it belongs (cloud stairs climb to the sky courses; the airship's stair appears when the
// fortress falls). Around it: the Frostpeak snowfields to the north, the Giant Mushroom Forest to the north-east, the
// Sunsand Desert with its pyramid and desert town to the east, Mount Ember to the south-east, and the Southern Isles
// with a lighthouse and a shipwreck. Hidden all over it are secret stars: on the tallest treetop and the highest peak,
// inside invisible blocks, under an X you must ground-pound, behind cracked brick walls, at the end of sets of eight
// red coins, down unmarked pipes, under the sea. Old stone tablets whisper riddles about where to look.
import { T, SUITS } from './game.js?v=8';
import { LEVELS } from './levels.js?v=8';

// everything sits Y0 blocks up, so the sea has room to be deep and the tallest mountain room to be ten times taller
export const Y0 = 112, W = 816, D = 816, H = 368, GY = 17 + Y0, SEA = 16 + Y0;   // you stand at y = GY on flat land; water fills up to y = SEA
// the world's blocks, kept in 16 × 16 columns that each hold only their own range of heights; below a column's
// range is solid stone, above it is open air (so the deep sea and the giant mountain don't cost the whole world memory)
export class Store {
  constructor(w, d, h) { this.w = w; this.d = d; this.h = h; this.NX = Math.ceil(w / 16); this.NZ = Math.ceil(d / 16); this.c = new Array(this.NX * this.NZ).fill(null); }
  init(cx, cz, y0, y1) { y0 = Math.max(0, y0 & ~3); y1 = Math.min(this.h, y1); this.c[cz * this.NX + cx] = { y0, y1, a: new Uint8Array(256 * (y1 - y0)) }; }
  col(x, z) { return this.c[(z >> 4) * this.NX + (x >> 4)]; }
  get(x, y, z) { const c = this.c[(z >> 4) * this.NX + (x >> 4)]; if (y < c.y0) return y < 0 ? T.EMPTY : T.STONE; if (y >= c.y1) return T.EMPTY; return c.a[((y - c.y0) << 8) | ((z & 15) << 4) | (x & 15)]; }
  set(x, y, z, t) {
    const c = this.c[(z >> 4) * this.NX + (x >> 4)];
    if (y < c.y0) { if (t === T.STONE || y < 0) return; this.grow(c, y - 4, c.y1); }
    else if (y >= c.y1) { if (t === T.EMPTY || y >= this.h) return; this.grow(c, c.y0, y + 16); }
    c.a[((y - c.y0) << 8) | ((z & 15) << 4) | (x & 15)] = t;
  }
  grow(c, y0, y1) {
    y0 = Math.max(0, Math.min(c.y0, y0)); y1 = Math.min(this.h, Math.max(c.y1, y1)); const a = new Uint8Array(256 * (y1 - y0));
    a.fill(T.STONE, 0, 256 * (c.y0 - y0)); a.set(c.a, 256 * (c.y0 - y0)); c.a = a; c.y0 = y0; c.y1 = y1;
  }
}
export const OX = 40, OZ = 150;                              // where the old heartland sits in the big world
const B = (zh, en) => [zh, en];
// where each course is set: its corner in the world and how high its ground sits
export const COURSES = {
  '1-1': { ox: 26 + OX, oz: 132 + OZ, oy: GY - 2, region: B('草原小路', 'Meadow Path') },
  '1-2': { ox: 44 + OX, oz: 36 + OZ, oy: GY - 2, region: B('起伏山丘', 'Rolling Hills') },
  '1-4': { ox: 112 + OX, oz: 90 + OZ, oy: GY - 2, region: B('水管森林', 'Pipe Grove') },
  '1-3': { ox: 64 + OX, oz: 112 + OZ, oy: 33 + Y0, region: B('天空雲橋', 'Cloud Bridges') },
  '1-6': { ox: 92 + OX, oz: 58 + OZ, oy: 46 + Y0, region: B('雲上運動場', 'Sky Gym') },
  '1-W': { ox: 44 + OX, oz: 200 + OZ, oy: GY - 12, region: B('海底灣', 'Coral Bay') },
  '1-5': { ox: 112 + OX, oz: 16 + OZ, oy: GY - 2, region: B('地底洞窟', 'Underground Cave'), inside: 'mountain' },
  '1-F': { ox: 140 + OX, oz: 160 + OZ, oy: GY - 2, region: B('石頭堡壘', 'Stone Fortress'), inside: 'castle' },
  '1-A': { ox: 136 + OX, oz: 230 + OZ, oy: 40 + Y0, region: B('飛行船', 'The Airship') },
};
COURSES['1-D'] = { ox: 380, oz: 712, oy: Y0 - 100, w: 40, d: 40, h: 128, gen: true, region: B('深海峽谷', 'The Deep Trench') };
export const ORDER = ['1-1', '1-2', '1-3', '1-4', '1-F', '1-W', '1-5', '1-6', '1-D', '1-A'];
// the lands beyond the heartland: each has a warp pipe at its landmark (it opens once you have been there)
export const LANDS = {
  snow: { name: B('霜峰雪原', 'Frostpeak Snowfields'), theme: 'sky', sky: 'snow' },
  forest: { name: B('巨菇森林', 'Giant Mushroom Forest'), theme: 'grass', sky: 'grass' },
  desert: { name: B('烈陽沙漠', 'Sunsand Desert'), theme: 'airship', sky: 'desert' },
  volcano: { name: B('餘燼火山', 'Mount Ember'), theme: 'fort', sky: 'volcano' },
  isles: { name: B('南方群島', 'Southern Isles'), theme: 'water', sky: 'water' },
  peak: { name: B('天梯峰', 'Skyreach Peak'), theme: 'sky', sky: 'snow' },
  abyss: { name: B('深淵大洋', 'The Abyssal Sea'), theme: 'water', sky: 'water' },
};
export const PLACES = { ...Object.fromEntries(Object.entries(COURSES).map(([id, c]) => [id, { name: c.region }])), ...LANDS };
export const LAND_ORDER = ['snow', 'forest', 'desert', 'volcano', 'isles', 'peak', 'abyss'];
const BIOME = ['core', 'snow', 'forest', 'desert', 'volcano', 'isles', 'peak', 'abyss'];

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
export const PEAK = [690, 300], PEAK_R = 130, PEAK_H = 220;   // the giant mountain: ten times the height of the old peaks

export function buildWorld() {
  const store = new Store(W, D, H);
  const inb = (x, y, z) => x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
  const get = (x, y, z) => (inb(x, y, z) ? store.get(x, y, z) : T.EMPTY);
  const set = (x, y, z, t) => { if (inb(x, y, z)) store.set(x, y, z, t); };
  const fill = (x0, y0, z0, x1, y1, z1, t) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) set(x, y, z, t); };
  const W0 = { w: W, h: H, d: D, store, get: (x, y, z) => store.get(x, y, z), set: (x, y, z, t) => store.set(x, y, z, t), killY: Y0 - 6, cannons: [], ents: [], goals: [], checks: [], pipes: [], warps: [], doors: [], signs: [], hints: [], secrets: [], secretAt: {}, reds: [], world: true, theme: 'grass', start: [20 + OX, GY, 112 + OZ], stairs: {}, regions: [] };
  const rnd = mulberry(20241024);
  const reserved = new Uint8Array(W * D), reserve = (x0, z0, x1, z1) => { for (let z = Math.max(0, z0); z <= Math.min(D - 1, z1); z++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) reserved[z * W + x] = 1; };

  // ---------------------------------------------------------------- the lie of the land
  const rects = Object.entries(COURSES).filter(([, c]) => !c.gen).map(([id, c]) => ({ id, ...c, w: LEVELS[id].w, d: LEVELS[id].d, h: LEVELS[id].h }));
  const outside = (x, z, r, m) => { const dx = Math.max(r.ox - m - x, 0, x - (r.ox + r.w - 1 + m)), dz = Math.max(r.oz - m - z, 0, z - (r.oz + r.d - 1 + m)); return Math.hypot(dx, dz); };
  const heightMap = new Int16Array(W * D), biome = new Uint8Array(W * D);
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const cx = x - OX, cz = z - OZ, n = fbm(x / 38, z / 38, 1), edge = Math.min(x, z, W - 1 - x, D - 1 - z);
    // the heartland, as it was: meadows, hills to the north, the mountain to the north-east, the bay to the south
    let h = GY + Math.round(n * 3.2);
    h += Math.round(smooth(80, 30, cz) * smooth(-60, -10, cz) * fbm(x / 22, z / 22, 4) * 7);
    const mx = smooth(96, 118, cx) * smooth(48, 30, cz) * smooth(-40, 0, cz) * smooth(300, 270, cx), ridge = 1 - Math.abs(noise(x / 26, z / 26, 9) * 2 - 1);
    h += Math.round(mx * (16 + ridge * 14));
    const bay = smooth(178, 196, cz) * smooth(300, 280, cx); h = Math.round(lerp(h, Y0 + 9 + n * 3, bay));
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
    if (south > 0) { let sh = Y0 + 8 + n * 3; for (const [ix, iz, ir] of ISLES) { const d = Math.hypot(x - ix, z - iz); if (d < ir + 6) sh = Math.max(sh, GY + 2.5 - Math.max(0, d - ir * 0.55) * 1.1); } h = Math.round(lerp(h, sh, south)); }
    // far to the east, the Skyreach range and its giant peak
    const range = smooth(560, 600, x) * smooth(-20, 40, z) * smooth(560, 520, z);
    if (range > 0) { const dp = Math.hypot(x - PEAK[0], (z - PEAK[1]) * 0.9), cone = dp < PEAK_R ? PEAK_H * Math.pow(1 - dp / PEAK_R, 1.5) : 0, foot = GY + 4 + Math.round(fbm(x / 30, z / 30, 51) * 14 + Math.pow(Math.max(0, 1 - Math.abs(noise(x / 40, z / 40, 52) * 2 - 1) - 0.3), 2) * 50);
      h = Math.round(lerp(h, Math.max(foot, GY + cone + fbm(x / 12, z / 12, 53) * 6 * Math.min(1, dp / 20)), range)); }
    // far to the south, the land drops away into the abyssal sea, with a trench at its deepest
    const deep = smooth(588, 640, z);
    if (deep > 0) { const tr = Math.max(0, 1 - Math.abs(z - 740) / 46) * smooth(120, 200, x) * smooth(700, 620, x); const bed = Y0 - 40 + fbm(x / 26, z / 26, 61) * 16 - tr * 62; h = Math.round(lerp(h, bed, deep)); }
    // the edge of the world is the open sea
    h = Math.round(lerp(h, Y0 + 7, smooth(22, 3, edge)));
    // flat where the ground courses run, blending into the hills around them
    for (const r of rects) if (!r.inside && r.oy === GY - 2) { const o = outside(x, z, r, 3); if (o < 10) h = Math.round(GY + (h - GY) * smooth(0, 10, o)); }
    { const o = Math.hypot(Math.max(0, cx - 42), Math.max(0, 86 - cz, cz - 130)) + Math.max(0, -cx); if (o < 12) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    { const o = Math.hypot(Math.max(0, 128 - cx, cx - 300), Math.max(0, 148 - cz, cz - 196)); if (o < 12 && bay < 0.6) h = Math.round(GY + (h - GY) * smooth(0, 12, o)); }
    { const o = Math.hypot(x - TOWN[0], z - TOWN[1]) - 18; if (o < 10) h = Math.round(GY + (h - GY) * smooth(0, 10, o)); }
    heightMap[z * W + x] = h;
    biome[z * W + x] = deep > 0.5 ? 7 : range > 0.5 ? 6 : south > 0.5 ? 5 : east > 0.5 ? (z < 150 ? 2 : z > 412 ? 4 : 3) : north > 0.5 ? 1 : 0;
  }
  // the courses set in the mountain need it to be solid above them
  for (const r of rects) if (r.inside === 'mountain') for (let z = r.oz - 3; z < r.oz + r.d + 3; z++) for (let x = r.ox - 2; x < r.ox + r.w + 2; x++) heightMap[z * W + x] = Math.max(heightMap[z * W + x], r.oy + r.h + 4);
  for (let cz = 0; cz < store.NZ; cz++) for (let cx = 0; cx < store.NX; cx++) {
    let lo = 1e9, hi = 0; for (let z = cz * 16; z < Math.min(D, cz * 16 + 16); z++) for (let x = cx * 16; x < Math.min(W, cx * 16 + 16); x++) { const h = heightMap[z * W + x]; lo = Math.min(lo, h); hi = Math.max(hi, h); }
    store.init(cx, cz, Math.min(lo, SEA) - 8, Math.max(hi, SEA) + 24 < GY + 66 ? GY + 66 : Math.max(hi, SEA) + 24);
  }
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const h = heightMap[z * W + x], b = biome[z * W + x], low = h <= SEA || (h === SEA + 1 && (heightMap[z * W + Math.min(W - 1, x + 2)] <= SEA || heightMap[z * W + Math.max(0, x - 2)] <= SEA || heightMap[Math.min(D - 1, z + 2) * W + x] <= SEA || heightMap[Math.max(0, z - 2) * W + x] <= SEA));
    for (let y = store.col(x, z).y0; y < h; y++) {
      let t = y < h - 4 ? T.STONE : T.GROUND;
      if (b === 3) t = y >= h - 3 ? T.SAND : T.SANDSTONE;
      else if (b === 4) t = T.BASALT;
      else if (b === 1) t = y === h - 1 ? T.SNOW : y >= h - 3 ? T.GROUND : T.STONE;
      else if (low || b === 5 || b === 7) t = y >= h - 3 ? T.SAND : T.STONE;
      else if (b === 6) t = y === h - 1 ? (h > GY + 40 ? T.SNOW : T.GROUND) : y >= h - 2 ? T.GROUND : T.STONE;
      else if (h > Y0 + 36 && y < h - 1) t = T.STONE;
      if (y >= Y0 + 42 && y === h - 1 && b !== 4) t = T.SNOW;
      set(x, y, z, t);
    }
    for (let y = h; y <= SEA; y++) set(x, y, z, T.WATER);
  }

  // ---------------------------------------------------------------- the castle and its lava moat, before the fortress goes in
  { const r = rects.find((q) => q.id === '1-F'), x0 = r.ox - 4, x1 = r.ox + r.w + 3, z0 = r.oz - 4, z1 = r.oz + r.d + 3;
    for (let z = z0 - 5; z <= z1 + 5; z++) for (let x = x0 - 5; x <= x1 + 5; x++) { if (x >= x0 && x <= x1 && z >= z0 && z <= z1) continue; fill(x, Y0 + 1, z, x, GY - 2, z, T.STONE); set(x, GY - 1, z, T.LAVA); fill(x, GY, z, x, H - 1, z, T.EMPTY); }
    fill(x0, Y0 + 1, z0, x1, r.oy + r.h + 3, z1, T.STONE);
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
      for (let y = 0; y < L.h; y++) { let t = L.tiles[(y * L.d + z) * L.w + x]; if (t === T.CANNON) W0.cannons.push({ x: wx, y: y + r.oy, z: wz, t: 1 + ((wx * 7 + wz * 3) % 10) / 4 }); if (r.id === '1-W' && t === T.GROUND) t = T.SAND; if (t === T.EMPTY && !r.inside && y + r.oy <= SEA && r.id !== '1-W') t = get(wx, y + r.oy, wz) === T.WATER ? T.WATER : T.EMPTY; set(wx, y + r.oy, wz, t); }
      const bottom = L.tiles[(0 * L.d + z) * L.w + x];
      if (r.oy > 0 && r.oy <= GY) for (let y = Y0 - 12; y < r.oy; y++) set(wx, y, wz, bottom === T.EMPTY ? T.EMPTY : r.id === '1-W' ? T.SAND : T.STONE);
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
  const surf = (x, z) => { if (x < 0 || z < 0 || x >= W || z >= D) return 0; for (let y = store.col(x, z).y1 - 1; y >= 0; y--) { const t = get(x, y, z); if (t !== T.EMPTY && t !== T.WATER && t !== T.COIN && t !== T.HIDDEN) return y + 1; } return 0; };

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
  bonus('heaven', 'core', [16 + OX, 90 + OZ + 1], [70, Y0 + 66, 36], true);
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
  { const cx = 150 + OX, cz = 120 + OZ, cy = Y0 + 68; fill(cx - 8, cy - 1, cz - 8, cx + 8, cy - 1, cz + 8, T.CLOUD); fill(cx - 3, cy, cz - 3, cx + 3, cy + 5, cz + 3, T.WALL); fill(cx - 2, cy, cz - 2, cx + 2, cy + 4, cz + 2, T.EMPTY); fill(cx, cy, cz + 3, cx, cy + 1, cz + 3, T.EMPTY); for (let k = 0; k < 3; k++) fill(cx - 4 + k, cy + 6 + k, cz - 4 + k, cx + 4 - k, cy + 6 + k, cz + 4 - k, T.CAPGOLD);
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
    bonus('forest-vault', 'forest', [390, 60], [500, Y0 + 4, 20]);
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
    const [ox, oz] = OASIS; for (let z = oz - 13; z <= oz + 13; z++) for (let x = ox - 13; x <= ox + 13; x++) { const d = Math.hypot(x - ox, z - oz); if (d < 11) { fill(x, Y0 + 8, z, x, Y0 + 10, z, T.SAND); fill(x, Y0 + 11, z, x, SEA, z, T.WATER); fill(x, SEA + 1, z, x, H - 1, z, T.EMPTY); } }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; tree(Math.round(ox + Math.cos(a) * 13), Math.round(oz + Math.sin(a) * 13), 'palm'); }
    star('oasis-floor', 'desert', ox, Y0 + 12, oz); reserve(ox - 15, oz - 15, ox + 15, oz + 15);
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
    const sx = 236, sz = 500; fill(sx, Y0 + 7, sz, sx + 13, Y0 + 9, sz + 4, T.PLANK); fill(sx + 1, Y0 + 8, sz + 1, sx + 12, Y0 + 9, sz + 3, T.WATER); fill(sx + 6, Y0 + 10, sz + 2, sx + 6, Y0 + 15, sz + 2, T.LOG); star('shipwreck', 'isles', sx + 9, Y0 + 8, sz + 2);
    const tx2 = 128, tz2 = 470; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; fill(Math.round(tx2 + Math.cos(a) * 5), Y0 + 8, Math.round(tz2 + Math.sin(a) * 5), Math.round(tx2 + Math.cos(a) * 5), Y0 + 13, Math.round(tz2 + Math.sin(a) * 5), T.STONE); } star('sunken-ring', 'isles', tx2, Y0 + 10, tz2);
    for (let i = 0; i < 10; i++) W0.ents.push({ t: 'f', x: 120 + i * 18, y: Y0 + 11, z: 480 + (i % 3) * 20, region: 'isles' });
    const [p3x, p3z] = ISLES[3], top = tree(p3x, p3z, 'palm'); hidden('palm-sky', 'isles', p3x + 1, top + 3, p3z); hint(p3x - 4, p3z + 4, '最大棵的椰子樹，樹頂再上面。', 'Above the top of the tallest palm.');
    const [b5x, b5z] = ISLES[5]; xmark('sandbar-x', 'isles', b5x, b5z); hint(b5x + 2, b5z - 3, '最小的沙洲上，蹬一下。', 'Pound the smallest sandbar.');
    bonus('sunken-vault', 'isles', [ISLES[2][0], ISLES[2][1]], [24, Y0 + 3, 536]);
    for (const [x, z, r] of ISLES) { reserve(x - 2, z - 2, x + 2, z + 2); for (let k = 0; k < 2; k++) { const a = rnd() * 6.3, tx = Math.round(x + Math.cos(a) * r * 0.5), tz = Math.round(z + Math.sin(a) * r * 0.5); if (!reserved[tz * W + tx] && surf(tx, tz) > SEA + 1) tree(tx, tz, 'palm'); } }
    const pts = []; ISLES.forEach(([x, z, r], i) => { pts.push([x + 3, surf(x + 3, z) + 1, z]); if (i < 2) pts.push([x - 3, surf(x - 3, z + 3) + 1, z + 3]); }); reds('isle-reds', 'isles', pts.slice(0, 8), [lx + 5, surf(lx + 5, lz + 5), lz + 5]);
  }
  // ---------------------------------------------------------------- Skyreach Peak: a trail winds up the giant mountain to a shrine at the top
  { const [px, pz] = PEAK, rAt = (y) => PEAK_R * (1 - Math.pow(Math.max(0, Math.min(1, (y - GY) / PEAK_H)), 1 / 1.5));
    let th = Math.PI, y = GY + 4, s = 0, lastRest = 0, n = 0; const trail = [];
    while (y < GY + PEAK_H - 6) {
      const r = Math.max(7, rAt(y) - 1.5), x = Math.round(px + Math.cos(th) * r), z = Math.round(pz + Math.sin(th) * r / 0.9), yy = Math.round(y);
      for (let k = -1; k <= 1; k++) { const tx = Math.round(px + Math.cos(th) * (r + k)), tz = Math.round(pz + Math.sin(th) * (r + k) / 0.9); fill(tx, yy - 3, tz, tx, yy - 1, tz, yy > GY + 40 ? T.SNOW : T.GROUND); fill(tx, yy, tz, tx, yy + 4, tz, T.EMPTY); }
      if (s - lastRest > 70) { lastRest = s; n++; fill(x - 2, yy - 1, z - 2, x + 2, yy - 1, z + 2, T.STONE); fill(x - 2, yy, z - 2, x + 2, yy + 4, z + 2, T.EMPTY); for (let k = 0; k < 4; k++) set(x - 1 + k % 2 * 2, yy + 1, z - 1 + Math.floor(k / 2) * 2, T.COIN); W0.checks.push({ x: x - 2, y: yy, z, z0: z - 3, z1: z + 3, region: 'peak' }); trail.push([x, yy, z]); if (n % 2) W0.ents.push({ t: n % 4 === 1 ? 's' : 'b', x: x + 3, y: yy + (n % 4 === 1 ? 0 : 3), z, region: 'peak', skin: 'snow' }); }
      const step = 0.5; th += step / r; y += step * 0.5; s += step;
    }
    // the summit: a little shrine with a golden roof, a star, and a pipe home
    const top = GY + PEAK_H; fill(px - 5, top - 3, pz - 5, px + 5, top - 1, pz + 5, T.STONE); fill(px - 5, top, pz - 5, px + 5, top + 8, pz + 5, T.EMPTY);
    { const ly = Math.round(y); for (let yy = ly; yy < top; yy++) { const k = (yy - ly) * 0.9; const sx = Math.round(px + Math.cos(th + k * 0.35) * 6), sz = Math.round(pz + Math.sin(th + k * 0.35) * 6); fill(sx - 1, yy - 1, sz - 1, sx + 1, yy - 1, sz + 1, T.STONE); fill(sx - 1, yy, sz - 1, sx + 1, yy + 3, sz + 1, T.EMPTY); } }
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) fill(px + dx, top, pz + dz, px + dx, top + 3, pz + dz, T.WALL);
    for (let k = 0; k < 3; k++) fill(px - 4 + k, top + 4 + k, pz - 4 + k, px + 4 - k, top + 4 + k, pz + 4 - k, T.CAPGOLD);
    star('summit', 'peak', px, top + 1, pz); hidden('summit-sky', 'peak', px, top + 10, pz); hint(px - 4, pz + 4, '山頂的屋頂再往上，雲裡藏著最後的東西。', 'Above the shrine’s roof, in the clouds, the last thing is hidden.');
    W0.checks.push({ x: px - 3, y: top, z: pz, z0: pz - 5, z1: pz + 5, region: 'peak', summit: true });
    pipe(px + 1, pz - 4, top, 2, { kind: 'secret', to: [W0.start[0], W0.start[1] + 2, W0.start[2]] });
    W0.signs.push({ x: px + 2, y: top + 2.6, z: pz - 3, text: B('回蘑菇村', 'To the village') });
    // red coins on the rest stops, an X on one of them, and a star on a ledge only the brave fly to
    const pts = trail.filter((_, i) => i % 2 === 0).slice(0, 8).map(([x, yy, z]) => [x + 1, yy, z + 1]); if (pts.length === 8) reds('trail-reds', 'peak', pts, [trail[9][0], trail[9][1], trail[9][2]]);
    const xr = trail[3]; if (xr) { set(xr[0] - 1, xr[1] - 1, xr[2] - 1, T.XMARK); secret('rest-x', 'peak', xr[0] - 1, xr[1] - 1, xr[2] - 1, 'pound'); hint(xr[0] + 2, xr[2] + 2, '第四個休息站，石頭地上有記號。', 'At the fourth rest stop, a mark in the stone floor.'); }
    const mid = trail[Math.floor(trail.length / 2)]; if (mid) { const ox = Math.round(px + (mid[0] - px) * 1.25), oz = Math.round(pz + (mid[2] - pz) * 1.25); fill(ox - 1, mid[1] + 8, oz - 1, ox + 1, mid[1] + 8, oz + 1, T.CLOUD); star('cliff-cloud', 'peak', ox, mid[1] + 9, oz); }
    reserve(px - PEAK_R, pz - PEAK_R, px + PEAK_R, pz + PEAK_R);
    W0.places.peak = [Math.round(px + Math.cos(Math.PI) * (PEAK_R + 4)), pz];
    W0.regions.push({ id: 'summit', name: B('天梯峰頂', 'Skyreach Summit'), theme: 'sky', sky: 'snow', box: [px - 12, top - 4, pz - 12, px + 12, H, pz + 12] });
  }

  // ---------------------------------------------------------------- the Deep Trench: a dock on the open sea, and far below it a sunken temple
  { const c = COURSES['1-D'], cx = c.ox + 20, cz = c.oz + 20, yb = c.oy + 2;
    // open the trench into a great round shaft of water
    for (let z = cz - 22; z <= cz + 22; z++) for (let x = cx - 22; x <= cx + 22; x++) { const r = Math.hypot(x - cx, z - cz); if (r < 18) { fill(x, yb - 2, z, x, yb - 1, z, T.SAND); fill(x, yb, z, x, SEA, z, T.WATER); } else if (r < 21) { const top = Math.max(surf(x, z), yb); fill(x, yb - 2, z, x, Math.min(top, SEA - 12), z, T.STONE); } }
    // the dock at the surface, with a frog suit to try, coins and two pipes
    fill(cx - 7, SEA, cz - 22, cx + 7, SEA, cz - 13, T.PLANK); fill(cx - 7, SEA + 1, cz - 22, cx + 7, SEA + 6, cz - 13, T.EMPTY);
    for (const [dx, dz] of [[-7, -22], [7, -22], [-7, -13], [7, -13]]) fill(cx + dx, Y0 - 50, cz + dz, cx + dx, SEA - 1, cz + dz, T.LOG);
    set(cx - 2, GY + 3, cz - 17, T.QFROG); set(cx - 1, GY + 3, cz - 17, T.BRICK); set(cx, GY + 3, cz - 17, T.QCOIN);
    W0.checks.push({ x: cx - 6, y: GY, z: cz - 17, z0: cz - 22, z1: cz - 13, region: '1-D', start: true });
    pipe(cx - 6, cz - 21, GY, 2, { kind: 'home', region: '1-D' }); W0.signs.push({ x: cx - 5, y: GY + 2.6, z: cz - 20, text: c.region, id: '1-D' });
    W0.places.abyss = [cx + 4, cz - 21];
    // coral ledges spiralling down the shaft, rings of coins in the water, fish everywhere
    const corals = [T.ROOF, T.CAPBLUE, T.CAPGOLD]; let k = 0;
    for (let y = SEA - 8; y > yb + 6; y -= 7, k++) {
      const a = k * 1.25, lx = Math.round(cx + Math.cos(a) * 12), lz = Math.round(cz + Math.sin(a) * 12);
      fill(lx - 2, y - 1, lz - 2, lx + 2, y - 1, lz + 2, T.STONE); for (let i = 0; i < 4; i++) set(lx - 2 + i, y, lz + 2, corals[(i + k) % 3]);
      for (let i = 0; i < 8; i++) { const b = i / 8 * Math.PI * 2; set(Math.round(cx + Math.cos(a + 0.6) * 7 + Math.cos(b) * 2), y + 2, Math.round(cz + Math.sin(a + 0.6) * 7 + Math.sin(b) * 2), T.COIN); }
      W0.ents.push({ t: 'f', x: cx + Math.round(Math.cos(a + 2) * 8), y: y + 1, z: cz + Math.round(Math.sin(a + 2) * 8), region: '1-D' }, { t: 'f', x: cx + Math.round(Math.cos(a - 2) * 6), y: y - 3, z: cz + Math.round(Math.sin(a - 2) * 6), region: '1-D' });
      if (k === 7) W0.checks.push({ x: lx - 2, y, z: lz, z0: lz - 3, z1: lz + 3, region: '1-D' });
    }
    // the temple on the bottom: pillars, a roof, the finish line and a pipe home
    fill(cx - 8, yb - 1, cz - 6, cx + 8, yb - 1, cz + 6, T.STONE);
    for (let x = cx - 8; x <= cx + 8; x += 4) for (const z of [cz - 6, cz + 6]) fill(x, yb, z, x, yb + 7, z, T.STONE);
    for (const z of [cz - 6, cz + 6]) { fill(cx - 8, yb + 8, z, cx + 8, yb + 8, z, T.STONE); fill(cx - 8, yb + 9, z, cx + 8, yb + 9, z, T.CAPGOLD); }
    W0.goals.push({ x: cx + 2, y: yb + 0.8, z: cz, w: 1, h: 1, d: 1, z0: cz - 5, z1: cz + 6, region: '1-D' });
    pipe(cx + 5, cz - 4, yb, 2, { kind: 'home', region: '1-D', end: true });
    star('temple-floor', 'abyss', cx - 6, yb, cz + 4);
    W0.regions.push({ id: '1-D', name: c.region, theme: 'water', box: [cx - 22, yb - 4, cz - 24, cx + 22, SEA + 10, cz + 22] });
    reserve(cx - 24, cz - 24, cx + 24, cz + 24);
    // out on the abyssal sea floor: a great sunken ship and a hidden block beside it, red coins on the sand
    const wx = 600, wz = 690, wy = surf(wx, wz); fill(wx, wy, wz, wx + 24, wy + 4, wz + 7, T.PLANK); fill(wx + 1, wy + 1, wz + 1, wx + 23, wy + 3, wz + 6, T.WATER); fill(wx + 15, wy + 4, wz + 2, wx + 21, wy + 4, wz + 5, T.WATER); fill(wx + 12, wy + 5, wz + 3, wx + 12, wy + 20, wz + 3, T.LOG);
    star('deep-wreck', 'abyss', wx + 18, wy + 1, wz + 3); hidden('wreck-block', 'abyss', wx + 6, wy + 8, wz + 3); reserve(wx - 2, wz - 2, wx + 26, wz + 10);
    const pts = []; for (let i = 0; i < 8; i++) { const x = 200 + i * 40, z = 650 + (i % 2) * 30, y = surf(x, z); pts.push([x, y + 1, z]); } reds('abyss-reds', 'abyss', pts, [360, surf(360, 680) + 1, 680]);
  }
  for (const id of LAND_ORDER) { const [x, z] = W0.places[id], b = surf(x, z); clearAbove(x, z, x + 1, z + 1, b); const under = get(x, b - 1, z); fill(x - 1, b - 1, z - 1, x + 2, b - 1, z + 2, under === T.WATER || under === T.EMPTY ? T.SAND : under); pipe(x, z, b, 2, { kind: 'home', region: id }); W0.signs.push({ x: x + 1, y: b + 2.6, z: z + 1, text: LANDS[id].name, id }); W0.checks.push({ x: x - 1, y: b, z: z + 3, z0: z - 4, z1: z + 6, region: id, start: true }); }

  // ---------------------------------------------------------------- suit shrines: a little pavilion with a golden roof, and a suit floating in the middle
  W0.suits = []; W0.relics = [];
  const shrine = (id, x, z, pier) => {
    const g = pier ? Math.max(surf(x, z), SEA + 1) : surf(x, z);
    // a level terrace round it, stepping down to the land on every side
    for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dz)), X = x + dx, Z = z + dz, ts = surf(X, Z), want = d <= 5 ? g : ts > g ? Math.min(ts, g + d - 5) : Math.max(ts, g - (d - 5));
      if (ts > want) { const top = get(X, ts - 1, Z); fill(X, want, Z, X, Math.min(H - 1, ts + 12), Z, T.EMPTY); if (top !== T.LEAVES && top !== T.LOG) set(X, want - 1, Z, top); }
      else if (ts < want && (!pier || d <= 3)) { const top = get(X, ts - 1, Z); fill(X, ts, Z, X, want - 1, Z, T.STONE); if (top !== T.WATER && top !== T.LEAVES) set(X, want - 1, Z, top); }
    }
    fill(x - 3, pier ? Y0 : g - 4, z - 3, x + 3, g - 1, z + 3, T.STONE); fill(x - 2, g - 1, z - 2, x + 2, g - 1, z + 2, T.SANDSTONE);
    fill(x - 3, g, z - 3, x + 3, Math.min(H - 1, g + 14), z + 3, T.EMPTY);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) fill(x + dx, g, z + dz, x + dx, g + 3, z + dz, T.WALL);
    for (let k = 0; k < 3; k++) fill(x - 3 + k, g + 4 + k, z - 3 + k, x + 3 - k, g + 4 + k, z + 3 - k, T.CAPGOLD);
    W0.suits.push({ id, x, y: g, z, locked: id === 'gold' }); W0.signs.push({ x: x + 0.5, y: g + 8.4, z: z + 0.5, text: SUITS[id].name });
    reserve(x - 5, z - 5, x + 5, z + 5); return g;
  };
  shrine('leaf', W0.places.forest[0] + 12, W0.places.forest[1] + 14);
  shrine('frog', 176, 338, true);
  shrine('lava', VOLC[0] - 24, VOLC[1] - 32);
  shrine('climb', W0.places.peak[0] - 8, W0.places.peak[1] + 16);
  shrine('tanooki', TOWN[0] + 22, TOWN[1] + 2);
  hint(61, 276, '葉葉國各地有套裝神殿：森林有葉子套裝、珊瑚海岸有青蛙套裝、火山腳下有岩漿套裝、天梯峰下有登山套裝、沙漠小鎮有狸貓套裝。拿到以後隨時按 R 換穿！', 'Suit shrines stand around Leafy Land: the Leaf Suit in the forest, the Frog Suit on the Coral Coast, the Lava Suit below Mount Ember, the Climbing Suit at the foot of Skyreach Peak, the Tanooki Suit in the desert town. Once found, press R to change any time!');

  // ---------------------------------------------------------------- the Mystery Gate in the village: sealed until all five mysterious treasures are found
  { const g = GY; fill(37, Y0, 256, 47, g - 1, 268, T.STONE); fill(37, g, 256, 47, g + 9, 268, T.EMPTY);
    fill(38, g, 257, 46, g + 5, 267, T.BASALT); fill(39, g, 258, 45, g + 4, 266, T.EMPTY);
    for (let k = 0; k < 4; k++) fill(37 + k, g + 6 + k, 256 + k, 47 - k, g + 6 + k, 268 - k, T.ROOF);
    const door = []; for (let y = g; y <= g + 3; y++) for (let z = 261; z <= 263; z++) { set(46, y, z, T.HARD); door.push([46, y, z]); }
    const lamps = []; for (let i = 0; i < 5; i++) lamps.push([46, g + 4, 260 + i]);
    W0.gate = { door, lamps }; W0.suits.push({ id: 'gold', x: 41, y: g, z: 262, locked: true });
    W0.signs.push({ x: 47.4, y: g + 7.4, z: 262.5, text: B('神秘之門', 'The Mystery Gate') });
    hint(49, 266, '神秘之門：五件神秘寶物到齊，門就會打開。寶物藏在熔岩神殿、鷹之巢、人魚洞窟、天空花園和幽靈古宅。', 'The Mystery Gate: it opens when all five mysterious treasures are found. They lie in the Lava Temple, the Eagle’s Eyrie, the Mermaid Grotto, the Sky Garden and the Haunted Manor.');
    reserve(35, 254, 49, 270); }

  // ---------------------------------------------------------------- mysterious places, each with its treasure
  // the Lava Temple: the crater lake is deep, and at its bottom a golden temple glows (only the lava suit swims there)
  { const [vx, vz] = VOLC;
    for (let z = vz - 12; z <= vz + 12; z++) for (let x = vx - 12; x <= vx + 12; x++) { const d = Math.hypot(x - vx, z - vz); if (d < 11 && !(Math.abs(x - vx) <= 1 && Math.abs(z - vz) <= 1)) { set(x, GY + 11, z, T.BASALT); fill(x, GY + 12, z, x, GY + 26, z, T.LAVA); } }
    const tx = vx + 6, tz = vz; for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) fill(tx + dx, GY + 12, tz + dz, tx + dx, GY + 16, tz + dz, T.HARD);
    fill(tx - 2, GY + 17, tz - 2, tx + 2, GY + 17, tz + 2, T.CAPGOLD); set(tx, GY + 18, tz, T.CAPGOLD);
    W0.relics.push({ id: 'heart', x: tx, y: GY + 12, z: tz });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; W0.ents.push({ t: 'l', x: Math.round(vx + Math.cos(a) * 8.5), y: GY + 26, z: Math.round(vz + Math.sin(a) * 8.5), region: 'volcano' }); }
    hint(vx - 14, vz + 12, '火山口的岩漿底下，有一座發光的神殿。只有穿岩漿套裝才游得下去。', 'Deep under the lava in the crater a temple glows. Only the Lava Suit can swim down to it.');
    W0.regions.push({ id: 'lavatemple', name: B('熔岩神殿', 'The Lava Temple'), theme: 'cave', sky: 'molten', box: [vx - 11, GY + 11, vz - 11, vx + 12, GY + 26, vz + 12] });
    const c = W0.castle; for (let k = 0; k < 6; k++) W0.ents.push({ t: 'l', x: k < 3 ? c.x0 - 3 : c.x1 + 3, y: GY - 1, z: c.z0 + 6 + (k % 3) * 9, region: 'castle' }); }
  // the Eagle's Eyrie: a sheer pillar of rock with a nest on top; no path leads up, only a climber gets there
  { const ex = 612, ez = 466, g = surf(ex, ez), top = g + 64, sq = (x, z) => Math.abs(x) <= 3 && Math.abs(z) <= 3 && !(Math.abs(x) === 3 && Math.abs(z) === 3);
    for (let y = g - 3; y < top; y++) for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) if (sq(x, z)) set(ex + x, y, ez + z, T.STONE);
    for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) { if (!sq(x, z)) continue; const rim = Math.abs(x) === 3 || Math.abs(z) === 3 || (Math.abs(x) === 2 && Math.abs(z) === 2); set(ex + x, top, ez + z, rim ? T.LOG : T.LEAVES); if (rim) set(ex + x, top + 1, ez + z, T.LOG); }
    fill(ex - 3, top + 2, ez - 3, ex + 3, H - 1, ez + 3, T.EMPTY);
    W0.relics.push({ id: 'feather', x: ex, y: top + 1, z: ez });
    hint(ex - 8, ez + 7, '鷹之巢：這根石柱沒有路可以上去，只有會爬牆的人才到得了頂。', 'The Eagle’s Eyrie: no path climbs this pillar of rock. Only a climber can reach the top.');
    for (let k = 0; k < 4; k++) { const x = ex - 12 + k * 7, z = ez + 14; W0.ents.push({ t: 'r', x, y: surf(x, z), z, region: 'peak', skin: 'snow' }); }
    reserve(ex - 9, ez - 9, ex + 9, ez + 9);
    W0.regions.push({ id: 'eyrie', name: B('鷹之巢', 'The Eagle’s Eyrie'), theme: 'sky', sky: 'snow', box: [ex - 6, top - 3, ez - 6, ex + 7, H, ez + 7] }); }
  // the Mermaid Grotto: a dome of coral on the floor of the abyss, entered through a hole in its top
  { const gx = 250, gz = 742, bed = surf(gx, gz), cy = bed + 3, corals = [T.CAPBLUE, T.ROOF, T.CAPGOLD, T.STEM];
    for (let y = -4; y <= 8; y++) for (let z = -8; z <= 8; z++) for (let x = -8; x <= 8; x++) {
      const d = Math.hypot(x, z, y * 1.1), X = gx + x, Y = cy + y, Z = gz + z;
      if (d < 6.2) set(X, Y, Z, Y < bed ? T.SAND : T.WATER);
      else if (d < 7.3 && Y >= bed - 1 && !(y > 4 && Math.abs(x) < 3 && Math.abs(z) < 3)) set(X, Y, Z, corals[Math.abs(x * 7 + z * 3 + y * 5) % 4]);
    }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; set(Math.round(gx + Math.cos(a) * 4), bed, Math.round(gz + Math.sin(a) * 4), T.STEM); set(Math.round(gx + Math.cos(a + 0.5) * 3), bed + 1, Math.round(gz + Math.sin(a + 0.5) * 3), T.COIN); }
    W0.relics.push({ id: 'pearl', x: gx, y: bed, z: gz });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; W0.ents.push({ t: 'j', x: Math.round(gx + Math.cos(a) * 11), y: cy + 6 + (k % 3) * 4, z: Math.round(gz + Math.sin(a) * 11), region: 'abyss' }); }
    const dk = COURSES['1-D']; hint(dk.ox + 25, dk.oz + 5, '人魚洞窟在這裡往西的最深海底。沒有青蛙套裝的話，氣會不夠用。', 'The Mermaid Grotto lies on the deepest sea floor, west of here. Without the Frog Suit you will run out of air.');
    reserve(gx - 9, gz - 9, gx + 9, gz + 9);
    W0.regions.push({ id: 'grotto', name: B('人魚洞窟', 'The Mermaid Grotto'), theme: 'water', box: [gx - 8, bed - 4, gz - 8, gx + 9, cy + 9, gz + 9] }); }
  // the Sky Garden: a floating island high above the southern sea; fly up to it from the lighthouse beach
  { const sx = 120, sz = 438, sy = GY + 36;
    for (let z = -10; z <= 10; z++) for (let x = -10; x <= 10; x++) { const d = Math.hypot(x, z * 1.1); if (d > 9.5) continue; const depth = Math.round((9.5 - d) * 0.8) + 1; for (let k = 0; k < depth; k++) set(sx + x, sy - 1 - k, sz + z, k === 0 ? T.GROUND : T.STONE); }
    tree(sx - 5, sz - 3, 'oak', sy); tree(sx + 5, sz + 4, 'oak', sy);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; set(Math.round(sx + Math.cos(a) * 6), sy + 1, Math.round(sz + Math.sin(a) * 6), T.COIN); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, x = Math.round(sx + Math.cos(a) * 3.5), z = Math.round(sz + Math.sin(a) * 3.5); if (get(x, sy, z) === T.EMPTY) set(x, sy, z, [T.ROOF, T.CAPGOLD, T.CAPBLUE][k % 3]); }
    W0.relics.push({ id: 'fruit', x: sx, y: sy, z: sz });
    const [lx, lz] = ISLES[0]; hint(lx + 7, lz - 7, '燈塔北邊的天上有一座花園。穿葉子套裝在沙灘上跑滿 P，一路往上飛！', 'A garden floats in the sky north of the lighthouse. In the Leaf Suit, run on the beach until the P-meter fills, then fly all the way up!');
    reserve(sx - 11, sz - 11, sx + 11, sz + 11);
    W0.regions.push({ id: 'garden', name: B('天空花園', 'The Sky Garden'), theme: 'sky', box: [sx - 11, sy - 12, sz - 11, sx + 12, sy + 20, sz + 12] }); }
  // the Haunted Manor: a dark house of three floors in the snowfields, full of shy ghosts; its treasure is behind a cracked wall at the top
  { let best = null; for (let z = 30; z <= 84; z += 3) for (let x = 296; x <= 334; x += 3) { if (reserved[(z + 8) * W + x + 10]) continue; let sum = 0; for (let dz = 0; dz <= 16; dz += 4) for (let dx = 0; dx <= 20; dx += 4) sum += Math.abs(heightMap[(z + dz) * W + x + dx] - GY - 2); if (!best || sum < best.sum) best = { x, z, sum }; }
    const x0 = best.x, z0 = best.z, x1 = x0 + 20, z1 = z0 + 16, b = GY + 2, mx = x0 + 10;
    fill(x0 - 3, Y0, z0 - 3, x1 + 3, b - 1, z1 + 9, T.STONE); fill(x0 - 3, b, z0 - 3, x1 + 3, H - 1, z1 + 9, T.EMPTY); fill(x0 - 3, b - 1, z0 - 3, x1 + 3, b - 1, z1 + 9, T.GROUND);
    fill(x0, b, z0, x1, b + 14, z1, T.BASALT); fill(x0 + 1, b, z0 + 1, x1 - 1, b + 13, z1 - 1, T.EMPTY); fill(x0 + 1, b - 1, z0 + 1, x1 - 1, b - 1, z1 - 1, T.PLANK);
    for (const f of [1, 2]) fill(x0 + 1, b + f * 5 - 1, z0 + 1, x1 - 1, b + f * 5 - 1, z1 - 1, T.PLANK);
    for (let k = 0; k < 6; k++) fill(x0 - 1 + k, b + 14 + k, z0 - 1 + k, x1 + 1 - k, b + 14 + k, z1 + 1 - k, T.ROOF);
    fill(mx - 1, b, z1, mx + 1, b + 2, z1, T.EMPTY);
    for (const f of [0, 1, 2]) for (const wx of [x0 + 3, x1 - 4]) fill(wx, b + f * 5 + 1, z1, wx + 1, b + f * 5 + 2, z1, f ? T.CAPGOLD : T.EMPTY);
    for (const f of [1, 2]) for (const wz of [z0 + 5, z1 - 6]) { fill(x0, b + f * 5 + 1, wz, x0, b + f * 5 + 2, wz + 1, T.CAPGOLD); fill(x1, b + f * 5 + 1, wz, x1, b + f * 5 + 2, wz + 1, T.CAPGOLD); }
    fill(x1 - 4, b + 15, z0 + 3, x1 - 3, b + 22, z0 + 4, T.BRICK);
    const stairs = (f, dir) => { const y = b + f * 5, s0 = dir > 0 ? x0 + 3 : x1 - 3; for (let k = 0; k < 5; k++) { const x = s0 + dir * k; fill(x, y, z0 + 1, x, y + k, z0 + 2, T.PLANK); if (k < 4) fill(x, y + 4, z0 + 1, x, y + 4, z0 + 2, T.EMPTY); } };
    stairs(0, 1); stairs(1, -1);
    const y2 = b + 10; fill(x0 + 6, y2, z0 + 1, x0 + 6, y2 + 3, z1 - 1, T.BASALT); fill(x0 + 6, y2, z0 + 7, x0 + 6, y2 + 1, z0 + 9, T.BRICK);
    W0.relics.push({ id: 'key', x: x0 + 3, y: y2, z: z0 + 8 });
    for (const f of [0, 1, 2]) for (let i = 0; i < 6; i++) set(x0 + 8 + i * 2, b + f * 5, z0 + 9 + (i % 2) * 2, T.COIN);
    for (const [f, dx, dz] of [[0, 4, 10], [0, 12, 6], [0, 16, 12], [1, 6, 10], [1, 12, 12], [1, 16, 6], [2, 10, 10], [2, 15, 12]]) W0.ents.push({ t: 'h', x: x0 + dx, y: b + f * 5 + 1, z: z0 + dz, region: 'manor' });
    W0.signs.push({ x: mx + 0.5, y: b + 4.2, z: z1 + 0.8, text: B('幽靈古宅', 'The Haunted Manor') });
    hint(mx + 4, z1 + 3, '幽靈古宅：背對幽靈時它們會靠過來，轉身看著它們就會停下。頂樓有一面裂開的磚牆，用尾巴甩開它。', 'The Haunted Manor: ghosts creep closer while your back is turned and freeze when you look at them. A cracked brick wall on the top floor: swing your tail at it.');
    reserve(x0 - 4, z0 - 4, x1 + 4, z1 + 10);
    W0.regions.push({ id: 'manor', name: B('幽靈古宅', 'The Haunted Manor'), theme: 'fort', sky: 'ghost', box: [x0, b - 1, z0, x1 + 1, b + 15, z1 + 1] }); }
  // penguins on the frozen lake, jellyfish in the deep sea and down the trench
  { const [lx, lz] = LAKE; for (let k = 0; k < 6; k++) W0.ents.push({ t: 'n', x: lx - 15 + k * 6, y: GY, z: lz + (k % 2 ? 6 : -6), region: 'snow' });
    for (let i = 0; i < 400 && W0.ents.filter((e) => e.t === 'j').length < 70; i++) { const x = 40 + Math.floor(rnd() * 740), z = 600 + Math.floor(rnd() * 200), bed = surf(x, z), y = Math.round(bed + 4 + rnd() * Math.max(1, SEA - bed - 12)); if (get(x, y, z) === T.WATER && get(x, y + 2, z) === T.WATER && get(x, y - 2, z) === T.WATER && !reserved[z * W + x]) W0.ents.push({ t: 'j', x, y, z, region: 'abyss' }); }
    const c = COURSES['1-D'], cx = c.ox + 20, cz = c.oz + 20; for (let k = 0; k < 9; k++) { const a = k * 2.1; W0.ents.push({ t: 'j', x: Math.round(cx + Math.cos(a) * 5), y: SEA - 14 - k * 10, z: Math.round(cz + Math.sin(a) * 5), region: '1-D' }); } }

  // ---------------------------------------------------------------- trees, cacti, coins and wandering baddies across the open land
  const bio = (x, z) => BIOME[biome[z * W + x]];
  for (let i = 0; i < 5200; i++) {
    const x = 8 + Math.floor(rnd() * (W - 16)), z = 8 + Math.floor(rnd() * (D - 16)), g = surf(x, z), b = bio(x, z);
    if (reserved[z * W + x] || g <= SEA + 1 || g > Y0 + 44) continue;
    const top = get(x, g - 1, z);
    if (b === 'desert') { if (top === T.SAND && rnd() < 0.35) { const hgt = 2 + Math.floor(rnd() * 3); fill(x, g, z, x, g + hgt - 1, z, T.CACTUS); if (rnd() < 0.6) { set(x + 1, g + 1, z, T.CACTUS); set(x + 1, g + 2, z, T.CACTUS); } } continue; }
    if (b === 'volcano' || b === 'isles' || b === 'abyss') continue;
    if (b === 'peak') { if (top === T.GROUND && g < GY + 60) tree(x, z, 'pine', g); continue; }
    if (b === 'snow') { if (top === T.SNOW || top === T.GROUND) tree(x, z, 'pine', g); continue; }
    if (top !== T.GROUND) continue;
    if (b === 'forest' && rnd() < 0.4) continue;
    tree(x, z, 'oak', g);
  }
  const KINDS = { peak: ['g', 'r', 'w', 'k', 'r', 'b', 'r'], abyss: ['k'], core: ['g', 'g', 'k', 'w', 'g'], snow: ['g', 'n', 'k', 'w', 's', 'n', 'r'], forest: ['g', 'k', 'w', 'g', 'k'], desert: ['c', 'c', 'g', 's', 'k'], volcano: ['s', 'g', 'b', 's', 'k'], isles: ['k', 'g'] };
  for (let i = 0; i < 1050; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z), b = bio(x, z);
    if (reserved[z * W + x] || g <= SEA + 1 || g > Y0 + 42 || get(x, g, z) !== T.EMPTY) continue;
    const ks = KINDS[b], t = ks[Math.floor(rnd() * ks.length)];
    W0.ents.push({ t, x, y: t === 'b' ? g + 4 : g, z, region: b, skin: b, roam: true });
  }
  for (let i = 0; i < 420; i++) {
    const x = 10 + Math.floor(rnd() * (W - 20)), z = 10 + Math.floor(rnd() * (D - 20)), g = surf(x, z);
    if (reserved[z * W + x] || g <= SEA || g > Y0 + 40) continue;
    if (rnd() < 0.5) { for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; set(Math.round(x + Math.cos(a) * 2), g + 2, Math.round(z + Math.sin(a) * 2), T.COIN); } }
    else { const q = [T.QCOIN, T.QCOIN, T.QLEAF, T.QFLOWER, T.Q1UP, T.QTANOOKI][Math.floor(rnd() * 6)]; set(x, g + 3, z, T.BRICK); set(x + 1, g + 3, z, q); set(x + 2, g + 3, z, T.BRICK); }
  }
  // the tallest tree in the heartland wears a star
  { let best = null; for (let z = OZ + 10; z < OZ + 180; z += 1) for (let x = OX + 10; x < OX + 250; x += 1) { const s = surf(x, z); if (get(x, s - 1, z) !== T.LEAVES) continue; if (!best || s > best[2]) best = [x, z, s]; } if (best) star('tall-tree', 'core', best[0], best[2] + 1, best[1]); }
  W0.heightMap = heightMap; W0.biome = biome; W0.surf = surf; W0.seaY = SEA;
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
