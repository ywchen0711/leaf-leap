// LEAF LEAP 3D — what you see: pixel-art blocks, round pipes, scenery for each theme, the hero, enemies, items and effects.
import * as THREE from 'three';
import { T, cardAt, tileAt, isSolid } from './game.js';

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
  grasstop: () => px('grasstop', (g) => { rect(g, '#4ac83a', 0, 0, 16, 16); for (const [x, y] of [[2, 3], [9, 2], [13, 9], [5, 11], [11, 13], [7, 6]]) { rect(g, '#7ae05a', x, y, 2, 1); rect(g, '#2a9a2a', x + 1, y + 1, 1, 1); } }),
  checker: () => px('checker', (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) rect(g, (x + y) % 2 ? '#1a1a1a' : '#ffffff', x * 4, y * 4, 4, 4); }),
  sand: () => px('sand', (g) => { rect(g, '#f0d898', 0, 0, 16, 16); for (const [x, y] of [[2, 3], [9, 2], [13, 9], [5, 11], [11, 13], [7, 6], [1, 14]]) rect(g, '#d8b878', x, y, 1, 1); }),
  plank: () => px('plank', (g) => { rect(g, '#b07a40', 0, 0, 16, 16); g.fillStyle = '#6a4220'; for (let y = 0; y < 16; y += 4) g.fillRect(0, y + 3, 16, 1); for (const [x, y] of [[5, 0], [12, 4], [3, 8], [10, 12]]) g.fillRect(x, y, 1, 3); rect(g, '#d8a060', 0, 0, 16, 1); for (const [x, y] of [[1, 1], [14, 1], [1, 9], [14, 9]]) rect(g, '#3a2410', x, y, 1, 1); }),
  cannon: () => px('cannon', (g) => { rect(g, '#2a2a30', 0, 0, 16, 16); rect(g, '#5a5a66', 1, 1, 14, 2); g.fillStyle = '#0a0a0e'; g.beginPath(); g.arc(8, 9, 4.5, 0, 7); g.fill(); rect(g, '#8a8a96', 6, 6, 2, 2); }),
  stone: () => px('stone', (g) => { rect(g, '#8a8a98', 0, 0, 16, 16); g.fillStyle = '#4a4a58'; for (let y = 0; y < 16; y += 8) { g.fillRect(0, y + 7, 16, 1); const o = (y / 8) % 2 ? 8 : 0; g.fillRect(o, y, 1, 7); } rect(g, '#b8b8c8', 0, 0, 16, 1); }),
};
const mats = new Map();
function mat(key, opts = {}) { if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ map: TEX[key](), ...opts })); return mats.get(key); }
const colMat = new Map();
export function cmat(c, emissive) { const k = c + (emissive || ''); if (!colMat.has(k)) colMat.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: emissive || '#000000' })); return colMat.get(k); }
const BOX = new THREE.BoxGeometry(1, 1, 1);
const box = (w, h, d, c, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(BOX, cmat(c)); m.scale.set(w, h, d); m.position.set(x, y, z); return m; };

// which look each block gets
function look(L, x, y, z) {
  switch (tileAt(L, x, y, z)) {
    case T.GROUND: return L.theme === 'water' ? 'sand' : tileAt(L, x, y + 1, z) === T.GROUND ? 'dirt' : 'grass';
    case T.PLANK: return 'plank'; case T.CANNON: return 'cannon'; case T.QTANOOKI: case T.QFROG: return 'q';
    case T.BRICK: return 'brick'; case T.QCOIN: case T.QLEAF: case T.QFLOWER: case T.Q1UP: return 'q'; case T.USED: return 'used';
    case T.HARD: return 'wood'; case T.CLOUD: return 'cloud'; case T.NOTE: return 'note';
    case T.LAVA: return 'lava'; case T.STONE: return 'stone'; default: return null;
  }
}
const faceMats = new Map();
function lookMat(k) {
  if (!faceMats.has(k)) {
    let m;
    if (k === 'grass') { const side = mat('grass'); m = [side, side, mat('grasstop'), mat('dirt'), side, side]; }
    else if (k === 'lava') m = mat('lava', { emissive: '#ff4000', emissiveIntensity: 0.6 });
    else m = mat(k);
    faceMats.set(k, m);
  }
  return faceMats.get(k);
}
// a round pipe over its 2 × 2 blocks
function pipeMesh(x, z, base, hgt) {
  const g = new THREE.Group(), green = cmat('#2ab82a'), light = cmat('#5ad84a');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, hgt - 0.5, 20), green); body.position.y = (hgt - 0.5) / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.55, 20), light); rim.position.y = hgt - 0.27;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.78, 20), cmat('#0a2a0a')); hole.rotation.x = -Math.PI / 2; hole.position.y = hgt + 0.03;
  g.add(body, rim, hole); g.position.set(x + 1, base, z + 1);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
