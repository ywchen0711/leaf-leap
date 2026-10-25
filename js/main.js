// LEAF LEAP 3D — the page: the title curtain, one open world to roam, the HUD, panels, input and the save.
// Leafy Land is a single island now: walk anywhere, climb the cloud stairs, take a warp pipe home to Mushroom Village,
// and cross each course's finish line for its card. There is no world map any more; the map screen shows the island.
import * as THREE from 'three';
import { T, newRun, step, floorBelow, tileAt, isSolid, setPower, respawn, wear, suitItem, SUITS, SUIT_ORDER, SUIT_OF, RELICS, RELIC_ORDER, PH } from './game.js?v=8';
import { LEVELS } from './levels.js?v=8';
import { buildWorld, COURSES, ORDER, PLACES, LANDS, LAND_ORDER, SECRET_LANDS, airshipCells, regionAt, GY, SEA } from './world.js?v=8';
import { buildWorldView, worldMapImage, makeHero, BROS, poseHero, makeEnemy, poseEnemy, makeItem, makeRedCoin, makeFireball, makeShot, makeCoinPop, tileBox, look, box, cmat, cardDataURL } from './view.js?v=8';
import { Sound } from './audio.js?v=8';

const $ = (id) => document.getElementById(id);
// ---------------------------------------------------------------- language
const q = new URLSearchParams(location.search);
let lang = q.get('lang') || (() => { try { return localStorage.getItem('leafleap.lang'); } catch (e) { return null; } })() || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
if (lang !== 'en') lang = 'zh';
const EN = () => lang === 'en';
const L = (zh, en) => (EN() ? en : zh);
const N = (pair) => pair[EN() ? 1 : 0];

// ---------------------------------------------------------------- the save (an old world-map save carries over)
const KEY = 'leafleap.save';
const fresh = () => ({ v: 2, cleared: {}, lives: 5, coins: 0, items: ['mush'], power: 0, cards: [], houses: {}, spade: false, won: false, at: null, warps: {}, seen: {}, secrets: {}, big: true, big2: true, bro: 'josh', suits: {}, relics: {} });
let SAVE = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && (s.v === 1 || s.v === 2)) return { ...fresh(), ...s, v: 2, at: s.v === 2 && s.big2 ? s.at : null, big: true, big2: true, bro: s.bro === 'jasper' ? 'jasper' : 'josh' }; } catch (e) { /* none */ } return null; })();
const hadSave = !!SAVE; if (!SAVE) SAVE = fresh();
SAVE.items = SAVE.items.map((it) => (it === 'leaf' || it === 'tanooki' || it === 'frog' ? 'mush' : it));
const relicsN = () => RELIC_ORDER.filter((k) => SAVE.relics[k]).length, allRelics = () => relicsN() === RELIC_ORDER.length;
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode */ } };

// ---------------------------------------------------------------- renderer
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const LOWFX = q.get('fx') === 'low';
renderer.shadowMap.enabled = !LOWFX; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.3, 1600);
scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 1.3));
const sun = new THREE.DirectionalLight('#fff8e8', 1.55); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 }); sun.shadow.bias = -0.0008;
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const sound = new Sound();
const skyTex = (a, b) => { const c = document.createElement('canvas'); c.width = 2; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 2, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const SKIES = { grass: ['#4aa8ff', '#d0f0ff', '#cfeaff', 90, 620], map: ['#4aa8ff', '#d0f0ff', '#cfeaff', 90, 620], sky: ['#2a8aff', '#e8f6ff', '#e0f2ff', 100, 680], water: ['#3a9ae8', '#c8ecff', '#cfeaff', 90, 560], airship: ['#ff8a4a', '#ffe0a8', '#ffc890', 90, 520],
  deep: ['#0a2a5a', '#1a4a88', '#123a70', 4, 34], abyss: ['#020814', '#0a1a38', '#061020', 3, 24], molten: ['#3a0a00', '#c84a10', '#d8501a', 1.5, 12], ghost: ['#0a0612', '#2a1a3a', '#1a1028', 8, 44],
  cave: ['#05070d', '#141a30', '#0a0e1a', 14, 46], fort: ['#100e16', '#2a2030', '#1a1620', 16, 50], under: ['#1a5aa8', '#2a7ac8', '#2a7ac8', 6, 40],
  snow: ['#8ab8e8', '#f4f8ff', '#e8f0fa', 80, 560], desert: ['#5aa8e8', '#fff0c8', '#f8e4b8', 90, 560], volcano: ['#5a2a2a', '#e8805a', '#a8604a', 50, 280] };
const skyCache = {};
function setSky(k) { if (S.sky === k) return; S.sky = k; const s = SKIES[k]; scene.background = skyCache[k] || (skyCache[k] = skyTex(s[0], s[1])); scene.fog = new THREE.Fog(s[2], s[3], s[4]); }

// ---------------------------------------------------------------- the world
const W0 = buildWorld();
const S = { mode: 'title', panel: null, G: null, V: null, deadT: 0, acc: 0, t: 0, shake: 0, region: null, sky: null, doorCd: 0, warpT: 0 };
// the save's state goes back into the world: the airship stair once the fortress is beaten
function openAirship(G, announce) { for (const [x, y, z] of airshipCells(W0)) if (tileAt(G.L, x, y, z) === T.EMPTY) { G.L.set(x, y, z, T.CLOUD); if (S.V) S.V.touch(x, z); } if (announce) { banner(L('通往飛行船的雲梯出現了！', 'A cloud stair to the airship has appeared!'), L('在熔岩城的南邊', 'south of the Lava Castle')); sound.play('note'); } }
function gateState(G, announce) {
  const g = W0.gate; RELIC_ORDER.forEach((k, i) => { const [x, y, z] = g.lamps[i], want = SAVE.relics[k] ? T.CAPGOLD : T.BASALT; if (tileAt(G.L, x, y, z) !== want) { G.L.set(x, y, z, want); if (S.V) S.V.touch(x, z); } });
  if (!allRelics()) return;
  for (const [x, y, z] of g.door) if (tileAt(G.L, x, y, z) !== T.EMPTY) { G.L.set(x, y, z, T.EMPTY); if (S.V) S.V.touch(x, z); }
  if (announce) { G.items.push(suitItem(W0.suits.find((q2) => q2.id === 'gold'))); setTimeout(() => { banner(L('神秘之門打開了！', 'The Mystery Gate is open!'), L('回蘑菇村，門後面有黃金套裝', 'Back in the village, the Golden Suit waits behind it')); sound.play('fanfare'); }, 3000); }
}
function newWorld() {
  const at = SAVE.at && !isSolid(tileAt(W0, Math.floor(SAVE.at[0]), Math.floor(SAVE.at[1]), Math.floor(SAVE.at[2]))) ? SAVE.at : W0.start;
  S.G = newRun(W0, { power: SAVE.power, at, done: SAVE.cleared, found: SAVE.secrets, relics: SAVE.relics, perks: SAVE.relics, gold: allRelics() });
  S.G.respawn = at;
  if (SAVE.cleared['1-F']) openAirship(S.G, false);
  gateState(S.G, false);
}
newWorld();
S.V = buildWorldView(scene, S.G); S.V.prime(S.G.hero.x, S.G.hero.z);
const shadowed = (m) => { m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(m); return m; };
const broMesh = { josh: shadowed(makeHero('josh')), jasper: shadowed(makeHero('jasper')) };
const BRO_STAT = { josh: { speedMul: 1.1, jumpMul: 1 }, jasper: { speedMul: 1, jumpMul: 1.15 } };
const otherBro = () => (SAVE.bro === 'josh' ? 'jasper' : 'josh');
let heroMesh = broMesh[SAVE.bro], buddyMesh = broMesh[otherBro()];
function applyBro() { const h = S.G.hero; Object.assign(h, BRO_STAT[SAVE.bro]); heroMesh = broMesh[SAVE.bro]; buddyMesh = broMesh[otherBro()]; heroMesh.userData.power = buddyMesh.userData.power = -1; if ($('bname')) $('bname').textContent = BROS[SAVE.bro].name.toUpperCase(); }
applyBro();
const buddy = { x: 0, y: 0, z: 0, w: 0.7, d: 0.7, vx: 0, vy: 0, vz: 0, face: 0, onGround: true, power: 0, inv: 0, flyT: 0, wag: 0, spin: 0, pm: 0, statue: 0, cx: 0, cz: 0, init: false };
const trail = [];
// the brother walks in your footsteps, a step and a half behind; if he falls too far behind he catches up at once
function follow(dt) {
  const h = S.G.hero, hx = h.x + h.w / 2, hz = h.z + h.d / 2, last = trail[trail.length - 1];
  if (!last || Math.hypot(hx - last[0], h.y - last[1], hz - last[2]) > 0.12) { trail.push([hx, h.y, hz, h.onGround || h.swimming, !!h.swimming]); if (trail.length > 400) trail.shift(); }
  const B = buddy;
  if (!B.init || h.dead || Math.hypot(B.cx - hx, B.y - h.y, B.cz - hz) > 12) { B.cx = hx; B.y = h.y; B.cz = hz; B.init = true; trail.length = 0; }
  let need = 1.6, px = hx, py = h.y, pz = hz, tgt = null;
  for (let i = trail.length - 1; i >= 0; i--) { const p = trail[i], d = Math.hypot(p[0] - px, p[1] - py, p[2] - pz); if (d >= need) { const k = need / d; tgt = [px + (p[0] - px) * k, py + (p[1] - py) * k, pz + (p[2] - pz) * k, p[3], p[4]]; trail.splice(0, Math.max(0, i - 2)); break; } need -= d; px = p[0]; py = p[1]; pz = p[2]; }
  const ox = B.cx, oy = B.y, oz = B.cz;
  if (tgt) { const k = Math.min(1, dt * 10); B.cx += (tgt[0] - B.cx) * k; B.y += (tgt[1] - B.y) * k; B.cz += (tgt[2] - B.cz) * k; B.onGround = tgt[3]; B.swimming = tgt[4]; }
  else { B.onGround = h.onGround || h.swimming; B.swimming = h.swimming; }
  const sdt = Math.max(dt, 1e-3); B.vx = (B.cx - ox) / sdt; B.vz = (B.cz - oz) / sdt; B.vy = (B.y - oy) / sdt;
  if (Math.hypot(B.vx, B.vz) > 0.4) B.face = Math.atan2(B.vx, B.vz); else if (Math.hypot(hx - B.cx, hz - B.cz) > 0.3) B.face = Math.atan2(hx - B.cx, hz - B.cz);
  B.x = B.cx - B.w / 2; B.z = B.cz - B.d / 2; B.power = h.power === 4 ? 1 : h.power; B.flyT = !B.onGround && h.flyT > 0 ? h.flyT : 0;
  poseHero(buddyMesh, B, dt, S.t + 0.37); buddyMesh.visible = S.warpT <= 0 || buddyMesh.visible;
}
function swapBro() {
  const h = S.G.hero; if (h.dead || S.warpT > 0 || S.mode !== 'world') return;
  SAVE.bro = otherBro(); store();
  // you take over the brother who was behind you, right where he stands (if there is room)
  const B = buddy, hx = h.x + h.w / 2, hy = h.y, hz = h.z + h.d / 2;
  if (B.init && Math.hypot(B.cx - hx, B.cz - hz) > 0.3 && !solidAt(B.cx, B.y + 0.3, B.cz) && !solidAt(B.cx, B.y + 1.3, B.cz)) { h.x = B.cx - h.w / 2; h.z = B.cz - h.d / 2; h.y = B.y; h.vx = h.vz = 0; B.cx = hx; B.y = hy; B.cz = hz; h.face = Math.atan2(hx - (h.x + h.w / 2), hz - (h.z + h.d / 2)) + Math.PI; trail.length = 0; }
  applyBro(); sound.play('leaf');
  toast(SAVE.bro === 'josh' ? L('換 Josh 上場！跑得比較快', 'Josh’s turn! He runs a little faster') : L('換 Jasper 上場！跳得比較高', 'Jasper’s turn! He jumps a little higher'));
}
const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);
const shade = (m) => { m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return m; };
const cam = { yaw: Math.PI * 0.75, pitch: 0.42, dist: 11, manual: 0 };
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (S.mode === 'world' && !S.panel) drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; cam.yaw -= (e.clientX - drag.x) * 0.006; cam.pitch = Math.max(0.08, Math.min(1.25, cam.pitch + (e.clientY - drag.y) * 0.004)); drag.x = e.clientX; drag.y = e.clientY; cam.manual = 2; });
addEventListener('pointerup', () => { drag = null; }); addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { cam.dist = Math.max(6, Math.min(26, cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); e.preventDefault(); }, { passive: false });
const ents = new Map(), anims = [];

