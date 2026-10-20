// LEAF LEAP — the rules of a level: tiles, how the hero runs, jumps and flies, enemies, blocks and power-ups.
// No DOM: the page draws what is here, and node tests (tools/test.mjs) play it.
export const T = { EMPTY: 0, GROUND: 1, BRICK: 2, QCOIN: 3, QLEAF: 4, USED: 5, HARD: 6, PIPE: 7, PIPETOP: 8, CLOUD: 9, NOTE: 10, LAVA: 11, Q1UP: 12, QFLOWER: 13, COIN: 14, STONE: 15 };
const SOLID = new Uint8Array(32); for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 13, 15]) SOLID[t] = 1;
export const isSolid = (t) => SOLID[t] === 1;
export const isQ = (t) => t === T.QCOIN || t === T.QLEAF || t === T.Q1UP || t === T.QFLOWER;
// powers: 0 small, 1 big, 2 fire, 3 leaf
export const POWER = { SMALL: 0, BIG: 1, FIRE: 2, LEAF: 3 };
// tuning, in tiles and seconds
export const PH = { walk: 5.5, run: 8.5, prun: 11, accel: 18, airAccel: 14, skid: 40, fric: 24, jump: 16, jumpRun: 0.22, gHold: 34, g: 75, fall: 20,
  stomp: 10, stompHold: 15, fly: 9, flyTime: 4.5, wagFall: 2.4, note: 13, noteHold: 19 };

export const tileAt = (L, x, y) => (x < 0 || x >= L.w ? T.HARD : y < 0 || y >= L.h ? T.EMPTY : L.tiles[y * L.w + x]);
function setTile(G, x, y, t) { const L = G.L; if (x < 0 || x >= L.w || y < 0 || y >= L.h) return; L.tiles[y * L.w + x] = t; G.ev.push({ t: 'tile', x, y }); }
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------------------------------------------------------------- moving a box through the tiles
function moveX(L, o, dx) {
  o.x += dx; const y0 = Math.floor(o.y + 0.02), y1 = Math.floor(o.y + o.h - 0.02);
  if (dx > 0) { const tx = Math.floor(o.x + o.w); for (let y = y0; y <= y1; y++) if (isSolid(tileAt(L, tx, y))) { o.x = tx - o.w; return { x: tx, y }; } }
  else if (dx < 0) { const tx = Math.floor(o.x); for (let y = y0; y <= y1; y++) if (isSolid(tileAt(L, tx, y))) { o.x = tx + 1; return { x: tx, y }; } }
  return null;
}
// returns { hit: 'floor' | 'ceil', x, y, t }; clouds only hold you from above
function moveY(L, o, dy) {
  const before = o.y; o.y += dy;
  const x0 = Math.floor(o.x + 0.04), x1 = Math.floor(o.x + o.w - 0.04);
  if (dy < 0) {
    const ty = Math.floor(o.y);
    for (let x = x0; x <= x1; x++) { const t = tileAt(L, x, ty); if (isSolid(t) || (t === T.CLOUD && before >= ty + 1 - 0.001)) { o.y = ty + 1; return { hit: 'floor', x, y: ty, t }; } }
  } else if (dy > 0) {
    const ty = Math.floor(o.y + o.h); let best = null, bd = 9;
    for (let x = x0; x <= x1; x++) { const t = tileAt(L, x, ty); if (isSolid(t)) { const d = Math.abs(x + 0.5 - (o.x + o.w / 2)); if (d < bd) { bd = d; best = { hit: 'ceil', x, y: ty, t }; } } }
    if (best) { o.y = ty - o.h; return best; }
  }
  return null;
}

