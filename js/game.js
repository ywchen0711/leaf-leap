// LEAF LEAP 3D — the rules of a level in 3D: a grid of blocks, how the hero runs, jumps, pounds and flies, enemies,
// blocks and power-ups. No DOM: the page draws what is here, and node tests (tools/test.mjs) play it.
export const T = { EMPTY: 0, GROUND: 1, BRICK: 2, QCOIN: 3, QLEAF: 4, USED: 5, HARD: 6, PIPE: 7, PIPETOP: 8, CLOUD: 9, NOTE: 10, LAVA: 11, Q1UP: 12, QFLOWER: 13, COIN: 14, STONE: 15,
  WATER: 16, QTANOOKI: 17, QFROG: 18, CANNON: 19, PLANK: 20,
  // the open world's land: sand, tree trunks and leaves, plaster walls, roof tiles, the spade panel, snow
  SAND: 21, LOG: 22, LEAVES: 23, WALL: 24, ROOF: 25, SPADE: 26, SNOW: 27 };
const SOLID = new Uint8Array(32); for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]) SOLID[t] = 1;
export const isSolid = (t) => SOLID[t] === 1;
export const isQ = (t) => t === T.QCOIN || t === T.QLEAF || t === T.Q1UP || t === T.QFLOWER || t === T.QTANOOKI || t === T.QFROG;
// powers: 0 small, 1 big, 2 fire, 3 raccoon (the leaf), 4 tanooki suit, 5 frog suit
export const POWER = { SMALL: 0, BIG: 1, FIRE: 2, LEAF: 3, TANOOKI: 4, FROG: 5 };
const hasTail = (h) => h.power === POWER.LEAF || h.power === POWER.TANOOKI;
// tuning, in blocks and seconds
export const PH = { walk: 6, run: 9.5, prun: 12, accel: 32, airAccel: 18, fric: 34, airFric: 6, jump: 16, jumpRun: 0.2, gHold: 34, g: 58, fall: 22,
  stomp: 10, stompHold: 15, fly: 9, flyTime: 4.5, wagFall: 2.4, note: 13, noteHold: 19, pound: 28,
  swim: 3.6, frogSwim: 7.5, frogWalk: 6, stroke: 5.5, sink: 3, waterG: 10, statueTime: 4 };

// the grid: index ((y * d) + z) * w + x; outside the sides is an invisible wall, below is a pit, above is open sky
export const tileAt = (L, x, y, z) => (x < 0 || x >= L.w || z < 0 || z >= L.d ? T.HARD : y < 0 || y >= L.h ? T.EMPTY : L.tiles[(y * L.d + z) * L.w + x]);
function setTile(G, x, y, z, t) { const L = G.L; if (x < 0 || x >= L.w || z < 0 || z >= L.d || y < 0 || y >= L.h) return; L.tiles[(y * L.d + z) * L.w + x] = t; G.ev.push({ t: 'tile', x, y, z }); }
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y && a.z < b.z + b.d && a.z + a.d > b.z;
const flatDist = (a, b) => Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.z + a.d / 2 - (b.z + b.d / 2));

// ---------------------------------------------------------------- moving a box through the grid, one axis at a time
const EXT = { x: 'w', y: 'h', z: 'd' }, OTHER = { x: ['y', 'z'], y: ['x', 'z'], z: ['x', 'y'] };
// returns { x, y, z, t } of the block hit, or null; clouds only hold you from above
function sweep(L, o, axis, dist) {
  if (!dist) return null;
  const before = o[axis]; o[axis] += dist;
  const e = o[EXT[axis]], [p, q] = OTHER[axis];
  const p0 = Math.floor(o[p] + 0.03), p1 = Math.floor(o[p] + o[EXT[p]] - 0.03), q0 = Math.floor(o[q] + 0.03), q1 = Math.floor(o[q] + o[EXT[q]] - 0.03);
  const face = dist > 0 ? Math.floor(o[axis] + e) : Math.floor(o[axis]);
  let best = null, bd = 99;
  for (let i = p0; i <= p1; i++) for (let j = q0; j <= q1; j++) {
    const c = { [axis]: face, [p]: i, [q]: j }, t = tileAt(L, c.x, c.y, c.z);
    if (isSolid(t) || (axis === 'y' && dist < 0 && t === T.CLOUD && before >= face + 1 - 0.001)) {
      const dd = Math.hypot(i + 0.5 - (o[p] + o[EXT[p]] / 2), j + 0.5 - (o[q] + o[EXT[q]] / 2));
      if (dd < bd) { bd = dd; best = { ...c, t }; }
    }
  }
  if (best) o[axis] = dist > 0 ? face - e : face + 1;
  return best;
}
// the height of the floor under a point (for shadows, ledges and the bot)
export function floorBelow(L, x, y, z) { const cx = Math.floor(x), cz = Math.floor(z); for (let yy = Math.min(L.h - 1, Math.floor(y)); yy >= 0; yy--) { const t = tileAt(L, cx, yy, cz); if (isSolid(t) || t === T.CLOUD) return yy + 1; if (t === T.LAVA) return -1; } return -99; }
export const inWater = (L, o) => tileAt(L, Math.floor(o.x + o.w / 2), Math.floor(o.y + Math.min(0.6, o.h * 0.5)), Math.floor(o.z + o.d / 2)) === T.WATER;

