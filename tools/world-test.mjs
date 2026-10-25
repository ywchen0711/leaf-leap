// node tools/world-test.mjs — the open world: it builds, you can stand in the village, every course set into the
// world can still be finished from its start, the pipes and stairs are where they should be
import { T, newRun, step, tileAt, isSolid, floorBelow } from '../js/game.js';
import { LEVELS } from '../js/levels.js';
import { buildWorld, COURSES, ORDER, LAND_ORDER, airshipCells, regionAt, GY } from '../js/world.js';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fails++; };
const DT = 1 / 120, NONE = { mx: 0, mz: 0, jump: false, jumpPressed: false, run: false, runPressed: false, poundPressed: false };
const t0 = Date.now(), W0 = buildWorld();
ok('the world builds quickly', Date.now() - t0 < 3000, `${Date.now() - t0} ms`);
const [vx, vy, vz] = W0.start;
ok('the village start is open ground', isSolid(tileAt(W0, vx, vy - 1, vz)) && !isSolid(tileAt(W0, vx, vy, vz)) && !isSolid(tileAt(W0, vx, vy + 1, vz)));
ok('every course is in the world', ORDER.every((id) => COURSES[id] && LEVELS[id]));
ok('there is a warp pipe to every course in the village, and one home from each', ORDER.every((id) => W0.warps.some((p) => p.warp.kind === 'to' && p.warp.region === id) && W0.warps.some((p) => p.warp.kind === 'home' && p.warp.region === id)));

// the same runner as tools/test.mjs, heading for the course's waypoints, now inside the whole world
function runCourse(id, power) {
  const c = COURSES[id], L = LEVELS[id], at = [L.start[0] + c.ox, L.start[1] + c.oy, L.start[2] + c.oz];
  const G = newRun(W0, { power, god: true, at }), h = G.hero, s = { hold: 0, bestX: 0, stuck: 0 };
  const path = L.path.map(([x, z]) => [x + c.ox, z + c.oz]), endX = c.ox + L.w;
  let cleared = false;
  for (let i = 0; i < 240 / DT; i++) {
    const cx = h.x + h.w / 2, cz = h.z + h.d / 2;
    const target = path.find(([x]) => x > cx + 1) || [endX, c.oz + L.d / 2];
    let dx = target[0] - cx, dz = target[1] - cz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const wall = [0.3, 1.0, 1.6].some((dy) => dy < h.h + 0.3 && isSolid(tileAt(G.L, Math.floor(cx + dx * 1.3), Math.floor(h.y + dy), Math.floor(cz + dz * 1.3))));
    const gap = !(floorBelow(G.L, cx + dx * 0.6, h.y + 0.1, cz + dz * 0.6) >= h.y - 2.5);
    const foe = G.enemies.some((e) => e.alive && e.active && Math.hypot(e.x + e.w / 2 - cx, e.z + e.d / 2 - cz) < 2.8 && (e.x - h.x) * dx + (e.z - h.z) * dz > 0 && Math.abs(e.y - h.y) < 2.5 && !(e.kind === 'koopa' && e.state === 'shell'));
    let press = false;
    if (h.onGround && s.hold <= 0 && (wall || gap || foe)) { press = true; s.hold = 0.5; }
    if (h.swimming && s.hold <= 0 && (h.y < 9.5 + c.oy || wall) && h.vy < 1) { press = true; s.hold = 0.3; }
    s.hold -= DT;
    for (const e of step(G, { ...NONE, mx: dx, mz: dz, run: true, jump: s.hold > 0, jumpPressed: press }, DT)) if (e.t === 'clear' && e.region === id) cleared = true;
    if (h.dead || G.lava) return { why: G.lava ? 'lava' : 'fell', x: h.x - c.ox, z: h.z - c.oz };
    if (cleared) return { done: true, t: i * DT };
    if (L.arena && h.x - c.ox >= L.arena) return { done: true, arena: true, t: i * DT };
    if (h.x > s.bestX + 0.5) { s.bestX = h.x; s.stuck = 0; } else if ((s.stuck += DT) > 6) return { why: 'stuck', x: h.x - c.ox, z: h.z - c.oz };
  }
  return { why: 'timeout' };
}
for (const id of ORDER) for (const [power, label] of [[0, 'small'], [1, 'big']]) {
  const r = runCourse(id, power);
  ok(`${id} can be finished inside the world (${label})`, r.done, r.done ? `${r.t.toFixed(0)} s${r.arena ? ', reached the boss' : ''}` : `${r.why} at course x ${r.x?.toFixed(1)} z ${r.z?.toFixed(1)}`);
}
// the cloud stairs: each step is a jump from the one before
for (const [key, cells] of Object.entries(W0.stairs)) {
  const steps = []; for (let i = 0; i < cells.length; i += 9) steps.push(cells[i + 4]);
  let worst = 0; for (let i = 1; i < steps.length; i++) { const [ax, ay, az] = steps[i - 1], [bx, by, bz] = steps[i]; worst = Math.max(worst, by - ay, Math.hypot(bx - ax, bz - az) - 2.5); }
  ok(`the cloud stair to ${key} can be climbed`, worst <= 3, `largest step ${worst.toFixed(1)}`);
}
ok('the airship stair is not there until the fortress falls', airshipCells(W0).every(([x, y, z]) => tileAt(W0, x, y, z) !== T.CLOUD));
ok('regions are found', regionAt(W0, vx, vy, vz).id === 'village' && regionAt(W0, COURSES['1-5'].ox + 20, GY, COURSES['1-5'].oz + 5).id === '1-5');
ok('there are many secret stars', W0.secrets.length >= 40, `${W0.secrets.length}`);
{ const bad = []; for (const sc of W0.secrets) { const t = tileAt(W0, sc.x, sc.y, sc.z), fl = floorBelow(W0, sc.x + 0.5, sc.y + 0.2, sc.z + 0.5); if (sc.kind === 'free' && isSolid(t)) bad.push(sc.id + ' buried'); if (sc.kind === 'free' && t !== T.WATER && sc.y - fl > 4) bad.push(sc.id + ' floats'); if (sc.kind === 'pound' && t !== T.XMARK) bad.push(sc.id + ' no X'); if (sc.kind === 'block' && t !== T.HIDDEN) bad.push(sc.id + ' no block'); if (sc.kind === 'block' && sc.y - floorBelow(W0, sc.x + 0.5, sc.y - 0.5, sc.z + 0.5) > 4.2) bad.push(sc.id + ' too high to bump'); }
  for (const r of W0.reds) for (const [x, y, z] of r.coins) if (isSolid(tileAt(W0, x, y, z))) bad.push(r.id + ' coin buried');
  ok('every secret star can be got at', !bad.length, bad.join(' · ')); }
