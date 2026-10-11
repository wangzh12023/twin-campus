// World: loads the Blender exports, assigns tuned materials, builds instanced vegetation/cars,
// lighting, environment maps and per-state visibility groups.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createGlass, attachPlanar } from './glass.js';
import { createSky } from './sky.js';
import { PlanarReflection, addFloorReflection } from './reflection.js';
import * as T from './textures.js';

// Blender (x east, y north, z up)  ->  three (x, z, -y)
export const B = (x, y, z) => new THREE.Vector3(x, z, -y);

const LOBBY = ['lobby_mullion', 'lobby_wall', 'lobby_floor', 'lobby_ceiling', 'ceiling_slot', 'column_dark', 'led', 'led_cove', 'desk_white',
  'plinth_dark', 'gate_metal', 'gate_glass', 'tv_bezel', 'screen_campus', 'backlight', 'lobby_pot'];
const TOWER_SHELL = ['glass_tower', 'glass_tower_low', 'tower_frame', 'tower_slab', 'tower_light', 'tower_logo', 'crown_text',
  'tower_slab_office', 'tower_light_office'];
const TOWER_PODIUM = ['glass_lobby', 'tower_frame_dark', 'sign_brand'];

export class World {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.anchors = {};
    this.groups = { exterior: [], lobby: [], office: [], shell: [], podium: [] };
    this.glassMats = [];
    this.reflections = [];
    this.time = 0;
  }

  async load(onProgress) {
    const loader = new GLTFLoader();
    const prog = { campus: 0, robot: 0 };
    const report = () => onProgress && onProgress(prog.campus * 0.85 + prog.robot * 0.15);
    const get = (url, key) => new Promise((res, rej) => loader.load(url, res, (e) => {
      if (e.total) { prog[key] = e.loaded / e.total; report(); }
    }, rej));
    const [campus, robot, inst] = await Promise.all([
      get('models/campus.glb', 'campus'),
      get('models/robot.glb', 'robot'),
      fetch('models/campus_instances.json').then((r) => r.json()),
    ]);
    this.robotGltf = robot;
    this.setupLights();
    this.setupEnv();
    this.setupCampus(campus.scene, inst);
    return this;
  }

  // ------------------------------------------------------------------ lights / env
  setupLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight('#a9c1ee', '#e9ebee', 1.35);
    s.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff4e6', 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    sun.shadow.radius = 2.5;
    this.sun = sun;
    // sun from the north-east, ~40° up (shadows fall towards the plaza / camera)
    this.sunDir = B(0.62, 0.52, 1.04).normalize();   // ~52 deg elevation: the reference keeps the east boulevard sunlit
    s.add(sun, sun.target);
    this.fitShadow(B(0, 10, 0), 260, 600);
    this.sky = createSky();
    s.add(this.sky);
    this.fog = new THREE.Fog('#bccfe8', 700, 4000);
    s.fog = this.fog;
  }

  fitShadow(center, half, depth = 600, normalBias = 0.6) {
    const sun = this.sun;
    sun.target.position.copy(center);
    sun.position.copy(center).addScaledVector(this.sunDir, depth * 0.5);
    const c = sun.shadow.camera;
    c.left = -half; c.right = half; c.top = half; c.bottom = -half;
    c.near = 1; c.far = depth;
    c.updateProjectionMatrix();
    sun.shadow.normalBias = normalBias;
    sun.target.updateMatrixWorld();
    sun.updateMatrixWorld();
    sun.shadow.needsUpdate = true;
  }

  setupEnv() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    // exterior: the sky dome + a pale ground disc
    const es = new THREE.Scene();
    const sky = createSky();
    sky.material.uniforms.cloudAmount.value = 0.06;
    es.add(sky);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3000, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#c9d2dc' }));
    ground.position.y = -40;
    es.add(ground);
    // a ring of white towers so glass reflects a "city"
    const tg = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const twm = new THREE.MeshBasicMaterial({ color: '#e9eef5' });
    const tws = new THREE.MeshBasicMaterial({ color: '#9fb3d3' });
    const r = mulberry(4);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = 380 + r() * 500;
      const h = 60 + r() * 220, w = 30 + r() * 50;
      const m = new THREE.Mesh(tg, r() > 0.45 ? twm : tws);
      m.position.set(Math.cos(a) * d, -40, Math.sin(a) * d);
      m.scale.set(w, h, w);
      m.rotation.y = r() * 3;
      es.add(m);
    }
    this.envExterior = pm.fromScene(es, 0.02, 1, 3000).texture;
    // interior: neutral studio room
    const room = new RoomEnvironment();
    this.envInterior = pm.fromScene(room, 0.03).texture;
    // cube for glass shader (needs a plain cube texture): render the same scene into a cube camera
    const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cc = new THREE.CubeCamera(1, 4000, crt);
    cc.position.set(0, 60, 0);
    es.add(cc);
    cc.update(this.renderer, es);
    this.cubeExterior = crt.texture;
    const crt2 = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
    const cc2 = new THREE.CubeCamera(0.1, 100, crt2);
    room.add(cc2);
    cc2.update(this.renderer, room);
    this.cubeInterior = crt2.texture;
    this.scene.environment = this.envExterior;
    this.scene.environmentIntensity = 0.55;
    pm.dispose();
  }

  // ------------------------------------------------------------------ campus
  setupCampus(root, inst) {
    root.updateMatrixWorld(true);
    const meshes = {};
    const templates = {};
    root.traverse((o) => {
      if (o.isMesh) {
        if (o.name.startsWith('TPL_')) templates[o.name] = o;
        else meshes[o.name] = o;
      } else if (o !== root && !o.isMesh && o.children.length === 0) {
        this.anchors[o.name] = o.getWorldPosition(new THREE.Vector3());
      }
    });
    this.meshes = meshes;
    this.buildMaterials(meshes);
    for (const t of Object.values(templates)) t.parent.remove(t);
    this.scene.add(root);
    this.root = root;

    for (const [name, m] of Object.entries(meshes)) {
      let g = 'exterior';
      if (LOBBY.includes(name)) g = 'lobby';
      else if (name.startsWith('office_') || name.startsWith('device_')) g = 'office';
      else if (TOWER_SHELL.includes(name)) g = 'shell';
      else if (TOWER_PODIUM.includes(name)) g = 'podium';
      this.groups[g].push(m);
      const noShadow = m.material.transparent || m.material.isShaderMaterial || m.material.isMeshBasicMaterial;
      m.castShadow = !noShadow && !['ground', 'road', 'marking', 'water', 'sidewalk', 'office_light', 'tower_light'].includes(name);
      m.receiveShadow = !noShadow;
    }
    // the office interior and lobby only receive (sun casts from the city at large scale)
    this.groups.office.forEach((m) => { m.castShadow = !m.material.transparent; });

    this.buildInstances(templates, inst);
    this.buildReflections();
  }

  buildMaterials(meshes) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const paving = T.pavingTexture();
    const side = T.sidewalkTexture();
    const road = T.roadTexture();
    const lobbyWall = T.lobbyWallTexture();
    const lobbyFloor = T.polishedFloorTexture(4, [222, 223, 224], 1.2, 4.8);
    const officeFloor = T.polishedFloorTexture(9, [226, 228, 229], 1.2, 4.8);
    this.monitorTex = T.monitorTexture();
    const backlight = T.backlightTexture();
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    for (const t of [paving, side, road, lobbyWall, lobbyFloor, officeFloor]) t.anisotropy = aniso;

    const glassTower = createGlass({
      tint: '#0b4f7a', deepTint: '#0a3f66', gridColor: '#103a52', gridSize: [1.6, 2.0], gridOffset: [-19.5, 13.1],
      gridWidth: 0.07, gridAlpha: 0.75, alphaFacing: 0.62, alphaGrazing: 0.98, reflStrength: 0.85, reflBase: 0.22, envBoost: 0.8,
    });
    const glassTowerLow = createGlass({
      tint: '#0b4f7a', deepTint: '#0a3f66', gridColor: '#12425c', gridSize: [1.6, 2.0], gridOffset: [-12.0, 13.1],
      gridWidth: 0.07, gridAlpha: 0.72, alphaFacing: 0.5, alphaGrazing: 0.97, reflStrength: 0.9, reflBase: 0.25, envBoost: 0.8,
    });
    const glassAnnex = createGlass({
      tint: '#4f8fc4', deepTint: '#3a74a8', gridColor: '#e8eef4', gridSize: [1.5, 20], gridOffset: [0, 0], gridWidth: 0.0, gridAlpha: 0.0,
      alphaFacing: 0.78, alphaGrazing: 0.98, reflStrength: 0.7, reflBase: 0.3, envBoost: 1.1, depthWrite: true,
    });
    const glassLobby = createGlass({
      tint: '#c9d9e6', deepTint: '#a9c0d3', gridAlpha: 0.0, alphaFacing: 0.06, alphaGrazing: 0.75, reflStrength: 0.85, reflBase: 0.08, envBoost: 1.0,
    });
    const glassOffice = createGlass({
      tint: '#eef4f8', deepTint: '#dfe9f0', gridAlpha: 0.0, alphaFacing: 0.05, alphaGrazing: 0.55, reflStrength: 0.7, reflBase: 0.06, envBoost: 1.0,
    });
    this.glassMats = [glassTower, glassTowerLow, glassAnnex, glassLobby, glassOffice];
    this.glass = { tower: glassTower, towerLow: glassTowerLow, annex: glassAnnex, lobby: glassLobby, office: glassOffice };
    for (const g of this.glassMats) {
      g.uniforms.envMap.value = this.cubeExterior;
      g.uniforms.sunDir.value.copy(this.sunDir);
    }
    glassOffice.uniforms.envMap.value = this.cubeInterior;

    const lobbyFloorMat = std({ map: lobbyFloor, color: '#ffffff', roughness: 0.16, metalness: 0.0, envMapIntensity: 0.7 });
    const officeFloorMat = std({ map: officeFloor, color: '#ffffff', roughness: 0.14, metalness: 0.0, envMapIntensity: 0.7 });
    this.floorMats = { lobby: lobbyFloorMat, office: officeFloorMat };

    const M = {
      bg_white: std({ color: '#f6f8fb', roughness: 0.92 }),
      white: std({ color: '#f1f4f7', roughness: 0.85 }),
      rim: std({ color: '#f1f4f7', roughness: 0.85 }),
      annex_frame: std({ color: '#f2f5f8', roughness: 0.55 }),
      tower_frame: std({ color: '#eef2f7', roughness: 0.6 }),
      tower_frame_dark: std({ color: '#3b4955', roughness: 0.45, metalness: 0.5 }),
      glass_tower: glassTower,
      glass_tower_low: glassTowerLow,
      glass_annex: glassAnnex,
      glass_lobby: glassLobby,
      glass_roof: std({ color: '#a8c6e4', roughness: 0.25, metalness: 0.1, envMapIntensity: 1.2 }),
      wood: std({ color: '#c98a52', roughness: 0.65 }),
      paving: std({ map: paving, color: '#ffffff', roughness: 0.82 }),
      forecourt: std({ map: paving, color: '#ffffff', roughness: 0.82 }),
      monolith: std({ color: '#6f8fbd', roughness: 0.5 }),
      pavilion: std({ color: '#b9c8de', roughness: 0.7 }),
      pavilion_dark: std({ color: '#14364c', roughness: 0.15, metalness: 0.2 }),
      annex_slab: std({ color: '#e9eef3', roughness: 0.7 }),
      annex_core: std({ color: '#dcc7ab', roughness: 0.7 }),
      steps: std({ color: '#eef1f4', roughness: 0.8 }),
      sidewalk: std({ map: side, color: '#ffffff', roughness: 0.88 }),
      ground: std({ color: '#dfe4ea', roughness: 0.95 }),
      road: std({ map: road, color: '#e4e8ec', roughness: 0.92 }),
      marking: std({ color: '#f7f8f9', roughness: 0.7 }),
      water: std({ color: '#1a5d8c', roughness: 0.08, metalness: 0.1, envMapIntensity: 0.5 }),
      grass: std({ color: '#9ec486', roughness: 0.95 }),
      planter: std({ color: '#f2f4f6', roughness: 0.7 }),
      ring_sculpture: std({ color: '#e6edf6', roughness: 0.18, metalness: 0.75, envMapIntensity: 2.4 }),   // polished, picks up the blue sky
      solar: std({ color: '#26476b', roughness: 0.3, metalness: 0.4 }),
      rail: new THREE.MeshPhysicalMaterial({ color: '#dfeaf3', roughness: 0.05, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
      tower_slab: std({ color: '#dfe6ec', roughness: 0.8 }),
      tower_light: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.6) }),
      tower_slab_office: std({ color: '#dfe6ec', roughness: 0.8 }),
      tower_light_office: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.6) }),
      tower_pier: std({ color: '#eef2f7', roughness: 0.6 }),
      lobby_mullion: std({ color: '#2b3239', roughness: 0.4, metalness: 0.5 }),
      office_band: std({ color: '#8d969d', roughness: 0.6 }),
      tower_logo: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(1.15) }),
      crown_text: new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9f4fb'), transparent: true, opacity: 0.8 }),
      sign_brand: std({ color: '#4e5b66', roughness: 0.45, metalness: 0.4 }),
      // lobby
      lobby_wall: std({ map: lobbyWall, color: '#ffffff', roughness: 0.5, envMapIntensity: 0.6 }),
      lobby_floor: lobbyFloorMat,
      lobby_ceiling: std({ color: '#e7e8e9', roughness: 0.85 }),
      ceiling_slot: new THREE.MeshBasicMaterial({ color: '#2a2d30', side: THREE.DoubleSide }),
      column_dark: std({ color: '#6f7780', roughness: 0.35, metalness: 0.35 }),
      led: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6e8').multiplyScalar(5.0), side: THREE.DoubleSide }),
      led_cove: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff8ee').multiplyScalar(2.6) }),
      desk_white: std({ color: '#f3f3f3', roughness: 0.22, envMapIntensity: 0.9 }),
      plinth_dark: std({ color: '#1d2023', roughness: 0.6 }),
      gate_metal: std({ color: '#89919a', roughness: 0.28, metalness: 0.7 }),
      gate_glass: new THREE.MeshPhysicalMaterial({ color: '#d4e0e8', roughness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
      tv_bezel: std({ color: '#1a2128', roughness: 0.3, metalness: 0.4 }),
      backlight: new THREE.MeshBasicMaterial({ map: backlight, color: new THREE.Color('#ffffff').multiplyScalar(1.15) }),
      lobby_pot: std({ color: '#f1f1ee', roughness: 0.5 }),
      // office
      office_floor: officeFloorMat,
      office_ceiling: std({ color: '#a8abad', roughness: 0.85 }),
      office_slab: std({ color: '#f4f6f8', roughness: 0.65 }),
      office_mullion: std({ color: '#3a4249', roughness: 0.4, metalness: 0.55 }),
      office_glass: glassOffice,
      office_frost: new THREE.MeshPhysicalMaterial({ color: '#e7eef4', roughness: 0.35, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
      office_column: std({ color: '#f2f3f4', roughness: 0.55 }),
      office_desktop: std({ color: '#f5f6f7', roughness: 0.25 }),
      office_deskside: std({ color: '#9db2c8', roughness: 0.4, metalness: 0.15 }),
      office_drawer: std({ color: '#e8eaec', roughness: 0.35 }),
      office_switch: std({ color: '#e8eaec', roughness: 0.35 }),
      office_metal: std({ color: '#c6ccd2', roughness: 0.25, metalness: 0.85 }),
      office_chair: std({ color: '#393d41', roughness: 0.6 }),
      office_chairframe: std({ color: '#1f2224', roughness: 0.35, metalness: 0.6 }),
      office_monitor: std({ color: '#1b1d1f', roughness: 0.3, metalness: 0.3 }),
      office_screen: new THREE.MeshBasicMaterial({ map: this.monitorTex, color: new THREE.Color('#ffffff').multiplyScalar(1.05) }),
      office_keyboard: std({ color: '#e5e7e9', roughness: 0.5 }),
      office_pot: std({ color: '#f3f3f0', roughness: 0.45 }),
      office_sofa: std({ color: '#4b5661', roughness: 0.85 }),
      office_partition: std({ color: '#aeb9c2', roughness: 0.6 }),
      office_wall: std({ color: '#cfd1d2', roughness: 0.7 }),
      office_tv: std({ color: '#262b30', roughness: 0.25, metalness: 0.3 }),
      office_light: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2.2) }),
      office_diffuser: std({ color: '#d8dbdd', roughness: 0.6 }),
      office_gateway: std({ color: '#eceae4', roughness: 0.45 }),
      office_firebtn: std({ color: '#c8473b', roughness: 0.5 }),
      device_white: std({ color: '#e7e3d8', roughness: 0.42, envMapIntensity: 0.8 }),
      device_dome: std({ color: '#e7e3d8', roughness: 0.42, envMapIntensity: 0.8 }),
      device_slot: std({ color: '#6b6d6a', roughness: 0.6 }),
      device_dark: std({ color: '#2b2a28', roughness: 0.5 }),
      device_lens: std({ color: '#c3cdc7', roughness: 0.12, metalness: 0.3 }),
    };
    this.mats = M;
    for (const [name, mesh] of Object.entries(meshes)) {
      const m = M[name];
      if (m) mesh.material = m;
      else {
        // keep glTF material but make it standard & sane
        const o = mesh.material;
        if (o && o.color) mesh.material = std({ color: o.color, roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0 });
      }
    }
    // The tower glass should not hide the transparent lobby / office glass behind it
    for (const g of [glassTower, glassTowerLow]) g.depthWrite = false;
  }

  buildInstances(T_, inst) {
    const dummy = new THREE.Object3D();
    const make = (tplNames, rows, { shadow = true, flat = true, colorFn = null, group = 'exterior' } = {}) => {
      const out = [];
      for (const n of tplNames) {
        const tpl = T_[n];
        if (!tpl) continue;
        let mat = tpl.material;
        if (n.endsWith('_leaf')) mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.9, flatShading: flat });
        else if (n.endsWith('_trunk') || n.endsWith('_stem')) mat = new THREE.MeshStandardMaterial({ color: '#6b5a4a', roughness: 0.9 });
        else if (n === 'TPL_car') mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.35, metalness: 0.3 });
        const im = new THREE.InstancedMesh(tpl.geometry, mat, rows.length);
        rows.forEach((r, i) => {
          dummy.position.set(r[0], r[1], r[2]);
          dummy.rotation.set(0, r[4], 0);
          dummy.scale.setScalar(r[3]);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
          if (colorFn) im.setColorAt(i, colorFn(r, i, n));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = shadow;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        im.name = n + '_inst';
        this.scene.add(im);
        this.groups[group].push(im);
        out.push(im);
      }
      return out;
    };
    const leafTint = (r) => {
      const k = 0.88 + r[5] * 0.24;
      return new THREE.Color(k, k * (0.98 + r[5] * 0.04), k);
    };
    make(['TPL_tree_leaf', 'TPL_tree_trunk'], inst.tree, { colorFn: (r, i, n) => (n.endsWith('_leaf') ? leafTint(r) : new THREE.Color(1, 1, 1)) });
    make(['TPL_tree_round_leaf', 'TPL_tree_round_trunk'], inst.tree_round, { colorFn: (r, i, n) => (n.endsWith('_leaf') ? leafTint(r) : new THREE.Color(1, 1, 1)) });
    make(['TPL_bush_leaf'], inst.bush, { colorFn: leafTint });
    const carCols = ['#f2f4f6', '#3a3f45', '#7d858d', '#b8c0c8'].map((c) => new THREE.Color(c));
    make(['TPL_car'], inst.car, { colorFn: (r) => carCols[r[5] % 4] });
    make(['TPL_plant_leaf', 'TPL_plant_stem'], inst.plant || [], { flat: false, group: 'office',
      colorFn: (r, i, n) => new THREE.Color(1, 1, 1) });
  }

  buildReflections() {
    const r = this.renderer;
    // lobby floor
    this.meshes.lobby_floor.geometry.computeBoundingBox();
    const lb = this.meshes.lobby_floor.geometry.boundingBox;
    const lobbyRefl = new PlanarReflection({ normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(0, lb.max.y, 0), resolution: 0.5 });
    lobbyRefl.region = lb.clone();
    this.lobbyRefl = lobbyRefl;
    addFloorReflection(this.floorMats.lobby, lobbyRefl, { strength: 0.9, blur: 0.0035, base: 0.55 });
    this.meshes.office_floor.geometry.computeBoundingBox();
    const ob = this.meshes.office_floor.geometry.boundingBox;
    const officeRefl = new PlanarReflection({ normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(0, ob.max.y, 0), resolution: 0.5 });
    officeRefl.region = ob.clone();
    this.officeRefl = officeRefl;
    addFloorReflection(this.floorMats.office, officeRefl, { strength: 0.6, blur: 0.004, base: 0.38 });
    // tower south face: one mirror shared by both glass volumes
    const towerRefl = new PlanarReflection({ normal: new THREE.Vector3(0, 0, 1), point: B(0, 28.0, 0), resolution: 0.4 });
    this.towerRefl = towerRefl;
    attachPlanar(this.glass.tower, towerRefl, new THREE.Vector3(0, 0, 1));
    attachPlanar(this.glass.towerLow, towerRefl, new THREE.Vector3(0, 0, 1));
    towerRefl.hide = [this.meshes.glass_tower, this.meshes.glass_tower_low, this.meshes.tower_slab, this.meshes.tower_light,
      this.meshes.tower_slab_office, this.meshes.tower_light_office];
    lobbyRefl.hide = [this.meshes.lobby_floor];
    officeRefl.hide = [this.meshes.office_floor];
    this.reflections = [lobbyRefl, officeRefl, towerRefl];
  }

  setSize(w, h) {
    this.reflections.forEach((r) => r.setSize(w, h));
  }

  // ------------------------------------------------------------------ state presets
  applyPreset(p) {
    // p: {groups:{exterior,lobby,office,shell,podium}, env:'ext'|'int', sun, hemi, fog, shadow:{c,half}, refl:{lobby,office,tower}}
    for (const [g, vis] of Object.entries(p.groups)) this.groups[g].forEach((m) => (m.visible = vis));
    this.scene.environment = p.env === 'int' ? this.envInterior : this.envExterior;
    this.scene.environmentIntensity = p.envIntensity ?? (p.env === 'int' ? 0.8 : 0.55);
    this.sun.intensity = p.sun ?? 3.2;
    this.hemi.intensity = p.hemi ?? 1.35;
    if (p.hemiSky) this.hemi.color.set(p.hemiSky); else this.hemi.color.set('#a9c1ee');
    if (p.hemiGround) this.hemi.groundColor.set(p.hemiGround); else this.hemi.groundColor.set('#e9ebee');
    this.fog.near = p.fog?.[0] ?? 300;
    this.fog.far = p.fog?.[1] ?? 1500;
    if (p.shadow) this.fitShadow(p.shadow.c, p.shadow.half, p.shadow.depth ?? 600, p.shadow.nb ?? 0.6);
    this.lobbyRefl.enabled = !!p.refl?.lobby;
    this.officeRefl.enabled = !!p.refl?.office;
    this.towerRefl.enabled = !!p.refl?.tower;
    this.floorMats.lobby.userData.reflUniforms.reflOn.value = p.refl?.lobby ? 1 : 0;
    this.floorMats.office.userData.reflUniforms.reflOn.value = p.refl?.office ? 1 : 0;
    this.glass.tower.uniforms.planarOn.value = p.refl?.tower ? 1 : 0;
    this.glass.towerLow.uniforms.planarOn.value = p.refl?.tower ? 1 : 0;
    const ce = p.env === 'int' ? this.cubeInterior : this.cubeExterior;
    this.glass.lobby.uniforms.envMap.value = ce;
  }

  setShellFade(v) {
    this.glass.tower.uniforms.fade.value = v;
    this.glass.towerLow.uniforms.fade.value = v;
  }

  updateReflections(camera) {
    for (const r of this.reflections) r.update(this.renderer, this.scene, camera);
  }

  update(dt, camera) {
    this.time += dt;
    // office curtain wall: clear when seen from outside (IOT overview), bright and milky from inside
    if (!this.officeBox) {
      this.meshes.office_floor.geometry.computeBoundingBox();
      this.officeBox = this.meshes.office_floor.geometry.boundingBox.clone().expandByVector(new THREE.Vector3(0, 4, 0));
      this.officeBox.min.y -= 0.5;
    }
    const inside = this.officeBox.containsPoint(camera.position) ? 1 : 0;
    const go = this.glass.office.uniforms;
    this.officeInside = this.officeInside === undefined ? inside : THREE.MathUtils.damp(this.officeInside, inside, 6, dt);
    go.alphaFacing.value = THREE.MathUtils.lerp(0.05, 0.55, this.officeInside);
    go.alphaGrazing.value = THREE.MathUtils.lerp(0.55, 0.8, this.officeInside);
    this.sky.position.copy(camera.position);
    this.sky.material.uniforms.time.value = this.time;
  }
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
