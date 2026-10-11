// Post-processing: MSAA scene target -> depth-of-field -> bloom -> grade/tonemap to screen.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const quadVert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

const blurFrag = /* glsl */`
uniform sampler2D tIn; uniform vec2 dir; uniform vec2 texel; varying vec2 vUv;
void main(){
  vec4 c = texture2D( tIn, vUv ) * 0.2270270270;
  vec2 o1 = dir * texel * 1.3846153846; vec2 o2 = dir * texel * 3.2307692308;
  c += texture2D( tIn, vUv + o1 ) * 0.3162162162; c += texture2D( tIn, vUv - o1 ) * 0.3162162162;
  c += texture2D( tIn, vUv + o2 ) * 0.0702702703; c += texture2D( tIn, vUv - o2 ) * 0.0702702703;
  gl_FragColor = c;
}`;

const copyFrag = /* glsl */`uniform sampler2D tIn; varying vec2 vUv; void main(){ gl_FragColor = texture2D( tIn, vUv ); }`;

const dofFrag = /* glsl */`
#include <packing>
uniform sampler2D tSharp; uniform sampler2D tBlur1; uniform sampler2D tBlur2; uniform sampler2D tDepth;
uniform float cameraNear; uniform float cameraFar; uniform float focus; uniform float range; uniform float nearRange;
uniform float amount; uniform float maxBlur; uniform float band;
varying vec2 vUv;
float linDepth( vec2 uv ) {
  float d = texture2D( tDepth, uv ).x;
  return -perspectiveDepthToViewZ( d, cameraNear, cameraFar );
}
void main(){
  float z = linDepth( vUv );
  // sharp band of +-band metres around the focus distance, then ramp to full blur over range / nearRange
  float dz = max( abs( z - focus ) - band, 0.0 );
  float coc = z > focus ? dz / range : dz / nearRange;
  coc = clamp( coc, 0.0, 1.0 ) * amount * maxBlur;
  vec4 s = texture2D( tSharp, vUv );
  vec4 b1 = texture2D( tBlur1, vUv );
  vec4 b2 = texture2D( tBlur2, vUv );
  vec4 c = mix( s, b1, smoothstep( 0.0, 0.45, coc ) );
  c = mix( c, b2, smoothstep( 0.4, 1.0, coc ) );
  gl_FragColor = c;
}`;