// ---------------------------------------------------------------- starting a level
// def: { id, w, h, d, tiles, ents: [{ t, x, y, z }], start: [x, y, z], goal: [x, y, z] | null, check: [x, y, z] | null, theme }
export function newRun(def, opts = {}) {
  const L = { w: def.w, h: def.h, d: def.d, tiles: def.tiles.slice(), theme: def.theme };
  const at = opts.checkpoint && def.check ? def.check : def.start;
  const hero = { x: at[0] + 0.15, y: at[1], z: at[2] + 0.15, w: 0.7, d: 0.7, h: 0.9, vx: 0, vy: 0, vz: 0, face: Math.PI / 2, onGround: true, power: 0, inv: 0, pm: 0, flyT: 0, wag: 0, spin: 0,
    coyote: 0, buffer: 0, dead: false, deadT: 0, prevY: at[1], fireCd: 0, pound: 0, poundT: 0, statue: 0, statueCd: 0, swimming: false, pwing: !!opts.pwing };
  // the P-wing: a raccoon tail and a P-meter that never runs out, for one level
  setPower(hero, opts.pwing && !hasTail({ power: opts.power || 0 }) ? POWER.LEAF : opts.power || 0);
  const cannons = [];
  for (let y = 0; y < L.h; y++) for (let z = 0; z < L.d; z++) for (let x = 0; x < L.w; x++) if (L.tiles[(y * L.d + z) * L.w + x] === T.CANNON) cannons.push({ x, y, z, t: 1 + ((x * 7 + z * 3) % 10) / 4 });
  const spawns = def.ents.filter((e) => ENEMY[e.t]);
  const G = { def, L, hero, enemies: spawns.map(makeEnemy), items: [], fire: [], shots: [], cannons, t: 0, coins: 0, lives: 0, cleared: null, checked: !!opts.checkpoint,
    god: !!opts.god, ev: [], goal: def.goal ? { x: def.goal[0], y: def.goal[1], z: def.goal[2], w: 1, h: 1, d: 1 } : null, bossDown: false,
    world: !!def.world, goals: def.goals || [], checks: def.checks || [], done: { ...(opts.done || {}) }, respawn: opts.at || def.start, spawns, graves: [] };
  if (opts.at) { hero.x = opts.at[0] + 0.15; hero.y = opts.at[1]; hero.z = opts.at[2] + 0.15; hero.prevY = hero.y; }
  return G;
}
export function setPower(h, p) { h.power = p; h.h = p ? 1.75 : 0.9; }
// back on your feet at a checkpoint, as you were but small
export function respawn(G, at, power = 0) {
  const h = G.hero; Object.assign(h, { x: at[0] + 0.15, y: at[1], z: at[2] + 0.15, vx: 0, vy: 0, vz: 0, dead: false, deadT: 0, inv: 2, pm: 0, flyT: 0, pound: 0, statue: 0, spin: 0, prevY: at[1] }); setPower(h, power);
  G.fire = []; G.shots = [];
}