// ---------------------------------------------------------------- a level's blocks and scenery
export function buildLevel(scene, G) {
  const group = new THREE.Group(), L = G.L, theme = L.theme, def = G.def; scene.add(group);
  const THEME = {
    grass: { sky: ['#4aa8ff', '#d0f0ff'], fog: ['#cfeaff', 40, 140] }, sky: { sky: ['#2a8aff', '#e8f6ff'], fog: ['#e0f2ff', 45, 150] },
    cave: { sky: ['#05070d', '#141a30'], fog: ['#0a0e1a', 18, 60] }, water: { sky: ['#3a9ae8', '#c8ecff'], fog: ['#2a7ac8', 22, 80] }, airship: { sky: ['#ff8a4a', '#ffe0a8'], fog: ['#ffc890', 45, 160] }, fort: { sky: ['#100e16', '#2a2030'], fog: ['#1a1620', 20, 70] }, castle: { sky: ['#180606', '#3a1410'], fog: ['#2a0c08', 20, 70] },
  }[theme];
  let tileGroup = new THREE.Group(); group.add(tileGroup);
  const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14); coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshLambertMaterial({ color: '#ffd030', emissive: '#7a5000' });
  let coinMesh = null;
  const filled = (x, y, z) => x >= 0 && x < L.w && z >= 0 && z < L.d && y >= 0 && y < L.h && isSolid(L.tiles[(y * L.d + z) * L.w + x]) && L.tiles[(y * L.d + z) * L.w + x] !== T.PIPE && L.tiles[(y * L.d + z) * L.w + x] !== T.PIPETOP;
  function rebuild() {
    group.remove(tileGroup); tileGroup.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); tileGroup = new THREE.Group(); group.add(tileGroup);
    const lists = {}, coins = [];
    for (let y = 0; y < L.h; y++) for (let z = 0; z < L.d; z++) for (let x = 0; x < L.w; x++) {
      const t = L.tiles[(y * L.d + z) * L.w + x];
      if (t === T.EMPTY || t === T.PIPE || t === T.PIPETOP || t === T.WATER) continue;
      if (t === T.COIN) { coins.push([x, y, z]); continue; }
      // only blocks you can see: at least one side open
      if (isSolid(t) && filled(x + 1, y, z) && filled(x - 1, y, z) && filled(x, y + 1, z) && filled(x, y - 1, z) && filled(x, y, z + 1) && filled(x, y, z - 1)) continue;
      const k = look(L, x, y, z); if (k) (lists[k] = lists[k] || []).push([x, y, z]);
    }
    const m4 = new THREE.Matrix4();
    for (const [k, list] of Object.entries(lists)) {
      const im = new THREE.InstancedMesh(BOX, lookMat(k), list.length);
      list.forEach(([x, y, z], i) => { const sy = k === 'cloud' ? 0.6 : k === 'lava' ? 0.85 : 1; m4.makeScale(1, sy, 1); m4.setPosition(x + 0.5, y + (k === 'cloud' ? 0.7 : k === 'lava' ? 0.42 : 0.5), z + 0.5); im.setMatrixAt(i, m4); });
      im.castShadow = k !== 'lava'; im.receiveShadow = true; tileGroup.add(im);
    }
    coinMesh = coins.length ? new THREE.InstancedMesh(coinGeo, coinMat, coins.length) : null; if (coinMesh) { coinMesh.userData.list = coins; coinMesh.castShadow = true; tileGroup.add(coinMesh); }
  }
  rebuild();
  for (const p of def.pipes || []) group.add(pipeMesh(p.x, p.z, p.base, p.hgt));
  for (const [x0, y0, z0, x1, y1, z1] of def.waters || []) {
    const wm = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: '#2a8aff', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })); wm.scale.set(x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1); wm.position.set((x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2, (z0 + z1 + 1) / 2); wm.renderOrder = 2; group.add(wm);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 1, z1 - z0 + 1), new THREE.MeshLambertMaterial({ color: '#8ad8ff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.set((x0 + x1 + 1) / 2, y1 + 1.01, (z0 + z1 + 1) / 2); group.add(top);
  }
  // scenery
  const back = new THREE.Group(); group.add(back);
  const rnd = mulberry(L.w * 7 + L.d);
  if (theme === 'grass' || theme === 'sky') {
    if (theme === 'grass') {
      const land = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 400, 400), cmat('#5ab84a')); land.rotation.x = -Math.PI / 2; land.position.set(L.w / 2, -9, L.d / 2); back.add(land);
      const hillCols = ['#4ac85a', '#7ae07a', '#2aa84a'];
      for (let i = 0; i < 40; i++) {
        const side = i % 2 ? -1 : 1, r = 5 + rnd() * 9, x = -30 + rnd() * (L.w + 60), z = side > 0 ? L.d + 18 + rnd() * 50 : -18 - rnd() * 50;
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), cmat(hillCols[Math.floor(rnd() * 3)])); m.scale.set(r, r * (1.2 + rnd()), r); m.position.set(x, -9, z); back.add(m);
      }
      for (let i = 0; i < 50; i++) { const x = -20 + rnd() * (L.w + 40), z = rnd() < 0.5 ? L.d + 8 + rnd() * 25 : -8 - rnd() * 25; const t = new THREE.Group(), tr = box(0.6, 3, 0.6, '#7a4a1a', 0, 1.5, 0), top = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), cmat(rnd() < 0.5 ? '#2a9a3a' : '#3ab84a')); top.position.y = 4; t.add(tr, top); t.position.set(x, -9, z); back.add(t); }
    } else {
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 400, 400), new THREE.MeshBasicMaterial({ color: '#f4fbff' })); sea.rotation.x = -Math.PI / 2; sea.position.set(L.w / 2, -14, L.d / 2); back.add(sea);
    }
    for (let i = 0; i < 36; i++) {
      const g = new THREE.Group(), y = theme === 'sky' ? -10 + rnd() * 26 : 12 + rnd() * 10;
      for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (k === 1 ? 0.6 : 0), 12, 8), cmat('#ffffff', '#b0c0d0')); s.position.set(k * 1.6, k === 1 ? 0.5 : 0, 0); g.add(s); }
      g.position.set(-20 + rnd() * (L.w + 40), y, rnd() < 0.5 ? -10 - rnd() * 40 : L.d + 14 + rnd() * 30); back.add(g);
    }
  } else if (theme === 'water') {
    const r2 = mulberry(5);
    for (let i = 0; i < 70; i++) { const x = 9 + r2() * (L.w - 20), z = r2() * L.d; if (isSolid(tileAt(L, Math.floor(x), 2, Math.floor(z)))) continue; const hgt = 1 + r2() * 3, sw = box(0.18, hgt, 0.18, r2() < 0.5 ? '#2a9a5a' : '#c8507a', x, 2 + hgt / 2, z); sw.userData.sway = r2() * 6; back.add(sw); }
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 400, 400), cmat('#1a5aa8')); sea.rotation.x = -Math.PI / 2; sea.position.set(L.w / 2, 11.9, L.d / 2 + 210); back.add(sea);
  } else if (theme === 'airship') {
    const r2 = mulberry(9);
    const below = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 400, 400), new THREE.MeshBasicMaterial({ color: '#fff0e0' })); below.rotation.x = -Math.PI / 2; below.position.set(L.w / 2, -16, L.d / 2); back.add(below);
    for (let i = 0; i < 40; i++) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.SphereGeometry(2 + (k === 1 ? 1 : 0), 12, 8), cmat('#fff4e8', '#c8a080')); c.position.set(k * 2.4, k === 1 ? 0.8 : 0, 0); g.add(c); } g.position.set(-30 + r2() * (L.w + 60), -14 + r2() * 24, r2() < 0.5 ? -12 - r2() * 40 : L.d + 14 + r2() * 30); back.add(g); }
    for (const x of [8, 32, 55, 78, 100]) { const mast = box(0.4, 10, 0.4, '#6a4220', x, 13, 0.4); const sail = box(4, 4, 0.1, '#f8f0e0', x, 14, 0.2); mast.castShadow = true; back.add(mast, sail); const prop = new THREE.Group(); prop.add(box(0.2, 0.2, 3, '#8a8a96'), box(0.2, 3, 0.2, '#8a8a96')); prop.position.set(x, 4, -0.4); prop.userData.spin = true; back.add(prop); }
  } else if (theme === 'cave') {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 60, 30), new THREE.MeshLambertMaterial({ color: '#2a3048' })); wall.position.set(L.w / 2, 7, -1.5); back.add(wall);
    for (let x = 3; x < L.w; x += 4 + rnd() * 5) for (const z of [1 + rnd() * 3, L.d - 2 - rnd() * 3]) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2 + rnd(), 6), cmat('#4a4a68')); s.rotation.x = Math.PI; s.position.set(x, 9.4, z); back.add(s); }
  } else {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(L.w + 60, 30), new THREE.MeshLambertMaterial({ color: theme === 'castle' ? '#3a2228' : '#2a2a38' })); wall.position.set(L.w / 2, 7, -1.5); back.add(wall);
    for (let x = 4; x < L.w; x += 8) { const w = box(1.2, 2, 0.1, '#ff8a3a', x, 7, -1.4); w.material = cmat('#ff8a3a', '#a03000'); back.add(w); }
  }
  // the checkpoint flag
  if (def.check) { const [cx, cy, cz] = def.check, f = new THREE.Group(); f.add(box(0.12, 3, 0.12, '#e8e8e8', 0, 1.5, 0), box(0.9, 0.6, 0.05, '#ff4a6a', 0.5, 2.6, 0)); f.position.set(cx + 0.5, cy, cz - 1.5); f.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(f); }
  // the goal: a finish line across the course, and a box of spinning cards above it
  let goal = null;
  if (G.goal) {
    const gx = G.goal.x + 0.8, fy = Math.max(0, Math.floor(G.goal.y) - 0.98);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1, L.d), new THREE.MeshLambertMaterial({ map: (() => { const t = TEX.checker().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, L.d); t.needsUpdate = true; return t; })() }));
    line.rotation.x = -Math.PI / 2; line.position.set(gx, G.goal.y - 0.78, L.d / 2); group.add(line);
    for (const z of [-0.2, L.d + 0.2]) { const post = box(0.25, 6, 0.25, '#f8f8f8', gx, G.goal.y - 0.8 + 3, z); post.castShadow = true; group.add(post); }
    group.add(box(0.25, 0.25, L.d + 0.6, '#f8f8f8', gx, G.goal.y + 5, L.d / 2));
    goal = new THREE.Mesh(BOX, [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshLambertMaterial({ map: cardTex('mush'), emissive: '#303030' }))); goal.scale.setScalar(1.4); goal.position.set(gx, G.goal.y + 3.6, G.goal.z + 0.5); goal.castShadow = true; group.add(goal);
    void fy;
  }
  const lastCard = { k: '' };
  return {
    group, theme: THEME, rebuild,
    update(t) {
      if (coinMesh) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 3); coinMesh.userData.list.forEach(([x, y, z], i) => { p.set(x + 0.5, y + 0.5, z + 0.5); m4.compose(p, q, sc); coinMesh.setMatrixAt(i, m4); }); coinMesh.instanceMatrix.needsUpdate = true; }
      if (goal) { const k = G.cleared || cardAt(G.t); if (k !== lastCard.k) { lastCard.k = k; goal.material.forEach((m) => { m.map = cardTex(k); m.needsUpdate = true; }); } goal.rotation.y = t * 1.5; if (G.cleared) goal.position.y += 0.04; }
      const lava = mats.get('lava'); if (lava) lava.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.15;
      for (const o of back.children) { if (o.userData.sway != null) o.rotation.z = Math.sin(t * 1.5 + o.userData.sway) * 0.2; if (o.userData.spin) o.rotation.z = t * 8; }
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
const PALETTE = { 0: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' }, 1: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' }, 2: { cap: '#ffffff', shirt: '#ffffff', alls: '#e8302a' }, 3: { cap: '#ff6a1a', shirt: '#ff6a1a', alls: '#2a6ad8' },
  4: { cap: '#9a5a2a', shirt: '#9a5a2a', alls: '#8a4a1a', skin: '#f0c890' }, 5: { cap: '#3ab83a', shirt: '#3ab83a', alls: '#2a9a2a', skin: '#c8f0a0' }, stone: { cap: '#8a8a8a', shirt: '#8a8a8a', alls: '#7a7a7a', skin: '#9a9a9a' } };
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
  const head = new THREE.Group(); head.position.y = 1.45; parts.face = box(0.58, 0.5, 0.52, '#ffd0a0', 0, 0, 0);
  head.add(parts.face, box(0.12, 0.14, 0.04, '#1a1a1a', -0.13, 0.04, 0.27), box(0.12, 0.14, 0.04, '#1a1a1a', 0.13, 0.04, 0.27), box(0.16, 0.12, 0.12, '#ffb080', 0, -0.06, 0.3), box(0.36, 0.06, 0.04, '#5a2a10', 0, -0.17, 0.27));
  parts.cap = box(0.62, 0.2, 0.56, '#ff6a1a', 0, 0.3, 0); parts.brim = box(0.5, 0.06, 0.26, '#ff6a1a', 0, 0.21, 0.35); head.add(parts.cap, parts.brim);
  // the leaf look: round ears and a striped tail
  const ears = new THREE.Group(); ears.add(box(0.16, 0.2, 0.08, '#b8783a', -0.2, 0.5, 0), box(0.16, 0.2, 0.08, '#b8783a', 0.2, 0.5, 0)); head.add(ears);
  const tail = new THREE.Group(); tail.position.set(0, 0.75, -0.25); for (let i = 0; i < 4; i++) tail.add(box(0.2, 0.2, 0.2, i % 2 ? '#3a2410' : '#c8884a', 0, -i * 0.05, -i * 0.17)); tail.rotation.x = -0.6;
  // the frog suit: big round eyes on top
  const frogEyes = new THREE.Group(); for (const x of [-0.18, 0.18]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), cmat('#ffffff')); e.position.set(x, 0.42, 0.12); const pu = box(0.08, 0.1, 0.04, '#1a1a1a', 0, 0, 0.14); e.add(pu); frogEyes.add(e); } head.add(frogEyes);
  inner.add(legL, legR, armL, armR, parts.body, parts.shirt, head, tail);
  g.userData = { inner, legL, legR, armL, armR, head, ears, tail, frogEyes, parts, phase: 0, power: -1 };
  return g;
}
export function poseHero(m, h, dt, t) {
  const u = m.userData;
  const lookKey = h.statue > 0 ? 'stone' : h.power;
  if (u.power !== lookKey) {
    u.power = lookKey; const p = PALETTE[lookKey];
    // a statue is stone all over; coming back, every part gets its own colour again
    u.inner.traverse((o) => { if (!o.isMesh) return; if (!o.userData.mat0) o.userData.mat0 = o.material; o.material = lookKey === 'stone' ? cmat('#8a8a8a') : o.userData.mat0; });
    for (const k of ['cap', 'brim']) u.parts[k].material = cmat(p.cap);
    for (const k of ['shirt', 'armLm', 'armRm']) u.parts[k].material = cmat(p.shirt);
    for (const k of ['body', 'legLm', 'legRm']) u.parts[k].material = cmat(p.alls);
    u.parts.face.material = cmat(p.skin || '#ffd0a0');
    const tailed = h.power === 3 || h.power === 4;
    u.ears.visible = u.tail.visible = tailed; u.frogEyes.visible = h.power === 5; u.parts.brim.visible = h.power !== 5;
    u.ears.children.forEach((e) => { e.material = cmat(h.statue > 0 ? '#8a8a8a' : '#b8783a'); });
  }
  if (h.statue > 0) { m.position.set(h.x + h.w / 2, h.y, h.z + h.d / 2); u.inner.rotation.set(0, 0, 0); for (const k of ['legL', 'legR', 'armL', 'armR']) u[k].rotation.set(0, 0, 0); m.visible = true; return; }
  const s = h.power ? 1 : 0.56; u.inner.scale.set(h.power ? 1 : 0.95, s, h.power ? 1 : 0.95);
  m.position.set(h.x + h.w / 2, h.y, h.z == null ? 0.1 : h.z + h.d / 2);
  const face = h.face == null ? 0 : h.face, dA = ((face - m.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  m.rotation.y += dA * Math.min(1, dt * 16);
  if (h.spin > 0) u.inner.rotation.y = (0.32 - h.spin) / 0.32 * Math.PI * 2; else u.inner.rotation.y = 0;
  if (h.dead) { u.inner.rotation.y = 0; u.armL.rotation.z = -2.6; u.armR.rotation.z = 2.6; u.legL.rotation.x = u.legR.rotation.x = 0; return; }
  u.armL.rotation.z = u.armR.rotation.z = 0;
  const speed = Math.hypot(h.vx, h.vz || 0);
  if (h.pound) { u.inner.rotation.x = h.pound === 1 ? (0.18 - h.poundT) / 0.18 * Math.PI * 2 : 0; u.legL.rotation.x = u.legR.rotation.x = -1.2; return; } u.inner.rotation.x = 0;
  if (h.swimming) { u.inner.rotation.x = 1.0; const s2 = Math.sin(t * (h.power === 5 ? 14 : 8)); u.legL.rotation.x = s2 * 0.8; u.legR.rotation.x = -s2 * 0.8; u.armL.rotation.x = -2 + s2; u.armR.rotation.x = -2 - s2; m.visible = !(h.inv > 0 && Math.floor(t * 20) % 2); return; }
  if (!h.onGround) { u.legL.rotation.x = -0.8; u.legR.rotation.x = 0.5; u.armL.rotation.x = -2.6; u.armR.rotation.x = 0.4; if (h.flyT > 0 || h.wag > 0) u.armL.rotation.x = u.armR.rotation.x = -1.4 + Math.sin(t * 30) * 0.6; }
  else { u.phase += dt * (4 + speed * 2.2); const a = Math.sin(u.phase) * Math.min(1, speed / 3) * 0.9; u.legL.rotation.x = a; u.legR.rotation.x = -a; u.armL.rotation.x = -a; u.armR.rotation.x = a; }
  // the frog suit hops along
  u.inner.position.y = h.power === 5 && h.onGround && speed > 0.5 ? Math.abs(Math.sin(u.phase)) * 0.3 : 0;
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
  } else if (e.kind === 'fish') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), cmat('#ff5a3a')); body.scale.set(0.8, 0.9, 1.2); body.position.y = 0.32;
    const fin = box(0.06, 0.4, 0.4, '#ffd8c8', 0, 0.32, -0.6); fin.rotation.x = 0.3; u.fin = fin;
    const eye = box(0.1, 0.12, 0.05, '#1a1a1a', 0.2, 0.42, 0.32), eye2 = box(0.1, 0.12, 0.05, '#1a1a1a', -0.2, 0.42, 0.32), lips = box(0.2, 0.08, 0.06, '#ffd040', 0, 0.26, 0.5);
    inner.add(body, fin, eye, eye2, lips, box(0.5, 0.06, 0.2, '#ffd8c8', 0, 0.55, 0));
  } else if (e.kind === 'boss' && e.prince) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), cmat('#4ab84a')); shell.scale.set(1, 1.1, 1); shell.position.y = 0.45;
    const head = new THREE.Group(); head.position.set(0, 1.15, 0.3); head.add(box(0.55, 0.5, 0.5, '#f0d060', 0, 0, 0), box(0.12, 0.16, 0.04, '#1a1a1a', -0.13, 0.06, 0.26), box(0.12, 0.16, 0.04, '#1a1a1a', 0.13, 0.06, 0.26), box(0.5, 0.25, 0.4, '#3a8aff', 0, 0.35, -0.05), box(0.2, 0.2, 0.2, '#3a8aff', 0, 0.5, -0.15));
    const wand = new THREE.Group(); wand.add(box(0.06, 0.7, 0.06, '#f8f0e0', 0, 0.35, 0)); const star = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), cmat('#ffd030', '#a07000')); star.position.y = 0.75; wand.add(star); wand.position.set(0.45, 0.7, 0.3); wand.rotation.z = -0.4;
    inner.add(shell, head, wand, box(0.3, 0.25, 0.4, '#f0d060', -0.28, 0.12, 0.1), box(0.3, 0.25, 0.4, '#f0d060', 0.28, 0.12, 0.1)); u.head = head; u.wand = wand;
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
  m.position.set(e.x + e.w / 2, e.y, e.z + e.d / 2);
  if (e.face != null) m.rotation.y = e.face;
  if (e.kind === 'plant') { const open = 0.35 + Math.sin(t * 8) * 0.25; u.top.rotation.x = -open; u.bot.rotation.x = Math.PI + open; return; }
  if (e.flip) { u.inner.rotation.z = Math.PI; u.inner.position.y = 0.8; }
  if (!e.alive && e.how === 'stomp') { u.inner.scale.y = 0.25; return; }
  if (e.kind === 'walker') { u.wings.visible = !!e.wings; u.wings.children.forEach((w) => { w.rotation.z = w.userData.s * (0.4 + Math.sin(t * 16) * 0.5); }); u.inner.rotation.z = e.flip ? Math.PI : Math.sin(t * 8) * 0.12; }
  if (e.kind === 'koopa') { u.body.visible = e.state === 'walk'; if (e.state === 'spin') u.inner.rotation.y += dt * 20; else u.inner.rotation.y = 0; if (e.state !== 'walk' && !e.flip) u.inner.position.y = -0.1; }
  if (e.kind === 'boss') { m.visible = !(e.inv > 0 && Math.floor(t * 16) % 2); u.head.rotation.z = Math.sin(t * 5) * 0.08; if (u.wand) u.wand.rotation.z = -0.4 + Math.sin(t * 6) * 0.5; }
  if (e.kind === 'fish') u.fin.rotation.y = Math.sin(t * 12) * 0.6;
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
  } else if (kind === 'tanooki' || kind === 'frog') {
    const c = kind === 'tanooki' ? '#9a5a2a' : '#3ab83a';
    g.add(box(0.55, 0.55, 0.3, c, 0, 0.35, 0), box(0.18, 0.3, 0.2, c, -0.18, 0.08, 0), box(0.18, 0.3, 0.2, c, 0.18, 0.08, 0));
    if (kind === 'tanooki') g.add(box(0.14, 0.18, 0.1, '#b8783a', -0.18, 0.7, 0), box(0.14, 0.18, 0.1, '#b8783a', 0.18, 0.7, 0), box(0.16, 0.16, 0.4, '#c8884a', 0, 0.3, -0.3));
    else for (const x of [-0.15, 0.15]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), cmat('#ffffff')); e.position.set(x, 0.7, 0.05); g.add(e); }
  } else if (kind === 'leaf') {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), cmat('#e8902a')); l.scale.set(1, 0.18, 0.6); l.position.y = 0.3; g.add(l, box(0.5, 0.04, 0.04, '#7a4a1a', 0, 0.36, 0));
  }
  return g;
}
export function makeFireball() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), cmat('#ffb030', '#ff5a00'))); return g; }
export function makeShot(kind) {
  if (kind === 'ball') return new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), cmat('#1a1a22'));
  if (kind === 'ring') { const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), cmat('#5ac8ff', '#2a78c8')); return m; }
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), cmat('#ff6a2a', '#ff3000')); m.scale.set(1.5, 0.8, 0.8); return m;
}
export function makeCoinPop() { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12), cmat('#ffd030', '#7a5000')); m.rotation.x = Math.PI / 2; return m; }
export const tileBox = (key) => new THREE.Mesh(BOX, mat(key));
export { box, look };

