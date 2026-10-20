// LEAF LEAP — the page: the title curtain, the world map, playing a level, the HUD, panels, input and the save.
import * as THREE from 'three';
import { newRun, step } from './game.js';
import { LEVELS, MAP } from './levels.js';
import { buildLevel, makeHero, poseHero, makeEnemy, poseEnemy, makeItem, makeFireball, makeShot, makeCoinPop, tileBox, look, box, cmat, cardDataURL } from './view.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
// ---------------------------------------------------------------- language
const q = new URLSearchParams(location.search);
let lang = q.get('lang') || (() => { try { return localStorage.getItem('leafleap.lang'); } catch (e) { return null; } })() || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en');
if (lang !== 'en') lang = 'zh';
const EN = () => lang === 'en';
const L = (zh, en) => (EN() ? en : zh);
const N = (pair) => pair[EN() ? 1 : 0];

// ---------------------------------------------------------------- the save
const KEY = 'leafleap.save';
const fresh = () => ({ v: 1, cleared: {}, node: 0, lives: 5, coins: 0, items: ['mush'], power: 0, cards: [], house: false, won: false });
let SAVE = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return { ...fresh(), ...s }; } catch (e) { /* none */ } return null; })();
const hadSave = !!SAVE; if (!SAVE) SAVE = fresh();
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* private mode */ } };