// ---------------------------------------------------------------- input: keyboard, controller and touch all become the same buttons
const keys = new Set(), tapped = new Set();
const KEYS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], jump: ['Space', 'KeyZ', 'KeyK'], run: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'], pound: ['KeyC', 'KeyL', 'ControlLeft'], camL: ['KeyQ'], camR: ['KeyE'], pause: ['Escape', 'KeyP'], confirm: ['Enter'], items: ['Tab', 'KeyI'], map: ['KeyM'], swap: ['KeyV'], suit: ['KeyR'] };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; sound.start();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys.add(e.code); if (!e.repeat) for (const [k, list] of Object.entries(KEYS)) if (list.includes(e.code)) tapped.add(k);
});
addEventListener('keyup', (e) => keys.delete(e.code));
const touchHeld = {};
for (const [id, k] of [['t-left', 'left'], ['t-right', 'right'], ['t-up', 'up'], ['t-down', 'down'], ['t-a', 'jump'], ['t-b', 'run'], ['t-c', 'pound'], ['t-pause', 'pause'], ['t-swap', 'swap'], ['t-suit', 'suit']]) {
  const b = $(id); const on = (e) => { e.preventDefault(); sound.start(); if (!touchHeld[k]) tapped.add(k); touchHeld[k] = true; b.classList.add('on'); }, off = () => { touchHeld[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
}
$('items').addEventListener('click', () => { if (S.mode === 'world' && !S.panel) itemsPanel(); });
const PAD = { used: false, connected: false };
addEventListener('gamepadconnected', (e) => { PAD.connected = true; sound.start(); toast(L(`已連接控制器：${e.gamepad.id.split('(')[0].trim()}`, `Controller connected: ${e.gamepad.id.split('(')[0].trim()}`)); staticText(); });
addEventListener('gamepaddisconnected', () => { PAD.connected = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); staticText(); });
let prevHeld = {};
function readButtons() {
  const held = {}, stick = { x: 0, y: 0, rx: 0, ry: 0 };
  for (const [k, list] of Object.entries(KEYS)) held[k] = list.some((c) => keys.has(c)) || !!touchHeld[k];
  const digital = { ...held };
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean)[0] : null;
  if (gp) {
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    stick.x = dz(ax); stick.y = dz(ay); stick.rx = dz(gp.axes[2] || 0); stick.ry = dz(gp.axes[3] || 0);
    digital.left = digital.left || b(14); digital.right = digital.right || b(15); digital.up = digital.up || b(12); digital.down = digital.down || b(13);
    const pad = { left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, jump: b(0), run: b(1) || b(2) || b(7), pound: b(3) || b(6), pause: b(9), items: b(8), map: b(4), swap: b(5), suit: b(11) || b(10) };
    if (Object.values(pad).some(Boolean) && !PAD.used) { PAD.used = true; staticText(); }
    for (const k in pad) held[k] = held[k] || pad[k];
  }
  const edge = {}; for (const k in held) edge[k] = (held[k] && !prevHeld[k]) || tapped.has(k);
  for (const k of tapped) edge[k] = true;
  tapped.clear(); prevHeld = held;
  return { held, edge, digital, stick };
}