// ---------------------------------------------------------------- enemies
const ENEMY = {
  g: () => ({ kind: 'walker', w: 0.8, d: 0.8, h: 0.8, speed: 1.6 }),
  w: () => ({ kind: 'walker', wings: true, w: 0.8, d: 0.8, h: 0.8, speed: 1.6, hopT: 0.8 }),
  k: () => ({ kind: 'koopa', state: 'walk', w: 0.8, d: 0.8, h: 1.25, speed: 1.6 }),
  p: () => ({ kind: 'plant', w: 0.8, d: 0.8, h: 1.4, speed: 0 }),
  B: () => ({ kind: 'boss', w: 1.5, d: 1.5, h: 1.7, speed: 2.4, hp: 3, hopT: 2.4, big: false }),
  K: () => ({ kind: 'boss', w: 2.1, d: 2.1, h: 2.5, speed: 2, hp: 3, hopT: 2.6, big: true, shotT: 2 }),
  J: () => ({ kind: 'boss', prince: true, w: 1.1, d: 1.1, h: 1.6, speed: 2.8, hp: 3, hopT: 1.8, shotT: 1.6 }),
  f: () => ({ kind: 'fish', w: 0.8, d: 0.8, h: 0.6, speed: 2.2 }),
};
function makeEnemy(e, i) {
  const o = { id: i, spawn: e, region: e.region, x: e.x + 0.1, y: e.y, z: e.z + 0.1, vy: 0, dx: -1, dz: 0, alive: true, active: false, onGround: false, inv: 0, grace: 0, t: 0, ...ENEMY[e.t]() };
  if (o.kind === 'plant') { o.x = e.x + 0.6; o.z = e.z + 0.6; o.baseY = e.y; o.y = e.y - o.h; o.phase = 0; }
  return o;
}
function killEnemy(G, e, how) {
  if (!e.alive) return;
  if (e.kind === 'boss') return hitBoss(G, e, how === 'fire' ? 0.5 : 1);
  e.alive = false; e.how = how; e.deadT = 0;
  if (how !== 'stomp') { e.vy = 8; e.flip = true; }
  G.ev.push({ t: how === 'stomp' ? 'stomp' : 'kick', x: e.x, y: e.y, z: e.z });
}
function hitBoss(G, e, dmg) {
  if (e.inv > 0) return;
  e.hp -= dmg; e.inv = 1.1; G.ev.push({ t: 'bosshit', x: e.x, y: e.y, z: e.z });
  // knocked back, away from you
  const h = G.hero, dx = e.x - h.x, dz = e.z - h.z, l = Math.hypot(dx, dz) || 1; e.kx = dx / l * 5; e.kz = dz / l * 5;
  if (e.hp <= 0) { e.alive = false; e.flip = true; e.vy = 10; e.deadT = 0; G.bossDown = true; G.ev.push({ t: 'bossdown', x: e.x, y: e.y, z: e.z, region: e.region }); }
}
function stepEnemy(G, e, dt) {
  const L = G.L, h = G.hero;
  e.t += dt; if (e.inv > 0) e.inv -= dt; if (e.grace > 0) e.grace -= dt;
  const toH = { x: h.x + h.w / 2 - (e.x + e.w / 2), z: h.z + h.d / 2 - (e.z + e.d / 2) }, dist = Math.hypot(toH.x, toH.z);
  if (e.kind === 'plant') {
    // up out of its pipe for a while, then down; it stays down while you stand right next to the pipe
    const P = 3.6; e.phase += dt;
    if (e.phase % P < 0.05 && dist < 1.9) e.phase = 0;
    const p = e.phase % P, k = p < 0.6 ? p / 0.6 : p < 2 ? 1 : p < 2.6 ? 1 - (p - 2) / 0.6 : 0;
    e.y = e.baseY - e.h + e.h * k; e.out = k > 0.25; e.face = Math.atan2(toH.x, toH.z);
    return;
  }
  if (e.kind === 'fish') {
    // fish swim to and fro, and come after you when you are in the water nearby
    const hw = h.swimming && !h.dead && dist < 7 && Math.abs(h.y - e.y) < 4;
    if (hw) { const k = Math.min(1, dt * 1.2); e.dx += (toH.x / dist - e.dx) * k; e.dz += (toH.z / dist - e.dz) * k; const l = Math.hypot(e.dx, e.dz) || 1; e.dx /= l; e.dz /= l; }
    const px = e.x, py = e.y, pz = e.z, sp = e.speed * (hw ? 1.2 : 1);
    if (sweep(L, e, 'x', e.dx * sp * dt)) e.dx = -e.dx; if (sweep(L, e, 'z', e.dz * sp * dt)) e.dz = -e.dz;
    sweep(L, e, 'y', (hw ? Math.sign(h.y + 0.3 - e.y) * 1.2 : Math.sin(e.t * 2) * 0.4) * dt);
    if (!inWater(L, e)) { e.x = px; e.y = py; e.z = pz; e.dx = -e.dx; e.dz = -e.dz; }
    e.face = Math.atan2(e.dx, e.dz);
    return;
  }
  let vx, vz;
  if (e.kind === 'boss') {
    if (dist > 0.1) { e.dx = toH.x / dist; e.dz = toH.z / dist; }
    const sp = e.speed * (e.hp < 2 ? 1.4 : 1);
    vx = e.dx * sp + (e.kx || 0); vz = e.dz * sp + (e.kz || 0); e.kx = approach(e.kx || 0, 0, 8 * dt); e.kz = approach(e.kz || 0, 0, 8 * dt);
    e.hopT -= dt; if (e.hopT <= 0 && e.onGround) { e.vy = e.big ? 13 : 11; e.hopT = 2 + Math.random(); G.ev.push({ t: 'bosshop', x: e.x, y: e.y, z: e.z }); }
    // the king breathes fire; the prince waves his wand and sends out magic rings
    if (e.big || e.prince) { e.shotT -= dt; if (e.shotT <= 0 && dist < 16) { e.shotT = e.prince ? 2.4 : 3.2; G.shots.push({ kind: e.prince ? 'ring' : 'fire', x: e.x + e.w / 2 - 0.3, y: e.y + e.h * 0.55, z: e.z + e.d / 2 - 0.3, w: 0.6, h: 0.45, d: 0.6, vx: e.dx * (e.prince ? 7 : 6), vz: e.dz * (e.prince ? 7 : 6) }); G.ev.push({ t: e.prince ? 'wand' : 'bossfire' }); } }
  } else {
    // walkers wander, and turn towards you when you come close; shells spin in a straight line
    if (e.kind === 'walker' && dist < 7 && Math.abs(h.y - e.y) < 2.5 && !h.dead) { const k = Math.min(1, dt * 1.5); e.dx += (toH.x / dist - e.dx) * k; e.dz += (toH.z / dist - e.dz) * k; const l = Math.hypot(e.dx, e.dz) || 1; e.dx /= l; e.dz /= l; }
    const sp = e.kind === 'koopa' ? (e.state === 'spin' ? 11 : e.state === 'shell' ? 0 : e.speed) : e.speed;
    vx = e.dx * sp; vz = e.dz * sp;
  }
  if (e.wings && e.onGround) { e.hopT -= dt; if (e.hopT <= 0) { e.vy = 9; e.hopT = 1.1; } }
  e.vy = Math.max(-PH.fall, e.vy - 40 * dt);
  const spin = e.kind === 'koopa' && e.state === 'spin';
  const bounce = (hit, axis) => {
    if (!hit) return;
    if (axis === 'x') e.dx = -e.dx; else e.dz = -e.dz;
    if (spin) { if (hit.t === T.BRICK) { setTile(G, hit.x, hit.y, hit.z, T.EMPTY); G.ev.push({ t: 'break', x: hit.x, y: hit.y, z: hit.z }); } else if (isQ(hit.t)) hitBlock(G, hit.x, hit.y, hit.z); else G.ev.push({ t: 'thud' }); }
  };
  bounce(sweep(L, e, 'x', vx * dt), 'x'); bounce(sweep(L, e, 'z', vz * dt), 'z');
  const r = sweep(L, e, 'y', e.vy * dt);
  e.onGround = !!(r && e.vy < 0); if (r) e.vy = 0;
  // a walking turtle turns round at a ledge
  if (e.kind === 'koopa' && e.state === 'walk' && e.onGround) {
    const fx = e.x + e.w / 2 + e.dx * 0.7, fz = e.z + e.d / 2 + e.dz * 0.7;
    if (floorBelow(L, fx, e.y - 0.1, fz) < e.y - 0.6) { e.dx = -e.dx; e.dz = -e.dz; }
  }
  if (Math.hypot(vx, vz) > 0.3) e.face = Math.atan2(vx, vz);
  if (e.y < -4) e.alive = false;
  if (spin) for (const o of G.enemies) if (o !== e && o.alive && o.active && (o.kind !== 'plant' || o.out) && overlap(e, o)) killEnemy(G, o, 'shell');
}