// ---------------------------------------------------------------- starting a level
// def: { id, w, h, tiles (Uint8Array), ents: [{ t, x, y }], start: [x, y], goal: [x, y] | null, check: x | null, theme }
export function newRun(def, opts = {}) {
  const L = { w: def.w, h: def.h, tiles: def.tiles.slice(), theme: def.theme };
  const at = opts.checkpoint && def.check != null ? [def.check, def.checkY ?? 2] : def.start;
  const hero = { x: at[0] + 0.12, y: at[1], w: 0.75, h: 0.9, vx: 0, vy: 0, dir: 1, onGround: true, power: 0, inv: 0, pm: 0, flyT: 0, wag: 0, spin: 0, coyote: 0, buffer: 0, dead: false, deadT: 0, prevY: at[1], fireCd: 0 };
  setPower(hero, opts.power || 0);
  const G = { def, L, hero, enemies: def.ents.filter((e) => ENEMY[e.t]).map(makeEnemy), items: [], fire: [], shots: [], t: 0, coins: 0, lives: 0, cleared: null, checked: !!opts.checkpoint, god: !!opts.god, ev: [], goal: def.goal ? { x: def.goal[0], y: def.goal[1], w: 1, h: 1 } : null, bossDown: false };
  return G;
}
export function setPower(h, p) { const was = h.h; h.power = p; h.h = p ? 1.75 : 0.9; if (h.h !== was) h.y += 0; }

// ---------------------------------------------------------------- enemies
const ENEMY = {
  g: (e) => ({ kind: 'walker', w: 0.8, h: 0.8, vx: -1.6 }),
  w: (e) => ({ kind: 'walker', wings: true, w: 0.8, h: 0.8, vx: -1.6, hopT: 0.8 }),
  k: (e) => ({ kind: 'koopa', state: 'walk', w: 0.8, h: 1.25, vx: -1.6 }),
  p: (e) => ({ kind: 'plant', w: 0.8, h: 1.4, vx: 0, gravityless: true, baseY: e.y, phase: 0 }),
  B: (e) => ({ kind: 'boss', w: 1.5, h: 1.7, vx: -2.4, hp: 3, hopT: 2.4, big: false }),
  K: (e) => ({ kind: 'boss', w: 2.1, h: 2.5, vx: -2, hp: 3, hopT: 2.6, big: true, shotT: 2 }),
};
function makeEnemy(e, i) {
  const o = { id: i, x: e.x + 0.1, y: e.y, vy: 0, alive: true, active: false, onGround: false, inv: 0, grace: 0, t: 0, ...ENEMY[e.t](e) };
  if (o.kind === 'plant') { o.x = e.x + 0.6; o.y = e.y - o.h; }
  return o;
}
function killEnemy(G, e, how) {
  if (!e.alive) return;
  if (e.kind === 'boss') return hitBoss(G, e, how === 'fire' ? 0.5 : 1);
  e.alive = false; e.how = how; e.deadT = 0;
  if (how !== 'stomp') { e.vy = 8; e.flip = true; }
  G.ev.push({ t: how === 'stomp' ? 'stomp' : 'kick', x: e.x, y: e.y });
}
function hitBoss(G, e, dmg) {
  if (e.inv > 0) return;
  e.hp -= dmg; e.inv = 1.1; G.ev.push({ t: 'bosshit', x: e.x, y: e.y });
  e.vx = (G.hero.x < e.x ? 1 : -1) * (e.big ? 3.2 : 3.6);
  if (e.hp <= 0) { e.alive = false; e.flip = true; e.vy = 10; e.deadT = 0; G.bossDown = true; G.ev.push({ t: 'bossdown', x: e.x, y: e.y }); }
}
function stepEnemy(G, e, dt) {
  const L = G.L, h = G.hero;
  e.t += dt; if (e.inv > 0) e.inv -= dt; if (e.grace > 0) e.grace -= dt;
  if (e.kind === 'plant') {
    // up out of its pipe for a while, then down; it stays down while you stand right next to the pipe
    const P = 3.6; e.phase += dt;
    const near = Math.abs(h.x + h.w / 2 - (e.x + e.w / 2)) < 1.7;
    if (e.phase % P < 0.05 && near) e.phase = 0;
    const p = e.phase % P, k = p < 0.6 ? p / 0.6 : p < 2 ? 1 : p < 2.6 ? 1 - (p - 2) / 0.6 : 0;
    e.y = e.baseY - e.h + e.h * k; e.out = k > 0.25;
    return;
  }
  if (e.kind === 'boss') {
    const dir = h.x + h.w / 2 < e.x + e.w / 2 ? -1 : 1;
    if (e.inv <= 0) e.vx = approach(e.vx, dir * (e.big ? 2 : 2.4) * (e.hp < 2 ? 1.4 : 1), 6 * dt);
    e.hopT -= dt; if (e.hopT <= 0 && e.onGround) { e.vy = e.big ? 13 : 11; e.hopT = 2 + Math.random(); G.ev.push({ t: 'bosshop', x: e.x, y: e.y }); }
    if (e.big) { e.shotT -= dt; if (e.shotT <= 0) { e.shotT = 3.2; G.shots.push({ x: e.x + (dir > 0 ? e.w : -0.6), y: e.y + e.h * 0.6, w: 0.7, h: 0.45, vx: dir * 6 }); G.ev.push({ t: 'bossfire', x: e.x, y: e.y }); } }
  }
  if (e.wings && e.onGround) { e.hopT -= dt; if (e.hopT <= 0) { e.vy = 9; e.hopT = 1.1; } }
  if (e.kind === 'koopa' && e.state === 'shell') e.vx = 0;
  e.vy = Math.max(-PH.fall, e.vy - 40 * dt);
  const wall = moveX(L, e, e.vx * dt);
  if (wall) {
    if (e.kind === 'koopa' && e.state === 'spin') { const t = tileAt(L, wall.x, wall.y); if (t === T.BRICK) { setTile(G, wall.x, wall.y, T.EMPTY); G.ev.push({ t: 'break', x: wall.x, y: wall.y }); } else if (isQ(t)) hitBlock(G, wall.x, wall.y); else G.ev.push({ t: 'thud', x: e.x, y: e.y }); }
    e.vx = -e.vx;
  }
  const r = moveY(L, e, e.vy * dt);
  e.onGround = !!(r && r.hit === 'floor'); if (r) e.vy = 0;
  // a walking turtle turns round at a ledge
  if (e.kind === 'koopa' && e.state === 'walk' && e.onGround) {
    const fx = e.vx > 0 ? Math.floor(e.x + e.w + 0.05) : Math.floor(e.x - 0.05), below = tileAt(L, fx, Math.floor(e.y - 0.5));
    if (!isSolid(below) && below !== T.CLOUD) e.vx = -e.vx;
  }
  if (e.y < -4) e.alive = false;
  // a spinning shell knocks out whatever it hits
  if (e.kind === 'koopa' && e.state === 'spin') for (const o of G.enemies) if (o !== e && o.alive && o.active && (o.kind !== 'plant' || o.out) && overlap(e, o)) killEnemy(G, o, 'shell');
}

