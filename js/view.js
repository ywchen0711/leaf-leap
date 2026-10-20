// LEAF LEAP — what you see: pixel-art blocks in 3D, backdrops for each theme, the hero, enemies, items and effects.
import * as THREE from 'three';
import { T, cardAt } from './game.js';

// ---------------------------------------------------------------- pixel textures (16 × 16, drawn sharp)
const cache = new Map();
function px(key, draw, size = 16) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  cache.set(key, t); return t;
}
const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// draw rows of characters with a palette ('.' is see-through)
function pattern(g, rows, pal, ox = 0, oy = 0) { rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) rect(g, pal[ch], ox + x, oy + y, 1, 1); })); }
const QMARK = ['.1111.', '11..11', '....11', '...11.', '..11..', '..11..', '......', '..11..'];
const TEX = {
  dirt: () => px('dirt', (g) => { rect(g, '#d88a3a', 0, 0, 16, 16); for (const [x, y] of [[2, 3], [9, 2], [13, 7], [5, 9], [11, 12], [3, 14], [7, 5]]) rect(g, '#a85a1a', x, y, 2, 1); }),
  grass: () => px('grass', (g) => { rect(g, '#d88a3a', 0, 0, 16, 16); for (const [x, y] of [[2, 9], [9, 8], [13, 12], [5, 13]]) rect(g, '#a85a1a', x, y, 2, 1); rect(g, '#3ab83a', 0, 0, 16, 5); rect(g, '#7ae05a', 0, 0, 16, 2); for (let x = 0; x < 16; x += 3) rect(g, '#3ab83a', x, 5, 2, 1); rect(g, '#1a7a2a', 0, 4, 16, 1); }),
  brick: () => px('brick', (g) => { rect(g, '#c8641e', 0, 0, 16, 16); g.fillStyle = '#3a1a08'; for (let y = 0; y < 16; y += 4) { g.fillRect(0, y + 3, 16, 1); const o = (y / 4) % 2 ? 4 : 0; for (let x = o; x < 16; x += 8) g.fillRect(x, y, 1, 3); } rect(g, '#f0a060', 0, 0, 16, 1); }),
  q: () => px('q', (g) => { rect(g, '#f0b020', 0, 0, 16, 16); rect(g, '#8a4a08', 0, 15, 16, 1); rect(g, '#8a4a08', 15, 0, 1, 16); rect(g, '#ffe08a', 0, 0, 15, 1); rect(g, '#ffe08a', 0, 0, 1, 15); for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(g, '#8a4a08', x, y, 1, 1); pattern(g, QMARK, { 1: '#8a4a08' }, 6, 5); pattern(g, QMARK, { 1: '#fff6e0' }, 5, 4); }),
  used: () => px('used', (g) => { rect(g, '#8a5a2a', 0, 0, 16, 16); rect(g, '#4a2a10', 0, 15, 16, 1); rect(g, '#4a2a10', 15, 0, 1, 16); for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) rect(g, '#4a2a10', x, y, 1, 1); }),
  wood: () => px('wood', (g) => { rect(g, '#e8b070', 0, 0, 16, 16); g.strokeStyle = '#a86a2a'; g.lineWidth = 1; for (const r of [2.5, 5, 7.5]) { g.beginPath(); g.arc(8, 8, r, 0, 7); g.stroke(); } rect(g, '#7a4a1a', 0, 15, 16, 1); rect(g, '#7a4a1a', 15, 0, 1, 16); rect(g, '#fff0c8', 0, 0, 15, 1); }),
  pipe: () => px('pipe', (g) => { rect(g, '#2ab82a', 0, 0, 16, 16); rect(g, '#9af07a', 2, 0, 3, 16); rect(g, '#1a7a1a', 12, 0, 3, 16); rect(g, '#0a4a0a', 15, 0, 1, 16); }),
  pipetop: () => px('pipetop', (g) => { rect(g, '#2ab82a', 0, 0, 16, 16); rect(g, '#9af07a', 2, 0, 3, 15); rect(g, '#1a7a1a', 12, 0, 3, 15); rect(g, '#0a4a0a', 0, 15, 16, 1); rect(g, '#0a4a0a', 0, 0, 16, 1); }),
  cloud: () => px('cloud', (g) => { rect(g, '#ffffff', 0, 0, 16, 16); rect(g, '#cfe6ff', 0, 11, 16, 5); for (const x of [1, 6, 11]) rect(g, '#ffffff', x, 10, 4, 2); rect(g, '#3a3a5a', 5, 5, 1, 2); rect(g, '#3a3a5a', 10, 5, 1, 2); }),
  note: () => px('note', (g) => { rect(g, '#fff8f0', 0, 0, 16, 16); rect(g, '#c8b8a8', 0, 15, 16, 1); rect(g, '#c8b8a8', 15, 0, 1, 16); pattern(g, ['....11', '....1.1', '....1..1', '....1..', '....1..', '..111..', '.1111..', '.111...'], { 1: '#1a1a1a' }, 4, 4); }),
  lava: () => px('lava', (g) => { rect(g, '#ff5a10', 0, 0, 16, 16); for (let x = 0; x < 16; x++) { const y = 2 + Math.round(Math.sin(x / 2.5) * 1.5); rect(g, '#ffd040', x, y, 1, 2); } rect(g, '#c82a00', 0, 10, 16, 6); }),
  stone: () => px('stone', (g) => { rect(g, '#8a8a98', 0, 0, 16, 16); g.fillStyle = '#4a4a58'; for (let y = 0; y < 16; y += 8) { g.fillRect(0, y + 7, 16, 1); const o = (y / 8) % 2 ? 8 : 0; g.fillRect(o, y, 1, 7); } rect(g, '#b8b8c8', 0, 0, 16, 1); }),
};
const mats = new Map();
function mat(key, opts = {}) { if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ map: TEX[key](), ...opts })); return mats.get(key); }
const colMat = new Map();
export function cmat(c, emissive) { const k = c + (emissive || ''); if (!colMat.has(k)) colMat.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: emissive || '#000000' })); return colMat.get(k); }
const BOX = new THREE.BoxGeometry(1, 1, 1);
const box = (w, h, d, c, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(BOX, cmat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); return m; };