// ---------------------------------------------------------------- blocks
function hitBlock(G, x, y, z, fromAbove) {
  const t = tileAt(G.L, x, y, z), h = G.hero;
  G.ev.push({ t: 'bumpblock', x, y, z, down: !!fromAbove });
  // whatever stands on the block gets knocked out, and a coin sitting on it is collected
  if (!fromAbove) for (const e of G.enemies) if (e.alive && e.active && e.kind !== 'plant' && e.kind !== 'boss' && e.x + e.w > x && e.x < x + 1 && e.z + e.d > z && e.z < z + 1 && Math.abs(e.y - (y + 1)) < 0.35) killEnemy(G, e, 'bump');
  if (tileAt(G.L, x, y + 1, z) === T.COIN) { setTile(G, x, y + 1, z, T.EMPTY); G.coins++; G.ev.push({ t: 'coin', x, y: y + 1, z }); }
  if (t === T.QCOIN) { setTile(G, x, y, z, T.USED); G.coins++; G.ev.push({ t: 'coin', x, y, z, pop: true }); }
  else if (t === T.QLEAF || t === T.QFLOWER || t === T.Q1UP || t === T.QTANOOKI || t === T.QFROG) {
    setTile(G, x, y, z, T.USED);
    const kind = t === T.Q1UP ? 'oneup' : h.power === POWER.SMALL ? 'mush' : { [T.QLEAF]: 'leaf', [T.QFLOWER]: 'flower', [T.QTANOOKI]: 'tanooki', [T.QFROG]: 'frog' }[t];
    const away = { x: x + 0.5 - (h.x + h.w / 2), z: z + 0.5 - (h.z + h.d / 2) }, l = Math.hypot(away.x, away.z);
    G.items.push({ kind, x: x + 0.1, y: y + 0.2, z: z + 0.1, w: 0.8, h: 0.8, d: 0.8, vx: 0, vy: kind === 'leaf' ? 9 : 0, vz: 0, rise: kind === 'leaf' ? 0 : 0.5, bx: x + 0.1, t: 0,
      dx: l > 0.3 ? away.x / l : 1, dz: l > 0.3 ? away.z / l : 0 });
    G.ev.push({ t: 'sprout', x, y, z });
  } else if (t === T.BRICK) {
    if (h.power > 0 || fromAbove) { setTile(G, x, y, z, T.EMPTY); G.ev.push({ t: 'break', x, y, z }); } else G.ev.push({ t: 'thud' });
  } else G.ev.push({ t: 'thud' });
}

