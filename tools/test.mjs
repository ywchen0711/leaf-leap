// node tools/test.mjs — every level can be finished by a simple runner, and the rules do what they say
import { T, PH, newRun, step, tileAt, isSolid, setPower, floorBelow } from '../js/game.js';
import { LEVELS, MAP } from '../js/levels.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const DT = 1 / 120;
const NONE = { mx: 0, mz: 0, jump: false, jumpPressed: false, run: false, runPressed: false, poundPressed: false };

// a runner that heads for the level's waypoints with run held, and jumps at walls, pits, lava and enemies
// (it cannot be hurt, but falling in a pit or lava still counts as a failure)
function runBot(def, power) {
  const G = newRun(def, { power, god: true }), h = G.hero, L = G.L, s = { hold: 0, bestX: 0, stuck: 0 };
  for (let i = 0; i < 240 / DT; i++) {
    const cx = h.x + h.w / 2, cz = h.z + h.d / 2;
    const target = def.path.find(([x]) => x > cx + 1) || [def.w, def.d / 2];
    let dx = target[0] - cx, dz = target[1] - cz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const wall = [0.3, 1.0, 1.6].some((dy) => dy < h.h + 0.3 && isSolid(tileAt(L, Math.floor(cx + dx * 1.3), Math.floor(h.y + dy), Math.floor(cz + dz * 1.3))));
    const floorAt = (k) => floorBelow(L, cx + dx * k, h.y + 0.1, cz + dz * k) >= h.y - 2.5;
    const gap = !floorAt(0.7) || !floorAt(1.5);
    const foe = G.enemies.some((e) => e.alive && e.active && Math.hypot(e.x + e.w / 2 - cx, e.z + e.d / 2 - cz) < 2.8 && (e.x - h.x) * dx + (e.z - h.z) * dz > 0 && Math.abs(e.y - h.y) < 2.5 && !(e.kind === 'koopa' && e.state === 'shell'));
    let press = false;
    if (h.onGround && s.hold <= 0 && (wall || gap || foe)) { press = true; s.hold = 0.5; }
    // in the water: stroke whenever it sinks below cruising depth or meets a wall
    if (h.swimming && s.hold <= 0 && (h.y < 9.5 || wall) && h.vy < 1) { press = true; s.hold = 0.3; }
    s.hold -= DT;
    step(G, { ...NONE, mx: dx, mz: dz, run: true, jump: s.hold > 0, jumpPressed: press }, DT);
    if (h.dead || G.lava) return { G, why: G.lava ? 'lava' : G.fell ? 'fell' : 'died', x: h.x, z: h.z };
    if (G.cleared) return { G, done: true, t: i * DT };
    if (def.arena && h.x >= def.arena) return { G, done: true, arena: true, t: i * DT };
    if (h.x > s.bestX + 0.5) { s.bestX = h.x; s.stuck = 0; } else if ((s.stuck += DT) > 6) return { G, why: 'stuck', x: h.x, z: h.z };
  }
  return { G, why: 'timeout', x: h.x, z: h.z };
}

// ---- the map and the levels
ok('every level on the map exists', MAP.nodes.filter((n) => n.kind !== 'start' && n.kind !== 'house' && n.kind !== 'spade').every((n) => LEVELS[n.id]));
for (const def of Object.values(LEVELS)) {
  const [sx, sy, sz] = def.start;
  ok(`${def.id} has a goal or a boss, and room to start`, (!!def.goal || def.ents.some((e) => 'BKJ'.includes(e.t))) && !isSolid(tileAt(def, sx, sy, sz)) && isSolid(tileAt(def, sx, sy - 1, sz)));
  for (const power of [0, 1]) {
    const r = runBot(def, power);
    ok(`${def.id} can be finished (${power ? 'big' : 'small'})`, r.done, r.done ? `${r.t.toFixed(0)} s${r.arena ? ', reached the boss' : ''}` : `${r.why} at x ${r.x.toFixed(1)} z ${r.z.toFixed(1)}`);
  }
}

