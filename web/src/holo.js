// "AI semantics" hologram: a translucent cyan x-ray copy of a desk cluster, lifted above the office.
import * as THREE from 'three';
import { B } from './world.js';

const vert = /* glsl */`
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4( position, 1.0 );
  vW = w.xyz;
  vN = normalize( mat3( modelMatrix ) * normal );
  vV = cameraPosition - w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const frag = /* glsl */`
uniform vec3 color; uniform float opacity; uniform float time; uniform float reveal; uniform float yMin; uniform float yMax;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float f = 1.0 - abs( dot( normalize( vN ), normalize( vV ) ) );
  float scan = 0.85 + 0.15 * sin( vW.y * 60.0 - time * 3.0 );
  float h = ( vW.y - yMin ) / max( 0.001, yMax - yMin );
  float rv = smoothstep( reveal - 0.05, reveal, 1.0 - h );
  vec3 c = color * ( 0.55 + 1.4 * pow( f, 1.5 ) ) * scan;
  gl_FragColor = vec4( c, opacity * ( 0.32 + 0.68 * pow( f, 1.2 ) ) * ( 1.0 - rv ) );
}`;

export function extractRegion(meshes, box) {
  const out = [];
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const idx = g.index;
    const P = [], N = [];
    const tri = idx ? idx.count / 3 : pos.count / 3;
    const v = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let t = 0; t < tri; t++) {
      c.set(0, 0, 0);
      const ids = [];
      for (let k = 0; k < 3; k++) {
        const i = idx ? idx.getX(t * 3 + k) : t * 3 + k;
        ids.push(i);
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        c.add(v);
      }
      c.multiplyScalar(1 / 3);
      if (!box.containsPoint(c)) continue;
      for (const i of ids) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        P.push(v.x, v.y, v.z);
        N.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      }
    }
    if (P.length) {
      const ng = new THREE.BufferGeometry();
      ng.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      ng.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      out.push(ng);
    }
  }
  return out;
}

export class Hologram {
  constructor(world, fz) {
    const M = world.meshes;
    const src = ['office_desktop', 'office_deskside', 'office_drawer', 'office_chair', 'office_chairframe', 'office_monitor',
      'office_partition', 'office_column'].map((n) => M[n]).filter(Boolean);
    // cluster: two desk rows near the east corridor columns
    // one desk cluster, replayed as a holographic twin in the aisle next to the robot (as in the reference)
    const a = B(3.6, 37.7, fz - 0.1), b = B(8.6, 41.4, fz + 2.0);
    const box = new THREE.Box3().setFromPoints([a, b]);
    const geos = extractRegion(src, box);
    this.uniforms = {
      color: { value: new THREE.Color('#2a9ee8') }, opacity: { value: 0.0 }, time: { value: 0 }, reveal: { value: 1 },
      yMin: { value: 0 }, yMax: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
      side: THREE.DoubleSide,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: '#6fd2ff', transparent: true, opacity: 0, depthWrite: false });
    this.group = new THREE.Group();
    const center = box.getCenter(new THREE.Vector3());
    for (const g of geos) {
      g.translate(-center.x, -box.min.y, -center.z);
      this.group.add(new THREE.Mesh(g, mat));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 35), lineMat);
      this.group.add(e);
    }
    // enclosing translucent volume
    const size = box.getSize(new THREE.Vector3());
    const vol = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y * 0.9, size.z).translate(0, size.y * 0.45, 0),
      new THREE.MeshBasicMaterial({ color: '#2f9fe6', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    const volEdges = new THREE.LineSegments(new THREE.EdgesGeometry(vol.geometry), lineMat);
    this.group.add(vol, volEdges);
    this.vol = vol;
    this.lineMat = lineMat;
    const at = B(11.7, 37.2, 0);
    this.group.position.set(at.x, box.min.y + 0.45, at.z);
    this.group.scale.setScalar(0.85);
    this.group.rotation.y = 0.0;
    this.group.visible = false;
    this.group.renderOrder = 5;
    this.target = 0;
    this.v = 0;
    this.labelAnchor = B(11.7, 37.2, fz + 2.6);
    world.scene.add(this.group);
    this.uniforms.yMin.value = this.group.position.y;
    this.uniforms.yMax.value = this.group.position.y + size.y * 0.85;
  }

  show(on) { this.target = on ? 1 : 0; }

  update(dt) {
    this.v = THREE.MathUtils.damp(this.v, this.target, 3.2, dt);
    const v = this.v;
    this.group.visible = v > 0.01;
    this.uniforms.opacity.value = 0.8 * v;
    this.uniforms.reveal.value = v;
    this.uniforms.time.value += dt;
    this.lineMat.opacity = 0.9 * v;
    this.vol.material.opacity = 0.12 * v;
    this.group.position.y = this.uniforms.yMin.value + (1 - v) * -0.3;
  }
}