// ---------------------------------------------------------------- the hero
export function hurt(G) {
  const h = G.hero; if (h.inv > 0 || h.dead || G.cleared || G.god || h.statue > 0) return;
  if (h.power >= 2) setPower(h, 1); else if (h.power === 1) setPower(h, 0); else return die(G);
  h.inv = 2; h.flyT = 0; G.ev.push({ t: 'hurt' });
}
export function die(G) { const h = G.hero; if (h.dead) return; h.dead = true; h.deadT = 0; h.vy = 13; h.vx = h.vz = 0; G.ev.push({ t: 'die' }); }
function powerUp(G, kind) {
  const h = G.hero;
  if (kind === 'oneup') { G.lives++; G.ev.push({ t: 'oneup' }); return; }
  const to = kind === 'mush' ? Math.max(1, h.power) : { flower: 2, leaf: 3, tanooki: 4, frog: 5 }[kind];
  if (to !== h.power) { setPower(h, to); const top = Math.floor(h.y + h.h); if (isSolid(tileAt(G.L, Math.floor(h.x + h.w / 2), top, Math.floor(h.z + h.d / 2)))) h.y = Math.max(0, top - h.h); }
  G.ev.push({ t: 'power', kind });
}
// inp: { mx, mz (a direction on the ground, length ≤ 1), jump (held), jumpPressed, run (held), runPressed, poundPressed }
function stepHero(G, inp, dt) {
  const h = G.hero, L = G.L;
  if (h.dead) { h.deadT += dt; if (h.deadT > 0.45) { h.vy -= 38 * dt; h.y += h.vy * dt; } return; }
  if (h.inv > 0) h.inv -= dt; if (h.fireCd > 0) h.fireCd -= dt; if (h.wag > 0) h.wag -= dt; if (h.statueCd > 0) h.statueCd -= dt;
  if (h.pwing) { h.pm = 1; if (h.flyT > 0) h.flyT = Math.max(h.flyT, 1); }
  const was0 = h.swimming; h.swimming = inWater(L, h);
  if (h.swimming && !was0) { G.ev.push({ t: 'splash' }); h.pound = 0; h.flyT = 0; }
  // the tanooki suit: hold the pound button on the ground to turn to stone (nothing can hurt a statue)
  if (h.power === POWER.TANOOKI && inp.pound && h.onGround && !h.swimming && h.statueCd <= 0 && h.statue <= 0) { h.statue = PH.statueTime; G.ev.push({ t: 'statue' }); }
  if (h.statue > 0) { h.statue -= dt; if (!inp.pound || h.statue <= 0 || h.power !== POWER.TANOOKI) { h.statue = 0; h.statueCd = 0.8; G.ev.push({ t: 'unstatue' }); } }
  const want = Math.min(1, Math.hypot(inp.mx || 0, inp.mz || 0)), pFull = h.pm >= 1;
  // the frog suit hops slowly on land but is the fastest swimmer
  const max = (h.swimming ? (h.power === POWER.FROG ? PH.frogSwim : PH.swim) : h.power === POWER.FROG ? PH.frogWalk : inp.run ? (pFull ? PH.prun : PH.run) : PH.walk) * want;
  // steer the velocity towards where the stick points
  if (h.pound || h.statue > 0) { h.vx = h.vz = 0; }
  else {
    const tvx = want > 0.05 ? inp.mx / want * max : 0, tvz = want > 0.05 ? inp.mz / want * max : 0;
    const a = (want > 0.05 ? (h.onGround ? PH.accel : PH.airAccel) : (h.onGround ? PH.fric : PH.airFric)) * dt;
    const dvx = tvx - h.vx, dvz = tvz - h.vz, dl = Math.hypot(dvx, dvz);
    if (dl <= a) { h.vx = tvx; h.vz = tvz; } else { h.vx += dvx / dl * a; h.vz += dvz / dl * a; }
    if (want > 0.05) h.face = Math.atan2(inp.mx, inp.mz);
  }
  const speed = Math.hypot(h.vx, h.vz);
  // the P-meter fills while you run flat out on the ground
  if (h.flyT > 0) { h.flyT -= dt; h.pm = 1; if (h.flyT <= 0) h.pm = 0; }
  else if (h.onGround) { if (inp.run && speed >= PH.run - 0.4) h.pm = Math.min(1, h.pm + dt / 0.9); else h.pm = Math.max(0, h.pm - dt * 1.2); }
  // swimming: strokes up (the frog swims freely: jump rises, pound dives); jump at the surface to leap out
  if (h.swimming) {
    h.pm = 0; h.flyT = 0;
    const surface = tileAt(L, Math.floor(h.x + h.w / 2), Math.floor(h.y + h.h + 0.4), Math.floor(h.z + h.d / 2)) !== T.WATER;
    if (inp.jumpPressed && surface) { h.vy = PH.jump * 0.85; G.ev.push({ t: 'jump' }); }
    else if (h.power === POWER.FROG) { const tvy = inp.jump ? 5 : inp.pound ? -5 : -0.6; h.vy = approach(h.vy, tvy, 24 * dt); }
    else { if (inp.jumpPressed) { h.vy = PH.stroke; G.ev.push({ t: 'swim' }); } h.vy = Math.max(-PH.sink, h.vy - PH.waterG * dt); }
    h.buffer = 0; h.coyote = 0;
  }
  // jumping (a little forgiveness both before landing and after leaving a ledge)
  h.coyote = h.swimming ? 0 : h.onGround ? 0.09 : h.coyote - dt; h.buffer = h.swimming ? 0 : inp.jumpPressed ? 0.12 : h.buffer - dt;
  if (h.statue > 0 || h.swimming) { /* no jumping as a statue, and swimming is handled above */ }
  else if (!h.pound && h.buffer > 0 && h.coyote > 0) { h.vy = PH.jump + speed * PH.jumpRun; h.onGround = false; h.coyote = 0; h.buffer = 0; G.ev.push({ t: 'jump' }); }
  else if (!h.pound && inp.jumpPressed && !h.onGround && hasTail(h)) {
    // with the leaf: a full P-meter lets you fly; otherwise a wag of the tail slows the fall
    if (h.pm >= 1) { if (h.flyT <= 0) h.flyT = PH.flyTime; h.vy = PH.fly; G.ev.push({ t: 'fly' }); } else { h.wag = 0.32; G.ev.push({ t: 'wag' }); }
    h.buffer = 0;
  }
  // the ground pound: a moment in the air, then straight down
  if (inp.poundPressed && !h.onGround && !h.pound && !h.swimming && h.y > 0.5) { h.pound = 1; h.poundT = 0.18; h.vy = 0; h.flyT = 0; G.ev.push({ t: 'spinup' }); }
  if (h.pound === 1) { h.poundT -= dt; h.vy = 0; if (h.poundT <= 0) { h.pound = 2; h.vy = -PH.pound; } }
  else if (h.pound !== 2 && !h.swimming) {
    h.vy -= (h.vy > 0 && inp.jump ? PH.gHold : PH.g) * dt;
    if (hasTail(h) && h.vy < -PH.wagFall && (h.wag > 0 || inp.jump)) h.vy = -PH.wagFall;
    h.vy = Math.max(-PH.fall, h.vy);
  }
  // the tail spin and fireballs (the run button)
  if (inp.runPressed && hasTail(h) && h.spin <= 0 && h.statue <= 0) { h.spin = 0.32; G.ev.push({ t: 'tail' }); h.spun = new Set(); }
  if (inp.runPressed && h.power === POWER.FIRE && h.fireCd <= 0 && G.fire.length < 2) {
    h.fireCd = 0.18; const fx = Math.sin(h.face), fz = Math.cos(h.face);
    G.fire.push({ x: h.x + h.w / 2 - 0.2 + fx * 0.6, y: h.y + h.h * 0.55, z: h.z + h.d / 2 - 0.2 + fz * 0.6, w: 0.4, h: 0.4, d: 0.4, vx: fx * 13, vz: fz * 13, vy: -3, life: 2.5 }); G.ev.push({ t: 'fire' });
  }
  // nobody flies off the top of the world
  if (h.y > L.h + 3 && h.vy > 0) h.vy = 0;
  h.prevY = h.y;
  if (sweep(L, h, 'x', h.vx * dt)) h.vx = 0;
  if (sweep(L, h, 'z', h.vz * dt)) h.vz = 0;
  const r = sweep(L, h, 'y', h.vy * dt), falling = h.vy <= 0;
  const was = h.onGround; h.onGround = false;
  if (r && falling) {
    if (h.pound === 2) {
      // landing a pound: breaks the brick (or hits the ? block) underneath and knocks out enemies close by
      h.pound = 0; G.ev.push({ t: 'pound', x: h.x, y: h.y, z: h.z });
      const cells = new Set(); for (const [ox, oz] of [[0.1, 0.1], [h.w - 0.1, 0.1], [0.1, h.d - 0.1], [h.w - 0.1, h.d - 0.1]]) cells.add(Math.floor(h.x + ox) + ',' + Math.floor(h.z + oz));
      for (const c of cells) { const [cx, cz] = c.split(',').map(Number), t = tileAt(L, cx, r.y, cz); if (t === T.BRICK || isQ(t)) hitBlock(G, cx, r.y, cz, true); }
      for (const e of G.enemies) if (e.alive && e.active && e.kind !== 'plant' && flatDist(h, e) < 2 && Math.abs(e.y - h.y) < 1.2) killEnemy(G, e, 'pound');
    } else if (!was && h.vy < -10) G.ev.push({ t: 'land' });
    h.vy = 0; h.onGround = true;
    if (r.t === T.NOTE) { h.vy = inp.jump ? PH.noteHold : PH.note; h.onGround = false; G.ev.push({ t: 'note' }); G.ev.push({ t: 'bumpblock', x: r.x, y: r.y, z: r.z, down: true }); }
  } else if (r && !falling) { h.vy = -0.5; hitBlock(G, r.x, r.y, r.z); }
  if (h.spin > 0) {
    // a spin of the tail all round you
    h.spin -= dt;
    const box = { x: h.x - 0.85, y: h.y + 0.15, z: h.z - 0.85, w: h.w + 1.7, h: 0.9, d: h.d + 1.7 };
    for (const e of G.enemies) if (e.alive && e.active && (e.kind !== 'plant' || e.out) && overlap(box, e) && !h.spun.has(e)) { h.spun.add(e); killEnemy(G, e, 'tail'); }
    const ty = Math.floor(h.y + 0.5);
    for (let tx = Math.floor(box.x); tx <= Math.floor(box.x + box.w); tx++) for (let tz = Math.floor(box.z); tz <= Math.floor(box.z + box.d); tz++) {
      const key = tx + ',' + tz; if (h.spun.has(key)) continue; const t = tileAt(L, tx, ty, tz);
      if (t === T.BRICK || isQ(t)) { h.spun.add(key); if (t === T.BRICK) { setTile(G, tx, ty, tz, T.EMPTY); G.ev.push({ t: 'break', x: tx, y: ty, z: tz }); } else hitBlock(G, tx, ty, tz); }
    }
  }
  // coins and lava where you are
  for (let y = Math.floor(h.y); y <= Math.floor(h.y + h.h - 0.01); y++) for (let z = Math.floor(h.z); z <= Math.floor(h.z + h.d - 0.01); z++) for (let x = Math.floor(h.x); x <= Math.floor(h.x + h.w - 0.01); x++) {
    const t = tileAt(L, x, y, z);
    if (t === T.COIN) { setTile(G, x, y, z, T.EMPTY); G.coins++; G.ev.push({ t: 'coin', x, y, z }); }
    else if (t === T.LAVA && h.y < y + 0.6) { if (!G.god) die(G); else { G.lava = true; h.vy = 16; } }
  }
  if (h.y < -3) { if (G.god) G.fell = true; die(G); }
  // the checkpoint
  if (!G.world && !G.checked && G.def.check && h.x > G.def.check[0]) { G.checked = true; G.ev.push({ t: 'check' }); }
  if (G.world) { const hz = h.z + h.d / 2; for (const c of G.checks) if (h.x > c.x && h.x < c.x + 2.5 && hz >= c.z0 && hz <= c.z1 && Math.abs(h.y - c.y) < 4 && G.respawn !== c.at) { c.at = c.at || [c.x, c.y, c.z]; if (G.respawn !== c.at) { G.respawn = c.at; if (!c.start) G.ev.push({ t: 'check', region: c.region }); else G.ev.push({ t: 'arrive', region: c.region }); } } }
}