// ---- the rules
const flat = (w = 40, d = 10, extra) => { const tiles = new Uint8Array(w * 15 * d); for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) { tiles[(0 * d + z) * w + x] = T.GROUND; tiles[(1 * d + z) * w + x] = T.GROUND; } const def = { id: 't', w, h: 15, d, tiles, ents: [], start: [2, 2, 4], goal: null, check: null, theme: 'grass', path: [] }; if (extra) extra(def); return def; };
const put = (def, x, y, z, t) => { def.tiles[(y * def.d + z) * def.w + x] = t; };
const run = (G, secs, inp = NONE, every) => { const evs = []; for (let i = 0; i < secs / DT; i++) { evs.push(...step(G, i === 0 ? inp : { ...inp, jumpPressed: false, runPressed: false, poundPressed: false }, DT)); if (every) every(G, i); } return evs; };
{
  const G = newRun(flat()); run(G, 1.5, { ...NONE, mx: 1, run: true });
  ok('running reaches run speed', G.hero.vx > PH.run - 0.5, G.hero.vx.toFixed(1));
  const Z = newRun(flat()); run(Z, 0.6, { ...NONE, mz: 1 });
  ok('you can walk in depth too', Z.hero.z > 6 && Math.abs(Z.hero.face) < 0.1, `z ${Z.hero.z.toFixed(1)}`);
  const W = newRun(flat()); run(W, 3, { ...NONE, mz: -1 });
  ok('the sides of a level are walls', W.hero.z >= 0 && !W.hero.dead);
  const J = newRun(flat()); let top = 0; run(J, 1.2, { ...NONE, jump: true, jumpPressed: true }, (g) => { top = Math.max(top, g.hero.y - 2); });
  ok('a standing jump clears three blocks but not five', top > 3.2 && top < 4.6, top.toFixed(2));
}
{
  const def = flat(40, 10, (d) => { put(d, 2, 6, 4, T.QCOIN); put(d, 6, 6, 4, T.QLEAF); });
  const G = newRun(def); const ev = run(G, 0.6, { ...NONE, jump: true, jumpPressed: true });
  ok('hitting a ? block from below gives a coin', G.coins === 1 && tileAt(G.L, 2, 6, 4) === T.USED && ev.some((e) => e.t === 'coin'));
  G.hero.x = 6.15; run(G, 0.6, { ...NONE, jump: true, jumpPressed: true });
  ok('a small hero gets a mushroom from a leaf block', G.items.length === 1 && G.items[0].kind === 'mush');
  run(G, 4, NONE, (g) => { if (g.items[0]) { g.hero.x = g.items[0].x; g.hero.z = g.items[0].z; } });
  ok('touching the mushroom makes you big', G.hero.power === 1 && G.hero.h > 1.5);
}
{
  const def = flat(40, 10, (d) => { put(d, 8, 1, 4, T.BRICK); }); def.ents = [{ t: 'g', x: 10, y: 2, z: 4 }];
  const G = newRun(def); setPower(G.hero, 1); G.hero.x = 8.15; G.hero.y = 6; G.hero.vy = 0; G.hero.onGround = false;
  const ev = run(G, 0.6, { ...NONE, poundPressed: true });
  ok('a ground pound breaks the brick underneath', tileAt(G.L, 8, 1, 4) === T.EMPTY && ev.some((e) => e.t === 'pound'));
}
{
  const def = flat(); def.ents = [{ t: 'g', x: 8, y: 2, z: 4 }];
  const G = newRun(def); G.hero.x = 8.1; G.hero.z = 4.1; G.hero.y = 5; G.hero.vy = -5;
  const ev = run(G, 0.5); ok('landing on a Mushling squashes it', !G.enemies.some((e) => e.alive) && ev.some((e) => e.t === 'stomp'));
  const H = newRun(def); H.hero.x = 5; H.hero.z = 4.1; run(H, 3); ok('a Mushling walks up to a small hero, and that is the end', H.hero.dead);
  const B = newRun(def); setPower(B.hero, 3); B.hero.x = 5; B.hero.z = 4.1; run(B, 3); ok('a powered-up hero shrinks instead', !B.hero.dead && B.hero.power === 1);
}
{
  const def = flat(); def.ents = [{ t: 'k', x: 8, y: 2, z: 4 }, { t: 'g', x: 20, y: 2, z: 4 }];
  const G = newRun(def); G.hero.x = 8.1; G.hero.z = 4.1; G.hero.y = 5; G.hero.vy = -5; run(G, 0.3);
  const k = G.enemies.find((e) => e.kind === 'koopa'); ok('stomping a turtle leaves a shell', k.state === 'shell');
  G.hero.x = k.x - 1; G.hero.z = k.z; G.hero.y = 2; G.hero.vy = 0; run(G, 2.5, { ...NONE, mx: 1 });
  ok('kicking the shell sends it off to knock out the Mushling', k.state === 'spin' && !G.enemies.find((e) => e.kind === 'walker' && e.alive));
}
{
  const G = newRun(flat(160)); setPower(G.hero, 3); let top = 0;
  run(G, 1.6, { ...NONE, mx: 1, run: true });
  ok('running fills the P-meter', G.hero.pm >= 1);
  for (let i = 0; i < 12; i++) run(G, 0.25, { ...NONE, mx: 1, run: true, jump: true, jumpPressed: true }, (g) => { top = Math.max(top, g.hero.y); });
  ok('with the leaf and a full P-meter you fly', top > 9, `${top.toFixed(1)} blocks up`);
  const F = newRun(flat(60)); setPower(F.hero, 2); const ev = run(F, 0.1, { ...NONE, run: true, runPressed: true });
  ok('the flower throws fireballs the way you face', F.fire.length === 1 && F.fire[0].vx > 5 && ev.some((e) => e.t === 'fire'));
}
{
  for (const t of ['B', 'K']) {
    const def = flat(40); def.ents = [{ t, x: 20, y: 2, z: 4 }]; const G = newRun(def); setPower(G.hero, 1); G.god = true;
    for (let n = 0; n < 12 && !G.bossDown; n++) { const b = G.enemies.find((e) => e.kind === 'boss'); if (!b) break; G.hero.x = b.x + 0.3; G.hero.z = b.z + 0.3; G.hero.y = b.y + b.h + 2; G.hero.vy = -6; G.hero.prevY = G.hero.y; run(G, 1.3); }
    ok(`the ${t === 'B' ? 'fortress brute' : 'Turtle King'} falls to three stomps`, G.bossDown && G.cleared === 'star');
  }
}
// ---- the suits: tanooki, frog, the P-wing, water, cannons, the prince
{
  const sea = flat(60, 10, (d) => { for (let y = 2; y <= 10; y++) for (let z = 0; z < 10; z++) for (let x = 0; x < 60; x++) put(d, x, y, z, T.WATER); });
  const swimDist = (power) => { const G = newRun(sea, { power }); G.hero.y = 5; run(G, 2, { ...NONE, mx: 1 }, (g, i) => { if (i % 30 === 0) g.hero.vy = Math.max(g.hero.vy, 0); }); return G.hero.x - 2; };
  const plain = swimDist(0), frog = swimDist(5);
  ok('the frog suit swims about twice as fast', frog > plain * 1.7, `${frog.toFixed(1)} vs ${plain.toFixed(1)} blocks in 2 s`);
  const F = newRun(sea, { power: 5 }); F.hero.y = 4; run(F, 1, { ...NONE, jump: true }); const up = F.hero.y;
  ok('the frog swims up while jump is held, and does not sink', up > 7, `y ${up.toFixed(1)}`);
  const S = newRun(sea); S.hero.y = 9; run(S, 1.5); ok('without a suit you sink slowly in water', S.hero.y < 8 && S.hero.y > 2, `y ${S.hero.y.toFixed(1)}`);
  const L1 = newRun(flat(60)); setPower(L1.hero, 5); const ev = run(L1, 1, { ...NONE, mx: 1 }); ok('on land the frog hops along slowly', L1.hero.x - 2 < 5 && ev.some((e) => e.t === 'hop'), `${(L1.hero.x - 2).toFixed(1)} blocks in 1 s`);
}
{
  const def = flat(); def.ents = [{ t: 'g', x: 6, y: 2, z: 4 }];
  const G = newRun(def, { power: 4 }); G.hero.x = 3; G.hero.z = 4.1; const ev = run(G, 3, { ...NONE, pound: true });
  ok('the tanooki statue cannot be hurt', G.hero.power === 4 && !G.hero.dead && ev.some((e) => e.t === 'statue'));
  const T2 = newRun(flat(160), { power: 4 }); run(T2, 1.6, { ...NONE, mx: 1, run: true }); let top = 0;
  for (let i = 0; i < 12; i++) run(T2, 0.25, { ...NONE, mx: 1, run: true, jump: true, jumpPressed: true }, (g) => { top = Math.max(top, g.hero.y); });
  ok('the tanooki suit flies like the leaf', top > 9, `${top.toFixed(1)} up`);
  const P = newRun(flat(400), { power: 0, pwing: true }); let ptop = 0; run(P, 0.2, { ...NONE, mx: 1 });
  for (let i = 0; i < 40; i++) run(P, 0.25, { ...NONE, mx: 1, jump: true, jumpPressed: true }, (g) => { ptop = Math.max(ptop, g.hero.y); });
  ok('the P-wing gives a tail and flight that never runs out (up to the top of the level)', P.hero.power === 3 && P.hero.y > 12 && ptop < 20, `still at ${P.hero.y.toFixed(1)} after 10 s`);
}
{
  const def = flat(40, 10, (d) => put(d, 20, 2, 4, T.CANNON)); const G = newRun(def); G.hero.x = 10; G.hero.z = 4.1; let fired = false;
  run(G, 5, NONE, (g) => { if (g.shots.some((s) => s.kind === 'ball')) fired = true; });
  ok('a cannon fires balls at you', fired);
  const B = flat(40); B.ents = [{ t: 'J', x: 20, y: 2, z: 4 }]; const J = newRun(B); setPower(J.hero, 1); J.god = true; let rings = false;
  for (let n = 0; n < 12 && !J.bossDown; n++) { const b = J.enemies.find((e) => e.kind === 'boss'); if (!b) break; J.hero.x = b.x + 0.2; J.hero.z = b.z + 0.2; J.hero.y = b.y + b.h + 2; J.hero.vy = -6; J.hero.prevY = J.hero.y; run(J, 1.3, NONE, (g) => { if (g.shots.some((s) => s.kind === 'ring')) rings = true; }); }
  ok('the prince throws magic rings and falls to three stomps', rings && J.bossDown);
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