ok('every far land has a warp pipe at its landmark and one in the village', LAND_ORDER.every((id) => W0.warps.some((p) => p.warp.kind === 'to' && p.warp.region === id) && W0.warps.some((p) => p.warp.kind === 'home' && p.warp.region === id)));
ok('every unmarked pipe leads somewhere and back', W0.warps.filter((p) => p.warp.kind === 'secret').length >= 6 && W0.warps.filter((p) => p.warp.kind === 'secret').every((p) => !isSolid(tileAt(W0, Math.floor(p.warp.to[0]), Math.floor(p.warp.to[1]), Math.floor(p.warp.to[2])))));
// a ground pound on an X brings up its star; an invisible block bumped from below does too
{ const sc = W0.secrets.find((q) => q.kind === 'pound'), G = newRun(W0, { at: [sc.x, sc.y + 5, sc.z] }); let got = false;
  for (let i = 0; i < 240; i++) { for (const e of step(G, { ...NONE, poundPressed: i === 20 }, DT)) if (e.t === 'secret') got = true; }
  for (let i = 0; i < 240 && !got; i++) for (const e of step(G, { ...NONE }, DT)) if (e.t === 'secret') got = true;
  ok('pounding the X digs up a secret star', got || G.items.some((it) => it.kind === 'secret' && it.id === sc.id), sc.id); }
{ const sc = W0.secrets.find((q) => q.kind === 'block'), fl = floorBelow(W0, sc.x + 0.5, sc.y - 0.5, sc.z + 0.5), G = newRun(W0, { at: [sc.x, fl, sc.z] });
  for (let i = 0; i < 120; i++) step(G, { ...NONE, jump: true, jumpPressed: i === 2 }, DT);
  ok('jumping into the invisible block brings out a secret star', G.items.some((it) => it.kind === 'secret' && it.id === sc.id), sc.id); }
// eight red coins make their star appear
{ const r = W0.reds[0], G = newRun(W0, {}); for (const c of G.reds[0].coins) { G.hero.x = c.x; G.hero.y = c.y; G.hero.z = c.z; G.hero.vy = 0; step(G, NONE, DT); }
  ok('the eighth red coin brings out a secret star', G.items.some((it) => it.kind === 'secret' && it.id === r.id)); }
console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