// ---------------------------------------------------------------- renderer
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
scene.add(new THREE.HemisphereLight('#ffffff', '#9a8a7a', 1.35));
const sun = new THREE.DirectionalLight('#fff8e8', 1.5); sun.position.set(-3, 6, 10); scene.add(sun);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const sound = new Sound();
const skyTex = (a, b) => { const c = document.createElement('canvas'); c.width = 2; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, 2, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// ---------------------------------------------------------------- the world map (a little diorama)
const nodes = MAP.nodes;
const labelTex = (text, bg, fg) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 58); g.fillStyle = fg; g.font = `900 ${text.length > 2 ? 18 : 40}px "Lilita One", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 32, 35); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const mapGroup = new THREE.Group(); scene.add(mapGroup);
const nodeMesh = [];
{
  const land = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 8), cmat('#6ad05a')); land.position.set(4.8, -0.3, 5); mapGroup.add(land);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), cmat('#3a9aff')); sea.rotation.x = -Math.PI / 2; sea.position.set(5, -0.7, 5); mapGroup.add(sea);
  // the path
  for (let i = 0; i + 1 < nodes.length; i++) {
    const a = nodes[i], b = nodes[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    const p = box(Math.abs(b.x - a.x) + 0.36, 0.06, Math.abs(b.y - a.y) + 0.36, '#f0d8a0', (a.x + b.x) / 2, 0.03, (a.y + b.y) / 2); void len; mapGroup.add(p);
  }
  nodes.forEach((n, i) => {
    let m;
    if (n.kind === 'level' || n.kind === 'start') { const tex = labelTex(n.kind === 'start' ? 'START' : n.label, n.kind === 'start' ? '#f8f0e0' : '#ff9a2a', '#1a1a1a'); m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), [cmat('#c86a1a'), cmat('#c86a1a'), new THREE.MeshLambertMaterial({ map: tex }), cmat('#c86a1a'), cmat('#c86a1a'), cmat('#c86a1a')]); m.position.set(n.x, 0.12, n.y); }
    else if (n.kind === 'house') { m = new THREE.Group(); m.add(box(0.8, 0.6, 0.7, '#f8f0e0', 0, 0.3, 0)); const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.55, 4), cmat('#e8302a')); roof.rotation.y = Math.PI / 4; roof.position.y = 0.88; m.add(roof, box(0.22, 0.34, 0.05, '#7a3a10', 0, 0.17, 0.36)); m.position.set(n.x, 0, n.y); }
    else if (n.kind === 'fort') { m = new THREE.Group(); m.add(box(0.9, 1.1, 0.9, '#9a9aa8', 0, 0.55, 0)); for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) m.add(box(0.2, 0.2, 0.2, '#9a9aa8', x, 1.2, z)); m.add(box(0.3, 0.45, 0.05, '#2a2a2a', 0, 0.23, 0.46)); m.position.set(n.x, 0, n.y); }
    else if (n.kind === 'castle') { m = new THREE.Group(); m.add(box(1.4, 1.2, 1, '#c8c8d0', 0, 0.6, 0)); for (const x of [-0.6, 0.6]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.8, 10), cmat('#c8c8d0')); t.position.set(x, 0.9, 0); const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 10), cmat('#2a8a3a')); c.position.set(x, 2.05, 0); m.add(t, c); } m.add(box(0.4, 0.6, 0.05, '#2a2a2a', 0, 0.3, 0.51), box(0.04, 0.8, 0.04, '#ffffff', 0, 1.6, 0), box(0.4, 0.25, 0.03, '#2ab83a', 0.2, 1.85, 0)); m.position.set(n.x, 0, n.y); }
    mapGroup.add(m); nodeMesh[i] = m;
  });
  // trees and hills
  const r = (() => { let a = 11; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  for (let i = 0; i < 40; i++) {
    const x = -0.4 + r() * 10.4, z = 1.3 + r() * 7.4;
    if (nodes.some((n, k) => Math.hypot(n.x - x, n.y - z) < 0.9 || (k + 1 < nodes.length && distSeg(x, z, n, nodes[k + 1]) < 0.55))) continue;
    const t = new THREE.Group(), trunk = box(0.12, 0.3, 0.12, '#7a4a1a', 0, 0.15, 0), top = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), cmat(r() < 0.5 ? '#2a9a3a' : '#3ab84a')); top.position.y = 0.5; top.scale.y = 1.2; t.add(trunk, top); t.position.set(x, 0, z); mapGroup.add(t);
  }
}
function distSeg(x, z, a, b) { const dx = b.x - a.x, dz = b.y - a.y, l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.y) * dz) / l)); return Math.hypot(x - a.x - dx * t, z - a.y - dz * t); }
function refreshMap() {
  nodes.forEach((n, i) => {
    const m = nodeMesh[i];
    if (n.kind === 'level') m.material[2] = new THREE.MeshLambertMaterial({ map: SAVE.cleared[n.id] ? labelTex('✔', '#4a8aff', '#ffffff') : labelTex(n.label, '#ff9a2a', '#1a1a1a') });
    if (n.kind === 'fort') m.scale.y = SAVE.cleared[n.id] ? 0.45 : 1;
    if (n.kind === 'house') m.children[1].material = cmat(SAVE.house ? '#9a9aa8' : '#e8302a');
  });
}
const mapHero = makeHero(); mapHero.scale.setScalar(0.6); mapGroup.add(mapHero);
const passable = (i) => nodes[i].kind === 'start' || nodes[i].kind === 'house' || !!SAVE.cleared[nodes[i].id];

// ---------------------------------------------------------------- state
const S = { mode: 'title', panel: null, G: null, LV: null, endT: 0, deadT: 0, walk: null, acc: 0, t: 0 };
let heroMesh = null;
const ents = new Map(), anims = [];

// ---------------------------------------------------------------- input: keyboard, controller and touch all become the same buttons
const keys = new Set(), tapped = new Set();
const KEYS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], jump: ['Space', 'KeyZ', 'KeyK'], run: ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ'], pause: ['Escape', 'KeyP'], confirm: ['Enter'] };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; sound.start();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  keys.add(e.code); if (!e.repeat) for (const [k, list] of Object.entries(KEYS)) if (list.includes(e.code)) tapped.add(k);
});
addEventListener('keyup', (e) => keys.delete(e.code));
const touchHeld = {};
for (const [id, k] of [['t-left', 'left'], ['t-right', 'right'], ['t-up', 'up'], ['t-down', 'down'], ['t-a', 'jump'], ['t-b', 'run'], ['t-pause', 'pause']]) {
  const b = $(id); const on = (e) => { e.preventDefault(); sound.start(); if (!touchHeld[k]) tapped.add(k); touchHeld[k] = true; b.classList.add('on'); }, off = () => { touchHeld[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
}
const PAD = { used: false, connected: false };
addEventListener('gamepadconnected', (e) => { PAD.connected = true; sound.start(); toast(L(`已連接控制器：${e.gamepad.id.split('(')[0].trim()}`, `Controller connected: ${e.gamepad.id.split('(')[0].trim()}`)); staticText(); });
addEventListener('gamepaddisconnected', () => { PAD.connected = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); staticText(); });
let prevHeld = {};
function readButtons() {
  const held = {};
  for (const [k, list] of Object.entries(KEYS)) held[k] = list.some((c) => keys.has(c)) || !!touchHeld[k];
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean)[0] : null;
  if (gp) {
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const pad = { left: b(14) || ax < -0.45, right: b(15) || ax > 0.45, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5, jump: b(0), run: b(1) || b(2) || b(7), items: b(3), pause: b(9), map: b(8) };
    if (Object.values(pad).some(Boolean) && !PAD.used) { PAD.used = true; staticText(); }
    for (const k in pad) held[k] = held[k] || pad[k];
  }
  const edge = {}; for (const k in held) edge[k] = (held[k] && !prevHeld[k]) || tapped.has(k);
  for (const k of tapped) edge[k] = true;
  tapped.clear(); prevHeld = held;
  return { held, edge };
}

// ---------------------------------------------------------------- panels (mouse, keyboard or controller)
let handlers = [], focus = 0, closable = true;
const btn = (label, fn, o = {}) => { handlers.push(fn); return `<button data-i="${handlers.length - 1}" class="${o.cls || ''}"${o.off ? ' disabled' : ''}>${label}</button>`; };
function showPanel(kind, title, build, canClose = true) {
  handlers = []; const html = build(); closable = canClose;
  $('panel').innerHTML = `<div class="pbox ${kind}">${title ? `<h2>${title}</h2>` : ''}${html}</div>`;
  $('panel').hidden = false; S.panel = kind; focus = 0; markFocus();
}
function closePanel() { $('panel').hidden = true; $('panel').innerHTML = ''; S.panel = null; }
const panelButtons = () => [...$('panel').querySelectorAll('button:not([disabled])')];
function markFocus() { panelButtons().forEach((b, i) => b.classList.toggle('focus', i === focus)); }
$('panel').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sound.play('click'); const f = handlers[+b.dataset.i]; if (f) f(); });
function panelInput(edge) {
  const bs = panelButtons(), n = bs.length;
  if (n && (edge.down || edge.right)) { focus = (focus + 1) % n; markFocus(); sound.play('click'); }
  if (n && (edge.up || edge.left)) { focus = (focus - 1 + n) % n; markFocus(); sound.play('click'); }
  if ((edge.jump || edge.confirm) && bs[focus]) bs[focus].click();
  else if ((edge.run || edge.pause) && closable) { closePanel(); sound.setSong(S.mode === 'level' ? S.G.L.theme : 'map'); }
}

// ---------------------------------------------------------------- HUD
function toast(text) { const d = $('toast'); d.innerHTML = text; d.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => d.classList.remove('on'), 2400); }
function banner(text, sub) { const d = $('banner'); d.innerHTML = `<b>${text}</b>${sub ? `<small>${sub}</small>` : ''}`; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on'); }
const cardImg = (k) => `<img src="${cardDataURL(k)}" alt="${k}">`;
const itemImg = (it) => (it === 'leaf' ? `<img src="${leafURL()}" alt="leaf">` : cardImg(it));
function hud() {
  $('lives').textContent = SAVE.lives; $('coins').textContent = String(SAVE.coins).padStart(2, '0');
  const pm = S.G ? S.G.hero.pm : 0, lit = Math.floor(pm * 6 + 0.001);
  $('pm').innerHTML = [0, 1, 2, 3, 4, 5].map((i) => `<i class="${i < lit ? 'on' : ''}">▶</i>`).join('') + `<b class="${pm >= 1 ? 'on' : ''}">P</b>`;
  $('cards').innerHTML = [0, 1, 2].map((i) => `<span>${SAVE.cards[i] ? cardImg(SAVE.cards[i]) : ''}</span>`).join('');
  $('where').textContent = S.mode === 'level' ? `WORLD 1-${S.G.def.id.split('-')[1]}` : 'WORLD 1';
}
const POWER_NAME = [['小', 'Small'], ['大', 'Big'], ['火焰', 'Fire'], ['葉子', 'Leaf']];
const ITEM_NAME = { mush: ['蘑菇', 'Mushroom'], flower: ['火焰花', 'Fire Flower'], leaf: ['神奇葉子', 'Super Leaf'] };
const ITEM_POWER = { mush: 1, flower: 2, leaf: 3 };

// ---------------------------------------------------------------- the map screen
function toMap() {
  if (S.LV) { S.LV.dispose(); S.LV = null; } for (const m of ents.values()) scene.remove(m); ents.clear(); for (const a of anims) scene.remove(a.m); anims.length = 0;
  if (heroMesh) heroMesh.visible = false; S.G = null;
  mapGroup.visible = true; scene.background = skyTex('#5ab4ff', '#c8ecff'); refreshMap();
  S.mode = 'map'; sound.setSong('map'); $('hud').hidden = false; $('mapui').hidden = false; mapText(); hud(); store();
}
function mapText() {
  const n = nodes[SAVE.node];
  const what = n.kind === 'start' ? L('出發點', 'Start') : n.kind === 'house' ? L('蘑菇小屋', 'Mushroom House') : N(LEVELS[n.id].name);
  $('nodename').innerHTML = `<b>${n.kind === 'level' ? `1-${n.label} ` : ''}${what}</b>${SAVE.cleared[n.id] ? ` <span class="done">${L('已過關', 'Cleared')}</span>` : ''}`;
  $('items').innerHTML = `<span>${L('道具', 'Items')}</span>` + (SAVE.items.length ? SAVE.items.map(itemImg).join('') : `<small>${L('（沒有）', '(none)')}</small>`) + `<em>${L('目前', 'Now')}: ${N(POWER_NAME[SAVE.power])}</em>`;
  $('maphelp').textContent = PAD.used ? L('十字鍵 移動 · A 進入 · Y 道具 · Start 選單', 'D-pad move · A enter · Y items · Start menu') : matchMedia('(pointer: coarse)').matches ? L('方向鈕 移動 · A 進入 · B 道具', 'Arrows move · A enter · B items') : L('方向鍵 移動 · 空白鍵／Enter 進入 · X 道具 · Esc 選單', 'Arrows move · Space / Enter to enter · X items · Esc menu');
}
let _leaf = null;
function leafURL() { if (_leaf) return _leaf; const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#101010'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f8f8f8'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#e8902a'; g.beginPath(); g.ellipse(8, 8, 5, 3.2, -0.5, 0, 7); g.fill(); g.fillStyle = '#7a4a1a'; g.fillRect(3, 11, 3, 1); _leaf = c.toDataURL(); return _leaf; }
function mapStep(dt, edge) {
  if (S.walk) {
    S.walk.t += dt * 3.2; const a = nodes[S.walk.from], b = nodes[S.walk.to], k = Math.min(1, S.walk.t);
    S.tok = [a.x + (b.x - a.x) * k, 0.08 + Math.abs(Math.sin(k * Math.PI * 2)) * 0.15, a.y + (b.y - a.y) * k, Math.atan2(b.x - a.x, b.y - a.y)];
    if (k >= 1) { SAVE.node = S.walk.to; S.walk = null; mapText(); store(); }
    return;
  }
  const n = nodes[SAVE.node]; S.tok = [n.x, 0.08 + Math.abs(Math.sin(S.t * 4)) * 0.06, n.y, 0];
  for (const [d, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) {
    if (!edge[d]) continue;
    for (const j of [SAVE.node - 1, SAVE.node + 1]) {
      const m = nodes[j]; if (!m) continue;
      if (Math.sign(m.x - n.x) !== dx || Math.sign(m.y - n.y) !== dy) continue;
      if (j > SAVE.node && !passable(SAVE.node)) { sound.play('deny'); toast(L('先過這一關才能繼續前進！', 'Clear this level to move on!')); break; }
      S.walk = { from: SAVE.node, to: j, t: 0 }; sound.play('step'); break;
    }
  }
  if (edge.jump || edge.confirm) enterNode();
  else if (edge.run || edge.items) itemsPanel();
  else if (edge.pause) menuPanel();
}
function enterNode() {
  const n = nodes[SAVE.node];
  if (n.kind === 'start') { toast(L('往右走，進入第 1 關！', 'Walk right to the first level!')); return; }
  if (n.kind === 'house') { if (SAVE.house) { toast(L('小屋今天休息囉', 'The house is closed for now')); return; } return housePanel(); }
  sound.play('enter'); startLevel(n.id, false);
}
function housePanel() {
  showPanel('house', L('蘑菇小屋', 'Mushroom House'), () => `<p class="say">${L('歡迎！選一個寶箱，裡面的道具送給你。', 'Welcome! Pick a chest, and what is inside is yours.')}</p><div class="chests">${[1, 2, 3].map((i) => btn(`<i class="chest"></i>${i}`, () => {
    const it = ['mush', 'flower', 'leaf', 'leaf'][Math.floor(Math.random() * 4)]; SAVE.items.push(it); if (SAVE.items.length > 8) SAVE.items.shift(); SAVE.house = true; store(); refreshMap(); mapText(); sound.play('power');
    showPanel('house', L('得到了！', 'You got it!'), () => `<div class="got">${itemImg(it)}</div><p class="say">${N(ITEM_NAME[it])} — ${L('在地圖上按「道具」使用。', 'use it from Items on the map.')}</p>${btn('OK', closePanel, { cls: 'go' })}`);
  }, { cls: 'chestbtn' })).join('')}</div>`);
}
function itemsPanel() {
  showPanel('items', L('道具', 'Items'), () => {
    if (!SAVE.items.length) return `<p class="say">${L('沒有道具。蘑菇小屋可以拿到。', 'No items. Visit the Mushroom House to get one.')}</p>${btn('OK', closePanel)}`;
    return `<p class="say">${L('在進入關卡前使用，讓自己變強。', 'Use one before a level to power up.')} ${L('目前', 'Now')}: <b>${N(POWER_NAME[SAVE.power])}</b></p><div class="row">` + SAVE.items.map((it, i) => btn(`${itemImg(it)}<span>${N(ITEM_NAME[it])}</span>`, () => {
      const p = ITEM_POWER[it]; if (p <= SAVE.power && !(it === 'mush' && SAVE.power === 0)) { sound.play('deny'); toast(L('現在用沒有效果', 'That would not help right now')); return; }
      SAVE.power = p; SAVE.items.splice(i, 1); sound.play(it === 'leaf' ? 'leaf' : 'power'); store(); mapText(); closePanel(); toast(L(`變成${N(POWER_NAME[p])}了！`, `Now ${N(POWER_NAME[p])}!`));
    }, { cls: 'itembtn' })).join('') + `</div>${btn(L('關閉', 'Close'), closePanel)}`;
  });
}
function menuPanel() {
  showPanel('menu', L('選單', 'Menu'), () => {
    let h = '<div class="col">';
    if (S.mode === 'level') { h += btn(L('繼續', 'Resume'), () => { closePanel(); sound.setSong(S.G.L.theme); }, { cls: 'go' }); h += btn(L('回到地圖', 'Back to the map'), () => { closePanel(); toMap(); }); }
    else h += btn(L('繼續', 'Resume'), () => { closePanel(); sound.setSong('map'); }, { cls: 'go' });
    h += btn(sound.musicOn ? L('音樂：開', 'Music: on') : L('音樂：關', 'Music: off'), () => { sound.setMusic(!sound.musicOn); menuPanel(); });
    h += btn(EN() ? '中文' : 'English', () => { setLang(EN() ? 'zh' : 'en'); menuPanel(); });
    if (S.mode === 'map') h += btn(L('重新開始遊戲', 'Start a new game'), () => showPanel('menu', L('重新開始？', 'Start over?'), () => `<p class="say">${L('所有進度都會清除。', 'All progress will be erased.')}</p><div class="col">${btn(L('確定', 'Yes, start over'), () => { SAVE = fresh(); store(); closePanel(); toMap(); }, { cls: 'red' })}${btn(L('取消', 'Cancel'), menuPanel)}</div>`));
    return h + `</div><p class="help">${helpText()}</p>`;
  });
  sound.setSong(null);
}

// ---------------------------------------------------------------- playing a level
function startLevel(id, fromCheck) {
  closePanel();
  if (S.LV) { S.LV.dispose(); } for (const m of ents.values()) scene.remove(m); ents.clear(); for (const a of anims) scene.remove(a.m); anims.length = 0;
  const def = LEVELS[id];
  S.G = newRun(def, { power: SAVE.power, checkpoint: fromCheck }); S.LV = buildLevel(scene, S.G);
  const th = S.LV.theme; scene.background = skyTex(th.sky[0], th.sky[1]);
  if (!heroMesh) { heroMesh = makeHero(); scene.add(heroMesh); } heroMesh.visible = true; heroMesh.userData.power = -1;
  mapGroup.visible = false; S.mode = 'level'; S.endT = 0; S.deadT = 0; S.acc = 0; S.camX = null; $('mapui').hidden = true;
  sound.setSong(def.theme); hud();
  banner(`WORLD 1-${id.split('-')[1]}`, N(def.name) + (fromCheck ? ` · ${L('從中間點開始', 'from the checkpoint')}` : ''));
}
function onEvent(e) {
  const G = S.G;
  switch (e.t) {
    case 'tile': S.dirty = true; break;
    case 'coin': SAVE.coins++; sound.play('coin'); if (e.pop) popCoin(e.x, e.y); if (SAVE.coins >= 100) { SAVE.coins -= 100; SAVE.lives++; sound.play('oneup'); toast('1UP!'); } break;
    case 'bumpblock': bumpBlock(e.x, e.y, e.down); break;
    case 'break': sound.play('break'); debris(e.x, e.y); break;
    case 'power': sound.play(e.kind === 'leaf' ? 'leaf' : 'power'); break;
    case 'oneup': SAVE.lives++; sound.play('oneup'); toast('1UP!'); break;
    case 'die': sound.setSong(null); sound.play('die'); S.deadT = 0.001; break;
    case 'clear': sound.setSong(null); sound.play(e.boss ? 'fanfare' : 'clear'); S.endT = 0.001; S.endBoss = !!e.boss;
      if (!e.boss) banner(L('過關！', 'Course clear!'), `${L('得到卡片', 'You got a card')} ${cardImg(e.card)}`); else banner(L('打倒了！', 'Defeated!'), ''); break;
    case 'bossdown': sound.play('bosshit'); break;
    case 'check': sound.play('check'); toast(L('通過中間點！', 'Checkpoint!')); break;
    case 'jump': case 'stomp': case 'kick': case 'thud': case 'fire': case 'tail': case 'note': case 'hurt': case 'sprout': case 'bosshit': case 'bosshop': case 'bossfire': case 'fly': case 'wag': sound.play(e.t); break;
  }
  void G;
}
function popCoin(x, y) { const m = makeCoinPop(); m.position.set(x + 0.5, y + 1.2, 0.2); scene.add(m); anims.push({ m, t: 0, kind: 'coin', y0: y + 1.2 }); }
function bumpBlock(x, y, down) { const k = look(S.G.L, x, y); if (!k) return; const m = tileBox(k); m.position.set(x + 0.5, y + 0.5, 0.02); m.scale.setScalar(1.02); scene.add(m); anims.push({ m, t: 0, kind: 'bump', y0: y + 0.5, dir: down ? -1 : 1 }); }
function debris(x, y) { for (let i = 0; i < 4; i++) { const m = box(0.4, 0.4, 0.4, '#c8641e', x + 0.5, y + 0.5, 0.2); scene.add(m); anims.push({ m, t: 0, kind: 'bit', vx: (i % 2 ? 1 : -1) * 3, vy: i < 2 ? 12 : 8 }); } }
function stepAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]; a.t += dt;
    if (a.kind === 'coin') { a.m.position.y = a.y0 + Math.sin(Math.min(1, a.t / 0.5) * Math.PI) * 2; a.m.rotation.y += dt * 20; if (a.t > 0.5) a.done = true; }
    else if (a.kind === 'bump') { a.m.position.y = a.y0 + Math.sin(Math.min(1, a.t / 0.18) * Math.PI) * 0.35 * a.dir; if (a.t > 0.18) a.done = true; }
    else if (a.kind === 'bit') { a.vy -= 40 * dt; a.m.position.x += a.vx * dt; a.m.position.y += a.vy * dt; a.m.rotation.z += dt * 10; if (a.t > 1.2) a.done = true; }
    if (a.done) { scene.remove(a.m); anims.splice(i, 1); }
  }
}
function syncEntities(dt) {
  const G = S.G, seen = new Set();
  const sync = (list, make, pose) => { for (const o of list) { seen.add(o); let m = ents.get(o); if (!m) { m = make(o); scene.add(m); ents.set(o, m); } pose(m, o); } };
  sync(G.enemies, (e) => makeEnemy(e), (m, e) => poseEnemy(m, e, dt, S.t));
  sync(G.items, (it) => makeItem(it.kind), (m, it) => { m.position.set(it.x + it.w / 2, it.y, it.rise > 0 ? -0.3 : 0.1); if (it.kind === 'leaf') m.rotation.z = Math.sin(it.t * 3) * 0.5; else m.rotation.y = it.kind === 'flower' ? Math.sin(S.t * 3) * 0.4 : 0; });
  sync(G.fire, () => makeFireball(), (m, f) => { m.position.set(f.x + f.w / 2, f.y + f.h / 2, 0.1); });
  sync(G.shots, () => makeShot(), (m, s) => { m.position.set(s.x + s.w / 2, s.y + s.h / 2, 0.1); });
  for (const [o, m] of ents) if (!seen.has(o)) { scene.remove(m); ents.delete(o); }
}
const STEP = 1 / 120;
function levelStep(dt, held, edge) {
  const G = S.G;
  if (edge.pause) return menuPanel();
  S.acc += dt; let first = true;
  while (S.acc >= STEP) {
    S.acc -= STEP;
    const inp = { left: held.left, right: held.right, jump: held.jump || (held.up && !matchMedia('(pointer: coarse)').matches), jumpPressed: first && (edge.jump || (edge.up && !PAD.used && !matchMedia('(pointer: coarse)').matches)), run: held.run, runPressed: first && edge.run };
    for (const e of step(G, inp, STEP)) onEvent(e);
    first = false;
  }
  if (S.dirty) { S.dirty = false; S.LV.rebuild(); }
  if (S.deadT > 0) { S.deadT += dt; if (S.deadT > 2.8) { SAVE.lives--; SAVE.power = 0; store(); if (SAVE.lives <= 0) return gameOver(); return startLevel(G.def.id, G.checked); } }
  if (S.endT > 0) { S.endT += dt; if (S.endT > (S.endBoss ? 2.6 : 3.4)) return levelDone(); }
}
function levelDone() {
  const G = S.G, id = G.def.id;
  SAVE.cleared[id] = true; SAVE.power = G.hero.power;
  let bonus = '';
  if (!S.endBoss) {
    SAVE.cards.push(G.cleared);
    if (SAVE.cards.length >= 3) { const c = SAVE.cards, same = c.every((x) => x === c[0]), n = same ? { mush: 2, flower: 3, star: 5 }[c[0]] : 1; SAVE.lives += n; bonus = L(`三張卡片：${n} UP！`, `Three cards: ${n} UP!`); SAVE.cards = []; }
  }
  store(); toMap();
  if (bonus) { sound.play('oneup'); banner(bonus, ''); }
  if (id === '1-C') { SAVE.won = true; SAVE.house = false; store(); refreshMap(); ending(); }
}
function gameOver() {
  sound.setSong(null);
  showPanel('over', 'GAME OVER', () => `<p class="say">${L('沒關係！這是簡單模式：給你 5 條命，從地圖繼續。過的關都還在。', 'No worries — this is easy mode. Here are 5 more lives; carry on from the map. Every level you cleared stays cleared.')}</p>${btn(L('繼續', 'Continue'), () => { SAVE.lives = 5; store(); closePanel(); toMap(); }, { cls: 'go' })}`, false);
}
function ending() {
  sound.play('fanfare');
  showPanel('end', L('葉葉國得救了！', 'Leafy Land is saved!'), () => `<p class="say">${L('龜王被打敗了，葉葉國又恢復了和平。謝謝你，勇敢的小跳跳！蘑菇小屋重新開門了，每一關都可以再玩。', 'The Turtle King is beaten and peace returns to Leafy Land. Thank you, brave hopper! The Mushroom House is open again, and every level can be played again.')}</p>${btn(L('太好了！', 'Hooray!'), closePanel, { cls: 'go' })}`);
}

// ---------------------------------------------------------------- the frame
let last = performance.now();
const lerp = (a, b, k) => a + (b - a) * k;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; S.t += dt;
  const { held, edge } = readButtons();
  if (S.mode === 'title') { if (edge.jump || edge.confirm || edge.pause) play(); }
  else if (S.panel) panelInput(edge);
  else if (S.mode === 'map') mapStep(dt, edge);
  else if (S.mode === 'level') levelStep(dt, held, edge);
  // the camera
  if (S.mode === 'level' && S.G) {
    const G = S.G, h = G.hero, vh = 15, dist = vh / 2 / Math.tan(camera.fov * Math.PI / 360), vw = vh * camera.aspect;
    const want = Math.max(vw / 2, Math.min(G.L.w - vw / 2, h.x + h.dir * 1.5));
    S.camX = S.camX == null ? want : lerp(S.camX, want, Math.min(1, dt * 5));
    // (the view starts a little below the ground so the status bar does not hide where you stand)
    const lo = vh / 2 - 0.9, cx = G.L.w < vw ? G.L.w / 2 : S.camX, cy = Math.max(lo, Math.min(Math.max(lo, G.L.h - vh / 2 + 0.5), h.y + 1.5));
    S.camY = S.camY == null ? cy : lerp(S.camY, cy, Math.min(1, dt * 4));
    camera.position.set(cx, S.camY, dist); camera.lookAt(cx, S.camY, 0);
    poseHero(heroMesh, h, dt, S.t); syncEntities(dt); stepAnims(dt); S.LV.update(S.t);
    hudT += dt; if (hudT > 0.08) { hudT = 0; hud(); }
  } else {
    const k = Math.max(1, 1.5 / camera.aspect);
    camera.position.set(4.8 + (S.mode === 'title' ? Math.sin(S.t * 0.3) * 1.5 : 0), 8.5 * k, 5 + 8.5 * k); camera.lookAt(4.8, 0, 5);
    poseHero(mapHero, { x: 0, y: 0, w: 0, dir: 1, power: SAVE.power, onGround: true, vx: S.walk ? 3 : 0, inv: 0, spin: 0 }, dt, S.t);
    // (posing moves the mesh; on the map the token stands where mapStep put it)
    const n = nodes[SAVE.node], tk = S.mode === 'map' && S.tok ? S.tok : [n.x, 0.08, n.y, 0];
    mapHero.position.set(tk[0], tk[1], tk[2]); mapHero.rotation.y = tk[3]; mapHero.userData.inner.scale.set(1, 1, 1);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
let hudT = 0;

// ---------------------------------------------------------------- start
const helpText = () => PAD.used || PAD.connected ? L('控制器：左搖桿／十字鍵 移動 · A 跳（拿著葉子在空中連按可以飛）· B／X 跑步＋攻擊 · Start 選單', 'Controller: stick / D-pad move · A jump (with the leaf, tap in the air to fly) · B / X run and attack · Start menu')
  : matchMedia('(pointer: coarse)').matches ? L('觸控：◀ ▶ 移動 · A 跳（拿著葉子在空中連按可以飛）· B 跑步＋攻擊', 'Touch: ◀ ▶ move · A jump (with the leaf, tap in the air to fly) · B run and attack')
    : L('← → 移動 · 空白鍵／Z／↑ 跳（拿著葉子在空中連按可以飛）· Shift／X 跑步＋丟火球／甩尾巴 · Esc 選單', '← → move · Space / Z / ↑ jump (with the leaf, tap in the air to fly) · Shift / X run, throw fire, swing your tail · Esc menu');
function staticText() {
  document.documentElement.lang = EN() ? 'en' : 'zh-Hant';
  $('t-sub').textContent = L('跳上方塊、踩扁敵人、吃下神奇葉子在天上飛！穿過葉葉國的八個關卡，打倒龜王。（簡單模式）', 'Bop blocks, stomp baddies, and grab the Super Leaf to fly! Cross eight levels of Leafy Land and beat the Turtle King. (Easy mode)');
  $('t-play').textContent = hadSave ? L('繼續冒險', 'Continue') : L('開始', 'Start');
  $('t-lang').textContent = EN() ? '中文' : 'English';
  $('t-help').textContent = helpText();
  if (S.mode === 'map') mapText();
}
function setLang(l) { lang = l; try { localStorage.setItem('leafleap.lang', lang); } catch (e) { /* ignore */ } staticText(); }
function play() {
  if (S.mode !== 'title') return;
  sound.start(); $('curtain').classList.add('up'); $('title').classList.add('gone');
  setTimeout(() => { $('title').hidden = true; }, 900);
  toMap();
  if (!hadSave) setTimeout(() => { if (S.mode === 'map' && SAVE.node === 0) toast(L('往右走，按空白鍵進入第 1 關！', 'Walk right and press Space to enter level 1!')); }, 1200);
}
$('t-play').onclick = play;
$('t-lang').onclick = () => setLang(EN() ? 'zh' : 'en');
staticText(); refreshMap(); hud();
requestAnimationFrame(frame);
window.__ll = { S, get SAVE() { return SAVE; }, play, startLevel, toMap, menuPanel, itemsPanel, housePanel, frame: (now) => frame(now), keys, tapped };
