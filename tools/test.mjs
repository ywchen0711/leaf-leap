// node tools/test.mjs — every level can be finished by a simple runner, and the rules do what they say
import { T, PH, newRun, step, tileAt, isSolid, setPower } from '../js/game.js';
import { LEVELS, MAP } from '../js/levels.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const DT = 1 / 120;
const NONE = { left: false, right: false, jump: false, jumpPressed: false, run: false, runPressed: false };

// a runner that holds right and run, and jumps at walls, gaps, lava and enemies (it cannot be hurt, but pits and lava still count)
function runBot(def, power) {
  const G = newRun(def, { power, god: true }), h = G.hero, L = G.L, s = { hold: 0, bestX: 0, stuck: 0 };
  const solidish = (x, y) => { const t = tileAt(L, Math.floor(x), Math.floor(y)); return isSolid(t) || t === T.CLOUD; };
  for (let i = 0; i < 240 / DT; i++) {
    const front = h.x + h.w;
    const wall = [0.3, 1.0, 1.6].some((dy) => dy < h.h + 0.3 && isSolid(tileAt(L, Math.floor(front + 0.9), Math.floor(h.y + dy))));
    const floorAt = (dx) => { for (let y = Math.floor(h.y) - 1; y >= Math.floor(h.y) - 4; y--) { const t = tileAt(L, Math.floor(front + dx), y); if (t === T.LAVA) return false; if (solidish(front + dx, y + 0.5)) return true; } return false; };
    const gap = !floorAt(0.5) || !floorAt(1.3);
    const foe = G.enemies.some((e) => e.alive && e.active && e.x > h.x && e.x - h.x < 3 && Math.abs(e.y - h.y) < 2.5 && !(e.kind === 'koopa' && e.state === 'shell'));
    let press = false;
    if (h.onGround && s.hold <= 0 && (wall || gap || foe)) { press = true; s.hold = 0.5; }
    s.hold -= DT;
    step(G, { ...NONE, right: true, run: true, jump: s.hold > 0, jumpPressed: press }, DT);
    if (h.dead) return { G, why: G.fell ? 'fell' : 'died', x: h.x };
    if (G.cleared) return { G, done: true, t: i * DT };
    if (def.arena && h.x >= def.arena) return { G, done: true, arena: true, t: i * DT };
    if (h.x > s.bestX + 0.5) { s.bestX = h.x; s.stuck = 0; } else if ((s.stuck += DT) > 6) return { G, why: 'stuck', x: h.x };
  }
  return { G, why: 'timeout', x: h.x };
}

// ---- the map and the levels
ok('every level on the map exists', MAP.nodes.filter((n) => n.kind !== 'start' && n.kind !== 'house').every((n) => LEVELS[n.id]));
for (const def of Object.values(LEVELS)) {
  ok(`${def.id} has a goal or a boss`, !!def.goal || def.ents.some((e) => e.t === 'B' || e.t === 'K'));
  ok(`${def.id} start is standing room`, !isSolid(tileAt({ ...def }, def.start[0], def.start[1])) && isSolid(tileAt({ ...def }, def.start[0], def.start[1] - 1)));
  for (const power of [0, 1]) {
    const r = runBot(def, power);
    ok(`${def.id} can be finished (${power ? 'big' : 'small'})`, r.done, r.done ? `${r.t.toFixed(0)} s${r.arena ? ', reached the boss' : ''}` : `${r.why} at x ${r.x.toFixed(1)}`);
  }
}

