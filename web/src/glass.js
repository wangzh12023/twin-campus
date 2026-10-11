// Curtain-wall glass: tinted, fresnel reflective (cube env + optional planar mirror) with a procedural
// mullion grid computed in world space, so no per-mullion geometry is needed on the big facades.
import * as THREE from 'three';

const vert = /* glsl */`
#include <common>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
uniform mat4 reflMatrix;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec4 vReflUv;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorldPos = wp.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  vReflUv = reflMatrix * wp;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
  #include <fog_vertex>
}`;

const frag = /* glsl */`
#include <common>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
uniform samplerCube envMap;
uniform sampler2D tReflect;
uniform float planarOn;
uniform vec3 planeN;
uniform vec3 tint;
uniform vec3 deepTint;
uniform vec3 gridColor;
uniform vec2 gridSize;
uniform vec2 gridOffset;
uniform float gridWidth;
uniform float gridAlpha;
uniform float alphaFacing;
uniform float alphaGrazing;
uniform float reflStrength;
uniform float reflBase;
uniform float envBoost;
uniform float fade;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec4 vReflUv;

void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize( vNormalW );
  vec3 V = normalize( cameraPosition - vWorldPos );
  if ( dot( N, V ) < 0.0 ) N = -N;
  float ndv = clamp( dot( N, V ), 0.0, 1.0 );
  float F = 0.04 + 0.96 * pow( 1.0 - ndv, 5.0 );

  vec3 R = reflect( -V, N );
  vec3 env = textureCube( envMap, R ).rgb * envBoost;
  float useP = planarOn * step( 0.97, dot( N, planeN ) );
  if ( useP > 0.5 ) {
    vec3 pr = texture2DProj( tReflect, vReflUv ).rgb;
    env = mix( env, pr, 0.92 );
  }
  float kr = clamp( reflBase + F * reflStrength, 0.0, 1.0 );
  vec3 base = mix( tint, deepTint, pow( 1.0 - ndv, 1.4 ) );
  vec3 col = mix( base, env, kr );
  // sun glint
  vec3 H = normalize( sunDir + V );
  col += sunColor * pow( max( dot( N, H ), 0.0 ), 400.0 ) * 3.0;
  float a = mix( alphaFacing, alphaGrazing, F );
  a = max( a, kr * 0.85 );

  // mullion grid
  float u = abs( N.x ) > abs( N.z ) ? vWorldPos.z : vWorldPos.x;
  vec2 g = ( vec2( u, vWorldPos.y ) - gridOffset ) / gridSize;
  vec2 gw = vec2( gridWidth ) / gridSize;
  vec2 dist = abs( fract( g + 0.5 ) - 0.5 );
  vec2 aa = fwidth( g ) * 0.75;
  vec2 cov = 1.0 - smoothstep( gw * 0.5, gw * 0.5 + aa, dist );
  float line = max( cov.x, cov.y );
  float far = smoothstep( 0.25, 1.2, max( aa.x / gw.x, aa.y / gw.y ) * 0.25 );
  line = mix( line, min( 1.0, ( gw.x + gw.y ) * 1.2 ), far );
  col = mix( col, gridColor, line * gridAlpha );
  a = mix( a, 1.0, line * gridAlpha );

  gl_FragColor = vec4( col, a * fade );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export function createGlass(opts = {}) {
  const c = (h) => new THREE.Color(h);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    envMap: { value: null },
    tReflect: { value: null },
    reflMatrix: { value: new THREE.Matrix4() },
    planarOn: { value: 0 },
    planeN: { value: new THREE.Vector3(0, 0, 1) },
    tint: { value: c(opts.tint || '#0b5c84') },
    deepTint: { value: c(opts.deepTint || '#0a4e74') },
    gridColor: { value: c(opts.gridColor || '#14384f') },
    gridSize: { value: new THREE.Vector2(...(opts.gridSize || [1.25, 2.0])) },
    gridOffset: { value: new THREE.Vector2(...(opts.gridOffset || [0, 0])) },
    gridWidth: { value: opts.gridWidth ?? 0.07 },
    gridAlpha: { value: opts.gridAlpha ?? 0.85 },
    alphaFacing: { value: opts.alphaFacing ?? 0.55 },
    alphaGrazing: { value: opts.alphaGrazing ?? 0.97 },
    reflStrength: { value: opts.reflStrength ?? 0.9 },
    reflBase: { value: opts.reflBase ?? 0.18 },
    envBoost: { value: opts.envBoost ?? 1.0 },
    fade: { value: 1 },
    sunDir: { value: new THREE.Vector3(0.5, 0.7, -0.4).normalize() },
    sunColor: { value: c('#fff3df') },
  }]);
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: vert, fragmentShader: frag,
    transparent: true, depthWrite: opts.depthWrite ?? false, side: THREE.DoubleSide, fog: true,
  });
  m.userData.isGlass = true;
  return m;
}

export function attachPlanar(material, refl, normal) {
  material.uniforms.tReflect.value = refl.texture;
  material.uniforms.reflMatrix.value = refl.textureMatrix;
  material.uniforms.planeN.value.copy(normal);
  material.userData.planar = refl;
}