// ---------------------------------------------------------------- blocks
function hitBlock(G, x, y) {
  const t = tileAt(G.L, x, y), h = G.hero;
  G.ev.push({ t: 'bumpblock', x, y });
  // whatever stands on the block gets knocked out, and a coin sitting on it is collected
  for (const e of G.enemies) if (e.alive && e.active && e.kind !== 'plant' && e.kind !== 'boss' && e.x + e.w > x && e.x < x + 1 && Math.abs(e.y - (y + 1)) < 0.35) killEnemy(G, e, 'bump');
  if (tileAt(G.L, x, y + 1) === T.COIN) { setTile(G, x, y + 1, T.EMPTY); G.coins++; G.ev.push({ t: 'coin', x, y: y + 1 }); }
  if (t === T.QCOIN) { setTile(G, x, y, T.USED); G.coins++; G.ev.push({ t: 'coin', x, y, pop: true }); }
  else if (t === T.QLEAF || t === T.QFLOWER || t === T.Q1UP) {
    setTile(G, x, y, T.USED);
    const kind = t === T.Q1UP ? 'oneup' : h.power === POWER.SMALL ? 'mush' : t === T.QLEAF ? 'leaf' : 'flower';
    G.items.push({ kind, x: x + 0.1, y: y + 0.2, w: 0.8, h: 0.8, vx: 0, vy: kind === 'leaf' ? 9 : 0, rise: kind === 'leaf' ? 0 : 0.5, bx: x + 0.1, t: 0, dir: h.x + h.w / 2 < x + 0.5 ? 1 : -1 });
    G.ev.push({ t: 'sprout', x, y });
  } else if (t === T.BRICK) {
    if (h.power > 0) { setTile(G, x, y, T.EMPTY); G.ev.push({ t: 'break', x, y }); } else G.ev.push({ t: 'thud', x, y });
  } else G.ev.push({ t: 'thud', x, y });
}

