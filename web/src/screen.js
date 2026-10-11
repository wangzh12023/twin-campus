// Lobby wall display: a live-rendered aerial snapshot of the campus composed with dashboard chrome.
import * as THREE from 'three';
import { B } from './world.js';
import { drawLogo } from './textures.js';

const W = 1280, H = 720;

export class CampusScreen {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.snapshot = null;
    this.selected = null;
    this.lang = 'en';
    this.labelUV = {};
    const mesh = world.meshes.screen_campus;
    mesh.material = new THREE.MeshBasicMaterial({ map: this.tex, color: new THREE.Color(1, 1, 1).multiplyScalar(1.1), toneMapped: true });
    this.mesh = mesh;
    mesh.geometry.computeBoundingBox();
    this.box = mesh.geometry.boundingBox.clone();
  }

  // emissive level of the panel; the zones grade with different exposures
  setGain(g) {
    this.mesh.material.color.setScalar(g);
  }

  // render the 3D campus once from a dashboard-like camera
  capture(renderer, scene) {
    const iw = 1180, ih = 540;
    const rt = new THREE.WebGLRenderTarget(iw, ih, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const cam = new THREE.PerspectiveCamera(30, iw / ih, 2, 3000);
    cam.position.copy(B(10, -120, 92));
    cam.lookAt(B(2, 18, 6));
    cam.updateMatrixWorld();
    const prevTM = renderer.toneMapping;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, cam);
    const px = new Uint8Array(iw * ih * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, iw, ih, px);
    renderer.setRenderTarget(null);
    renderer.toneMapping = prevTM;
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = iw; c.height = ih;
    const g = c.getContext('2d');
    const id = g.createImageData(iw, ih);
    for (let y = 0; y < ih; y++) {
      const src = (ih - 1 - y) * iw * 4;
      id.data.set(px.subarray(src, src + iw * 4), y * iw * 4);
    }
    g.putImageData(id, 0, 0);
    this.snapshot = c;
    // label anchors (projected into the snapshot)
    const anchors = {
      'b-left': B(-58, -6, 34), 'b-hq': B(4, 40, 100), 'b-right': B(58, 22, 26), 'b-ring': B(-4, -12, 8),
    };
    const off = { 'b-left': [0.02, 0.06], 'b-hq': [0.09, -0.01], 'b-right': [0.1, 0.02], 'b-ring': [0.04, 0.1] };
    this.imgRect = { x: 50, y: 112, w: iw, h: ih };
    for (const [k, p] of Object.entries(anchors)) {
      const v = p.clone().project(cam);
      const u = (this.imgRect.x + (v.x * 0.5 + 0.5) * iw) / W + off[k][0];
      const vv = (this.imgRect.y + (1 - (v.y * 0.5 + 0.5)) * ih) / H + off[k][1];
      this.labelUV[k] = [u, vv];
    }
    this.draw();
  }

  uvToWorld(u, v) {
    // screen quad lies on a plane of constant Blender y (three z); x spans box.min.x..max.x
    const b = this.box;
    const m = this.world.meshes.screen_campus.matrixWorld;
    const x = b.min.x + (b.max.x - b.min.x) * u;
    const y = b.max.y - (b.max.y - b.min.y) * v;
    return new THREE.Vector3(x, y, b.min.z - 0.02).applyMatrix4(m);
  }

  select(id, lang) {
    this.selected = id;
    this.lang = lang;
    this.draw();
  }

  draw() {
    const g = this.g;
    g.fillStyle = '#0f1d2b';
    g.fillRect(0, 0, W, H);
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#13283b');
    grd.addColorStop(1, '#0c1824');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    const zh = this.lang === 'zh';
    const titles = {
      null: zh ? '智慧园区 · 数字孪生' : 'Smart Campus · Digital Twin',
      'b-left': zh ? '西侧附楼 · 工作室' : 'West annex · Studios',
      'b-hq': zh ? '总部大楼 · 核心' : 'HQ tower · Core',
      'b-right': zh ? '东翼楼 · 运营' : 'East wing · Operations',
      'b-ring': zh ? '圆环广场 · 公共空间' : 'Ring plaza · Public space',
    };
    g.fillStyle = '#e8f0f7';
    g.font = '600 30px "Segoe UI", Arial, sans-serif';
    g.fillText(titles[this.selected] || titles.null, 52, 58);
    g.fillStyle = 'rgba(200,215,228,0.6)';
    g.font = '400 15px "Segoe UI", Arial, sans-serif';
    g.fillText(zh ? '概念演示 · 无实时数据' : 'Concept demonstration · No live telemetry', 52, 88);
    if (this.snapshot) {
      const r = this.imgRect;
      g.save();
      g.beginPath();
      g.rect(r.x, r.y, r.w, r.h);
      g.clip();
      g.drawImage(this.snapshot, r.x, r.y, r.w, r.h);
      // logo printed on the rendered tower crown
      drawLogo(g, r.x + r.w * 0.47, r.y + 30, 1.05, '#e9f5ff', '#bfe4ff');
      g.restore();
    }
    // selection overlay
    if (this.selected) {
      const r = this.imgRect;
      const sel = g.createLinearGradient(0, r.y + r.h - 210, 0, r.y + r.h);
      sel.addColorStop(0, 'rgba(12,24,36,0)');
      sel.addColorStop(0.35, 'rgba(12,24,36,0.82)');
      sel.addColorStop(1, 'rgba(12,24,36,0.92)');
      g.fillStyle = sel;
      g.fillRect(r.x, r.y + r.h - 210, r.w, 210);
      g.fillStyle = '#e6eef5';
      g.font = '600 20px "Segoe UI", Arial, sans-serif';
      g.fillText(zh ? '楼宇概念界面' : 'Building concept interface', r.x + 24, r.y + r.h - 120);
      g.fillStyle = 'rgba(205,220,232,0.7)';
      g.font = '400 14px "Segoe UI", Arial, sans-serif';
      g.fillText(zh ? '概念视图 / 可编辑' : 'Concept view / Editable', r.x + 24, r.y + r.h - 96);
      const cols = [[zh ? '用途' : 'FUNCTION', zh ? '示意空间' : 'Areas space'], [zh ? '状态' : 'STATUS', zh ? '演示在线' : 'Demo online']];
      cols.forEach(([a, b], i) => {
        g.fillStyle = 'rgba(160,185,205,0.75)';
        g.font = '600 11px "Segoe UI", Arial, sans-serif';
        g.fillText(a, r.x + 24 + i * 210, r.y + r.h - 62);
        g.fillStyle = '#dfe9f2';
        g.font = '500 15px "Segoe UI", Arial, sans-serif';
        g.fillText(b, r.x + 24 + i * 210, r.y + r.h - 42);
      });
      g.fillStyle = 'rgba(170,190,210,0.55)';
      g.font = '500 11px "Segoe UI", Arial, sans-serif';
      g.fillText('SPACES · TOPOLOGY · SEMANTICS · STATE', r.x + 24, r.y + r.h - 16);
    }
    g.fillStyle = 'rgba(190,206,220,0.75)';
    g.font = '600 13px "Segoe UI", Arial, sans-serif';
    g.fillText(zh ? '空间 · 设备 · 状态 · 协同' : 'SPACE · DEVICES · STATE · COLLABORATION', 52, H - 40);
    this.tex.needsUpdate = true;
  }
}