// ---------------------------------------------------------------- panels (mouse, keyboard or controller)
let handlers = [], focus = 0, closable = true;
const btn = (label, fn, o = {}) => { handlers.push(fn); return `<button data-i="${handlers.length - 1}" class="${o.cls || ''}"${o.off ? ' disabled' : ''}>${label}</button>`; };
function showPanel(kind, title, build, canClose = true) {
  handlers = []; const html = build(); closable = canClose;
  $('panel').innerHTML = `<div class="pbox ${kind}">${title ? `<h2>${title}</h2>` : ''}${html}</div>`;
  $('panel').hidden = false; S.panel = kind; focus = 0; markFocus();
}
function closePanel() { $('panel').hidden = true; $('panel').innerHTML = ''; S.panel = null; if (S.mode === 'world') sound.setSong(songFor()); }
const panelButtons = () => [...$('panel').querySelectorAll('button:not([disabled])')];
function markFocus() { panelButtons().forEach((b, i) => b.classList.toggle('focus', i === focus)); }
$('panel').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sound.play('click'); const f = handlers[+b.dataset.i]; if (f) f(); });
function panelInput(edge) {
  const bs = panelButtons(), n = bs.length;
  if (n && (edge.down || edge.right)) { focus = (focus + 1) % n; markFocus(); sound.play('click'); }
  if (n && (edge.up || edge.left)) { focus = (focus - 1 + n) % n; markFocus(); sound.play('click'); }
  if ((edge.jump || edge.confirm) && bs[focus]) bs[focus].click();
  else if ((edge.run || edge.pause || edge.items || edge.map) && closable) closePanel();
}

