// Planar reflections (mirror camera with oblique near-plane clipping), adapted from three's Reflector
// but decoupled from a mesh so any material can sample it.
import * as THREE from 'three';

export class PlanarReflection {
  constructor({ normal, point, resolution = 0.5, clipBias = 0.0, samples = 0 }) {
    this.normal = normal.clone().normalize();
    this.point = point.clone();
    this.resolution = resolution;
    this.clipBias = clipBias;
    this.textureMatrix = new THREE.Matrix4();
    this.target = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples });
    this.texture = this.target.texture;
    this.camera = new THREE.PerspectiveCamera();
    this.hide = [];          // objects hidden while rendering the reflection
    this.enabled = true;
    this.region = null;      // optional THREE.Box3 – skip when not in view
    this._frustum = new THREE.Frustum();
    this._m = new THREE.Matrix4();
    this._v = {
      rp: new THREE.Vector3(), cp: new THREE.Vector3(), rot: new THREE.Matrix4(), look: new THREE.Vector3(0, 0, -1),
      view: new THREE.Vector3(), target: new THREE.Vector3(), plane: new THREE.Plane(), clip: new THREE.Vector4(), q: new THREE.Vector4(),
    };
    this.active = false;
  }

  setSize(w, h) {
    this.target.setSize(Math.max(16, Math.round(w * this.resolution)), Math.max(16, Math.round(h * this.resolution)));
  }

  update(renderer, scene, camera) {
    this.active = false;
    if (!this.enabled) return;
    const v = this._v;
    v.rp.copy(this.point);
    v.cp.setFromMatrixPosition(camera.matrixWorld);
    v.view.subVectors(v.rp, v.cp);
    if (v.view.dot(this.normal) > 0) return; // camera behind the mirror
    if (this.region) {
      this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this._frustum.setFromProjectionMatrix(this._m);
      if (!this._frustum.intersectsBox(this.region)) return;
    }
    const n = this.normal;
    v.view.reflect(n).negate();
    v.view.add(v.rp);
    v.rot.extractRotation(camera.matrixWorld);
    v.look.set(0, 0, -1).applyMatrix4(v.rot).add(v.cp);
    v.target.subVectors(v.rp, v.look);
    v.target.reflect(n).negate();
    v.target.add(v.rp);

    const cam = this.camera;
    cam.position.copy(v.view);
    cam.up.set(0, 1, 0).applyMatrix4(v.rot).reflect(n);
    cam.lookAt(v.target);
    cam.far = camera.far;
    cam.near = camera.near;
    cam.updateMatrixWorld();
    cam.projectionMatrix.copy(camera.projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(cam.projectionMatrix);
    this.textureMatrix.multiply(cam.matrixWorldInverse);

    // oblique near plane = mirror plane
    v.plane.setFromNormalAndCoplanarPoint(n, v.rp);
    v.plane.applyMatrix4(cam.matrixWorldInverse);
    v.clip.set(v.plane.normal.x, v.plane.normal.y, v.plane.normal.z, v.plane.constant);
    const pm = cam.projectionMatrix;
    v.q.x = (Math.sign(v.clip.x) + pm.elements[8]) / pm.elements[0];
    v.q.y = (Math.sign(v.clip.y) + pm.elements[9]) / pm.elements[5];
    v.q.z = -1.0;
    v.q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    v.clip.multiplyScalar(2.0 / v.clip.dot(v.q));
    pm.elements[2] = v.clip.x;
    pm.elements[6] = v.clip.y;
    pm.elements[10] = v.clip.z + 1.0 - this.clipBias;
    pm.elements[14] = v.clip.w;
    cam.projectionMatrixInverse.copy(pm).invert();

    const vis = this.hide.map((o) => o.visible);
    this.hide.forEach((o) => (o.visible = false));
    const rt = renderer.getRenderTarget();
    const xr = renderer.xr.enabled;
    const sm = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.target);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, cam);
    renderer.xr.enabled = xr;
    renderer.shadowMap.autoUpdate = sm;
    renderer.setRenderTarget(rt);
    this.hide.forEach((o, i) => (o.visible = vis[i]));
    this.active = true;
  }
}

// Inject a blurred planar reflection into a MeshStandardMaterial (polished floors).
export function addFloorReflection(material, refl, { strength = 0.35, blur = 0.004, fresnelPow = 2.5, base = 0.35 } = {}) {
  material.userData.refl = { value: refl.texture };
  const u = {
    tReflect: { value: refl.texture },
    reflMatrix: { value: refl.textureMatrix },
    reflStrength: { value: strength },
    reflBlur: { value: blur },
    reflOn: { value: 0 },
  };
  material.userData.reflUniforms = u;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 reflMatrix;\nvarying vec4 vReflUv;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvReflUv = reflMatrix * modelMatrix * vec4( transformed, 1.0 );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tReflect; uniform float reflStrength; uniform float reflBlur; uniform float reflOn;
varying vec4 vReflUv;`)
      .replace('#include <opaque_fragment>', `
{
  vec2 ruv = vReflUv.xy / vReflUv.w;
  vec3 rc = texture2D( tReflect, ruv ).rgb * 0.36;
  rc += texture2D( tReflect, ruv + vec2( reflBlur, 0.0 ) ).rgb * 0.16;
  rc += texture2D( tReflect, ruv - vec2( reflBlur, 0.0 ) ).rgb * 0.16;
  rc += texture2D( tReflect, ruv + vec2( 0.0, reflBlur * 1.6 ) ).rgb * 0.16;
  rc += texture2D( tReflect, ruv - vec2( 0.0, reflBlur * 1.6 ) ).rgb * 0.16;
  float ndv = clamp( dot( normalize( normal ), normalize( vViewPosition ) ), 0.0, 1.0 );
  float fres = ${base.toFixed(3)} + ${(1 - base).toFixed(3)} * pow( 1.0 - ndv, ${fresnelPow.toFixed(2)} );
  float k = reflStrength * fres * reflOn;
  outgoingLight = outgoingLight * ( 1.0 - k * 0.55 ) + rc * k;
}
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'floorrefl' + strength + blur + fresnelPow + base;
  return u;
}