// ================================================================ the open world: meshed in chunks
// Every 16 × 16 column of the world is one mesh holding only the faces you can see, textured from one atlas, with a
// touch of ambient occlusion in the corners. A block that changes rebuilds just its chunk.
Object.assign(TEX, {
  log: () => px('log', (g) => { rect(g, '#8a5a2a', 0, 0, 16, 16); for (const x of [2, 6, 10, 13]) rect(g, '#6a4220', x, 0, 1, 16); for (const [x, y] of [[4, 3], [8, 9], [12, 5], [3, 12]]) rect(g, '#a87a40', x, y, 1, 2); }),
  logtop: () => px('logtop', (g) => { rect(g, '#8a5a2a', 0, 0, 16, 16); g.strokeStyle = '#c8a060'; for (const r of [2, 4.5, 7]) { g.beginPath(); g.arc(8, 8, r, 0, 7); g.stroke(); } }),
  leaves: () => px('leaves', (g) => { rect(g, '#2a9a3a', 0, 0, 16, 16); for (const [x, y] of [[1, 2], [6, 1], [11, 3], [3, 7], [9, 8], [14, 9], [2, 12], [7, 13], [12, 14]]) { rect(g, '#4ac85a', x, y, 2, 2); rect(g, '#1a6a2a', x + 1, y + 2, 2, 1); } }),
  wall: () => px('wall', (g) => { rect(g, '#f8f0dc', 0, 0, 16, 16); for (const [x, y] of [[3, 4], [10, 2], [6, 10], [13, 12]]) rect(g, '#e8dcc0', x, y, 2, 1); rect(g, '#d8c8a8', 0, 15, 16, 1); }),
  roof: () => px('roof', (g) => { rect(g, '#e8302a', 0, 0, 16, 16); for (const [x, y, r] of [[4, 4, 2.4], [12, 6, 1.8], [7, 12, 2]]) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } rect(g, '#a81a18', 0, 15, 16, 1); }),
  spade: () => px('spade', (g) => { rect(g, '#2a9a4a', 0, 0, 16, 16); rect(g, '#1a6a2a', 0, 15, 16, 1); rect(g, '#1a6a2a', 15, 0, 1, 16); g.fillStyle = '#ffffff'; g.font = 'bold 12px sans-serif'; g.fillText('♠', 3, 13); }),
  snow: () => px('snow', (g) => { rect(g, '#f4f8ff', 0, 0, 16, 16); for (const [x, y] of [[3, 3], [10, 6], [5, 11], [13, 13]]) rect(g, '#d8e4f4', x, y, 2, 1); }),
  sandside: () => px('sandside', (g) => { rect(g, '#e8c888', 0, 0, 16, 16); for (const [x, y] of [[2, 3], [9, 7], [5, 12], [13, 10]]) rect(g, '#c8a868', x, y, 2, 1); }),
});
const ATLAS_KEYS = ['dirt', 'grass', 'grasstop', 'brick', 'q', 'used', 'wood', 'cloud', 'note', 'lava', 'stone', 'sand', 'plank', 'cannon', 'log', 'logtop', 'leaves', 'wall', 'roof', 'spade', 'snow', 'sandside', 'checker'];
let ATLAS = null;
function atlas() {
  if (ATLAS) return ATLAS;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  ATLAS_KEYS.forEach((k, i) => g.drawImage(TEX[k]().image, (i % 8) * 16, Math.floor(i / 8) * 16));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  ATLAS = { tex: t, uv: Object.fromEntries(ATLAS_KEYS.map((k, i) => { const e = 0.002, u0 = (i % 8) / 8 + e, u1 = (i % 8 + 1) / 8 - e, r = Math.floor(i / 8), v1 = 1 - r / 4 - e, v0 = 1 - (r + 1) / 4 + e; return [k, [u0, v0, u1, v1]]; })) };
  return ATLAS;
}
// the texture for each face of each kind of block (0 +x, 1 -x, 2 top, 3 bottom, 4 +z, 5 -z)
function faceKey(L, t, x, y, z, f) {
  switch (t) {
    case T.GROUND: { const above = tileAt(L, x, y + 1, z); if (isSolid(above) && above !== T.PIPE && above !== T.PIPETOP) return 'dirt'; return f === 2 ? 'grasstop' : f === 3 ? 'dirt' : 'grass'; }
    case T.SAND: return f === 2 ? 'sand' : 'sandside';
    case T.LOG: return f === 2 || f === 3 ? 'logtop' : 'log';
    case T.SNOW: return f === 3 ? 'dirt' : 'snow';
    case T.LEAVES: return 'leaves'; case T.WALL: return 'wall'; case T.ROOF: return 'roof'; case T.SPADE: return f === 2 ? 'spade' : 'stone';
    default: return look(L, x, y, z);
  }
}
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }, { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];
const UVC = [[0, 0], [1, 0], [1, 1], [0, 1]];
// the two directions along a face, for looking at its corners
const TAN = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
const opaque = (t) => t !== T.EMPTY && t !== T.PIPE && t !== T.PIPETOP && t !== T.WATER && t !== T.COIN && t !== T.LAVA;
export function buildWorldView(scene, G) {
  const L = G.L, group = new THREE.Group(); scene.add(group);
  const A = atlas(), CH = 16, NX = Math.ceil(L.w / CH), NZ = Math.ceil(L.d / CH);
  const landMat = new THREE.MeshLambertMaterial({ map: A.tex, vertexColors: true });
  const lavaMat = new THREE.MeshLambertMaterial({ map: TEX.lava(), emissive: '#ff4000', emissiveIntensity: 0.6 });
  const waterMat = new THREE.MeshLambertMaterial({ color: '#3a9aff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14); coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshLambertMaterial({ color: '#ffd030', emissive: '#7a5000' });
  const chunks = new Array(NX * NZ).fill(null), dirty = new Set();
  const inside = (x, z) => x >= 0 && z >= 0 && x < L.w && z < L.d;
  const op = (x, y, z) => inside(x, z) && y >= 0 && y < L.h && opaque(L.tiles[(y * L.d + z) * L.w + x]);
  function buildChunk(cx, cz) {
    const old = chunks[cz * NX + cx]; if (old) { group.remove(old.g); old.g.traverse((o) => { if (o.geometry && o.geometry !== coinGeo) o.geometry.dispose(); }); }
    const land = { p: [], n: [], u: [], c: [], i: [] }, lava = { p: [], n: [], u: [], i: [] }, water = { p: [], n: [], i: [] }, coins = [];
    const x0 = cx * CH, z0 = cz * CH, x1 = Math.min(L.w, x0 + CH), z1 = Math.min(L.d, z0 + CH);
    for (let y = 0; y < L.h; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const t = L.tiles[(y * L.d + z) * L.w + x];
      if (t === T.EMPTY || t === T.PIPE || t === T.PIPETOP) continue;
      if (t === T.COIN) { coins.push([x, y, z]); continue; }
      if (t === T.WATER) {
        // the water: its surface, and its sides where it meets the air
        for (let f = 0; f < 6; f++) {
          if (f === 3) continue; const F = FACES[f], nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
          if (!inside(nx, nz)) continue; const nt = tileAt(L, nx, ny, nz); if (nt !== T.EMPTY && nt !== T.COIN) continue;
          const b = water.p.length / 3; for (const [a, bb, cc] of F.c) water.p.push(x + a, y + bb * 0.88, z + cc);
          water.n.push(...F.n, ...F.n, ...F.n, ...F.n); water.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }
        continue;
      }
      const isLava = t === T.LAVA;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
        if (ny < 0) continue;
        if (!inside(nx, nz)) { if (f !== 2 && y < 14) continue; }
        else { const nt = tileAt(L, nx, ny, nz); if (opaque(nt) || (isLava && nt === T.LAVA)) continue; }
        if (isLava) { if (f !== 2) continue; const b = lava.p.length / 3; F.c.forEach(([a, bb, cc], k) => { lava.p.push(x + a, y + bb * 0.85, z + cc); lava.n.push(...F.n); lava.u.push(UVC[k][0], UVC[k][1]); }); lava.i.push(b, b + 1, b + 2, b, b + 2, b + 3); continue; }
        const key = faceKey(L, t, x, y, z, f); if (!key) continue; const [u0, v0, u1, v1] = A.uv[key];
        const b = land.p.length / 3, ao = [], [ta, tb] = TAN[f], sh = [0.86, 0.86, 1, 0.62, 0.92, 0.78][f];
        F.c.forEach((corner, k) => {
          land.p.push(x + corner[0], y + corner[1], z + corner[2]); land.n.push(...F.n); land.u.push(UVC[k][0] ? u1 : u0, UVC[k][1] ? v1 : v0);
          // ambient occlusion: how many of the three blocks round this corner (on the open side) are solid
          const d = [0, 0, 0], e = [0, 0, 0]; d[ta] = corner[ta] ? 1 : -1; e[tb] = corner[tb] ? 1 : -1;
          const s1 = op(nx + d[0], ny + d[1], nz + d[2]), s2 = op(nx + e[0], ny + e[1], nz + e[2]), s3 = op(nx + d[0] + e[0], ny + d[1] + e[1], nz + d[2] + e[2]);
          const v = s1 && s2 ? 0 : 3 - (s1 + s2 + s3); ao.push(v);
          const k2 = t === T.CLOUD ? 1 : (0.52 + v * 0.16) * sh; land.c.push(k2, k2, k2);
        });
        // turn the quad so the darker corners blend the right way
        if (ao[0] + ao[2] < ao[1] + ao[3]) land.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b); else land.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    }
    const g = new THREE.Group();
    const mk = (d, m, uv = true, col = false) => { if (!d.i.length) return null; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3)); if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(d.u, 2)); if (col) geo.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3)); geo.setIndex(d.i); geo.computeBoundingSphere(); const m2 = new THREE.Mesh(geo, m); g.add(m2); return m2; };
    const lm = mk(land, landMat, true, true); if (lm) { lm.castShadow = true; lm.receiveShadow = true; }
    mk(lava, lavaMat); const wm = mk(water, waterMat, false); if (wm) wm.renderOrder = 2;
    let cm = null; if (coins.length) { cm = new THREE.InstancedMesh(coinGeo, coinMat, coins.length); cm.userData.list = coins; cm.castShadow = true; g.add(cm); }
    group.add(g); chunks[cz * NX + cx] = { g, coins: cm, cx: x0 + CH / 2, cz: z0 + CH / 2 };
  }
  // pipes, round
  for (const p of G.def.pipes || []) group.add(pipeMesh(p.x, p.z, p.base, p.hgt));
  // the sea beyond the island, and clouds far off
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: '#2a7ad8' })); sea.rotation.x = -Math.PI / 2; sea.position.set(L.w / 2, 16.85, L.d / 2); group.add(sea);
  const sky = new THREE.Group(), r = mulberry(77); group.add(sky);
  for (let i = 0; i < 60; i++) { const cg = new THREE.Group(); for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(3 + r() * 3, 10, 8), cmat('#ffffff', '#c0d0e0')); s.position.set(k * 4, (k % 2) * 1.5, r() * 2); cg.add(s); } cg.position.set(-200 + r() * (L.w + 400), 74 + r() * 30, -200 + r() * (L.d + 400)); sky.add(cg); }
  // the finish lines with their spinning card boxes, and the checkpoint flags
  const goals = (G.goals || []).map((gl) => {
    const gx = gl.x + 0.8, dd = gl.z1 - gl.z0;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1, dd), new THREE.MeshLambertMaterial({ map: (() => { const t = TEX.checker().clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, dd); t.needsUpdate = true; return t; })() }));
    line.rotation.x = -Math.PI / 2; line.position.set(gx, gl.y - 0.78, gl.z0 + dd / 2); group.add(line);
    for (const z of [gl.z0 - 0.2, gl.z1 + 0.2]) { const post = box(0.25, 6, 0.25, '#f8f8f8', gx, gl.y - 0.8 + 3, z); post.castShadow = true; group.add(post); }
    group.add(box(0.25, 0.25, dd + 0.6, '#f8f8f8', gx, gl.y + 5, gl.z0 + dd / 2));
    const m = new THREE.Mesh(BOX, [0, 1, 2, 3, 4, 5].map(() => new THREE.MeshLambertMaterial({ map: cardTex('mush'), emissive: '#303030' }))); m.scale.setScalar(1.4); m.position.set(gx, gl.y + 3.6, gl.z + 0.5); m.castShadow = true; group.add(m);
    return { gl, m, k: '' };
  });
  const flags = (G.checks || []).filter((c) => !c.start).map((c) => { const f = new THREE.Group(), cloth = box(0.9, 0.6, 0.05, '#9a9aa8', 0.5, 2.6, 0); f.add(box(0.12, 3, 0.12, '#e8e8e8', 0, 1.5, 0), cloth); f.position.set(c.x + 0.5, c.y, c.z0 - 0.5); f.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(f); return { c, cloth }; });
  // signs: names over pipes and course starts
  const signs = (G.def.signs || []).map((s) => { const sp = labelSprite(Array.isArray(s.text) ? s.text : [s.text, s.text]); sp.position.set(s.x, s.y, s.z); group.add(sp); return { s, sp }; });
  // build what is near first, the rest a few chunks a frame
  const order = []; for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) order.push([cx, cz]);
  let queue = order.slice();
  const api = {
    group, signs, ready: 0, total: order.length,
    prime(x, z) { queue = order.filter(([cx, cz]) => !chunks[cz * NX + cx]).sort((a, b) => Math.hypot(a[0] * CH + 8 - x, a[1] * CH + 8 - z) - Math.hypot(b[0] * CH + 8 - x, b[1] * CH + 8 - z)); },
    // a block changed: rebuild its chunk (and the neighbour's, if it sits on the edge)
    touch(x, z) { const cx = Math.floor(x / CH), cz = Math.floor(z / CH); dirty.add(cx + ',' + cz); if (x % CH === 0 && cx > 0) dirty.add(cx - 1 + ',' + cz); if (x % CH === CH - 1 && cx < NX - 1) dirty.add(cx + 1 + ',' + cz); if (z % CH === 0 && cz > 0) dirty.add(cx + ',' + (cz - 1)); if (z % CH === CH - 1 && cz < NZ - 1) dirty.add(cx + ',' + (cz + 1)); },
    work(budgetMs = 8) {
      const t0 = performance.now();
      for (const k of dirty) { const [cx, cz] = k.split(',').map(Number); if (chunks[cz * NX + cx]) buildChunk(cx, cz); } dirty.clear();
      while (queue.length && performance.now() - t0 < budgetMs) { const [cx, cz] = queue.shift(); if (!chunks[cz * NX + cx]) { buildChunk(cx, cz); api.ready++; } }
    },
    update(t, cam, info) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t * 3);
      for (const c of chunks) { if (!c) continue; const d = Math.hypot(c.cx - cam.x, c.cz - cam.z); c.g.visible = d < 240; if (c.coins && d < 64) { c.coins.userData.list.forEach(([x, y, z], i) => { p.set(x + 0.5, y + 0.5, z + 0.5); m4.compose(p, q, sc); c.coins.setMatrixAt(i, m4); }); c.coins.instanceMatrix.needsUpdate = true; } }
      lavaMat.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.15;
      for (const g of goals) { const k = info.done[g.gl.region] && !g.gl.passed ? 'star' : cardAt(t); if (k !== g.k) { g.k = k; g.m.material.forEach((mm) => { mm.map = cardTex(k); mm.needsUpdate = true; }); } g.m.rotation.y = t * 1.5; }
      for (const f of flags) { const on = info.respawn === f.c.at; if (f.on !== on) { f.on = on; f.cloth.material = cmat(on ? '#ff4a6a' : '#9a9aa8'); } }
      for (const s of signs) s.sp.visible = Math.hypot(s.s.x - cam.x, s.s.z - cam.z) < 70;
      sky.position.x = Math.sin(t * 0.01) * 20;
    },
  };
  return api;
}
// a name on a little wooden board, always facing you
function labelSprite([zh, en]) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#7a4a1a'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#e8b070'; g.fillRect(4, 4, 248, 56);
  g.fillStyle = '#3a1a08'; g.textAlign = 'center'; g.font = '900 26px "Noto Sans TC", sans-serif'; g.fillText(zh, 128, 30); g.font = '700 16px "Lilita One", sans-serif'; g.fillText(en, 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); sp.scale.set(4, 1, 1); return sp;
}
// a top-down picture of the whole island for the map screen
export function worldMapImage(W0) {
  const c = document.createElement('canvas'); c.width = W0.w; c.height = W0.d; const g = c.getContext('2d'), img = g.createImageData(W0.w, W0.d);
  const COL = { [T.GROUND]: [90, 190, 80], [T.SAND]: [240, 216, 152], [T.STONE]: [140, 140, 152], [T.SNOW]: [244, 248, 255], [T.LEAVES]: [40, 140, 60], [T.LOG]: [40, 140, 60], [T.WATER]: [50, 130, 230], [T.LAVA]: [255, 90, 20], [T.CLOUD]: [255, 255, 255], [T.PLANK]: [176, 122, 64], [T.WALL]: [248, 240, 220], [T.ROOF]: [232, 48, 42], [T.SPADE]: [42, 154, 74], [T.PIPETOP]: [42, 184, 42], [T.BRICK]: [200, 100, 30], [T.HARD]: [232, 176, 112] };
  for (let z = 0; z < W0.d; z++) for (let x = 0; x < W0.w; x++) {
    let col = [42, 122, 216], hgt = 0;
    for (let y = W0.h - 1; y >= 0; y--) { const t = W0.tiles[(y * W0.d + z) * W0.w + x]; if (t !== T.EMPTY && t !== T.COIN) { col = COL[t] || [200, 180, 140]; hgt = y; break; } }
    const k = 0.75 + Math.min(0.4, hgt / 120), i = (z * W0.w + x) * 4; img.data[i] = Math.min(255, col[0] * k); img.data[i + 1] = Math.min(255, col[1] * k); img.data[i + 2] = Math.min(255, col[2] * k); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