// ---------------------------------------------------------------- HUD
function toast(text) { const d = $('toast'); d.innerHTML = text; d.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => d.classList.remove('on'), 2600); }
function banner(text, sub) { const d = $('banner'); d.innerHTML = `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); }
const cardImg = (k) => `<img src="${cardDataURL(k)}" alt="${k}">`;
const itemImg = (it) => (it === 'mush' || it === 'flower' || it === 'star' ? cardImg(it) : `<img src="${iconURL(it)}" alt="${it}">`);
const clearedN = () => ORDER.filter((id) => SAVE.cleared[id]).length;
const secretsN = () => W0.secrets.filter((x) => SAVE.secrets[x.id]).length;
function hud() {
  $('bname').textContent = BROS[SAVE.bro].name.toUpperCase();
  $('lives').textContent = SAVE.lives; $('coins').textContent = String(SAVE.coins).padStart(2, '0');
  const h = S.G.hero, pm = h.pm, lit = Math.floor(pm * 6 + 0.001);
  $('pm').innerHTML = [0, 1, 2, 3, 4, 5].map((i) => `<i class="${i < lit ? 'on' : ''}">▶</i>`).join('') + `<b class="${pm >= 1 ? 'on' : ''}">P</b>`;
  $('cards').innerHTML = [0, 1, 2].map((i) => `<span>${SAVE.cards[i] ? cardImg(SAVE.cards[i]) : ''}</span>`).join('');
  { const h2 = S.G.hero, a = $('air'); if (h2.air < PH.air - 0.05 && h2.swimming && !h2.dead) { const n = Math.ceil(h2.air / PH.air * 8); a.innerHTML = `${L('氧氣', 'Air')} ` + Array.from({ length: 8 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join(''); a.hidden = false; a.classList.toggle('low', n <= 2); } else a.hidden = true; }
  $('where').textContent = `★${clearedN()}/${ORDER.length} ✦${secretsN()}/${W0.secrets.length} ${S.region ? N(S.region.name) : ''}`;
}
function hudItems() { $('items').innerHTML = `<span>🎒</span>` + (SAVE.items.length ? SAVE.items.map(itemImg).join('') : `<small>${L('（沒有道具）', '(no items)')}</small>`) + `<em>${N(POWER_NAME[S.G.hero.power])}</em>`; }
const POWER_NAME = [['小', 'Small'], ['大', 'Big'], ['火焰', 'Fire'], ...[3, 4, 5, 6, 7, 8].map((p) => SUITS[SUIT_OF[p]].name)];
const ITEM_NAME = { mush: ['蘑菇', 'Mushroom'], flower: ['火焰花', 'Fire Flower'], leaf: ['神奇葉子', 'Super Leaf'], tanooki: ['狸貓裝', 'Tanooki Suit'], frog: ['青蛙裝', 'Frog Suit'], pwing: ['P 翅膀', 'P-Wing'] };
const ITEM_POWER = { mush: 1, flower: 2, leaf: 3, tanooki: 4, frog: 5 };
const _icons = {}; let _leaf = null;
function iconURL(k) {
  if (k === 'leaf') return leafURL(); if (_icons[k]) return _icons[k];
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'), R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R('#101010', 0, 0, 16, 16); R('#f8f8f8', 1, 1, 14, 14);
  if (k === 'tanooki') { R('#9a5a2a', 4, 4, 8, 9); R('#b8783a', 4, 2, 2, 3); R('#b8783a', 10, 2, 2, 3); R('#f0c890', 6, 5, 4, 3); R('#1a1a1a', 6, 6, 1, 1); R('#1a1a1a', 9, 6, 1, 1); R('#c8884a', 12, 9, 3, 2); R('#3a2410', 13, 9, 1, 2); }
  else if (k === 'frog') { R('#3ab83a', 3, 5, 10, 8); R('#ffffff', 4, 3, 3, 3); R('#ffffff', 9, 3, 3, 3); R('#1a1a1a', 5, 4, 1, 1); R('#1a1a1a', 10, 4, 1, 1); R('#c8f0a0', 6, 8, 4, 3); R('#2a8a2a', 3, 12, 3, 2); R('#2a8a2a', 10, 12, 3, 2); }
  else if (k === 'pwing') { R('#d8282a', 2, 2, 12, 12); g.fillStyle = '#ffffff'; g.font = 'bold 9px monospace'; g.fillText('P', 6, 11); R('#ffffff', 2, 5, 3, 2); R('#ffffff', 11, 5, 3, 2); }
  else if (k === 'coin') { R('#ffd030', 5, 3, 6, 10); R('#ffffff', 6, 4, 1, 6); R('#a07000', 10, 4, 1, 8); }
  else if (k === 'back') { R('#2a9a4a', 1, 1, 14, 14); g.fillStyle = '#ffffff'; g.font = 'bold 11px sans-serif'; g.fillText('♠', 3, 12); }
  _icons[k] = c.toDataURL(); return _icons[k];
}
function leafURL() { if (_leaf) return _leaf; const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#101010'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f8f8f8'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(8, 8, 5, 3.2, -0.5, 0, 7); g.fill(); g.fillStyle = '#7a4a1a'; g.fillRect(3, 11, 3, 1); _leaf = c.toDataURL(); return _leaf; }
function prompt(text) { const d = $('nodename'); if (d.dataset.t === (text || '')) return; d.dataset.t = text || ''; d.innerHTML = text || ''; d.hidden = !text; }

// ---------------------------------------------------------------- Mushroom Houses, the spade panel, items
// the first house hides a leaf, a tanooki suit and a frog suit; the second, the two suits and a P-wing
const HOUSE_ITEMS = { house: ['mush', 'flower', 'pwing'], house2: ['flower', 'pwing', 'mush'], house3: ['pwing', 'flower', 'flower'] };
function housePanel(id) {
  const chest = [...HOUSE_ITEMS[id]].sort(() => Math.random() - 0.5);
  showPanel('house', L('蘑菇小屋', 'Mushroom House'), () => `<p class="say">${L('歡迎！選一個寶箱，裡面的道具送給你。', 'Welcome! Pick a chest, and what is inside is yours.')}</p><div class="chests">${[1, 2, 3].map((i) => btn(`<i class="chest"></i>${i}`, () => {
    const it = chest[i - 1]; SAVE.items.push(it); if (SAVE.items.length > 8) SAVE.items.shift(); SAVE.houses[id] = true; store(); hudItems(); sound.play('power');
    showPanel('house', L('得到了！', 'You got it!'), () => `<div class="got">${itemImg(it)}</div><p class="say">${N(ITEM_NAME[it])} — ${L('按 Tab（或點左上的背包）隨時使用。', 'use it any time from your bag (Tab, or tap it).')}</p>${btn('OK', closePanel, { cls: 'go' })}`);
  }, { cls: 'chestbtn' })).join('')}</div>`);
}
const SPADE_PRIZE = { mush: 'item', flower: 'item', pwing: 'item', star: 'life', coin: 'coins' };
function spadePanel() {
  const deck = ['mush', 'mush', 'flower', 'flower', 'star', 'star', 'pwing', 'coin', 'coin'].flatMap((k) => [k, k]).sort(() => Math.random() - 0.5);
  const st = { deck, done: new Set(), open: [], miss: 0, busy: false, won: [] };
  const draw = () => showPanel('spade', L('黑桃翻牌', 'Spade Panel'), () => {
    let h = `<p class="say">${L('翻兩張一樣的卡就能拿到獎品。錯兩次遊戲就結束。', 'Turn over two matching cards to win the prize. Two misses and the game is over.')} <b>${L('失誤', 'Misses')}: ${st.miss} / 2</b></p><div class="deck">`;
    st.deck.forEach((k, i) => { const up = st.done.has(i) || st.open.includes(i); h += btn(`<img src="${up ? (k === 'mush' || k === 'flower' || k === 'star' ? cardDataURL(k) : iconURL(k)) : iconURL('back')}" alt="">`, () => flip(i), { cls: 'scard' + (st.done.has(i) ? ' done' : ''), off: up || st.busy || st.miss >= 2 }); });
    return h + `</div>${st.won.length ? `<p class="say">${L('獎品', 'Prizes')}: ${st.won.join(' ')}</p>` : ''}${st.miss >= 2 || st.done.size === st.deck.length ? btn('OK', () => { SAVE.spade = true; store(); closePanel(); }, { cls: 'go' }) : ''}`;
  });
  const flip = (i) => {
    if (st.busy || st.open.includes(i) || st.done.has(i)) return;
    st.open.push(i); sound.play('click'); draw();
    if (st.open.length < 2) return;
    st.busy = true;
    setTimeout(() => {
      const [a, b] = st.open; st.busy = false; st.open = [];
      if (st.deck[a] === st.deck[b]) {
        st.done.add(a); st.done.add(b); const k = st.deck[a], kind = SPADE_PRIZE[k]; sound.play('card');
        if (kind === 'item') { SAVE.items.push(k); if (SAVE.items.length > 8) SAVE.items.shift(); st.won.push(N(ITEM_NAME[k])); }
        else if (kind === 'life') { SAVE.lives++; st.won.push('1UP'); sound.play('oneup'); }
        else { SAVE.coins += 10; st.won.push(L('10 金幣', '10 coins')); }
        store(); hudItems();
      } else { st.miss++; sound.play('deny'); }
      draw();
    }, 650);
  };
  draw();
}
const ownedSuits = () => SUIT_ORDER.filter((k) => SAVE.suits[k]);
function putOn(k) {
  const h = S.G.hero; if (h.dead || h.statue > 0) return;
  const to = k ? SUITS[k].power : Math.max(1, h.power <= 2 ? h.power : 1); if (to === h.power) return;
  wear(S.G, to); SAVE.power = to; store(); hudItems(); sound.play(k ? 'suit' : 'unstatue'); puff(h);
  toast(k ? `${L('換上', 'Now wearing the ')}${N(SUITS[k].name)}${L('！', '!')} <small>${N(SUITS[k].what)}</small>` : L('脫下套裝', 'Suit off'));
}
function cycleSuit() {
  const own = ownedSuits(); if (!own.length) { toast(L('還沒有套裝。去各地的套裝神殿拿吧！', 'No suits yet. Find them in the suit shrines around Leafy Land!')); sound.play('deny'); return; }
  const list = [null, ...own], cur = SUIT_OF[S.G.hero.power] || null, i = list.indexOf(cur); putOn(list[(i + 1) % list.length]);
}
function itemsPanel() {
  const h = S.G.hero;
  showPanel('items', L('道具', 'Items'), () => {
    const wardrobe = `<p class="say">${L('套裝（按 R 也可以換）', 'Suits (R changes them too)')}: ${ownedSuits().length} / ${SUIT_ORDER.length}</p><div class="row suits">` + SUIT_ORDER.map((k) => SAVE.suits[k] ? btn(`<i class="sw s-${k}"></i><span>${N(SUITS[k].name)}</span>`, () => { closePanel(); putOn(k); }, { cls: 'itembtn' + (SUIT_OF[h.power] === k ? ' on' : '') }) : `<button class="itembtn" disabled><i class="sw"></i><span>？？？</span></button>`).join('') + `</div><p class="say small">${L('神秘寶物', 'Mysterious treasures')}: ${RELIC_ORDER.map((k) => SAVE.relics[k] ? `<b title="${N(RELICS[k].what)}">${N(RELICS[k].name)}</b>` : '？').join(' · ')}</p>`;
    if (!SAVE.items.length) return wardrobe + `<p class="say">${L('沒有道具。蘑菇小屋和黑桃翻牌可以拿到。', 'No items. The Mushroom Houses and the spade panel give them.')}</p>${btn('OK', closePanel)}`;
    return wardrobe + `<p class="say">${L('道具隨時都可以用。', 'Use an item any time.')} ${L('目前', 'Now')}: <b>${N(POWER_NAME[h.power])}</b></p><div class="row">` + SAVE.items.map((it, i) => btn(`${itemImg(it)}<span>${N(ITEM_NAME[it])}</span>`, () => {
      if (it === 'pwing') { SAVE.items.splice(i, 1); h.pwing = true; S.pwingT = 60; if (h.power !== 3 && h.power !== 4) setPower(h, 3); SAVE.power = h.power; sound.play('leaf'); store(); hudItems(); closePanel(); toast(L('P 翅膀！60 秒內可以一直飛', 'P-wing! Fly as long as you like for 60 seconds')); return; }
      const p = ITEM_POWER[it]; if (p === h.power || (it === 'mush' && h.power > 0)) { sound.play('deny'); toast(L('現在用沒有效果', 'That would not help right now')); return; }
      setPower(h, p); SAVE.power = p; SAVE.items.splice(i, 1); sound.play(it === 'leaf' ? 'leaf' : 'power'); store(); hudItems(); closePanel(); toast(L(`變成${N(POWER_NAME[p])}了！`, `Now ${N(POWER_NAME[p])}!`));
    }, { cls: 'itembtn' })).join('') + `</div>${btn(L('關閉', 'Close'), closePanel)}`;
  });
}
// the map of the island: where you are, every course, which ones are done and which pipes are open
let mapImg = null;
function mapPanel() {
  if (!mapImg) mapImg = worldMapImage(W0);
  showPanel('map', N(['葉葉國', 'Leafy Land']), () => `<div class="wmap"><canvas id="wmapc" width="512" height="512"></canvas></div><p class="say small">${L(`★ 已過關　◎ 傳送水管已開　✦ 找到的秘密星星（${secretsN()} / ${W0.secrets.length}）　▲ 你在這裡`, `★ cleared  ◎ warp pipe open  ✦ secret stars found (${secretsN()} / ${W0.secrets.length})  ▲ you are here`)}</p>${btn(L('關閉', 'Close'), closePanel, { cls: 'go' })}`);
  const c = $('wmapc'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(mapImg, 0, 0, 512, 512);
  g.font = '900 15px "Noto Sans TC", sans-serif'; g.textAlign = 'center';
  const K = 512 / W0.w; g.font = '900 11px "Noto Sans TC", sans-serif';
  const label = (text, x, z, col) => { g.lineWidth = 3; g.strokeStyle = '#1a1a1a'; g.strokeText(text, x * K, z * K); g.fillStyle = col; g.fillText(text, x * K, z * K); };
  for (const id of ORDER) { const co = COURSES[id], cw = co.w ?? LEVELS[id].w, cd = co.d ?? LEVELS[id].d; label(`${SAVE.cleared[id] ? '★' : ''}${SAVE.warps[id] ? '◎' : ''}${N(co.region)}`, co.ox + cw / 2, co.oz + cd / 2, SAVE.cleared[id] ? '#ffd030' : '#ffffff'); }
  const LANDPOS = { snow: [140, 60], forest: [380, 60], desert: [480, 300], volcano: [460, 470], isles: [180, 560], peak: [690, 300], abyss: [400, 760], ...Object.fromEntries(Object.entries(W0.places || {}).filter(([k]) => LAND_ORDER.includes(k)).map(([k, v]) => [k, [v[0], v[1] - 14]])) };
  g.font = '900 14px "Noto Sans TC", sans-serif';
  for (const id of LAND_ORDER) { const [x, z] = LANDPOS[id], all = W0.secrets.filter((q2) => q2.land === id), got = all.filter((q2) => SAVE.secrets[q2.id]).length; label(`${SAVE.warps[id] ? '◎' : ''}${N(LANDS[id].name)} ✦${got}/${all.length}`, x, z, '#ffe8a0'); }
  { const all = W0.secrets.filter((q2) => q2.land === 'core'), got = all.filter((q2) => SAVE.secrets[q2.id]).length; label(`${N(['蘑菇村', 'Mushroom Village'])}  ✦${got}/${all.length}`, W0.start[0], W0.start[2] - 16, '#ff9a9a'); }
  g.font = '900 11px "Noto Sans TC", sans-serif';
  for (const sd of W0.suits) label(`👕${SAVE.suits[sd.id] ? N(SUITS[sd.id].name) : L('套裝神殿', 'Suit shrine')}`, sd.x, sd.z + 10, SAVE.suits[sd.id] ? '#9af0ff' : '#d0e8f0');
  for (const r of W0.relics) label(SAVE.relics[r.id] ? `◆${N(RELICS[r.id].where)}` : `？${N(RELICS[r.id].where)}`, r.x, r.z - 8, SAVE.relics[r.id] ? '#ff9af0' : '#e0b0ff');
  if (SAVE.relics.key) for (const sc of W0.secrets) if (!SAVE.secrets[sc.id]) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '11px sans-serif'; g.fillText('✧', sc.x * K, sc.z * K + 4); }
  for (const sc of W0.secrets) if (SAVE.secrets[sc.id]) { g.fillStyle = '#ffd030'; g.font = '12px sans-serif'; g.fillText('✦', sc.x * K, sc.z * K + 4); }
  const h = S.G.hero, hx = h.x * K, hz = h.z * K; g.save(); g.translate(hx, hz); g.rotate(-h.face + Math.PI); g.fillStyle = '#ff3a2a'; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 7); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function menuPanel() {
  showPanel('menu', L('選單', 'Menu'), () => {
    let h = '<div class="col">';
    h += btn(L('繼續', 'Resume'), closePanel, { cls: 'go' });
    h += btn(L('地圖', 'Map'), mapPanel); h += btn(L('道具', 'Items'), itemsPanel);
    h += btn(L('回到蘑菇村', 'Back to Mushroom Village'), () => { closePanel(); warpTo(W0.start, L('回到蘑菇村', 'Back to the village')); });
    h += btn(sound.musicOn ? L('音樂：開', 'Music: on') : L('音樂：關', 'Music: off'), () => { sound.setMusic(!sound.musicOn); menuPanel(); });
    h += btn(EN() ? '中文' : 'English', () => { setLang(EN() ? 'zh' : 'en'); menuPanel(); });
    h += btn(L('重新開始遊戲', 'Start a new game'), () => showPanel('menu', L('重新開始？', 'Start over?'), () => `<p class="say">${L('所有進度都會清除。', 'All progress will be erased.')}</p><div class="col">${btn(L('確定', 'Yes, start over'), () => { SAVE = fresh(); store(); location.reload(); }, { cls: 'red' })}${btn(L('取消', 'Cancel'), menuPanel)}</div>`));
    return h + `</div><p class="help">${helpText()}</p>`;
  });
  sound.setSong(null);
}

// ---------------------------------------------------------------- playing in the world
function songFor() { const h = S.G.hero; if (h.swimming) return 'water'; return S.region ? S.region.theme : 'grass'; }
function warpTo(at, msg) { const G = S.G; respawn(G, at, G.hero.power); G.respawn = at; SAVE.at = at; store(); S.camT = null; S.V.prime(at[0], at[2]); sound.play('enter'); if (msg) toast(msg); }
// the warp pipe you are standing on, if any
function pipeUnder(h) { if (!h.onGround) return null; const cx = h.x + h.w / 2, cz = h.z + h.d / 2; return W0.warps.find((p) => cx > p.x && cx < p.x + 2 && cz > p.z && cz < p.z + 2 && Math.abs(h.y - (p.base + p.hgt)) < 0.1) || null; }
function pipeTarget(p) {
  if (p.warp.kind === 'secret') return p.warp.to;
  if (p.warp.kind === 'home') { const hub = W0.warps.find((q2) => q2.warp.kind === 'to' && q2.warp.region === p.warp.region); return [hub.x + 0.5, hub.base + hub.hgt, hub.z + 2.6]; }
  const dest = W0.warps.find((q2) => q2.warp.kind === 'home' && q2.warp.region === p.warp.region && !q2.warp.end); return [dest.x + 0.5, dest.base + dest.hgt, dest.z + 0.5];
}
function onEvent(e) {
  const G = S.G;
  switch (e.t) {
    case 'tile': S.V.touch(e.x, e.z); break;
    case 'coin': SAVE.coins++; sound.play('coin'); if (e.pop) popCoin(e.x, e.y, e.z); if (SAVE.coins >= 100) { SAVE.coins -= 100; SAVE.lives++; sound.play('oneup'); toast('1UP!'); } break;
    case 'bumpblock': bumpBlock(e.x, e.y, e.z, e.down); break;
    case 'break': sound.play('break'); debris(e.x, e.y, e.z); break;
    case 'pound': sound.play('pound'); dust(e.x + 0.35, e.y, e.z + 0.35); S.shake = 0.25; break;
    case 'spinup': sound.play('wag'); break;
    case 'power': sound.play(e.kind === 'leaf' ? 'leaf' : 'power'); SAVE.power = G.hero.power; hudItems(); break;
    case 'oneup': SAVE.lives++; sound.play('oneup'); toast('1UP!'); break;
    case 'hurt': sound.play('hurt'); SAVE.power = G.hero.power; hudItems(); if (e.lost >= 3 && SAVE.suits[SUIT_OF[e.lost]]) toast(L(`${N(SUITS[SUIT_OF[e.lost]].name)}被打掉了！按 R 可以再穿上`, `Your ${N(SUITS[SUIT_OF[e.lost]].name)} came off! Press R to put it back on`)); break;
    case 'die': sound.setSong(null); sound.play('die'); S.deadT = 0.001; break;
    case 'clear': courseClear(e.region, e.card, e.again); break;
    case 'bossdown': sound.play('bosshit'); setTimeout(() => courseClear(e.region, 'star', !!SAVE.cleared[e.region], true), 900); break;
    case 'check': sound.play('check'); toast(L('通過中間點！', 'Checkpoint!')); SAVE.at = G.respawn; store(); break;
    case 'arrive': SAVE.at = G.respawn; if (e.region && PLACES[e.region] && !SAVE.warps[e.region]) { SAVE.warps[e.region] = true; toast(L('村子裡通往這裡的水管打開了！', 'The village pipe to here is open now!')); } store(); break;
    case 'secret': foundSecret(e.id); break;
    case 'suit': { const sd = SUITS[e.id]; SAVE.power = G.hero.power; puff(G.hero); if (!SAVE.suits[e.id]) { SAVE.suits[e.id] = true; sound.play('relic'); banner(L(`得到${N(sd.name)}！`, `You found the ${N(sd.name)}!`), `${N(sd.what)} · ${L('按 R 隨時換穿', 'press R to change any time')}`); } else { sound.play('suit'); toast(`${L('換上', 'Now wearing the ')}${N(sd.name)}`); } store(); hudItems(); break; }
    case 'relic': { const r = RELICS[e.id]; SAVE.relics[e.id] = true; G.perks[e.id] = true; sound.play('relic'); setTimeout(() => sound.play('fanfare'), 700);
      banner(L(`神秘寶物：${N(r.name)}！`, `Mysterious treasure: the ${N(r.name)}!`), `${N(r.what)} · ${relicsN()} / ${RELIC_ORDER.length}`); gateState(G, allRelics()); store(); break; }
    case 'noair': toast(L('🫧 氣不夠了！快浮上去換氣（青蛙套裝不用換氣）', '🫧 Out of air! Swim up to breathe (the Frog Suit never needs to)')); break;
    case 'ram': case 'slide': case 'suitlost': sound.play(e.t); break;
    case 'redcoin': sound.play('coin'); toast(`<span style="color:#e8302a">●</span> ${L('紅色金幣', 'Red coin')} ${e.n} / ${e.of}`); if (e.n === e.of) { sound.play('sprout'); toast(L('秘密星星出現了！', 'A secret star has appeared!')); } break;
    case 'dig': sound.play('break'); dust(e.x + 0.5, e.y + 1, e.z + 0.5); break;
    case 'bat': sound.play('wag'); break;
    case 'jump': case 'stomp': case 'kick': case 'thud': case 'fire': case 'tail': case 'note': case 'sprout': case 'bosshit': case 'bosshop': case 'bossfire': case 'fly': case 'wag': case 'splash': case 'swim': case 'hop': case 'statue': case 'unstatue': case 'cannon': case 'wand': sound.play(e.t); break;
  }
}
// a secret star: every fifth one brings a gift
const MILESTONES = { 5: ['flower', 1], 10: ['pwing', 3], 15: ['mush', 2], 20: ['pwing', 3], 25: ['flower', 5], 30: ['pwing', 5], 40: ['pwing', 10], 50: ['pwing', 10] };
function foundSecret(id) {
  if (SAVE.secrets[id]) return; SAVE.secrets[id] = true; S.G.found[id] = true;
  const n = secretsN(), all = W0.secrets.length; sound.play('fanfare');
  let sub = `✦ ${n} / ${all}`;
  const m = MILESTONES[n]; if (m) { SAVE.items.push(m[0]); if (SAVE.items.length > 8) SAVE.items.shift(); SAVE.lives += m[1]; sub += ` · ${L('獎勵', 'reward')}: ${N(ITEM_NAME[m[0]])} + ${m[1]}UP`; hudItems(); }
  if (n === all) { sub += ` · ${L('全部找到了！你是傳說中的跳跳！', 'All found! You are the legendary hopper!')}`; SAVE.lives += 20; }
  banner(L('秘密星星！', 'Secret star!'), sub); store(); hud();
}
// a course's finish line or its boss: a card, and the first time a star for Leafy Land
function courseClear(region, card, again, boss) {
  if (!region || !COURSES[region]) return;
  if (again) { sound.play('coin'); toast(L(`又過了一次 ${N(COURSES[region].region)}！+5 金幣`, `${N(COURSES[region].region)} again! +5 coins`)); SAVE.coins += 5; store(); return; }
  SAVE.cleared[region] = true; S.G.done[region] = true;
  sound.play(boss ? 'fanfare' : 'clear');
  let bonus = '';
  if (!boss) { SAVE.cards.push(card); if (SAVE.cards.length >= 3) { const c = SAVE.cards, same = c.every((x) => x === c[0]), n = same ? { mush: 2, flower: 3, star: 5 }[c[0]] : 1; SAVE.lives += n; bonus = L(`三張卡片：${n} UP！`, `Three cards: ${n} UP!`); SAVE.cards = []; } }
  // every new star restocks the Mushroom Houses and the spade panel
  SAVE.houses = {}; SAVE.spade = false;
  banner(boss ? L('打倒了！', 'Defeated!') : L('過關！', 'Course clear!'), `★ ${clearedN()} / ${ORDER.length}${boss ? '' : ` · ${L('得到卡片', 'card')} ${cardImg(card)}`}${bonus ? ' · ' + bonus : ''}`);
  if (region === '1-F') setTimeout(() => openAirship(S.G, true), 3200);
  if (region === '1-A') { SAVE.won = true; setTimeout(ending, 2600); }
  store(); hud();
}
function popCoin(x, y, z) { const m = makeCoinPop(); m.position.set(x + 0.5, y + 1.2, z + 0.5); scene.add(m); anims.push({ m, t: 0, kind: 'coin', y0: y + 1.2 }); }
function bumpBlock(x, y, z, down) { const k = look(S.G.L, x, y, z); if (!k) return; const m = tileBox(k === 'grass' ? 'dirt' : k); m.position.set(x + 0.5, y + 0.5, z + 0.5); m.scale.setScalar(1.03); scene.add(m); anims.push({ m, t: 0, kind: 'bump', y0: y + 0.5, dir: down ? -1 : 1 }); }
function debris(x, y, z) { for (let i = 0; i < 6; i++) { const m = box(0.35, 0.35, 0.35, '#c8641e', x + 0.5, y + 0.5, z + 0.5); scene.add(m); const a = i / 6 * Math.PI * 2; anims.push({ m, t: 0, kind: 'bit', vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: i % 2 ? 12 : 8 }); } }
function puff(h) { for (let i = 0; i < 10; i++) { const m = box(0.18, 0.18, 0.18, ['#ffffff', '#ffe060', '#ff9ad0'][i % 3], h.x + h.w / 2, h.y + 1, h.z + h.d / 2); scene.add(m); const a = i / 10 * Math.PI * 2; anims.push({ m, t: 0, kind: 'bit', vx: Math.cos(a) * 4, vz: Math.sin(a) * 4, vy: 6 }); } }
function dust(x, y, z) { for (let i = 0; i < 8; i++) { const m = box(0.25, 0.25, 0.25, '#f0e8d8', x, y + 0.2, z); scene.add(m); const a = i / 8 * Math.PI * 2; anims.push({ m, t: 0, kind: 'bit', vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, vy: 3 }); } }
function stepAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]; a.t += dt;
    if (a.kind === 'coin') { a.m.position.y = a.y0 + Math.sin(Math.min(1, a.t / 0.5) * Math.PI) * 2; a.m.rotation.y += dt * 20; if (a.t > 0.5) a.done = true; }
    else if (a.kind === 'bump') { a.m.position.y = a.y0 + Math.sin(Math.min(1, a.t / 0.18) * Math.PI) * 0.35 * a.dir; if (a.t > 0.18) a.done = true; }
    else if (a.kind === 'bit') { a.vy -= 40 * dt; a.m.position.x += a.vx * dt; a.m.position.z += (a.vz || 0) * dt; a.m.position.y += a.vy * dt; a.m.rotation.z += dt * 10; if (a.t > 1.2) a.done = true; }
    if (a.done) { scene.remove(a.m); anims.splice(i, 1); }
  }
}
function syncEntities(dt) {
  const G = S.G, seen = new Set(), h = G.hero, near = (o) => Math.abs(o.x - h.x) < 70 && Math.abs(o.z - h.z) < 70;
  const sync = (list, make, pose) => { for (const o of list) { if (!near(o)) continue; seen.add(o); let m = ents.get(o); if (!m) { m = make(o); scene.add(m); ents.set(o, m); } pose(m, o); } };
  sync(G.enemies, (e) => shade(makeEnemy(e)), (m, e) => poseEnemy(m, e, dt, S.t));
  sync(G.items, (it) => shade(makeItem(it.kind, it)), (m, it) => { m.position.set(it.x + it.w / 2, it.y, it.z + it.d / 2); if (m.userData.spin) m.userData.spin.rotation.y = S.t * 1.6; if (m.userData.sparks) m.userData.sparks.forEach((sp, i) => { const a = S.t * 2 + i * Math.PI / 2; sp.position.set(Math.cos(a) * 0.55, 0.5 + Math.sin(S.t * 3 + i) * 0.25, Math.sin(a) * 0.55); }); if (it.kind === 'leaf') m.rotation.z = Math.sin(it.t * 3) * 0.5; else m.rotation.y = it.kind === 'flower' ? Math.sin(S.t * 3) * 0.4 : 0; });
  sync(G.reds.flatMap((r) => r.coins.filter((c) => !c.got)), () => makeRedCoin(), (m, c) => { m.position.set(c.x + 0.35, c.y + 0.5, c.z + 0.35); m.rotation.y = S.t * 3; });
  sync(G.fire, () => makeFireball(), (m, f) => { m.position.set(f.x + f.w / 2, f.y + f.h / 2, f.z + f.d / 2); });
  sync(G.shots, (s) => makeShot(s.kind), (m, s) => { m.position.set(s.x + 0.3, s.y + 0.2, s.z + 0.3); m.rotation.y = Math.atan2(s.vx, s.vz) + Math.PI / 2; });
  for (const [o, m] of ents) if (!seen.has(o)) { scene.remove(m); ents.delete(o); }
}
const STEP = 1 / 120;
function worldStep(dt, held, edge, digital, stick) {
  if (edge.swap) swapBro();
  if (edge.suit && !S.panel && S.warpT <= 0) cycleSuit();
  const G = S.G, h = G.hero;
  if (edge.pause) return menuPanel();
  if (edge.items) return itemsPanel();
  if (edge.map) return mapPanel();
  if (S.warpT > 0) { S.warpT -= dt; heroMesh.position.y -= dt * 3; if (S.warpT <= 0) warpTo(S.warpTo, S.warpMsg); return; }
  const camIn = ((held.camL ? 1 : 0) - (held.camR ? 1 : 0)) * 1.8 * dt - stick.rx * 2.4 * dt;
  if (camIn) { cam.yaw += camIn; cam.manual = 2; }
  if (stick.ry) cam.pitch = Math.max(0.08, Math.min(1.25, cam.pitch + stick.ry * 1.6 * dt));
  let ix = (digital.right ? 1 : 0) - (digital.left ? 1 : 0) + stick.x, iz = (digital.up ? 1 : 0) - (digital.down ? 1 : 0) - stick.y;
  const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  const mx = -Math.sin(cam.yaw) * iz + Math.cos(cam.yaw) * ix, mz = -Math.cos(cam.yaw) * iz - Math.sin(cam.yaw) * ix;
  // standing on a warp pipe: C goes down it
  const pipe = !h.dead ? pipeUnder(h) : null;
  if (pipe) {
    const to = pipe.warp.region, secretPipe = pipe.warp.kind === 'secret', name = secretPipe ? '？？？' : N(PLACES[to].name), open = secretPipe || pipe.warp.kind === 'home' || SAVE.warps[to];
    prompt(secretPipe ? L('按 C 進水管 → ？？？', 'C: down the pipe → ???') : pipe.warp.kind === 'home' ? L(`按 C 進水管 → 回蘑菇村`, `C: down the pipe → Mushroom Village`) : open ? L(`按 C 進水管 → ${name}`, `C: down the pipe → ${name}`) : L(`還沒去過「${name}」：先走過去，這根水管才會通`, `You haven’t been to ${name} yet: walk there first to open this pipe`));
    if (edge.pound && open) { S.warpT = 0.6; S.warpTo = pipeTarget(pipe); S.warpMsg = secretPipe ? '' : pipe.warp.kind === 'home' ? N(['蘑菇村', 'Mushroom Village']) : name; sound.play('fly'); prompt(''); return; }
  } else { const hn = W0.hints.find((q2) => Math.abs(q2.x - (h.x + h.w / 2)) < 2.2 && Math.abs(q2.z - (h.z + h.d / 2)) < 2.2 && Math.abs(q2.y - 2 - h.y) < 3); prompt(hn ? `📜 ${N(hn.text)}` : ''); }
  S.acc += dt; let first = true;
  while (S.acc >= STEP) {
    S.acc -= STEP;
    const inp = { mx, mz, jump: held.jump, jumpPressed: first && edge.jump, run: held.run, runPressed: first && edge.run, pound: held.pound && !pipe, poundPressed: first && edge.pound && !pipe };
    for (const e of step(G, inp, STEP)) onEvent(e);
    first = false;
  }
  // the P-wing lasts a minute in the open world
  if (h.pwing) { S.pwingT -= dt; if (S.pwingT <= 0) { h.pwing = false; toast(L('P 翅膀用完了', 'The P-wing has worn off')); } }
  // walking into a Mushroom House door, or onto the spade panel
  S.doorCd = Math.max(0, S.doorCd - dt);
  const cx = h.x + h.w / 2, cz = h.z + h.d / 2;
  for (const d of W0.doors) if (S.doorCd <= 0 && Math.abs(cx - (d.x + 0.5)) < 0.6 && Math.abs(cz - (d.z + 0.5)) < 0.6 && Math.abs(h.y - d.y) < 0.5) {
    S.doorCd = 2; h.z += 1.4; h.vz = 0;
    if (SAVE.houses[d.id]) toast(L('小屋休息中。再過一關就會補貨！', 'The house is closed. Clear another course and it restocks!')); else { sound.play('enter'); housePanel(d.id); }
  }
  const sp = W0.spade; if (S.doorCd <= 0 && h.onGround && cx > sp.x0 && cx < sp.x1 + 1 && cz > sp.z0 && cz < sp.z1 + 1 && Math.abs(h.y - GY) < 0.2) { S.doorCd = 3; if (SAVE.spade) toast(L('翻牌已經玩過了。再過一關就能再玩！', 'Already played. Clear another course to play again!')); else spadePanel(); }
  // which part of Leafy Land: a banner and a tune when it changes
  const reg = regionAt(W0, cx, h.y, cz);
  if (!S.region || reg.id !== S.region.id) { S.region = reg; if (!h.dead) { const c = COURSES[reg.id]; banner(c ? `WORLD ${reg.id}` : N(reg.name), c ? N(reg.name) + (SAVE.cleared[reg.id] ? ' ★' : '') : ''); } sound.setSong(songFor()); }
  if (h.swimming !== S.wasSwim) { S.wasSwim = h.swimming; sound.setSong(songFor()); }
  if (S.deadT > 0) {
    S.deadT += dt;
    if (S.deadT > 2.6) {
      S.deadT = 0; SAVE.lives--; SAVE.power = 0;
      if (SAVE.lives <= 0) { store(); return gameOver(); }
      respawn(G, G.respawn, 0); S.camT = null; store(); hudItems(); sound.setSong(songFor());
    }
  }
}
function gameOver() {
  sound.setSong(null);
  showPanel('over', 'GAME OVER', () => `<p class="say">${L('沒關係！這是簡單模式：給你 5 條命，從蘑菇村繼續。拿到的星星都還在。', 'No worries: this is easy mode. Here are 5 more lives; carry on from Mushroom Village. Every star you won stays won.')}</p>${btn(L('繼續', 'Continue'), () => { SAVE.lives = 5; respawn(S.G, W0.start, 0); S.G.respawn = W0.start; SAVE.at = W0.start; store(); S.camT = null; closePanel(); hudItems(); }, { cls: 'go' })}`, false);
}
function ending() {
  sound.play('fanfare');
  showPanel('end', L('葉葉國得救了！', 'Leafy Land is saved!'), () => `<p class="say">${L('小王子被打敗了，飛行船墜落，葉葉國的魔杖也被搶回來了！謝謝你，勇敢的小跳跳！整座島都還可以繼續探險：找找看還沒拿到的星星、金幣和寶箱吧。', 'The little prince is beaten, his airship goes down, and Leafy Land gets its magic wand back! Thank you, brave hopper! The whole island is still yours to explore: look for the stars, coins and chests you have not found yet.')}</p>${btn(L('太好了！', 'Hooray!'), closePanel, { cls: 'go' })}`);
}

// ---------------------------------------------------------------- the camera: behind you, turning with you, never inside a wall
const tmpV = new THREE.Vector3();
function solidAt(x, y, z) { const t = tileAt(S.G.L, Math.floor(x), Math.floor(y), Math.floor(z)); return isSolid(t) && t !== T.PIPE && t !== T.PIPETOP; }
function placeCamera(dt) {
  const G = S.G, h = G.hero, hx = h.x + h.w / 2, hz = h.z + h.d / 2, speed = Math.hypot(h.vx, h.vz);
  cam.manual = Math.max(0, cam.manual - dt);
  // gently swing round behind you as you run (unless you turned the camera yourself a moment ago)
  if (!cam.manual && speed > 2 && !h.dead) { const want = h.face + Math.PI, d = ((want - cam.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; if (Math.abs(d) < 2.6) cam.yaw += d * Math.min(1, dt * 0.9 * speed / 9); }
  if (h.onGround || h.swimming || S.camBase == null) S.camBase = h.y;
  const ty = h.flyT > 0 || h.dead || Math.abs(h.y - S.camBase) > 2 ? h.y : S.camBase;
  const want = new THREE.Vector3(hx, ty + 1.4, hz);
  if (!S.camT) S.camT = want.clone(); else if (!h.dead) { const k = Math.min(1, dt * 8); S.camT.x += (want.x - S.camT.x) * k; S.camT.z += (want.z - S.camT.z) * k; S.camT.y += (want.y - S.camT.y) * Math.min(1, dt * (h.flyT > 0 ? 8 : 4)); }
  const cp = Math.cos(cam.pitch), dir = tmpV.set(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp);
  let dist = cam.dist * (camera.aspect < 1 ? 1.3 : 1);
  // pull in where a wall, a ceiling or a hill is in the way
  for (let s = 0.6; s < dist; s += 0.25) { const p = S.camT; if (solidAt(p.x + dir.x * s, p.y + dir.y * s, p.z + dir.z * s)) { dist = Math.max(1.6, s - 0.45); break; } }
  camera.position.set(S.camT.x + dir.x * dist, S.camT.y + dir.y * dist, S.camT.z + dir.z * dist);
  if (S.shake > 0) { S.shake -= dt; camera.position.y += Math.sin(S.t * 80) * S.shake * 0.6; }
  camera.lookAt(S.camT);
  sun.position.set(S.camT.x - 14, S.camT.y + 40, S.camT.z + 18); sun.target.position.copy(S.camT);
  // the sky and the fog: dark in the cave and the fortress, blue under the sea
  const inside = S.region && (S.region.theme === 'cave' || S.region.theme === 'fort') && (COURSES[S.region.id] || null);
  setSky(h.swimming ? (h.inLava ? 'molten' : h.y < SEA - 70 ? 'abyss' : h.y < SEA - 28 ? 'deep' : 'under') : inside ? S.region.theme : S.region ? (S.region.sky || (S.region.theme === 'fort' ? 'grass' : S.region.theme)) : 'grass');
  const fl = floorBelow(G.L, hx, h.y + 0.1, hz); blob.visible = !h.dead && fl > -50; blob.position.set(hx, fl + 0.03, hz); blob.scale.setScalar(Math.max(0.4, 1 - Math.max(0, h.y - fl) * 0.06));
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; S.t += dt;
  const { held, edge, digital, stick } = readButtons();
  S.V.work(S.mode === 'title' ? 14 : 6);
  if (S.mode === 'title') {
    $('t-play').disabled = S.V.ready < Math.min(S.V.total, 60);
    if ((edge.jump || edge.confirm) && !$('t-play').disabled) play();
    // a slow flight over the village while the island is built
    const a = S.t * 0.08, [sx, sy, sz] = W0.start; camera.position.set(sx + 20 + Math.cos(a) * 40, sy + 30, sz + Math.sin(a) * 40); camera.lookAt(sx + 20, sy + 2, sz); setSky('grass');
    poseHero(heroMesh, S.G.hero, dt, S.t); follow(dt);
  } else {
    if (S.panel) panelInput(edge); else worldStep(dt, held, edge, digital, stick);
    placeCamera(dt);
    if (S.warpT <= 0) poseHero(heroMesh, S.G.hero, dt, S.t);
    follow(dt);
    S.V.follow(S.G.hero.x, S.G.hero.z);
    syncEntities(dt); stepAnims(dt);
    hudT += dt; if (hudT > 0.1) { hudT = 0; hud(); }
  }
  S.V.update(S.t, camera.position, { done: SAVE.cleared, respawn: S.G.respawn });
  if (!S.noRender) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- start
const helpText = () => PAD.used || PAD.connected ? L('控制器：左搖桿 移動 · 右搖桿 轉視角 · A 跳／游泳（有尾巴時在空中連按可以飛）· B／X 跑步＋攻擊 · Y／LT 屁股蹬地、狸貓石像、青蛙下潛、站在水管上進水管 · R3 換套裝 · RB 換兄弟 · Back 道具 · LB 地圖 · Start 選單', 'Controller: left stick move · right stick camera · A jump / swim (with a tail, tap in the air to fly) · B / X run and attack · Y / LT ground pound, Tanooki statue, Frog dive, go down a pipe · R3 change suit · RB swap brother · Back items · LB map · Start menu')
  : matchMedia('(pointer: coarse)').matches ? L('觸控：方向鈕 移動 · 拖曳畫面 轉視角 · A 跳（拿著葉子在空中連按可以飛）· B 跑步＋攻擊 · ⤓ 屁股蹬地／進水管 · 👕 換套裝 · ⇄ 換兄弟 · 點背包用道具', 'Touch: arrows move · drag the screen to turn the camera · A jump (with the leaf, tap in the air to fly) · B run and attack · ⤓ ground pound / go down a pipe · 👕 change suit · ⇄ swap brother · tap the bag for items')
    : L('方向鍵／WASD 移動 · 空白鍵／Z 跳（有尾巴時在空中連按可以飛；水裡按跳游泳）· Shift／X 跑步＋丟火球／甩尾巴 · C：空中屁股蹬地；站在水管上進水管；狸貓裝按住變石像；青蛙裝下潛 · R 換套裝 · V 換兄弟 · Q／E 或拖曳 轉視角 · Tab 道具 · M 地圖 · Esc 選單', 'Arrows / WASD move · Space / Z jump (with a tail, tap in the air to fly; in water, jump swims) · Shift / X run, throw fire, swing your tail · C: ground pound in the air; go down a pipe you stand on; hold for the Tanooki statue; dive as a frog · R change suit · V swap brother · Q / E or drag: camera · Tab items · M map · Esc menu');
function staticText() {
  document.documentElement.lang = EN() ? 'en' : 'zh-Hant';
  $('t-sub').textContent = L('Josh 和 Jasper 兄弟的葉葉國是一個巨大的開放 3D 世界！蘑菇村、雪原、巨菇森林、沙漠金字塔、火山、南方群島、高聳入雲的天梯峰和深淵大洋，爬雲梯上天、潛進海底、鑽進山洞。去各地的神殿拿套裝：葉子套裝能飛、青蛙套裝潛進深海、岩漿套裝在岩漿裡游泳、登山套裝爬上峭壁、狸貓套裝變石像，再去五個神秘地點找神秘寶物。收集每一關的星星，還有藏在各地的秘密星星：看不見的方塊、地上的 X、紅色金幣、裂開的磚牆、沒有名牌的水管……（簡單模式）', 'All of Leafy Land is one huge open 3D world! Josh and Jasper’s Leafy Land: Mushroom Village, the snowfields, the giant mushroom forest, the desert pyramid, the volcano, the southern isles, the towering Skyreach Peak and the Abyssal Sea; climb cloud stairs, dive under the sea, burrow through mountains. Fetch the suits from their shrines: the Leaf Suit flies, the Frog Suit dives to the deep sea, the Lava Suit swims through lava, the Climbing Suit scales cliffs, the Tanooki Suit turns to stone; then seek the mysterious treasures in five mysterious places. Win every course’s star, and hunt the secret stars hidden everywhere: invisible blocks, an X on the ground, red coins, cracked brick walls, pipes with no name… (Easy mode)');
  $('t-play').textContent = hadSave ? L('繼續冒險', 'Continue') : L('開始', 'Start');
  pickBro(SAVE.bro, true);
  $('t-lang').textContent = EN() ? '中文' : 'English';
  $('t-help').textContent = helpText();
  $('maphelp').textContent = L('Tab 道具 · M 地圖', 'Tab items · M map');
  if (S.mode === 'world') { hud(); hudItems(); }
}
function pickBro(k, quiet) {
  if (S.mode === 'title' && SAVE.bro !== k) { SAVE.bro = k; store(); applyBro(); }
  for (const b of ['josh', 'jasper']) $('t-' + b).classList.toggle('on', b === SAVE.bro);
  $('t-josh').innerHTML = `<b>Josh</b><small>${L('哥哥 · 跑得快', 'big brother · runs faster')}</small>`; $('t-jasper').innerHTML = `<b>Jasper</b><small>${L('弟弟 · 跳得高', 'little brother · jumps higher')}</small>`;
  $('t-pick').textContent = L('選一個兄弟（遊戲中按 V／RB／⇄ 隨時交換）', 'Pick a brother (swap any time with V / RB / ⇄)');
  if (!quiet) sound.play('click');
}
$('t-josh').onclick = () => { sound.start(); pickBro('josh'); }; $('t-jasper').onclick = () => { sound.start(); pickBro('jasper'); };
function setLang(l) { lang = l; try { localStorage.setItem('leafleap.lang', lang); } catch (e) { /* ignore */ } staticText(); }
function play() {
  if (S.mode !== 'title') return;
  sound.start(); $('curtain').classList.add('up'); $('title').classList.add('gone');
  setTimeout(() => { $('title').hidden = true; }, 900);
  S.mode = 'world'; $('hud').hidden = false; $('mapui').hidden = false; prompt(''); hud(); hudItems();
  S.region = null; S.camT = null; cam.yaw = Math.PI * 0.5;
  if (!hadSave) setTimeout(() => toast(L('歡迎來到蘑菇村！往東走有第一關，村子裡的水管可以傳送。去各地的神殿拿套裝吧！', 'Welcome to Mushroom Village! The first course is east; the village pipes take you places. Go find the suits in their shrines!')), 1500);
}
$('t-play').onclick = play;
$('t-lang').onclick = () => setLang(EN() ? 'zh' : 'en');
staticText();
setInterval(() => { if (S.mode === 'world' && !S.G.hero.dead) { const h = S.G.hero; if (h.onGround) { SAVE.power = h.power; store(); } } }, 10000);
requestAnimationFrame(frame);
window.__ll = { S, W0, renderer, courseClear, get SAVE() { return SAVE; }, play, menuPanel, itemsPanel, housePanel, spadePanel, mapPanel, warpTo, frame: (now) => frame(now), keys, tapped, cam };