// ---------------------------------------------------------------- the hero
export function hurt(G) {
  const h = G.hero; if (h.inv > 0 || h.dead || G.cleared || G.god) return;
  if (h.power >= 2) setPower(h, 1); else if (h.power === 1) setPower(h, 0); else return die(G);
  h.inv = 2; h.flyT = 0; G.ev.push({ t: 'hurt' });
}
export function die(G) { const h = G.hero; if (h.dead) return; h.dead = true; h.deadT = 0; h.vy = 13; h.vx = 0; G.ev.push({ t: 'die' }); }
function powerUp(G, kind) {
  const h = G.hero;
  if (kind === 'oneup') { G.lives++; G.ev.push({ t: 'oneup' }); return; }
  const to = kind === 'mush' ? Math.max(1, h.power) : kind === 'flower' ? 2 : 3;
  if (to !== h.power) {
    setPower(h, to);
    // growing under a low ceiling: duck down into the free space
    const top = Math.floor(h.y + h.h); if (isSolid(tileAt(G.L, Math.floor(h.x + h.w / 2), top))) h.y = Math.max(h.y, top - h.h);
  }
  G.ev.push({ t: 'power', kind });
}
// inp: { left, right, jump (held), jumpPressed, run (held), runPressed }
function stepHero(G, inp, dt) {
  const h = G.hero, L = G.L;
  if (h.dead) { h.deadT += dt; if (h.deadT > 0.45) { h.vy -= 38 * dt; h.y += h.vy * dt; } return; }
  if (h.inv > 0) h.inv -= dt; if (h.fireCd > 0) h.fireCd -= dt; if (h.wag > 0) h.wag -= dt;
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), pFull = h.pm >= 1;
  const max = inp.run ? (pFull ? PH.prun : PH.run) : PH.walk;
  if (dir) { h.vx += dir * (!h.onGround ? PH.airAccel : h.vx * dir < 0 ? PH.skid : PH.accel) * dt; h.dir = dir; }
  if (!dir) h.vx = approach(h.vx, 0, (h.onGround ? PH.fric : 5) * dt);
  else if (Math.abs(h.vx) > max) h.vx = approach(h.vx, Math.sign(h.vx) * max, PH.fric * dt);
  // the P-meter fills while you run flat out on the ground
  if (h.flyT > 0) { h.flyT -= dt; h.pm = 1; if (h.flyT <= 0) h.pm = 0; }
  else if (h.onGround) { if (inp.run && dir && Math.abs(h.vx) >= PH.run - 0.3) h.pm = Math.min(1, h.pm + dt / 0.9); else h.pm = Math.max(0, h.pm - dt * 1.2); }
  // jumping (a little forgiveness both before landing and after leaving a ledge)
  h.coyote = h.onGround ? 0.09 : h.coyote - dt; h.buffer = inp.jumpPressed ? 0.12 : h.buffer - dt;
  if (h.buffer > 0 && h.coyote > 0) { h.vy = PH.jump + Math.abs(h.vx) * PH.jumpRun; h.onGround = false; h.coyote = 0; h.buffer = 0; G.ev.push({ t: 'jump' }); }
  else if (inp.jumpPressed && !h.onGround && h.power === POWER.LEAF) {
    // with the leaf: a full P-meter lets you fly; otherwise a wag of the tail slows the fall
    if (h.pm >= 1) { if (h.flyT <= 0) h.flyT = PH.flyTime; h.vy = PH.fly; G.ev.push({ t: 'fly' }); }
    else { h.wag = 0.32; G.ev.push({ t: 'wag' }); }
    h.buffer = 0;
  }
  h.vy -= (h.vy > 0 && inp.jump ? PH.gHold : PH.g) * dt;
  if (h.power === POWER.LEAF && h.vy < -PH.wagFall && (h.wag > 0 || inp.jump)) h.vy = -PH.wagFall;
  h.vy = Math.max(-PH.fall, h.vy);
  // the tail spin and fireballs (the run button)
  if (inp.runPressed && h.power === POWER.LEAF && h.spin <= 0) { h.spin = 0.32; G.ev.push({ t: 'tail' }); h.spun = new Set(); }
  if (inp.runPressed && h.power === POWER.FIRE && h.fireCd <= 0 && G.fire.length < 2) { h.fireCd = 0.18; G.fire.push({ x: h.dir > 0 ? h.x + h.w : h.x - 0.4, y: h.y + h.h * 0.55, w: 0.4, h: 0.4, vx: h.dir * 12, vy: -3, life: 2.5 }); G.ev.push({ t: 'fire' }); }
  h.prevY = h.y;
  if (moveX(L, h, h.vx * dt)) h.vx = 0;
  const r = moveY(L, h, h.vy * dt);
  const was = h.onGround; h.onGround = false;
  if (r && r.hit === 'floor') {
    if (!was && h.vy < -10) G.ev.push({ t: 'land' });
    h.vy = 0; h.onGround = true;
    if (r.t === T.NOTE) { h.vy = inp.jump ? PH.noteHold : PH.note; h.onGround = false; G.ev.push({ t: 'note', x: r.x, y: r.y }); G.ev.push({ t: 'bumpblock', x: r.x, y: r.y, down: true }); }
  } else if (r && r.hit === 'ceil') { h.vy = -0.5; hitBlock(G, r.x, r.y); }
  if (h.spin > 0) {
    h.spin -= dt;
    const box = { x: h.x - 0.8, y: h.y + 0.15, w: h.w + 1.6, h: 0.9 };
    for (const e of G.enemies) if (e.alive && e.active && (e.kind !== 'plant' || e.out) && overlap(box, e) && !h.spun.has(e)) { h.spun.add(e); killEnemy(G, e, 'tail'); }
    const ty = Math.floor(h.y + 0.5);
    for (const tx of [Math.floor(box.x), Math.floor(box.x + box.w)]) { if (h.spun.has(tx + ',' + ty)) continue; const t = tileAt(L, tx, ty); if (t === T.BRICK || isQ(t)) { h.spun.add(tx + ',' + ty); hitBlock(G, tx, ty); if (t === T.BRICK) { setTile(G, tx, ty, T.EMPTY); G.ev.push({ t: 'break', x: tx, y: ty }); } } }
  }
  // coins and lava under you
  for (let y = Math.floor(h.y); y <= Math.floor(h.y + h.h - 0.01); y++) for (let x = Math.floor(h.x); x <= Math.floor(h.x + h.w - 0.01); x++) {
    const t = tileAt(L, x, y);
    if (t === T.COIN) { setTile(G, x, y, T.EMPTY); G.coins++; G.ev.push({ t: 'coin', x, y }); }
    else if (t === T.LAVA && h.y < y + 0.6) { if (!G.god) die(G); else { h.vy = 16; } }
  }
  if (h.y < -2) { if (G.god) { G.fell = true; } die(G); }
  // the checkpoint
  if (!G.checked && G.def.check != null && h.x > G.def.check) { G.checked = true; G.ev.push({ t: 'check' }); }
}

