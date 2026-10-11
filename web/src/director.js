// Camera director: named shots, zone-aware transition routes, idle drift and drag/zoom exploration.
import * as THREE from 'three';
import { B } from './world.js';

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function zoneOf(state) {
  if (state === 'campus' || state === 'hq') return 'exterior';
  if (state === 'twin' || state.startsWith('b-')) return 'lobby';
  return 'office';
}

export class Director {
  constructor(camera, dom, A) {
    this.camera = camera;
    this.dom = dom;
    this.A = A;
    const FZ = A.FZ, L = A.LZ;
    this.FZ = FZ;
    this.L = L;
    const S = (p, t, fov, o = {}) => ({ p: B(...p), t: B(...t), fov, ...o });
    this.shots = {
      campus: S([17.6, -150.5, 125.0], [-4.65, 28.1, 28.0], 40.03, { drift: [0.8, 0.5, 0.6], orbit: [0.314, 50], dof: 0 }),
      hq: S([19.73, -43.96, 3.79], [1.73, 12.91, 10.23], 40.37, { drift: [0.9, 0.18, 0.5], dof: 0 }),   // fitted to the reference street frame
      twin: S([1.9, 25.5, L + 2.48], [2.83, 43.74, L + 3.74], 45.6, { drift: [0.18, 0.05, 0.1] }),   // fitted to the reference lobby frame
      iot: S([31.49, 15.15, FZ + 3.2], [-21.76, 42.64, FZ + 0.24], 15.0, { drift: [0.35, 0.12, 0.25], dof: 1, focusOn: B(8.0, 28.0, FZ + 1.8), band: 10, range: 25, nearRange: 8 }),   // long lens, fitted to the reference IOT frame
      ai: S([13.77, 29.5, FZ + 1.95], [6.14, 47.92, FZ + 0.31], 64, { drift: [0.08, 0.03, 0.05], dof: 0.35, focusOn: B(12.9, 33.2, FZ + 1.2), band: 4, range: 30, nearRange: 3 }),   // matched to the reference AI frame
      'ai-sem': S([11.8, 29.8, FZ + 1.95], [4.17, 48.2, FZ + 0.3], 64, { drift: [0.08, 0.03, 0.05], dof: 0.2, focusOn: B(11.7, 37.2, FZ + 1.2), band: 5, range: 30, nearRange: 6 }),
      'd-sensor': S([10.39, 40.36, FZ + 2.86], [10.66, 40.99, FZ + 3.56], 38, { drift: [0.015, 0.005, 0.01], dof: 1, focusOn: B(10.6, 41.0, FZ + 3.47), band: 0.25, range: 1.2, nearRange: 0.3 }),
      'd-camera': S([13.45, 28.55, FZ + 2.72], [14.42, 29.62, FZ + 2.9], 56, { drift: [0.02, 0.01, 0.01], dof: 1, focusOn: B(14.53, 29.67, FZ + 3.0), band: 0.4, range: 1.8, nearRange: 0.5 }),   // profile view against the east glazing
      'd-gateway': S([12.2, 41.0, FZ + 1.9], [9.9, 42.8, FZ + 1.6], 40, { dof: 1, focusOn: B(9.9, 42.8, FZ + 1.6), range: 2.5, nearRange: 0.6 }),
      'd-fire': S([12.0, 41.2, FZ + 1.5], [9.9, 42.8, FZ + 1.25], 40, { dof: 1, focusOn: B(9.9, 42.8, FZ + 1.25), range: 2.5, nearRange: 0.6 }),
      'd-fresh': S([11.6, 44.0, FZ + 1.9], [11.0, 46.0, FZ + 3.5], 44, { dof: 1, focusOn: B(11.0, 46.0, FZ + 3.5), range: 2.5, nearRange: 0.6 }),
      'd-light': S([4.0, 33.0, FZ + 1.6], [2.0, 42.0, FZ + 3.5], 50, { dof: 0.6, focusOn: B(2.0, 40.0, FZ + 3.5), range: 8, nearRange: 2 }),
    };
    for (const b of ['b-left', 'b-hq', 'b-right', 'b-ring']) this.shots[b] = { ...this.shots.twin };

    this.state = null;
    this.anim = null;
    this.cur = { p: new THREE.Vector3(), t: new THREE.Vector3(), fov: 45 };
    this.user = { yaw: 0, pitch: 0, zoom: 1, tyaw: 0, tpitch: 0, tzoom: 1 };
    this.time = 0;
    this.veil = 0;
    this.dof = { amount: 0, focus: 50, range: 50, nearRange: 10, band: 0 };
    this.onPreset = null;
    this.onArrive = null;
    this.explore = false;
    this.still = false;      // freeze idle motion (used for deterministic captures)
    this.bindInput();
  }