const finalFrag = /* glsl */`
uniform sampler2D tIn; uniform float exposure; uniform float saturation; uniform float contrast; uniform vec3 lift; uniform vec3 gain;
uniform float vignette; uniform vec2 res; uniform float time; uniform float whiteMix;
varying vec2 vUv;
vec3 RRTAndODTFit( vec3 v ) { vec3 a = v * ( v + 0.0245786 ) - 0.000090537; vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081; return a / b; }
vec3 aces( vec3 color ) {
  const mat3 ACESInputMat = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
  const mat3 ACESOutputMat = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
  color = ACESInputMat * color; color = RRTAndODTFit( color ); color = ACESOutputMat * color; return clamp( color, 0.0, 1.0 );
}
vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
void main(){
  vec3 c = texture2D( tIn, vUv ).rgb * exposure;
  c = aces( c / 0.6 );
  c = toSRGB( c );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = mix( vec3( l ), c, saturation );
  c = ( c - 0.5 ) * contrast + 0.5;
  c = c * gain + lift * ( 1.0 - c );
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  c *= 1.0 - vignette * smoothstep( 0.35, 1.05, length( q ) );
  c = mix( c, vec3( 0.94, 0.96, 0.98 ), whiteMix );
  c += ( hash( vUv * res + time ) - 0.5 ) / 255.0;
  gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    const ht = { type: THREE.HalfFloatType };
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, { ...ht, samples: 4 });
    this.sceneRT.depthTexture = new THREE.DepthTexture(4, 4);
    this.sceneRT.depthTexture.type = THREE.UnsignedIntType;
    this.half = [new THREE.WebGLRenderTarget(4, 4, ht), new THREE.WebGLRenderTarget(4, 4, ht)];
    this.quarter = [new THREE.WebGLRenderTarget(4, 4, ht), new THREE.WebGLRenderTarget(4, 4, ht)];
    this.comp = new THREE.WebGLRenderTarget(4, 4, ht);
    this.blurQ = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null }, dir: { value: new THREE.Vector2() }, texel: { value: new THREE.Vector2() } },
      vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false,
    }));
    this.copyQ = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null } }, vertexShader: quadVert, fragmentShader: copyFrag, depthTest: false, depthWrite: false,
    }));
    this.dofQ = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tSharp: { value: null }, tBlur1: { value: null }, tBlur2: { value: null }, tDepth: { value: null },
        cameraNear: { value: 0.1 }, cameraFar: { value: 1000 }, focus: { value: 10 }, range: { value: 10 }, nearRange: { value: 5 },
        amount: { value: 0 }, maxBlur: { value: 1 }, band: { value: 0 },
      },
      vertexShader: quadVert, fragmentShader: dofFrag, depthTest: false, depthWrite: false,
    }));
    this.finalQ = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tIn: { value: null }, exposure: { value: 1 }, saturation: { value: 1.08 }, contrast: { value: 1.02 },
        lift: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        vignette: { value: 0.12 }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, whiteMix: { value: 0 },
      },
      vertexShader: quadVert, fragmentShader: finalFrag, depthTest: false, depthWrite: false,
    }));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.55, 0.92);
    this.dof = { amount: 0, focus: 10, range: 10, nearRange: 4, band: 0, blur: 1 };
    this.grade = this.finalQ.material.uniforms;
  }

  setSize(w, h, pr) {
    const W = Math.round(w * pr), H = Math.round(h * pr);
    this.sceneRT.setSize(W, H);
    this.comp.setSize(W, H);
    this.half.forEach((t) => t.setSize(Math.max(4, W >> 1), Math.max(4, H >> 1)));
    this.quarter.forEach((t) => t.setSize(Math.max(4, W >> 2), Math.max(4, H >> 2)));
    this.bloom.setSize(W, H);
    this.grade.res.value.set(W, H);
    this.W = W; this.H = H;
  }

  blur(src, a, b, radius, passes = 1) {
    const r = this.r;
    const u = this.blurQ.material.uniforms;
    this.copyQ.material.uniforms.tIn.value = src.texture;
    r.setRenderTarget(a); this.copyQ.render(r);
    for (let i = 0; i < passes; i++) {
      u.texel.value.set(1 / a.width, 1 / a.height);
      u.tIn.value = a.texture; u.dir.value.set(radius * (1 + i), 0); r.setRenderTarget(b); this.blurQ.render(r);
      u.tIn.value = b.texture; u.dir.value.set(0, radius * (1 + i)); r.setRenderTarget(a); this.blurQ.render(r);
    }
  }

  render(scene, camera, target = null, opts = {}) {
    const r = this.r;
    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);
    let src = this.sceneRT;
    const d = this.dof;
    if (d.amount > 0.002) {
      this.blur(this.sceneRT, this.half[0], this.half[1], 1.2 * d.blur, 2);
      this.blur(this.half[0], this.quarter[0], this.quarter[1], 1.6 * d.blur, 3);
      const u = this.dofQ.material.uniforms;
      u.tSharp.value = this.sceneRT.texture; u.tBlur1.value = this.half[0].texture; u.tBlur2.value = this.quarter[0].texture;
      u.tDepth.value = this.sceneRT.depthTexture; u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
      u.focus.value = d.focus; u.range.value = d.range; u.nearRange.value = d.nearRange; u.amount.value = d.amount; u.band.value = d.band;
      r.setRenderTarget(this.comp); this.dofQ.render(r);
      src = this.comp;
    }
    if (this.bloom.strength > 0.001 && opts.bloom !== false) {
      if (src !== this.comp) {
        this.copyQ.material.uniforms.tIn.value = src.texture;
        r.setRenderTarget(this.comp); this.copyQ.render(r);
        src = this.comp;
      }
      this.bloom.render(r, null, this.comp, 0, false);
    }
    this.grade.tIn.value = src.texture;
    r.setRenderTarget(target);
    this.finalQ.render(r);
  }
}