// ---------------------------------------------------------------- one step of everything
export function step(G, inp, dt) {
  G.ev = []; G.t += dt;
  const h = G.hero;
  stepHero(G, G.cleared ? { right: true, jump: false } : inp, dt);
  // enemies wake up as you get near
  for (const e of G.enemies) {
    if (!e.active && Math.abs(e.x - h.x) < 17) e.active = true;
    if (!e.active) continue;
    if (!e.alive) { e.deadT += dt; if (e.flip) { e.vy -= 40 * dt; e.y += e.vy * dt; } continue; }
    stepEnemy(G, e, dt);
  }
  G.enemies = G.enemies.filter((e) => e.alive || e.deadT < 1.5);
  // you and the enemies
  if (!h.dead && !G.cleared) for (const e of G.enemies) {
    if (!e.alive || !e.active || (e.kind === 'plant' && !e.out) || !overlap(h, e)) continue;
    const fromAbove = h.vy <= 0.5 && h.prevY >= e.y + e.h * 0.4;
    if (e.kind === 'plant') { hurt(G); continue; }
    if (fromAbove) {
      h.vy = inp.jump ? PH.stompHold : PH.stomp; h.y = e.y + e.h;
      if (e.kind === 'walker') { if (e.wings) { e.wings = false; G.ev.push({ t: 'stomp', x: e.x, y: e.y }); } else killEnemy(G, e, 'stomp'); }
      else if (e.kind === 'koopa') {
        if (e.state === 'walk') { e.state = 'shell'; e.h = 0.8; e.vx = 0; }
        else if (e.state === 'shell') { e.state = 'spin'; e.vx = h.x + h.w / 2 < e.x + e.w / 2 ? 11 : -11; e.grace = 0.25; }
        else { e.state = 'shell'; e.vx = 0; }
        G.ev.push({ t: 'stomp', x: e.x, y: e.y });
      } else if (e.kind === 'boss') { if (e.inv > 0) G.ev.push({ t: 'stomp', x: e.x, y: e.y }); else hitBoss(G, e, 1); }
    } else if (e.kind === 'koopa' && e.state === 'shell') { e.state = 'spin'; e.vx = h.x + h.w / 2 < e.x + e.w / 2 ? 11 : -11; e.grace = 0.3; G.ev.push({ t: 'kick', x: e.x, y: e.y }); }
    else if (!(e.kind === 'koopa' && e.grace > 0)) hurt(G);
  }
  // items
  for (const it of G.items) {
    it.t += dt;
    if (it.rise > 0) { it.rise -= dt; it.y += dt * 1.6; if (it.rise <= 0 && (it.kind === 'mush' || it.kind === 'oneup')) it.vx = 3 * it.dir; continue; }
    if (it.kind === 'leaf') { if (it.vy > 0) { it.vy -= 30 * dt; it.y += it.vy * dt; } else { it.y -= 1.3 * dt; it.x = it.bx + Math.sin(it.t * 3) * 1.1; } }
    else if (it.kind !== 'flower') { it.vy = Math.max(-PH.fall, it.vy - 40 * dt); if (moveX(G.L, it, it.vx * dt)) it.vx = -it.vx; if (moveY(G.L, it, it.vy * dt)) it.vy = 0; }
    if (!h.dead && overlap(h, it)) { it.gone = true; powerUp(G, it.kind); }
    if (it.y < -3) it.gone = true;
  }
  G.items = G.items.filter((i) => !i.gone);
  // fireballs bounce along and knock out enemies
  for (const f of G.fire) {
    f.life -= dt; f.vy -= 50 * dt;
    if (moveX(G.L, f, f.vx * dt)) { f.gone = true; G.ev.push({ t: 'puff', x: f.x, y: f.y }); }
    if (moveY(G.L, f, f.vy * dt)) f.vy = f.vy < 0 ? 8 : -1;
    for (const e of G.enemies) if (!f.gone && e.alive && e.active && (e.kind !== 'plant' || e.out) && overlap(f, e)) { f.gone = true; killEnemy(G, e, 'fire'); }
    if (f.life <= 0 || f.y < -2) f.gone = true;
  }
  G.fire = G.fire.filter((f) => !f.gone);
  // the boss's fireballs
  for (const s of G.shots) { s.x += s.vx * dt; if (!h.dead && overlap(h, s)) { hurt(G); s.gone = true; } if (isSolid(tileAt(G.L, Math.floor(s.x + s.w / 2), Math.floor(s.y + s.h / 2))) || Math.abs(s.x - h.x) > 30) s.gone = true; }
  G.shots = G.shots.filter((s) => !s.gone);
  // the goal: a box of spinning cards; touching it ends the level with whichever card shows
  if (G.goal && !G.cleared && !h.dead && overlap(h, { x: G.goal.x - 0.15, y: G.goal.y - 0.15, w: 1.3, h: 1.3 })) { G.cleared = cardAt(G.t); G.ev.push({ t: 'clear', card: G.cleared }); }
  if (G.bossDown && !G.cleared && !h.dead) { G.cleared = 'star'; G.ev.push({ t: 'clear', card: 'star', boss: true }); }
  return G.ev;
}
export const CARDS = ['mush', 'flower', 'star'];
export const cardAt = (t) => CARDS[Math.floor(t * 6) % 3];