  bindInput() {
    const el = this.dom;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, yaw: this.user.tyaw, pitch: this.user.tpitch };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || this.anim) return;
      const k = this.explore ? 0.006 : 0.003;
      const lim = this.explore ? 1.2 : 0.35;
      this.user.tyaw = THREE.MathUtils.clamp(drag.yaw - (e.clientX - drag.x) * k, -lim, lim);
      this.user.tpitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * k, -0.35, 0.3);
    });
    const up = () => {
      drag = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.anim) return;
      const lo = this.explore ? 0.35 : 0.65;
      this.user.tzoom = THREE.MathUtils.clamp(this.user.tzoom * Math.exp(e.deltaY * 0.0012), lo, 1.25);
    }, { passive: false });
  }

  resetUser(instant = false) {
    const u = this.user;
    u.tyaw = u.tpitch = 0;
    u.tzoom = 1;
    if (instant) { u.yaw = u.pitch = 0; u.zoom = 1; }
  }

  jump(state) {
    const s = this.shots[state];
    this.state = state;
    this.anim = null;
    this.cur.p.copy(s.p);
    this.cur.t.copy(s.t);
    this.cur.fov = s.fov;
    this.veil = 0;
    this.resetUser(true);
    this.onPreset && this.onPreset(zoneOf(state));
    this.setDof(s, 1);
    this.onArrive && this.onArrive(state);
  }

  // ------------------------------------------------------------------ routes
  key(p, t, fov, extra = {}) {
    return { p: Array.isArray(p) ? B(...p) : p.clone(), t: Array.isArray(t) ? B(...t) : t.clone(), fov, ...extra };
  }

  exitKeys(zone, toZone) {
    const FZ = this.FZ, L = this.L, K = this.key.bind(this);
    if (zone === 'lobby' && toZone === 'exterior') {
      return [K([3.2, 35.0, L + 2.1], [3.6, 16.0, L + 2.6], 56), K([3.8, 22.6, L + 2.6], [3.8, 0.0, L + 3.4], 56, { veil: 0.15 })];
    }
    if (zone === 'lobby' && toZone === 'office') {
      return [K([1.5, 33.5, L + 2.2], [4.0, 40.0, L + 8.6], 58), K([2.5, 35.0, L + 8.0], [4.0, 40.0, L + 14.0], 62, { veil: 1, preset: 'office' })];
    }
    if (zone === 'office' && toZone === 'exterior') {
      return [K([9.5, 31.0, FZ + 1.8], [8.0, 50.0, FZ + 1.6], 56), K([9.5, 25.5, FZ + 2.4], [6.0, 50.0, FZ + 1.0], 58, { veil: 0.95, preset: 'exterior' }),
        K([30.0, 12.0, FZ + 4.0], [-40.0, 20.0, FZ - 6.0], 58, { veil: 0.0 })];
    }
    if (zone === 'office' && toZone === 'lobby') {
      return [K([4.0, 36.0, FZ + 1.8], [5.0, 42.0, FZ - 3.0], 58), K([3.0, 37.0, FZ + 0.2], [5.0, 41.0, FZ - 6.0], 62, { veil: 1, preset: 'lobby' })];
    }
    if (zone === 'exterior' && toZone === 'lobby') {
      // white flash at the doorway hides the switch to interior lighting (as in the reference)
      return [K([3.4, 2.0, L + 3.4], [3.6, 30.0, L + 4.8], 54), K([3.6, 21.5, L + 2.4], [3.6, 40.0, L + 2.8], 56, { veil: 0.7, preset: 'lobby' })];
    }
    if (zone === 'exterior' && toZone === 'office') {
      return [K([12.0, -40.0, FZ + 18.0], [4.0, 30.0, FZ + 4.0], 46), K([5.0, 18.0, FZ + 3.0], [4.0, 34.0, FZ + 2.2], 46),
        K([4.6, 26.6, FZ + 2.2], [4.0, 40.0, FZ + 1.8], 48, { veil: 1, preset: 'office' })];
    }
    return [];
  }

  entryKeys(zone, fromZone, dest) {
    const FZ = this.FZ, L = this.L, K = this.key.bind(this);
    if (zone === 'office' && fromZone === 'lobby') {
      const k = [K([6.0, 33.0, FZ + 0.3], [5.0, 46.0, FZ + 1.4], 58, { veil: 0.6 }), K([7.0, 31.0, FZ + 1.7], [5.0, 46.0, FZ + 1.2], 56, { veil: 0 })];
      if (dest === 'iot') return [K([20.0, 21.0, FZ + 2.6], [-21.8, 42.6, FZ + 0.4], 24, { veil: 0.7 }), K([27.0, 17.4, FZ + 3.0], [-21.8, 42.6, FZ + 0.3], 17, { veil: 0.1 })];
      if (dest.startsWith('d-')) k.push(K([13.0, 25.0, FZ + 2.0], [5.0, 44.0, FZ + 1.2], 50, { veil: 0.25 }));
      return k;
    }
    if (zone === 'office' && fromZone === 'exterior') {
      const k = [K([10.0, 22.0, FZ + 2.6], [4.0, 44.0, FZ + 1.2], 46, { veil: 0.25 })];
      if (dest === 'ai' || dest === 'ai-sem') k.push(K([10.0, 27.4, FZ + 1.8], [7.0, 50.0, FZ + 1.2], 54, { veil: 0 }));
      return k;
    }
    if (zone === 'lobby' && fromZone === 'office') {
      return [K([1.0, 34.0, L + 7.0], [7.0, 43.0, L + 3.5], 60, { veil: 0.5 }), K([-2.0, 32.0, L + 2.4], [8.5, 43.5, L + 3.3], 56, { veil: 0 })];
    }
    if (zone === 'lobby' && fromZone === 'exterior') {
      return [K([2.0, 27.0, L + 2.1], [6.0, 44.0, L + 3.2], 56, { veil: 0 })];
    }
    if (zone === 'exterior') {
      const k = [];
      if (fromZone === 'lobby') k.push(K([3.6, 6.0, L + 3.0], [2.0, 40.0, L + 9.0], 54, { veil: 0 }));
      if (dest === 'campus') k.push(K([10.0, -60.0, 60.0], [4.0, 30.0, 30.0], 44));
      return k;
    }
    return [];
  }

  midKeys(from, to) {
    const K = this.key.bind(this);
    if (from === 'campus' && to === 'hq') return [K([-14.0, -92.0, 46.0], [2.0, 30.0, 26.0], 46), K([0.0, -60.0, 12.0], [2.0, 30.0, 14.0], 50)];
    if (from === 'hq' && to === 'campus') return [K([2.0, -70.0, 22.0], [2.0, 30.0, 18.0], 50), K([-14.0, -100.0, 60.0], [4.0, 30.0, 28.0], 44)];
    if (from === 'iot' && (to === 'ai' || to === 'ai-sem')) return [K([24.0, 20.5, this.FZ + 2.8], [2.0, 40.0, this.FZ + 1.0], 30), K([16.5, 26.5, this.FZ + 2.2], [6.0, 46.0, this.FZ + 0.8], 50, { veil: 0.15 })];
    if ((from === 'ai' || from === 'ai-sem') && to === 'iot') return [K([16.5, 26.5, this.FZ + 2.2], [6.0, 46.0, this.FZ + 0.8], 50, { veil: 0.15 }), K([24.0, 20.5, this.FZ + 2.8], [2.0, 40.0, this.FZ + 1.0], 30)];
    return [];
  }

  go(to, opts = {}) {
    const from = this.state;
    if (!from || opts.instant) return this.jump(to);
    if (from === to && !this.anim) return;
    const zf = zoneOf(from), zt = zoneOf(to);
    const cam = this.currentPose();
    let keys = [this.key(cam.p, cam.t, cam.fov, { veil: this.veil })];
    if (zf === zt) {
      keys.push(...this.midKeys(from, to));
    } else if (zf === 'exterior' && zt === 'lobby' && from === 'campus') {
      keys.push(...this.midKeys('campus', 'hq'), this.key(this.shots.hq.p, this.shots.hq.t, this.shots.hq.fov));
      keys.push(...this.exitKeys(zf, zt), ...this.entryKeys(zt, zf, to));
    } else if (zf === 'lobby' && zt === 'exterior') {
      keys.push(...this.exitKeys(zf, zt), ...this.entryKeys(zt, zf, to));
    } else {
      // office <-> exterior / lobby, exterior -> office
      keys.push(...this.exitKeys(zf, zt), ...this.entryKeys(zt, zf, to));
    }
    const s = this.shots[to];
    keys.push(this.key(s.p, s.t, s.fov, { veil: 0, preset: zf !== zt && !keys.some((k) => k.preset) ? zt : undefined }));
    // distances -> timing
    const n = keys.length;
    const cum = [0];
    for (let i = 1; i < n; i++) {
      const d = keys[i].p.distanceTo(keys[i - 1].p) + 0.35 * keys[i].t.distanceTo(keys[i - 1].t);
      cum.push(cum[i - 1] + Math.max(d, 1.5));
    }
    const total = cum[n - 1];
    const dur = opts.duration ?? THREE.MathUtils.clamp(1.2 + Math.sqrt(total) * 0.32, 1.6, 6.5);
    const pc = new THREE.CatmullRomCurve3(keys.map((k) => k.p), false, 'centripetal', 0.5);
    const tc = new THREE.CatmullRomCurve3(keys.map((k) => k.t), false, 'centripetal', 0.5);
    this.anim = {
      from, to, keys, frac: cum.map((c) => c / total), pc, tc, dur, t: 0, fired: new Set(),
      dofFrom: { ...this.dof }, user: { ...this.user },
    };
    this.state = to;
    this.onDepart && this.onDepart(from, to);
  }

  skip() {
    if (!this.anim) return;
    this.anim.t = this.anim.dur;
  }

  currentPose() {
    return { p: this.camera.position.clone(), t: this.lastTarget ? this.lastTarget.clone() : this.cur.t.clone(), fov: this.camera.fov };
  }

  setDof(shot, k) {
    const d = this.dof;
    const amt = shot.dof ?? 0;
    const focus = shot.focusOn ? shot.focusOn.distanceTo(shot.p) : shot.t.distanceTo(shot.p);
    d.amount = THREE.MathUtils.lerp(d.amount, amt, k);
    d.focus = THREE.MathUtils.lerp(d.focus, focus, k);
    d.range = THREE.MathUtils.lerp(d.range, shot.range ?? 60, k);
    d.nearRange = THREE.MathUtils.lerp(d.nearRange, shot.nearRange ?? 10, k);
    d.band = THREE.MathUtils.lerp(d.band, shot.band ?? 0, k);
  }

  update(dt) {
    this.time += dt;
    const cam = this.camera;
    const a = this.anim;
    if (a) {
      a.t = Math.min(a.dur, a.t + dt);
      const s = ease(a.t / a.dur);
      // map arc fraction -> curve param
      const F = a.frac;
      let i = 0;
      while (i < F.length - 2 && s > F[i + 1]) i++;
      const local = (s - F[i]) / Math.max(1e-6, F[i + 1] - F[i]);
      const u = (i + THREE.MathUtils.clamp(local, 0, 1)) / (F.length - 1);
      const p = a.pc.getPoint(u);
      const t = a.tc.getPoint(u);
      const k0 = a.keys[i], k1 = a.keys[i + 1];
      const fov = THREE.MathUtils.lerp(k0.fov, k1.fov, local);
      const v0 = k0.veil ?? 0, v1 = k1.veil ?? 0;
      this.veil = THREE.MathUtils.lerp(v0, v1, Math.min(1, local));
      for (let j = 0; j <= i + (local >= 0.999 ? 1 : 0); j++) {
        if (a.keys[j].preset && !a.fired.has(j)) {
          a.fired.add(j);
          this.onPreset && this.onPreset(a.keys[j].preset);
        }
      }
      // fade user offsets out during travel
      const uk = 1 - Math.min(1, a.t / (a.dur * 0.4));
      this.user.yaw = a.user.yaw * uk; this.user.pitch = a.user.pitch * uk; this.user.zoom = 1 + (a.user.zoom - 1) * uk;
      this.user.tyaw = this.user.yaw; this.user.tpitch = this.user.pitch; this.user.tzoom = this.user.zoom;
      // DOF: off while travelling, ramp in at the end
      const shot = this.shots[a.to];
      const dk = Math.max(0, (a.t / a.dur - 0.75) / 0.25);
      this.dof.amount = THREE.MathUtils.lerp(a.dofFrom.amount * (1 - Math.min(1, a.t / (a.dur * 0.2))), shot.dof ?? 0, dk);
      const focus = shot.focusOn ? shot.focusOn.distanceTo(shot.p) : shot.t.distanceTo(shot.p);
      this.dof.focus = focus; this.dof.range = shot.range ?? 60; this.dof.nearRange = shot.nearRange ?? 10; this.dof.band = shot.band ?? 0;
      this.cur.p.copy(p);
      this.cur.t.copy(t);
      this.cur.fov = fov;
      if (a.t >= a.dur) {
        a.keys.forEach((k, j) => { if (k.preset && !a.fired.has(j)) this.onPreset && this.onPreset(k.preset); });
        this.anim = null;
        this.veil = 0;
        this.cur.p.copy(shot.p); this.cur.t.copy(shot.t); this.cur.fov = shot.fov;
        this.drift0 = this.time;
        this.onArrive && this.onArrive(a.to);
      }
    } else if (this.state) {
      const s = this.shots[this.state];
      this.cur.p.copy(s.p);
      this.cur.t.copy(s.t);
      this.cur.fov = s.fov;
      this.setDof(s, 1 - Math.exp(-dt * 4));
      const u = this.user;
      u.yaw = THREE.MathUtils.damp(u.yaw, u.tyaw, 6, dt);
      u.pitch = THREE.MathUtils.damp(u.pitch, u.tpitch, 6, dt);
      u.zoom = THREE.MathUtils.damp(u.zoom, u.tzoom, 6, dt);
    }

    // compose: base pose + idle drift + user look/zoom
    const p = this.cur.p.clone();
    const t = this.cur.t.clone();
    const s = this.shots[this.state] || {};
    if (!a && s.drift && !this.still) {
      const ti = this.time - (this.drift0 ?? 0);
      const ramp = Math.min(1, ti / 3);
      const [dx, dy, dz] = s.drift;
      const fwd = t.clone().sub(p).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      p.addScaledVector(right, Math.sin(ti * 0.16) * dx * ramp);
      p.y += Math.sin(ti * 0.23 + 1.0) * dy * ramp;
      p.addScaledVector(fwd, Math.sin(ti * 0.11 + 2.0) * dz * ramp);
    }
    const u = this.user;
    let auto = 0;
    if (!a && s.orbit && !this.still) {
      // slow one-sided orbit around the target, as in the reference idle state
      const ti = this.time - (this.drift0 ?? 0);
      auto = s.orbit[0] * (1 - Math.cos((2 * Math.PI * ti) / s.orbit[1])) / 2;
    }
    if (auto || Math.abs(u.yaw) > 1e-4 || Math.abs(u.pitch) > 1e-4 || Math.abs(u.zoom - 1) > 1e-4) {
      // orbit the camera around the target (explore) / look around the camera (guided)
      const off = p.clone().sub(t);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta += u.yaw + auto;
      sph.phi = THREE.MathUtils.clamp(sph.phi - u.pitch, 0.08, Math.PI - 0.08);
      sph.radius *= u.zoom;
      p.copy(t).add(new THREE.Vector3().setFromSpherical(sph));
    }
    cam.position.copy(p);
    cam.lookAt(t);
    this.lastTarget = t;
    if (Math.abs(cam.fov - this.cur.fov) > 1e-3) {
      cam.fov = this.cur.fov;
      cam.updateProjectionMatrix();
    }
  }
}
