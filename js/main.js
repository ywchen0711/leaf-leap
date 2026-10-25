// LEAF LEAP 3D — the page: the title curtain, one open world to roam, the HUD, panels, input and the save.
// Leafy Land is a single island now: walk anywhere, climb the cloud stairs, take a warp pipe home to Mushroom Village,
// and cross each course's finish line for its card. There is no world map any more; the map screen shows the island.
import * as THREE from 'three';
import { T, newRun, step, floorBelow, tileAt, isSolid, setPower, respawn } from './game.js';
import { LEVELS } from './levels.js';
import { buildWorld, COURSES, ORDER, airshipCells, regionAt, GY } from './world.js';
import { buildWorldView, worldMapImage, makeHero, poseHero, makeEnemy, poseEnemy, makeItem, makeFireball, makeShot, makeCoinPop, tileBox, look, box, cmat, cardDataURL } from './view.js';
import { Sound } from './audio.js';

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
const fresh = () => ({ v: 2, cleared: {}, lives: 5, coins: 0, items: ['mush'], power: 0, cards: [], houses: {}, spade: false, won: false, at: null, warps: {}, seen: {} });
let SAVE = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && (s.v === 1 || s.v === 2)) return { ...fresh(), ...s, v: 2, at: s.v === 2 ? s.at : null }; } catch (e) { /* none */ } return null; })();
const hadSave = !!SAVE; if (!SAVE) SAVE = fresh();
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode */ } };

