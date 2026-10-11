import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './style.css';
import * as THREE from 'three';
import { World, B } from './world.js';
import { Director, zoneOf } from './director.js';
import { Post } from './post.js';
import { UI, chapterOf } from './ui.js';
import { Robot } from './robot.js';
import { CampusScreen } from './screen.js';
import { Hologram } from './holo.js';
import { PANELS } from './content.js';

const qs = new URLSearchParams(location.search);
const CAPTURE = qs.has('capture');

class App {
  constructor() {
    const canvas = document.getElementById('gl');
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor('#dfe7ef', 1);
    this.renderer = renderer;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, Number(qs.get('pr')) || 1.5);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.3, 4500);
    this.clock = new THREE.Clock();
    this.story = false;
    this.history = [];
    this.zone = null;
  }

  async init() {
    this.world = new World(this.renderer);
    this.ui = new UI(this);
    await this.world.load((p) => this.ui.progress(p));
    const A = this.world.anchors;
    this.FZ = A.OFFICE_CENTER.y - 1.6;
    this.LZ = A.LOBBY_FLOOR ? A.LOBBY_FLOOR.y : A.LOBBY_SCREEN.y - 4.75;
    this.presets = this.makePresets();

    this.robot = new Robot(this.world.robotGltf, this.world);
    this.robot.placeOnFloor(this.FZ);
    this.robot.setPatrol([
      { x: 12.92, y: 33.21, wait: 5.5, face: Math.PI * 0.82 },
      { x: 11.8, y: 46.5, wait: 1.2 },
      { x: 13.2, y: 51.0, wait: 3.0 },
      { x: 13.4, y: 41.0, wait: 1.0 },
    ]);
    this.world.scene.add(this.robot.group);
    this.world.groups.office.push(this.robot.group);

    this.holo = new Hologram(this.world, this.FZ);
    this.world.groups.office.push(this.holo.group);
    this.screen = new CampusScreen(this.world);
    this.post = new Post(this.renderer);
    this.director = new Director(this.camera, this.canvas, { FZ: this.FZ, LZ: this.LZ });
    this.director.still = CAPTURE && !qs.has('drift');
    this.director.onPreset = (z) => this.setZone(z);
    this.director.onDepart = (from, to) => {
      this.ui.setState(to, { travelling: true });
      this.holo.show(false);
    };
    this.director.onArrive = (s) => {
      this.ui.setState(s);
      this.holo.show(s === 'ai-sem');
      this.screen.select(s.startsWith('b-') ? s : null, this.ui.lang);
      this.storyAt = this.time + 9;
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.back();
      if (e.key === ' ') this.director.skip();
    });

    // dashboard snapshot for the lobby display (exterior preset, shadows ready)
    this.setZone('exterior');
    this.renderer.shadowMap.needsUpdate = true;
    this.screen.capture(this.renderer, this.world.scene);

    const start = qs.get('state') || 'campus';
    this.time = 0;
    this.director.jump(PANELS[start] || ['campus', 'hq', 'twin', 'iot', 'ai'].includes(start) ? start : 'campus');
    if (qs.get('lang') === 'zh') this.ui.setLang('zh');
    this.ui.refreshMode();
    this.ui.loaded();
    window.__app = this;
    this.THREE = THREE;
    window.__ready = true;
    if (!qs.has('manual')) this.renderer.setAnimationLoop(() => this.frame());
  }

  anchor(name) {
    if (name === 'ROBOT_HEAD') return this.robot.headAnchor.clone().add(new THREE.Vector3(0, 0.12, 0));
    if (name === 'ROBOT_HAND') return this.robot.handAnchor.clone().add(new THREE.Vector3(0, 0.25, 0));
    if (name === 'HOLO_LABEL') return this.holo.labelAnchor;
    return this.world.anchors[name];
  }

  makePresets() {
    const FZ = this.FZ, LZ = this.LZ;
    return {
      exterior: {
        groups: { exterior: true, lobby: true, office: false, shell: true, podium: true }, env: 'ext', envIntensity: 0.35,
        sun: 4.4, hemi: 1.1, hemiSky: '#7f9fdc', hemiGround: '#c3cbd5', fog: [700, 4000], shadow: { c: B(0, 20, 10), half: 250, depth: 700, nb: 0.6 }, refl: { tower: true },
        exposure: 0.6, saturation: 1.22, bloom: 0.18, bloomThreshold: 0.92, clear: '#dfe7ef', near: 1.0,
      },
      lobby: {
        groups: { exterior: true, lobby: true, office: false, shell: false, podium: true }, env: 'int', envIntensity: 0.3,
        sun: 1.4, hemi: 1.55, hemiSky: '#ffffff', hemiGround: '#d8dadd', fog: [400, 1600],
        shadow: { c: B(2, 34, LZ + 4), half: 60, depth: 400, nb: 0.15 }, refl: { lobby: true }, exposure: 0.34, screenGain: 2.6, bloom: 0.5, bloomThreshold: 2.2, clear: '#dfe7ef', near: 0.15,
      },
      office: {
        groups: { exterior: true, lobby: false, office: true, shell: false, podium: false }, env: 'int', envIntensity: 0.6,
        sun: 2.0, hemi: 2.2, hemiSky: '#ffffff', hemiGround: '#9a9da0', fog: [500, 1700],
        shadow: { c: B(2, 43, FZ + 1), half: 30, depth: 300, nb: 0.04 }, refl: { office: true }, exposure: 0.6, bloom: 0.28, bloomThreshold: 2.2, clear: '#dfe7ef', near: 0.08,
      },
    };
  }

  setZone(z) {
    if (this.zone === z) return;
    this.zone = z;
    const p = this.presets[z];
    this.world.applyPreset(p);
    // the west pier would block the office cut-away / sits outside the lobby view
    const pier = this.world.meshes.tower_pier;
    if (pier) pier.visible = z === 'exterior';
    this.post && (this.post.bloom.strength = p.bloom);
    // threshold is in linear HDR units: only emissive strips / sun glints should bloom, not lit white walls
    this.post && (this.post.bloom.threshold = p.bloomThreshold ?? 1.6);
    this.post && (this.post.grade.exposure.value = p.exposure);
    this.screen && this.screen.setGain(p.screenGain ?? 1.1);
    this.post && (this.post.grade.saturation.value = p.saturation ?? 1.08);
    this.renderer.setClearColor(p.clear, 1);
    this.camera.near = p.near;
    this.camera.far = 4500;
    this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.needsUpdate = true;
  }

  go(state) {
    if (!state || state === this.director.state) return;
    if (this.director.anim) return;
    this.history.push(this.director.state);
    this.director.go(state);
  }

  back() {
    if (this.director.anim) return;
    const s = this.director.state;
    const p = PANELS[s];
    let to = p?.back;
    if (!to) {
      const order = ['campus', 'hq', 'twin', 'iot', 'ai'];
      const i = order.indexOf(chapterOf(s));
      to = i > 0 ? order[i - 1] : null;
    }
    if (to) this.director.go(to);
  }

  toggleStory() {
    this.story = !this.story;
    this.storyAt = this.time + 2;
    this.ui.refreshMode();
  }

  toggleExplore() {
    this.director.explore = !this.director.explore;
    this.director.resetUser();
    this.ui.refreshMode();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h, this.pixelRatio);
    this.world.setSize(w * this.pixelRatio, h * this.pixelRatio);
  }

  frame(fixedDt) {
    const dt = fixedDt ?? Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    if (this.story && !this.director.anim && this.time > this.storyAt) {
      const order = ['campus', 'hq', 'twin', 'iot', 'ai'];
      const i = order.indexOf(chapterOf(this.director.state));
      this.go(order[(i + 1) % order.length]);
    }
    this.director.update(dt);
    this.robot.update(this.zone === 'office' ? dt : 0);
    if (this.zone === 'office') this.renderer.shadowMap.needsUpdate = true;
    this.holo.update(dt);
    this.world.update(dt, this.camera);
    this.camera.updateMatrixWorld();
    this.world.updateReflections(this.camera);
    const d = this.director.dof;
    Object.assign(this.post.dof, { amount: d.amount, focus: d.focus, range: d.range, nearRange: d.nearRange, band: d.band });
    this.post.grade.whiteMix.value = this.director.veil * 0.92;
    this.post.grade.time.value = this.time;
    this.post.render(this.world.scene, this.camera);
    this.ui.updateHotspots(this.camera, this.w, this.h);
  }
}

const app = new App();
app.init().catch((e) => {
  console.error(e);
  window.__error = String(e && e.stack ? e.stack : e);
});