// ---------------------------------------------------------------- one step of everything
export function step(G, inp, dt) {
  G.ev = []; G.t += dt;
  const h = G.hero;
  stepHero(G, G.cleared ? { mx: 1, mz: 0 } : inp, dt);
  // enemies wake up as you get near
  for (const e of G.enemies) {
    const fd = flatDist(e, h);
    if (!e.active && fd < 20) e.active = true;
    if (!e.active || (G.world && fd > 48 && e.alive)) continue;
    if (!e.alive) { e.deadT += dt; if (e.flip) { e.vy -= 40 * dt; e.y += e.vy * dt; } continue; }
    stepEnemy(G, e, dt);
  }
  if (G.world) for (const e of G.enemies) if (!e.alive && e.deadT >= 1.5 && e.kind !== 'boss') G.graves.push({ spawn: e.spawn, t: G.t });
  G.enemies = G.enemies.filter((e) => e.alive || e.deadT < 1.5);
  if (G.world && G.graves.length && Math.floor(G.t) !== Math.floor(G.t - dt)) {
    G.graves = G.graves.filter((g) => { const far = Math.hypot(g.spawn.x - h.x, g.spawn.z - h.z) > 34; if (G.t - g.t > 50 && far) { G.enemies.push(makeEnemy(g.spawn, G.enemies.length + 1000)); return false; } return true; });
  }
  // you and the enemies
  if (!h.dead && !G.cleared) for (const e of G.enemies) {
    if (!e.alive || !e.active || (e.kind === 'plant' && !e.out) || !overlap(h, e)) continue;
    const fromAbove = h.vy <= 0.5 && h.prevY >= e.y + e.h * 0.4;
    if (h.statue > 0) continue;
    if (e.kind === 'plant' || (e.kind === 'fish' && !fromAbove)) { hurt(G); continue; }
    if (e.kind === 'fish') { killEnemy(G, e, 'stomp'); h.vy = PH.stomp; continue; }
    if (fromAbove) {
      if (h.pound) { h.pound = 0; }
      h.vy = inp.jump ? PH.stompHold : PH.stomp; h.y = e.y + e.h;
      if (e.kind === 'walker') { if (e.wings) { e.wings = false; G.ev.push({ t: 'stomp' }); } else killEnemy(G, e, 'stomp'); }
      else if (e.kind === 'koopa') {
        if (e.state === 'walk') { e.state = 'shell'; e.h = 0.8; }
        else if (e.state === 'shell') kick(G, e);
        else e.state = 'shell';
        G.ev.push({ t: 'stomp' });
      } else if (e.kind === 'boss') { if (e.inv > 0) G.ev.push({ t: 'stomp' }); else hitBoss(G, e, 1); }
    } else if (e.kind === 'koopa' && e.state === 'shell') { kick(G, e); G.ev.push({ t: 'kick' }); }
    else if (!(e.kind === 'koopa' && e.grace > 0)) hurt(G);
  }
  // items
  for (const it of G.items) {
    it.t += dt;
    if (it.rise > 0) { it.rise -= dt; it.y += dt * 1.6; continue; }
    if (it.kind === 'leaf') { if (it.vy > 0) { it.vy -= 30 * dt; it.y += it.vy * dt; } else { it.y -= 1.3 * dt; it.x = it.bx + Math.sin(it.t * 3) * 1.1; } }
    else if (it.kind !== 'flower' && it.kind !== 'tanooki' && it.kind !== 'frog') {
      it.vy = Math.max(-PH.fall, it.vy - 40 * dt);
      if (sweep(G.L, it, 'x', it.dx * 3 * dt)) it.dx = -it.dx; if (sweep(G.L, it, 'z', it.dz * 3 * dt)) it.dz = -it.dz;
      if (sweep(G.L, it, 'y', it.vy * dt)) it.vy = 0;
    }
    if (!h.dead && overlap(h, it)) { it.gone = true; powerUp(G, it.kind); }
    if (it.y < -3) it.gone = true;
  }
  G.items = G.items.filter((i) => !i.gone);
  // fireballs bounce along and knock out enemies
  for (const f of G.fire) {
    f.life -= dt; f.vy -= 50 * dt;
    if (sweep(G.L, f, 'x', f.vx * dt) || sweep(G.L, f, 'z', f.vz * dt)) { f.gone = true; G.ev.push({ t: 'puff', x: f.x, y: f.y, z: f.z }); }
    if (sweep(G.L, f, 'y', f.vy * dt)) f.vy = f.vy < 0 ? 8 : -1;
    for (const e of G.enemies) if (!f.gone && e.alive && e.active && (e.kind !== 'plant' || e.out) && overlap(f, e)) { f.gone = true; killEnemy(G, e, 'fire'); }
    if (f.life <= 0 || f.y < -2) f.gone = true;
  }
  G.fire = G.fire.filter((f) => !f.gone);
  // cannons on the airship fire balls towards you when you are near
  for (const c of G.cannons || []) {
    c.t -= dt; const dx = h.x + h.w / 2 - (c.x + 0.5);
    if (c.t <= 0 && Math.abs(dx) < 16 && Math.abs(dx) > 2 && Math.abs(h.z - c.z) < 10 && Math.abs(h.y - c.y) < 8 && !h.dead) {
      c.t = 3.2; const dir = Math.sign(dx);
      if (!isSolid(tileAt(G.L, c.x + dir, c.y, c.z))) { G.shots.push({ kind: 'ball', x: c.x + 0.5 + dir * 0.6 - 0.3, y: c.y + 0.2, z: c.z + 0.2, w: 0.6, h: 0.6, d: 0.6, vx: dir * 4.5, vz: 0 }); G.ev.push({ t: 'cannon', x: c.x, y: c.y, z: c.z }); }
    }
  }
  // shots: the king's fireballs, the prince's rings, cannon balls (which you can stomp)
  for (const s of G.shots) {
    s.x += s.vx * dt; s.z += s.vz * dt; s.t = (s.t || 0) + dt;
    if (!h.dead && overlap(h, s)) { if (s.kind === 'ball' && h.vy <= 0.5 && h.prevY >= s.y + s.h * 0.4) { h.vy = inp.jump ? PH.stompHold : PH.stomp; G.ev.push({ t: 'stomp' }); } else if (h.statue <= 0) hurt(G); s.gone = true; }
    if (isSolid(tileAt(G.L, Math.floor(s.x + 0.3), Math.floor(s.y + 0.2), Math.floor(s.z + 0.3))) || s.t > 5) s.gone = true;
  }
  G.shots = G.shots.filter((s) => !s.gone);
  // the goal: a box of spinning cards over a finish line across the course; crossing it ends the level with whichever card shows
  if (G.goal && !G.cleared && !h.dead && h.x + h.w > G.goal.x + 0.3 && h.y < G.goal.y + 7) { G.cleared = cardAt(G.t); G.ev.push({ t: 'clear', card: G.cleared }); }
  if (G.bossDown && !G.cleared && !h.dead && !G.world) { G.cleared = 'star'; G.ev.push({ t: 'clear', card: 'star', boss: true }); }
  if (G.world && !h.dead) { const hz = h.z + h.d / 2; for (const g of G.goals) if (h.x + h.w > g.x + 0.3 && h.x < g.x + 2 && hz >= g.z0 && hz <= g.z1 && h.y < g.y + 7 && h.y > g.y - 4 && !g.passed) { g.passed = true; const card = cardAt(G.t); G.ev.push({ t: 'clear', card, region: g.region, again: !!G.done[g.region] }); G.done[g.region] = true; } else if (h.x + h.w < g.x - 2 || h.x > g.x + 6) g.passed = false; }
  return G.ev;
}
function kick(G, e) {
  const h = G.hero, dx = e.x + e.w / 2 - (h.x + h.w / 2), dz = e.z + e.d / 2 - (h.z + h.d / 2), l = Math.hypot(dx, dz) || 1;
  e.state = 'spin'; e.dx = dx / l; e.dz = dz / l; e.grace = 0.3;
}
export const CARDS = ['mush', 'flower', 'star'];
export const cardAt = (t) => CARDS[Math.floor(t * 6) % 3];