// ---- the rules
const flat = (w = 40, extra) => { const tiles = new Uint8Array(w * 15); for (let x = 0; x < w; x++) { tiles[x] = T.GROUND; tiles[w + x] = T.GROUND; } if (extra) extra(tiles, w); return { id: 't', w, h: 15, tiles, ents: [], start: [2, 2], goal: null, check: null, theme: 'grass' }; };
const run = (G, secs, inp = NONE, every) => { const evs = []; for (let i = 0; i < secs / DT; i++) { evs.push(...step(G, i === 0 ? inp : { ...inp, jumpPressed: false, runPressed: false }, DT)); if (every) every(G, i); } return evs; };
{
  const G = newRun(flat()); run(G, 1.5, { ...NONE, right: true, run: true });
  ok('running reaches run speed', G.hero.vx > PH.run - 0.5, G.hero.vx.toFixed(1));
  const J = newRun(flat()); let top = 0; run(J, 1.2, { ...NONE, jump: true, jumpPressed: true }, (g) => { top = Math.max(top, g.hero.y - 2); });
  ok('a standing jump clears three tiles but not five', top > 3.2 && top < 4.6, top.toFixed(2));
}
{
  const def = flat(40, (t, w) => { t[6 * w + 3] = T.QCOIN; t[6 * w + 6] = T.QLEAF; });
  const G = newRun(def); G.hero.x = 3.1; const ev = run(G, 0.6, { ...NONE, jump: true, jumpPressed: true });
  ok('hitting a ? block from below gives a coin', G.coins === 1 && tileAt(G.L, 3, 6) === T.USED && ev.some((e) => e.t === 'coin'));
  G.hero.x = 6.1; run(G, 0.6, { ...NONE, jump: true, jumpPressed: true });
  ok('a small hero gets a mushroom from a leaf block', G.items.length === 1 && G.items[0].kind === 'mush');
  run(G, 4, { ...NONE }, (g) => { if (g.items[0]) { g.hero.x = g.items[0].x; } });
  ok('touching the mushroom makes you big', G.hero.power === 1 && G.hero.h > 1.5);
}
{
  const def = flat(); def.ents = [{ t: 'g', x: 8, y: 2 }];
  const G = newRun(def); G.hero.x = 8; G.hero.y = 5; G.hero.vy = -5;
  const ev = run(G, 0.5); ok('landing on a walker squashes it', !G.enemies.some((e) => e.alive) && ev.some((e) => e.t === 'stomp'));
  const H = newRun(def); H.hero.x = 6; run(H, 2); ok('walking into a walker as a small hero is the end', H.hero.dead);
  const B = newRun(def); setPower(B.hero, 3); B.hero.x = 6; run(B, 2); ok('a powered-up hero shrinks instead', !B.hero.dead && B.hero.power === 1);
}
{
  const def = flat(); def.ents = [{ t: 'k', x: 8, y: 2 }, { t: 'g', x: 20, y: 2 }];
  const G = newRun(def); G.hero.x = 8; G.hero.y = 5; G.hero.vy = -5; run(G, 0.3);
  const k = G.enemies.find((e) => e.kind === 'koopa'); ok('stomping a turtle leaves a shell', k.state === 'shell');
  G.hero.x = k.x - 1; G.hero.y = 2; G.hero.vy = 0; run(G, 2, { ...NONE, right: true });
  ok('kicking the shell sends it off to knock out the walker', k.state === 'spin' && !G.enemies.find((e) => e.kind === 'walker' && e.alive));
}
{
  const G = newRun(flat(120)); setPower(G.hero, 3); let top = 0;
  run(G, 1.6, { ...NONE, right: true, run: true });
  ok('running fills the P-meter', G.hero.pm >= 1);
  for (let i = 0; i < 12; i++) run(G, 0.25, { ...NONE, right: true, run: true, jump: true, jumpPressed: true }, (g) => { top = Math.max(top, g.hero.y); });
  ok('with the leaf and a full P-meter you fly', top > 9, `${top.toFixed(1)} tiles up`);
  const F = newRun(flat(60)); setPower(F.hero, 2); const ev = run(F, 0.1, { ...NONE, run: true, runPressed: true });
  ok('the flower throws fireballs', F.fire.length === 1 && ev.some((e) => e.t === 'fire'));
}
{
  // the bosses go down after three stomps
  for (const t of ['B', 'K']) {
    const def = flat(40); def.ents = [{ t, x: 20, y: 2 }]; const G = newRun(def); setPower(G.hero, 1); G.god = true;
    let ended = false;
    for (let n = 0; n < 12 && !G.bossDown; n++) { const b = G.enemies.find((e) => e.kind === 'boss'); if (!b) break; G.hero.x = b.x + 0.3; G.hero.y = b.y + b.h + 2; G.hero.vy = -6; G.hero.prevY = G.hero.y; run(G, 1.3); }
    ended = G.bossDown && G.cleared === 'star';
    ok(`the ${t === 'B' ? 'fortress brute' : 'Turtle King'} falls to three stomps`, ended);
  }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
