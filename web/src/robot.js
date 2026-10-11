// Articulated robot: procedural walk / idle on the joint hierarchy exported from Blender.
import * as THREE from 'three';
import { B } from './world.js';

export class Robot {
  constructor(gltf, world) {
    this.root = gltf.scene;
    this.world = world;
    this.j = {};
    const mats = {
      robot_white: new THREE.MeshPhysicalMaterial({ color: '#c9ced5', roughness: 0.24, metalness: 0.85, clearcoat: 0.6, clearcoatRoughness: 0.12 }),   // brushed chrome shell as in the reference
      robot_dark: new THREE.MeshStandardMaterial({ color: '#2a2e33', roughness: 0.35, metalness: 0.7 }),
      robot_visor: new THREE.MeshStandardMaterial({ color: '#0b0f12', roughness: 0.06, metalness: 0.6 }),
      robot_glow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fd2ff').multiplyScalar(2.5) }),
      robot_silver: new THREE.MeshStandardMaterial({ color: '#b8c0c7', roughness: 0.22, metalness: 0.95 }),
    };
    this.root.traverse((o) => {
      if (o.isMesh) {
        const n = o.material.name;
        if (mats[n]) o.material = mats[n];
        o.castShadow = true;
        o.receiveShadow = true;
      } else {
        this.j[o.name] = o;
      }
    });
    this.rest = {};
    for (const [k, o] of Object.entries(this.j)) this.rest[k] = o.quaternion.clone();
    this.group = new THREE.Group();
    this.group.add(this.root);
    this.group.name = 'robot';
    this.phase = 0;
    this.t = 0;
    this.headAnchor = new THREE.Vector3();
    this.handAnchor = new THREE.Vector3();
    this.floorZ = 0;
    this.path = [];
    this.seg = 0;
    this.segT = 0;
    this.mode = 'idle';
    this.heading = Math.PI; // facing -z (towards the north end) by default
    this.speed = 0.95;
    this.pos = new THREE.Vector3();
  }

  placeOnFloor(fz) {
    this.floorZ = fz;
  }

  // patrol in Blender coordinates: list of {x, y, wait}
  setPatrol(points, start = 0) {
    this.path = points;
    this.seg = start;
    const p = points[start];
    this.pos.copy(B(p.x, p.y, this.floorZ));
    this.wait = p.wait ?? 2;
    this.mode = 'wait';
    this.group.position.copy(this.pos);
    const n = points[(start + 1) % points.length];
    this.heading = Math.atan2(B(n.x, n.y, 0).x - this.pos.x, B(n.x, n.y, 0).z - this.pos.z);
    this.faceTo = p.face;
    if (p.face !== undefined) this.heading = p.face;
  }

  // pose a joint with euler offsets (radians) relative to rest
  pose(name, x = 0, y = 0, z = 0) {
    const o = this.j[name];
    if (!o) return;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
    o.quaternion.copy(this.rest[name]).multiply(q);
  }

  update(dt) {
    this.t += dt;
    let walking = false;
    if (this.path.length) {
      if (this.mode === 'wait') {
        this.wait -= dt;
        const p = this.path[this.seg];
        const n = this.path[(this.seg + 1) % this.path.length];
        const target = Math.atan2(B(n.x, n.y, 0).x - this.pos.x, B(n.x, n.y, 0).z - this.pos.z);
        const face = p.face !== undefined && this.wait > 0.9 ? p.face : target;
        this.heading = turnTo(this.heading, face, dt * 2.2);
        if (this.wait <= 0 && Math.abs(angDiff(this.heading, target)) < 0.08) this.mode = 'walk';
      } else {
        const n = this.path[(this.seg + 1) % this.path.length];
        const tgt = B(n.x, n.y, this.floorZ);
        const d = tgt.clone().sub(this.pos);
        d.y = 0;
        const dist = d.length();
        const want = Math.atan2(d.x, d.z);
        this.heading = turnTo(this.heading, want, dt * 3);
        const step = Math.min(dist, this.speed * dt);
        this.pos.x += Math.sin(this.heading) * step;
        this.pos.z += Math.cos(this.heading) * step;
        walking = true;
        if (dist < 0.05) {
          this.seg = (this.seg + 1) % this.path.length;
          this.mode = 'wait';
          this.wait = n.wait ?? 2;
        }
      }
    }
    this.walkBlend = THREE.MathUtils.damp(this.walkBlend ?? 0, walking ? 1 : 0, 6, dt);
    const w = this.walkBlend;
    if (walking) this.phase += dt * this.speed * 2.05 * Math.PI / 1.0;
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const breathe = Math.sin(this.t * 1.6) * 0.012;
    const look = Math.sin(this.t * 0.45) * 0.45 * (1 - w) + Math.sin(this.t * 0.9) * 0.05;

    this.group.position.set(this.pos.x, this.pos.y + Math.abs(c) * 0.025 * w - 0.012 * w, this.pos.z);
    this.group.rotation.y = this.heading;

    this.pose('pelvis', 0, s * 0.08 * w, 0);
    this.pose('spine', 0.03 * w + breathe, -s * 0.06 * w, 0);
    this.pose('chest', breathe * 0.5, -s * 0.05 * w, 0);
    this.pose('neck', -0.03, look * 0.5, 0);
    this.pose('head', 0.05 - 0.04 * w, look * 0.5, 0);
    for (const [side, k] of [['L', 1], ['R', -1]]) {
      const ph = side === 'L' ? s : -s;
      const phc = side === 'L' ? c : -c;
      // legs (hip flexion: negative x = forward)
      const hip = -ph * 0.42 * w;
      const knee = Math.max(0, phc) * 0.75 * w + 0.05;
      this.pose('hip_' + side, hip - 0.02, 0, k * 0.02);
      this.pose('knee_' + side, knee, 0, 0);
      this.pose('ankle_' + side, -hip * 0.4 - knee * 0.35, 0, 0);
      // arms swing opposite to legs
      const arm = ph * 0.35 * w;
      this.pose('shoulder_' + side, arm + 0.04, 0, k * (0.1 + 0.02 * Math.sin(this.t * 1.6)));
      this.pose('elbow_' + side, -0.25 - Math.max(0, -ph) * 0.35 * w - 0.08 * (1 - w), 0, 0);
      this.pose('wrist_' + side, 0, 0, 0);
    }
    this.root.updateMatrixWorld(true);
    this.j.head?.getWorldPosition(this.headAnchor);
    this.j.wrist_R?.getWorldPosition(this.handAnchor);
  }
}

function angDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function turnTo(a, b, maxStep) {
  const d = angDiff(a, b);
  return a + Math.sign(d) * Math.min(Math.abs(d), maxStep);
}