// which look each tile gets
function look(L, x, y) {
  const t = L.tiles[y * L.w + x];
  switch (t) {
    case T.GROUND: return y + 1 < L.h && L.tiles[(y + 1) * L.w + x] === T.GROUND ? 'dirt' : 'grass';
    case T.BRICK: return 'brick'; case T.QCOIN: case T.QLEAF: case T.QFLOWER: case T.Q1UP: return 'q'; case T.USED: return 'used';
    case T.HARD: return 'wood'; case T.PIPE: return 'pipe'; case T.PIPETOP: return 'pipetop'; case T.CLOUD: return 'cloud'; case T.NOTE: return 'note';
    case T.LAVA: return 'lava'; case T.STONE: return 'stone'; default: return null;
  }
}
// ---------------------------------------------------------------- a level's blocks and backdrop
export function buildLevel(scene, G) {
  const group = new THREE.Group(), L = G.L, theme = L.theme; scene.add(group);
  const THEME = {
    grass: { sky: ['#5ab4ff', '#c8ecff'], light: 1 }, sky: { sky: ['#3a9aff', '#e0f4ff'], light: 1.05 }, cave: { sky: ['#06080f', '#1a2240'], light: 0.75 },
    fort: { sky: ['#12101a', '#3a2a3a'], light: 0.8 }, castle: { sky: ['#1a0808', '#4a1a14'], light: 0.8 },
  }[theme];
  let tileGroup = new THREE.Group(); group.add(tileGroup);
  const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14); coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshLambertMaterial({ color: '#ffd030', emissive: '#7a5000' });
  let coinMesh = null;
  function rebuild() {
    group.remove(tileGroup); tileGroup.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); tileGroup = new THREE.Group(); group.add(tileGroup);
    const lists = {}, coins = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const t = L.tiles[y * L.w + x]; if (t === T.COIN) { coins.push([x, y]); continue; } const k = look(L, x, y); if (k) (lists[k] = lists[k] || []).push([x, y]); }
    const m4 = new THREE.Matrix4();
    for (const [k, list] of Object.entries(lists)) {
      const im = new THREE.InstancedMesh(BOX, mat(k, k === 'lava' ? { emissive: '#ff4000', emissiveIntensity: 0.6 } : {}), list.length);
      list.forEach(([x, y], i) => { const sx = k === 'pipetop' ? 1.14 : k === 'pipe' ? 1.0 : 1, sy = k === 'cloud' ? 0.6 : k === 'lava' ? 0.85 : 1; m4.makeScale(sx, sy, k === 'pipetop' ? 1.14 : 1); m4.setPosition(x + 0.5, y + (k === 'cloud' ? 0.7 : k === 'lava' ? 0.42 : 0.5), 0); im.setMatrixAt(i, m4); });
      tileGroup.add(im);
    }
    coinMesh = coins.length ? new THREE.InstancedMesh(coinGeo, coinMat, coins.length) : null; if (coinMesh) { coinMesh.userData.list = coins; tileGroup.add(coinMesh); }
  }
  rebuild();
  // the backdrop
  const back = new THREE.Group(); group.add(back);
  const rnd = mulberry(L.w * 7 + L.h);
  if (theme === 'grass' || theme === 'sky') {
    const hillCols = ['#4ac85a', '#7ae07a', '#2aa84a'];
    if (theme === 'grass') for (let x = -10; x < L.w + 20; x += 9 + rnd() * 12) {
      const r = 3 + rnd() * 5, m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), cmat(hillCols[Math.floor(rnd() * 3)])); m.scale.set(r * 0.8, r * 1.7, 1); m.position.set(x, 0, -6 - rnd() * 8); back.add(m);
      for (let i = 0; i < 3; i++) { const d = box(0.3, 0.6, 0.1, '#1a6a2a', x + (rnd() - 0.5) * r, 2 + rnd() * r * 0.8, m.position.z + 1); back.add(d); }
    }
    for (let x = 0; x < L.w + 20; x += 7 + rnd() * 10) {
      const g = new THREE.Group(), y = theme === 'sky' ? 1 + rnd() * 12 : 9 + rnd() * 4;
      for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8 + (i === 1 ? 0.4 : 0), 12, 8), cmat('#ffffff', '#a8b8c8')); s.position.set(i * 0.9, i === 1 ? 0.3 : 0, 0); g.add(s); }
      g.position.set(x, y, -10 - rnd() * 6); back.add(g);
    }
    if (theme === 'grass') for (let x = 4; x < L.w; x += 6 + rnd() * 9) { if (L.tiles[1 * L.w + Math.floor(x)] !== T.GROUND) continue; const b = new THREE.Group(); for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.5 + (i === 1 ? 0.2 : 0), 10, 8), cmat('#2ac84a')); s.position.set(i * 0.6, 0, 0); b.add(s); } b.position.set(x, 2.2, -1.3); back.add(b); }
    if (theme === 'sky') { const sea = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 80, 30), new THREE.MeshBasicMaterial({ color: '#f4fbff' })); sea.position.set(L.w / 2, -14, -16); back.add(sea); }
  } else if (theme === 'cave') {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 60, 30), new THREE.MeshLambertMaterial({ map: TEX.stone(), color: '#2a3048' })); wall.material.map = TEX.stone().clone(); wall.material.map.wrapS = wall.material.map.wrapT = THREE.RepeatWrapping; wall.material.map.repeat.set((L.w + 60) / 2, 15); wall.material.map.needsUpdate = true; wall.position.set(L.w / 2, 7, -3); back.add(wall);
    for (let x = 3; x < L.w; x += 5 + rnd() * 6) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4 + rnd(), 6), cmat('#4a4a68')); s.rotation.x = Math.PI; s.position.set(x, 11.3, -1); back.add(s); }
  } else {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 60, 30), new THREE.MeshLambertMaterial({ color: theme === 'castle' ? '#3a2228' : '#2a2a38' })); wall.position.set(L.w / 2, 7, -3); back.add(wall);
    for (let x = 4; x < L.w; x += 8) { const w = box(1.2, 2, 0.1, '#ff8a3a', x, 7, -2.9); w.material = cmat('#ff8a3a', '#a03000'); back.add(w); }
  }
  // the checkpoint flag
  if (G.def.check != null) { const f = new THREE.Group(); f.add(box(0.12, 3, 0.12, '#e8e8e8', 0, 1.5, 0), box(0.9, 0.6, 0.05, '#ff4a6a', 0.5, 2.6, 0)); f.position.set(G.def.check + 0.5, G.def.checkY, -0.6); group.add(f); group.userData.flag = f; }
  // the goal: a box of spinning cards
  let goal = null;
  if (G.goal) { goal = new THREE.Mesh(BOX, [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshLambertMaterial({ map: cardTex('mush'), emissive: '#202020' }))); goal.scale.setScalar(1.1); goal.position.set(G.goal.x + 0.5, G.goal.y + 0.5, 0); group.add(goal); const frame = box(1.3, 1.3, 0.2, '#101010', G.goal.x + 0.5, G.goal.y + 0.5, -0.7); group.add(frame); }
  const lastCard = { k: '' };
  return {
    group, theme: THEME, rebuild,
    update(t) {
      if (coinMesh) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 3); coinMesh.userData.list.forEach(([x, y], i) => { p.set(x + 0.5, y + 0.5, 0); m4.compose(p, q, s); coinMesh.setMatrixAt(i, m4); }); coinMesh.instanceMatrix.needsUpdate = true; }
      if (goal) { const k = G.cleared || cardAt(G.t); if (k !== lastCard.k) { lastCard.k = k; goal.material.forEach((m) => { m.map = cardTex(k); m.needsUpdate = true; }); } goal.rotation.y = G.cleared ? goal.rotation.y : Math.sin(t * 2) * 0.3; if (G.cleared) goal.position.y += 0.05; }
      const lava = mats.get('lava'); if (lava) lava.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.15;
    },
    dispose() { scene.remove(group); group.traverse((o) => { if (o.isInstancedMesh) o.dispose(); else if (o.geometry && o.geometry !== BOX) o.geometry.dispose(); }); },
  };
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- cards and item pictures
const CARD_ART = {
  mush: ['....222222....', '..2222112222..', '.221111111122.', '.211111111112.', '22111222211122', '21112222221112', '21112222221112', '22111222211122', '.222222222222.', '...33333333...', '...34333343...', '...33333333...', '....333333....'],
  flower: ['....444444....', '..4455555544..', '.445566665544.', '.455661166554.', '.445566665544.', '..4455555544..', '....444444....', '......77......', '..77..77..77..', '...777777777..', '.....7777.....', '......77......', '......77......'],
  star: ['......44......', '.....4444.....', '.....4444.....', '44444444444444', '.444444444444.', '..4441441444..', '...44144144...', '...44444444...', '..4444444444..', '..44444..4444.', '.4444......444', '.444........44', '.4..........4.'],
};
const CARD_PAL = { 1: '#e83a2a', 2: '#ffffff', 3: '#f8e0b0', 4: '#ffd030', 5: '#ff7a1a', 6: '#fff8e0', 7: '#2ab83a', 9: '#1a1a1a' };
export function cardTex(k) { return px('card_' + k, (g) => { rect(g, '#101010', 0, 0, 16, 16); rect(g, '#f8f8f8', 1, 1, 14, 14); pattern(g, CARD_ART[k], { ...CARD_PAL, 2: k === 'mush' ? '#e83a2a' : CARD_PAL[2], 1: k === 'mush' ? '#ffffff' : CARD_PAL[1] }, 1, 2); }); }
export function cardDataURL(k) { const t = cardTex(k); return t.image.toDataURL(); }