// ---------------------------------------------------------------- renderer
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const LOWFX = q.get('fx') === 'low';
renderer.shadowMap.enabled = !LOWFX; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.3, 900);
scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a6a', 1.3));
const sun = new THREE.DirectionalLight('#fff8e8', 1.55); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 }); sun.shadow.bias = -0.0008;
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const sound = new Sound();
const skyTex = (a, b) => { const c = document.createElement('canvas'); c.width = 2; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 2, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const SKIES = { grass: ['#4aa8ff', '#d0f0ff', '#cfeaff', 70, 230], map: ['#4aa8ff', '#d0f0ff', '#cfeaff', 70, 230], sky: ['#2a8aff', '#e8f6ff', '#e0f2ff', 80, 260], water: ['#3a9ae8', '#c8ecff', '#cfeaff', 70, 230], airship: ['#ff8a4a', '#ffe0a8', '#ffc890', 70, 240],
  cave: ['#05070d', '#141a30', '#0a0e1a', 14, 46], fort: ['#100e16', '#2a2030', '#1a1620', 16, 50], under: ['#1a5aa8', '#2a7ac8', '#2a7ac8', 6, 40] };
const skyCache = {};
function setSky(k) { if (S.sky === k) return; S.sky = k; const s = SKIES[k]; scene.background = skyCache[k] || (skyCache[k] = skyTex(s[0], s[1])); scene.fog = new THREE.Fog(s[2], s[3], s[4]); }

// ---------------------------------------------------------------- the world
const W0 = buildWorld();
const S = { mode: 'title', panel: null, G: null, V: null, deadT: 0, acc: 0, t: 0, shake: 0, region: null, sky: null, doorCd: 0, warpT: 0 };
// the save's state goes back into the world: the airship stair once the fortress is beaten
function openAirship(G, announce) { for (const [x, y, z] of airshipCells(W0)) if (tileAt(G.L, x, y, z) === T.EMPTY) { G.L.tiles[(y * G.L.d + z) * G.L.w + x] = T.CLOUD; if (S.V) S.V.touch(x, z); } if (announce) { banner(L('通往飛行船的雲梯出現了！', 'A cloud stair to the airship has appeared!'), L('在熔岩城的南邊', 'south of the Lava Castle')); sound.play('note'); } }
function newWorld() {
  const at = SAVE.at && !isSolid(tileAt(W0, Math.floor(SAVE.at[0]), Math.floor(SAVE.at[1]), Math.floor(SAVE.at[2]))) ? SAVE.at : W0.start;
  S.G = newRun(W0, { power: SAVE.power, at, done: SAVE.cleared });
  S.G.respawn = at;
  if (SAVE.cleared['1-F']) openAirship(S.G, false);
}
newWorld();
S.V = buildWorldView(scene, S.G); S.V.prime(S.G.hero.x, S.G.hero.z);
const heroMesh = makeHero(); heroMesh.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(heroMesh);
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
const KEYS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], jump: ['Space', 'KeyZ', 'KeyK'], run: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'], pound: ['KeyC', 'KeyL', 'ControlLeft'], camL: ['KeyQ'], camR: ['KeyE'], pause: ['Escape', 'KeyP'], confirm: ['Enter'], items: ['Tab', 'KeyI'], map: ['KeyM'] };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; sound.start();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys.add(e.code); if (!e.repeat) for (const [k, list] of Object.entries(KEYS)) if (list.includes(e.code)) tapped.add(k);
});
addEventListener('keyup', (e) => keys.delete(e.code));
const touchHeld = {};
for (const [id, k] of [['t-left', 'left'], ['t-right', 'right'], ['t-up', 'up'], ['t-down', 'down'], ['t-a', 'jump'], ['t-b', 'run'], ['t-c', 'pound'], ['t-pause', 'pause']]) {
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
    const pad = { left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, jump: b(0), run: b(1) || b(2) || b(7), pound: b(3) || b(6), pause: b(9), items: b(8), map: b(4) };
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
function hud() {
  $('lives').textContent = SAVE.lives; $('coins').textContent = String(SAVE.coins).padStart(2, '0');
  const h = S.G.hero, pm = h.pm, lit = Math.floor(pm * 6 + 0.001);
  $('pm').innerHTML = [0, 1, 2, 3, 4, 5].map((i) => `<i class="${i < lit ? 'on' : ''}">▶</i>`).join('') + `<b class="${pm >= 1 ? 'on' : ''}">P</b>`;
  $('cards').innerHTML = [0, 1, 2].map((i) => `<span>${SAVE.cards[i] ? cardImg(SAVE.cards[i]) : ''}</span>`).join('');
  $('where').textContent = `★${clearedN()}/${ORDER.length} ${S.region ? N(S.region.name) : ''}`;
}
function hudItems() { $('items').innerHTML = `<span>🎒</span>` + (SAVE.items.length ? SAVE.items.map(itemImg).join('') : `<small>${L('（沒有道具）', '(no items)')}</small>`) + `<em>${N(POWER_NAME[S.G.hero.power])}</em>`; }
const POWER_NAME = [['小', 'Small'], ['大', 'Big'], ['火焰', 'Fire'], ['狸貓尾巴', 'Raccoon'], ['狸貓裝', 'Tanooki'], ['青蛙裝', 'Frog']];
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
const HOUSE_ITEMS = { house: ['leaf', 'tanooki', 'frog'], house2: ['tanooki', 'frog', 'pwing'] };
function housePanel(id) {
  const chest = [...HOUSE_ITEMS[id]].sort(() => Math.random() - 0.5);
  showPanel('house', L('蘑菇小屋', 'Mushroom House'), () => `<p class="say">${L('歡迎！選一個寶箱，裡面的道具送給你。', 'Welcome! Pick a chest, and what is inside is yours.')}</p><div class="chests">${[1, 2, 3].map((i) => btn(`<i class="chest"></i>${i}`, () => {
    const it = chest[i - 1]; SAVE.items.push(it); if (SAVE.items.length > 8) SAVE.items.shift(); SAVE.houses[id] = true; store(); hudItems(); sound.play('power');
    showPanel('house', L('得到了！', 'You got it!'), () => `<div class="got">${itemImg(it)}</div><p class="say">${N(ITEM_NAME[it])} — ${L('按 Tab（或點左上的背包）隨時使用。', 'use it any time from your bag (Tab, or tap it).')}</p>${btn('OK', closePanel, { cls: 'go' })}`);
  }, { cls: 'chestbtn' })).join('')}</div>`);
}
const SPADE_PRIZE = { mush: 'item', flower: 'item', leaf: 'item', tanooki: 'item', frog: 'item', star: 'life', coin: 'coins' };
function spadePanel() {
  const deck = ['mush', 'mush', 'flower', 'flower', 'star', 'leaf', 'tanooki', 'frog', 'coin'].flatMap((k) => [k, k]).sort(() => Math.random() - 0.5);
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
function itemsPanel() {
  const h = S.G.hero;
  showPanel('items', L('道具', 'Items'), () => {
    if (!SAVE.items.length) return `<p class="say">${L('沒有道具。蘑菇小屋和黑桃翻牌可以拿到。', 'No items. The Mushroom Houses and the spade panel give them.')}</p>${btn('OK', closePanel)}`;
    return `<p class="say">${L('隨時都可以用。', 'Use one any time.')} ${L('目前', 'Now')}: <b>${N(POWER_NAME[h.power])}</b></p><div class="row">` + SAVE.items.map((it, i) => btn(`${itemImg(it)}<span>${N(ITEM_NAME[it])}</span>`, () => {
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
  showPanel('map', N(['葉葉國', 'Leafy Land']), () => `<div class="wmap"><canvas id="wmapc" width="512" height="512"></canvas></div><p class="say small">${L('★ 已過關　◎ 傳送水管已開　▲ 你在這裡', '★ cleared  ◎ warp pipe open  ▲ you are here')}</p>${btn(L('關閉', 'Close'), closePanel, { cls: 'go' })}`);
  const c = $('wmapc'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(mapImg, 0, 0, 512, 512);
  g.font = '900 15px "Noto Sans TC", sans-serif'; g.textAlign = 'center';
  for (const id of ORDER) { const co = COURSES[id], Lv = LEVELS[id], x = (co.ox + Lv.w / 2) * 2, z = (co.oz + Lv.d / 2) * 2; const label = `${SAVE.cleared[id] ? '★' : ''}${SAVE.warps[id] ? '◎' : ''}${N(co.region)}`; g.lineWidth = 4; g.strokeStyle = '#1a1a1a'; g.strokeText(label, x, z); g.fillStyle = SAVE.cleared[id] ? '#ffd030' : '#ffffff'; g.fillText(label, x, z); }
  g.strokeText(N(['蘑菇村', 'Mushroom Village']), 40, 220); g.fillStyle = '#ff8a8a'; g.fillText(N(['蘑菇村', 'Mushroom Village']), 40, 220);
  const h = S.G.hero, hx = h.x * 2, hz = h.z * 2; g.save(); g.translate(hx, hz); g.rotate(-h.face + Math.PI); g.fillStyle = '#ff3a2a'; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 7); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
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
    case 'die': sound.setSong(null); sound.play('die'); S.deadT = 0.001; break;
    case 'clear': courseClear(e.region, e.card, e.again); break;
    case 'bossdown': sound.play('bosshit'); setTimeout(() => courseClear(e.region, 'star', !!SAVE.cleared[e.region], true), 900); break;
    case 'check': sound.play('check'); toast(L('通過中間點！', 'Checkpoint!')); SAVE.at = G.respawn; store(); break;
    case 'arrive': SAVE.at = G.respawn; if (e.region && COURSES[e.region] && !SAVE.warps[e.region]) { SAVE.warps[e.region] = true; toast(L('村子裡通往這裡的水管打開了！', 'The village pipe to here is open now!')); } store(); break;
    case 'jump': case 'stomp': case 'kick': case 'thud': case 'fire': case 'tail': case 'note': case 'hurt': case 'sprout': case 'bosshit': case 'bosshop': case 'bossfire': case 'fly': case 'wag': case 'splash': case 'swim': case 'hop': case 'statue': case 'unstatue': case 'cannon': case 'wand': sound.play(e.t); break;
  }
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
  sync(G.items, (it) => shade(makeItem(it.kind)), (m, it) => { m.position.set(it.x + it.w / 2, it.y, it.z + it.d / 2); if (it.kind === 'leaf') m.rotation.z = Math.sin(it.t * 3) * 0.5; else m.rotation.y = it.kind === 'flower' ? Math.sin(S.t * 3) * 0.4 : 0; });
  sync(G.fire, () => makeFireball(), (m, f) => { m.position.set(f.x + f.w / 2, f.y + f.h / 2, f.z + f.d / 2); });
  sync(G.shots, (s) => makeShot(s.kind), (m, s) => { m.position.set(s.x + 0.3, s.y + 0.2, s.z + 0.3); m.rotation.y = Math.atan2(s.vx, s.vz) + Math.PI / 2; });
  for (const [o, m] of ents) if (!seen.has(o)) { scene.remove(m); ents.delete(o); }
}
const STEP = 1 / 120;
function worldStep(dt, held, edge, digital, stick) {
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
    const to = pipe.warp.region, name = N(COURSES[to].region), open = pipe.warp.kind === 'home' || SAVE.warps[to];
    prompt(pipe.warp.kind === 'home' ? L(`按 C 進水管 → 回蘑菇村`, `C: down the pipe → Mushroom Village`) : open ? L(`按 C 進水管 → ${name}`, `C: down the pipe → ${name}`) : L(`還沒去過「${name}」：先走過去，這根水管才會通`, `You haven’t been to ${name} yet: walk there first to open this pipe`));
    if (edge.pound && open) { S.warpT = 0.6; S.warpTo = pipeTarget(pipe); S.warpMsg = pipe.warp.kind === 'home' ? N(['蘑菇村', 'Mushroom Village']) : name; sound.play('fly'); prompt(''); return; }
  } else prompt('');
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
  const inside = S.region && (S.region.theme === 'cave' || S.region.theme === 'fort') && COURSES[S.region.id];
  setSky(h.swimming ? 'under' : inside ? S.region.theme : S.region ? (S.region.theme === 'fort' ? 'grass' : S.region.theme) : 'grass');
  const fl = floorBelow(G.L, hx, h.y + 0.1, hz); blob.visible = !h.dead && fl > -50; blob.position.set(hx, fl + 0.03, hz); blob.scale.setScalar(Math.max(0.4, 1 - Math.max(0, h.y - fl) * 0.06));
}

// ---------------------------------------------------------------- the frame
let last = performance.now(), hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; S.t += dt;
  const { held, edge, digital, stick } = readButtons();
  S.V.work(S.mode === 'title' ? 14 : 6);
  if (S.mode === 'title') {
    $('t-play').disabled = S.V.ready < Math.min(S.V.total, 40);
    if ((edge.jump || edge.confirm) && !$('t-play').disabled) play();
    // a slow flight over the village while the island is built
    const a = S.t * 0.08; camera.position.set(22 + Math.cos(a) * 40, 46, 110 + Math.sin(a) * 40); camera.lookAt(40, 18, 110); setSky('grass');
    poseHero(heroMesh, S.G.hero, dt, S.t);
  } else {
    if (S.panel) panelInput(edge); else worldStep(dt, held, edge, digital, stick);
    placeCamera(dt);
    if (S.warpT <= 0) poseHero(heroMesh, S.G.hero, dt, S.t);
    syncEntities(dt); stepAnims(dt);
    hudT += dt; if (hudT > 0.1) { hudT = 0; hud(); }
  }
  S.V.update(S.t, camera.position, { done: SAVE.cleared, respawn: S.G.respawn });
  if (!S.noRender) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- start
const helpText = () => PAD.used || PAD.connected ? L('控制器：左搖桿 移動 · 右搖桿 轉視角 · A 跳／游泳（有尾巴時在空中連按可以飛）· B／X 跑步＋攻擊 · Y／LT 屁股蹬地、狸貓石像、青蛙下潛、站在水管上進水管 · Back 道具 · LB 地圖 · Start 選單', 'Controller: left stick move · right stick camera · A jump / swim (with a tail, tap in the air to fly) · B / X run and attack · Y / LT ground pound, Tanooki statue, Frog dive, go down a pipe · Back items · LB map · Start menu')
  : matchMedia('(pointer: coarse)').matches ? L('觸控：方向鈕 移動 · 拖曳畫面 轉視角 · A 跳（拿著葉子在空中連按可以飛）· B 跑步＋攻擊 · ⤓ 屁股蹬地／進水管 · 點背包用道具', 'Touch: arrows move · drag the screen to turn the camera · A jump (with the leaf, tap in the air to fly) · B run and attack · ⤓ ground pound / go down a pipe · tap the bag for items')
    : L('方向鍵／WASD 移動 · 空白鍵／Z 跳（有尾巴時在空中連按可以飛；水裡按跳游泳）· Shift／X 跑步＋丟火球／甩尾巴 · C：空中屁股蹬地；站在水管上進水管；狸貓裝按住變石像；青蛙裝下潛 · Q／E 或拖曳 轉視角 · Tab 道具 · M 地圖 · Esc 選單', 'Arrows / WASD move · Space / Z jump (with a tail, tap in the air to fly; in water, jump swims) · Shift / X run, throw fire, swing your tail · C: ground pound in the air; go down a pipe you stand on; hold for the Tanooki statue; dive as a frog · Q / E or drag: camera · Tab items · M map · Esc menu');
function staticText() {
  document.documentElement.lang = EN() ? 'en' : 'zh-Hant';
  $('t-sub').textContent = L('整座葉葉國是一個開放的 3D 世界！自由奔跑、爬雲梯上天空、潛進海灣、鑽進山洞、闖進熔岩城，穿上狸貓裝飛、穿上青蛙裝游泳，收集每一關的星星，最後登上飛行船。（簡單模式）', 'All of Leafy Land is one open 3D world! Run anywhere, climb cloud stairs into the sky, dive into the bay, burrow through the mountain, storm the Lava Castle, fly in the Tanooki Suit, swim in the Frog Suit, win every course’s star, and board the airship at last. (Easy mode)');
  $('t-play').textContent = hadSave ? L('繼續冒險', 'Continue') : L('開始', 'Start');
  $('t-lang').textContent = EN() ? '中文' : 'English';
  $('t-help').textContent = helpText();
  $('maphelp').textContent = L('Tab 道具 · M 地圖', 'Tab items · M map');
  if (S.mode === 'world') { hud(); hudItems(); }
}
function setLang(l) { lang = l; try { localStorage.setItem('leafleap.lang', lang); } catch (e) { /* ignore */ } staticText(); }
function play() {
  if (S.mode !== 'title') return;
  sound.start(); $('curtain').classList.add('up'); $('title').classList.add('gone');
  setTimeout(() => { $('title').hidden = true; }, 900);
  S.mode = 'world'; $('hud').hidden = false; $('mapui').hidden = false; prompt(''); hud(); hudItems();
  S.region = null; S.camT = null; cam.yaw = Math.PI * 0.5;
  if (!hadSave) setTimeout(() => toast(L('歡迎來到蘑菇村！往東走有第一關，村子裡的水管可以傳送。', 'Welcome to Mushroom Village! The first course is east; the village pipes take you places.')), 1500);
}
$('t-play').onclick = play;
$('t-lang').onclick = () => setLang(EN() ? 'zh' : 'en');
staticText();
setInterval(() => { if (S.mode === 'world' && !S.G.hero.dead) { const h = S.G.hero; if (h.onGround) { SAVE.power = h.power; store(); } } }, 10000);
requestAnimationFrame(frame);
window.__ll = { S, W0, renderer, courseClear, get SAVE() { return SAVE; }, play, menuPanel, itemsPanel, housePanel, spadePanel, mapPanel, warpTo, frame: (now) => frame(now), keys, tapped, cam };
