// Procedural canvas textures (no external assets).
import * as THREE from 'three';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function tex(c, { repeat = 1, srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// plaza paving: 0.6 x 1.2 m stone slabs in a stretcher bond, texture covers 4.8 m
export function pavingTexture() {
  const [c, g] = canvas(1024, 1024);
  const r = rng(11);
  const px = 1024 / 4.8;
  g.fillStyle = '#e9ecef';
  g.fillRect(0, 0, 1024, 1024);
  const tw = 1.2 * px, th = 0.6 * px;
  for (let j = 0; j < 8; j++) {
    for (let i = -1; i < 5; i++) {
      const x = i * tw + (j % 2) * tw * 0.5, y = j * th;
      const v = 228 + Math.floor(r() * 14);
      g.fillStyle = `rgb(${v - 2},${v + 1},${v + 4})`;
      g.fillRect(x + 1.5, y + 1.5, tw - 3, th - 3);
    }
  }
  g.strokeStyle = 'rgba(150,160,172,0.55)';
  g.lineWidth = 2;
  for (let j = 0; j <= 8; j++) {
    g.beginPath(); g.moveTo(0, j * th); g.lineTo(1024, j * th); g.stroke();
  }
  for (let j = 0; j < 8; j++) {
    for (let i = -1; i < 5; i++) {
      const x = i * tw + (j % 2) * tw * 0.5;
      g.beginPath(); g.moveTo(x, j * th); g.lineTo(x, (j + 1) * th); g.stroke();
    }
  }
  return tex(c, { repeat: 1 / 4.8 });
}

// sidewalks / kerbs: larger square slabs
export function sidewalkTexture() {
  const [c, g] = canvas(512, 512);
  const r = rng(5);
  g.fillStyle = '#e6e9ec';
  g.fillRect(0, 0, 512, 512);
  const n = 4, s = 512 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = 224 + Math.floor(r() * 12);
    g.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
    g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
  }
  return tex(c, { repeat: 1 / 6 });
}

// asphalt with faint grain
export function roadTexture() {
  const [c, g] = canvas(512, 512);
  const r = rng(3);
  g.fillStyle = '#a9b0b8';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 150 + Math.floor(r() * 40);
    g.fillStyle = `rgba(${v},${v + 4},${v + 10},0.25)`;
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
  return tex(c, { repeat: 1 / 8 });
}

// lobby wall: large stone panels 1.6 x 1.2 m with thin dark joints
export function lobbyWallTexture() {
  const [c, g] = canvas(1024, 1024);
  const r = rng(21);
  const pw = 1.6, ph = 1.2, span = 6.4;
  const s = 1024 / span;
  g.fillStyle = '#d9dadb';
  g.fillRect(0, 0, 1024, 1024);
  for (let j = 0; j < span / ph + 1; j++) for (let i = 0; i < span / pw; i++) {
    const v = 214 + Math.floor(r() * 10);
    const grad = g.createLinearGradient(i * pw * s, 0, (i + 1) * pw * s, 0);
    grad.addColorStop(0, `rgb(${v},${v + 1},${v + 2})`);
    grad.addColorStop(1, `rgb(${v - 5},${v - 4},${v - 3})`);
    g.fillStyle = grad;
    g.fillRect(i * pw * s, j * ph * s, pw * s, ph * s);
  }
  g.fillStyle = 'rgba(120,124,128,0.9)';
  for (let i = 0; i <= span / pw; i++) g.fillRect(i * pw * s - 1.5, 0, 3, 1024);
  for (let j = 0; j <= Math.ceil(span / ph); j++) g.fillRect(0, j * ph * s - 1.5, 1024, 3);
  return tex(c, { repeat: 1 / span });
}

// polished light floors (lobby / office): large tiles with subtle marble cloud
export function polishedFloorTexture(seed = 1, base = [214, 216, 218], tile = 1.2, span = 4.8, veins = true) {
  const [c, g] = canvas(1024, 1024);
  const r = rng(seed);
  const s = 1024 / span;
  g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
  g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 220; k++) {
    const x = r() * 1024, y = r() * 1024, rad = 30 + r() * 140;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const d = (r() - 0.5) * 18;
    gr.addColorStop(0, `rgba(${base[0] + d},${base[1] + d},${base[2] + d},0.35)`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  if (veins) {
    g.strokeStyle = 'rgba(150,152,156,0.18)';
    for (let k = 0; k < 26; k++) {
      g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath();
      let x = r() * 1024, y = r() * 1024;
      g.moveTo(x, y);
      for (let t = 0; t < 12; t++) {
        x += (r() - 0.3) * 60; y += (r() - 0.5) * 50;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.fillStyle = 'rgba(160,163,167,0.45)';
  const n = Math.round(span / tile);
  for (let i = 0; i <= n; i++) {
    g.fillRect(i * tile * s - 1, 0, 2, 1024);
    g.fillRect(0, i * tile * s - 1, 1024, 2);
  }
  return tex(c, { repeat: 1 / span });
}

// office monitor wallpaper: white with the Twin Campus logotype
export function monitorTexture() {
  const [c, g] = canvas(512, 320);
  const grd = g.createLinearGradient(0, 0, 512, 320);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#eef3f7');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 320);
  drawLogo(g, 70, 132, 2.2);
  return tex(c, { aniso: 4 });
}

export function drawLogo(g, x, y, k = 1, dark = '#1d5e86', light = '#5aa2c8') {
  // icon: a solid rounded tile and its offset translucent twin
  const tile = (tx, ty, s) => { g.beginPath(); g.roundRect(tx, ty, s, s, s * 0.21); g.fill(); };
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.fillStyle = dark;
  tile(0, 0, 15);
  g.globalAlpha = 0.85;
  g.fillStyle = light;
  tile(9, 6, 15);
  g.globalAlpha = 1;
  g.font = '700 19px "Segoe UI", Arial, sans-serif';
  g.fillStyle = dark;
  g.textBaseline = 'alphabetic';
  g.fillText('Twin', 34, 20);
  const w = g.measureText('Twin').width;
  g.font = '400 19px "Segoe UI", Arial, sans-serif';
  g.fillStyle = light;
  g.fillText('Campus', 34 + w + 1, 20);
  g.restore();
}

// soft corridor view behind the lobby slot
export function backlightTexture() {
  const [c, g] = canvas(128, 512);
  const grd = g.createLinearGradient(0, 512, 0, 0);
  grd.addColorStop(0, '#dfe7ee');
  grd.addColorStop(0.35, '#f4f8fb');
  grd.addColorStop(0.7, '#cfe0ef');
  grd.addColorStop(1, '#a9c4dc');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 512);
  g.fillStyle = 'rgba(80,110,90,0.55)';
  g.beginPath(); g.ellipse(40, 360, 26, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(92, 372, 20, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(90,100,110,0.5)';
  g.fillRect(38, 380, 3, 70);
  g.fillRect(90, 386, 3, 64);
  return tex(c, { aniso: 4 });
}

// glass box-floor rendering of interior ceiling lights for the annex buildings
export function annexInteriorTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#7fa6c9';
  g.fillRect(0, 0, 256, 256);
  return tex(c);
}