// ---------------------------------------------------------------- characters
const PALETTE = { 0: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' }, 1: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' }, 2: { cap: '#ffffff', shirt: '#ffffff', alls: '#e8302a' }, 3: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' } };
export function makeHero() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const parts = {};
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  legL.position.set(-0.15, 0.55, 0); legR.position.set(0.15, 0.55, 0); armL.position.set(-0.4, 1.12, 0); armR.position.set(0.4, 1.12, 0);
  parts.shoeL = box(0.24, 0.16, 0.36, '#7a3a10', 0, -0.47, 0.05); parts.shoeR = box(0.24, 0.16, 0.36, '#7a3a10', 0, -0.47, 0.05);
  parts.legLm = box(0.24, 0.42, 0.28, '#2a6ad8', 0, -0.22, 0); parts.legRm = box(0.24, 0.42, 0.28, '#2a6ad8', 0, -0.22, 0);
  legL.add(parts.legLm, parts.shoeL); legR.add(parts.legRm, parts.shoeR);
  parts.armLm = box(0.2, 0.5, 0.22, '#ff6a1a', 0, -0.2, 0); parts.armRm = box(0.2, 0.5, 0.22, '#ff6a1a', 0, -0.2, 0);
  armL.add(parts.armLm, box(0.2, 0.16, 0.2, '#ffffff', 0, -0.48, 0)); armR.add(parts.armRm, box(0.2, 0.16, 0.2, '#ffffff', 0, -0.48, 0));
  parts.body = box(0.62, 0.62, 0.42, '#2a6ad8', 0, 0.85, 0); parts.shirt = box(0.64, 0.24, 0.44, '#ff6a1a', 0, 1.1, 0);
  const head = new THREE.Group(); head.position.y = 1.45;
  head.add(box(0.58, 0.5, 0.52, '#ffd0a0', 0, 0, 0), box(0.12, 0.14, 0.04, '#1a1a1a', -0.13, 0.04, 0.27), box(0.12, 0.14, 0.04, '#1a1a1a', 0.13, 0.04, 0.27), box(0.16, 0.12, 0.12, '#ffb080', 0, -0.06, 0.3), box(0.36, 0.06, 0.04, '#5a2a10', 0, -0.17, 0.27));
  parts.cap = box(0.62, 0.2, 0.56, '#ff6a1a', 0, 0.3, 0); parts.brim = box(0.5, 0.06, 0.26, '#ff6a1a', 0, 0.21, 0.35); head.add(parts.cap, parts.brim);
  // the leaf look: round ears and a striped tail
  const ears = new THREE.Group(); ears.add(box(0.16, 0.2, 0.08, '#b8783a', -0.2, 0.5, 0), box(0.16, 0.2, 0.08, '#b8783a', 0.2, 0.5, 0)); head.add(ears);
  const tail = new THREE.Group(); tail.position.set(0, 0.75, -0.25); for (let i = 0; i < 4; i++) tail.add(box(0.2, 0.2, 0.2, i % 2 ? '#3a2410' : '#c8884a', 0, -i * 0.05, -i * 0.17)); tail.rotation.x = -0.6;
  inner.add(legL, legR, armL, armR, parts.body, parts.shirt, head, tail);
  g.userData = { inner, legL, legR, armL, armR, head, ears, tail, parts, phase: 0, power: -1 };
  return g;
}
export function poseHero(m, h, dt, t) {
  const u = m.userData;
  if (u.power !== h.power) {
    u.power = h.power; const p = PALETTE[h.power];
    for (const k of ['cap', 'brim']) u.parts[k].material = cmat(p.cap);
    for (const k of ['shirt', 'armLm', 'armRm']) u.parts[k].material = cmat(p.shirt);
    for (const k of ['body', 'legLm', 'legRm']) u.parts[k].material = cmat(p.alls);
    u.ears.visible = u.tail.visible = h.power === 3;
  }
  const s = h.power ? 1 : 0.56; u.inner.scale.set(h.power ? 1 : 0.95, s, h.power ? 1 : 0.95);
  m.position.set(h.x + h.w / 2, h.y, 0.1);
  const face = h.dir > 0 ? Math.PI / 2 - 0.45 : -Math.PI / 2 + 0.45;
  m.rotation.y += (face - m.rotation.y) * Math.min(1, dt * 18);
  if (h.spin > 0) u.inner.rotation.y = (0.32 - h.spin) / 0.32 * Math.PI * 2; else u.inner.rotation.y = 0;
  if (h.dead) { u.inner.rotation.y = 0; m.rotation.y = 0; u.armL.rotation.z = -2.6; u.armR.rotation.z = 2.6; u.legL.rotation.x = u.legR.rotation.x = 0; return; }
  u.armL.rotation.z = u.armR.rotation.z = 0;
  const speed = Math.abs(h.vx);
  if (!h.onGround) { u.legL.rotation.x = -0.8; u.legR.rotation.x = 0.5; u.armL.rotation.x = -2.6; u.armR.rotation.x = 0.4; if (h.flyT > 0 || h.wag > 0) u.armL.rotation.x = u.armR.rotation.x = -1.4 + Math.sin(t * 30) * 0.6; }
  else { u.phase += dt * (4 + speed * 2.2); const a = Math.sin(u.phase) * Math.min(1, speed / 3) * 0.9; u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a; u.armR.rotation.x = a; }
  u.tail.rotation.y = Math.sin(t * (h.wag > 0 || h.flyT > 0 ? 40 : 4)) * 0.5;
  // blinking after a hit
  m.visible = !(h.inv > 0 && Math.floor(t * 20) % 2);
}
export function makeEnemy(e) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); const u = { inner };
  if (e.kind === 'walker') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cmat('#a8602a')); cap.scale.set(1, 0.9, 1); cap.position.y = 0.35;
    inner.add(cap, box(0.7, 0.36, 0.6, '#f0d0a0', 0, 0.25, 0), box(0.12, 0.2, 0.05, '#1a1a1a', -0.15, 0.55, 0.42), box(0.12, 0.2, 0.05, '#1a1a1a', 0.15, 0.55, 0.42), box(0.28, 0.14, 0.34, '#3a1a08', -0.2, 0.06, 0.05), box(0.28, 0.14, 0.34, '#3a1a08', 0.2, 0.06, 0.05), box(0.4, 0.05, 0.05, '#1a1a1a', 0, 0.68, 0.36));
    const wings = new THREE.Group(); for (const s of [-1, 1]) { const w = box(0.08, 0.4, 0.55, '#ffffff', s * 0.45, 0.7, -0.1); w.userData.s = s; wings.add(w); } inner.add(wings); u.wings = wings;
  } else if (e.kind === 'koopa') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cmat('#2ab83a')); shell.scale.set(1, 1.1, 1.1); shell.position.y = 0.25;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.14, 14), cmat('#fff4c8')); rim.position.y = 0.25;
    const body = new THREE.Group(); body.add(box(0.36, 0.5, 0.3, '#ffd040', 0, 0.72, 0.28), box(0.34, 0.32, 0.4, '#ffd040', 0, 1.05, 0.36), box(0.08, 0.12, 0.04, '#1a1a1a', 0.1, 1.1, 0.57), box(0.2, 0.12, 0.3, '#ffd040', -0.18, 0.06, 0.2), box(0.2, 0.12, 0.3, '#ffd040', 0.18, 0.06, 0.2));
    inner.add(shell, rim, body); u.body = body; u.shell = shell;
  } else if (e.kind === 'plant') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8), cmat('#2a9a2a')); stem.position.y = 0.4;
    const head = new THREE.Group(); head.position.y = 1.0;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cmat('#e8302a')); const bot = top.clone(); bot.rotation.x = Math.PI;
    for (const [x, y, z] of [[0.2, 0.22, 0.22], [-0.2, 0.22, 0.22], [0, 0.35, -0.1]]) top.add(box(0.1, 0.1, 0.1, '#ffffff', x, y, z));
    head.add(top, bot); inner.add(stem, head, box(0.5, 0.08, 0.2, '#2ab83a', -0.25, 0.5, 0), box(0.5, 0.08, 0.2, '#2ab83a', 0.25, 0.5, 0)); u.top = top; u.bot = bot;
  } else if (e.kind === 'boss') {
    const k = e.big, sc = k ? 1.25 : 1;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), cmat(k ? '#2a8a3a' : '#8a3ac8')); shell.scale.set(1.05, 1.1, 1); shell.position.y = 0.55;
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), cmat('#f8f8f8')); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * 0.45, 1.25, Math.sin(a) * 0.45); shell.add(sp); sp.position.y = 0.6; }
    const head = new THREE.Group(); head.position.set(0, 1.35, 0.45); head.add(box(0.7, 0.6, 0.6, k ? '#f0c040' : '#f0c890', 0, 0, 0), box(0.14, 0.18, 0.04, '#1a1a1a', -0.16, 0.08, 0.31), box(0.14, 0.18, 0.04, '#1a1a1a', 0.16, 0.08, 0.31), box(0.5, 0.08, 0.04, '#7a1a1a', 0, -0.16, 0.31));
    if (k) { head.add(box(0.6, 0.18, 0.6, '#ffd030', 0, 0.38, 0)); for (const x of [-0.22, 0, 0.22]) head.add(box(0.1, 0.18, 0.1, '#ffd030', x, 0.55, 0.2)); head.add(box(0.1, 0.25, 0.1, '#f8f0e0', -0.3, 0.4, -0.1), box(0.1, 0.25, 0.1, '#f8f0e0', 0.3, 0.4, -0.1)); }
    inner.add(shell, head, box(0.35, 0.3, 0.45, '#f0c890', -0.4, 0.15, 0.1), box(0.35, 0.3, 0.45, '#f0c890', 0.4, 0.15, 0.1)); inner.scale.setScalar(sc); u.head = head;
  }
  g.userData = u; return g;
}
export function poseEnemy(m, e, dt, t) {
  const u = m.userData;
  m.position.set(e.x + e.w / 2, e.y, 0);
  if (e.kind === 'plant') { m.position.y = e.y; const open = 0.35 + Math.sin(t * 8) * 0.25; u.top.rotation.x = -open; u.bot.rotation.x = Math.PI + open; m.rotation.y = 0; return; }
  m.rotation.y = e.vx > 0 ? Math.PI / 2 - 0.3 : -Math.PI / 2 + 0.3;
  if (e.flip) { u.inner.rotation.z = Math.PI; u.inner.position.y = 0.8; }
  if (!e.alive && e.how === 'stomp') { u.inner.scale.y = 0.25; return; }
  if (e.kind === 'walker') { u.wings.visible = !!e.wings; u.wings.children.forEach((w) => { w.rotation.z = w.userData.s * (0.4 + Math.sin(t * 16) * 0.5); }); u.inner.rotation.z = e.flip ? Math.PI : Math.sin(t * 8) * 0.12; }
  if (e.kind === 'koopa') { u.body.visible = e.state === 'walk'; if (e.state === 'spin') u.inner.rotation.y += dt * 20; else u.inner.rotation.y = 0; if (e.state !== 'walk' && !e.flip) u.inner.position.y = -0.1; }
  if (e.kind === 'boss') { m.visible = !(e.inv > 0 && Math.floor(t * 16) % 2); u.head.rotation.z = Math.sin(t * 5) * 0.08; }
}
export function makeItem(kind) {
  const g = new THREE.Group();
  if (kind === 'mush' || kind === 'oneup') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), cmat(kind === 'mush' ? '#e8302a' : '#2ab83a')); cap.position.y = 0.38;
    for (const [x, z] of [[0, 0.3], [0.28, 0.05], [-0.28, 0.05]]) cap.add(box(0.16, 0.16, 0.06, '#ffffff', x, 0.2, z));
    g.add(cap, box(0.4, 0.38, 0.4, '#f8e8c8', 0, 0.2, 0), box(0.06, 0.1, 0.04, '#1a1a1a', -0.08, 0.25, 0.21), box(0.06, 0.1, 0.04, '#1a1a1a', 0.08, 0.25, 0.21));
  } else if (kind === 'flower') {
    g.add(box(0.1, 0.4, 0.1, '#2ab83a', 0, 0.2, 0), box(0.5, 0.06, 0.15, '#2ab83a', 0, 0.12, 0));
    const head = new THREE.Group(); head.position.y = 0.6; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; head.add(box(0.22, 0.22, 0.08, i % 2 ? '#ff7a1a' : '#ffd030', Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0)); } head.add(box(0.2, 0.2, 0.1, '#fff8e0', 0, 0, 0.04)); g.add(head);
  } else if (kind === 'leaf') {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), cmat('#e8902a')); l.scale.set(1, 0.18, 0.6); l.position.y = 0.3; g.add(l, box(0.5, 0.04, 0.04, '#7a4a1a', 0, 0.36, 0));
  }
  return g;
}
export function makeFireball() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), cmat('#ffb030', '#ff5a00'))); return g; }
export function makeShot() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), cmat('#ff6a2a', '#ff3000')); m.scale.set(1.5, 0.8, 0.8); return m; }
export function makeCoinPop() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), cmat('#ffd030', '#7a5000')); m.rotation.x = Math.PI / 2; return m; }
export const tileBox = (key) => new THREE.Mesh(BOX, mat(key));
export { box, look };
