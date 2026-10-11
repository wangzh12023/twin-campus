// Gradient sky dome with soft procedural cumulus near the horizon.
import * as THREE from 'three';

const vert = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.99999;
}`;

const frag = /* glsl */`
uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; uniform vec3 below; uniform vec3 cloud; uniform vec3 cloudShade;
uniform vec3 sunDir; uniform float time; uniform float cloudAmount;
varying vec3 vDir;
float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ); }
float noise( vec2 p ) {
  vec2 i = floor( p ); vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), u.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), u.x ), u.y );
}
float fbm( vec2 p ) { float v = 0.0; float a = 0.5; for ( int i = 0; i < 6; i++ ) { v += a * noise( p ); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  vec3 col = mix( horizon, mid, smoothstep( 0.0, 0.22, h ) );
  col = mix( col, zenith, smoothstep( 0.22, 0.85, h ) );
  col = mix( col, below, smoothstep( 0.0, -0.08, h ) );
  // clouds projected on a flat layer
  vec2 uv = d.xz / max( h + 0.08, 0.02 );
  float n = fbm( uv * 0.55 + vec2( time * 0.004, 0.0 ) );
  float n2 = fbm( uv * 1.4 - vec2( 0.0, time * 0.003 ) );
  float c = smoothstep( 0.52 - cloudAmount, 0.78 - cloudAmount, n * 0.75 + n2 * 0.35 );
  float band = smoothstep( 0.01, 0.07, h ) * ( 1.0 - smoothstep( 0.32, 0.6, h ) );
  vec3 cc = mix( cloudShade, cloud, smoothstep( 0.45, 0.9, n2 ) );
  col = mix( col, cc, c * band * 0.9 );
  float s = max( dot( d, sunDir ), 0.0 );
  col += vec3( 1.0, 0.96, 0.9 ) * pow( s, 64.0 ) * 0.25;
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSky() {
  const c = (h) => new THREE.Color(h);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      zenith: { value: c('#3a6cc4') }, mid: { value: c('#78a0dc') }, horizon: { value: c('#c4d6ee') },
      below: { value: c('#dfe6ee') }, cloud: { value: c('#f7f9fc') }, cloudShade: { value: c('#c9d3e2') },
      sunDir: { value: new THREE.Vector3(0.5, 0.7, -0.4).normalize() }, time: { value: 0 }, cloudAmount: { value: 0.1 },
    },
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  sky.name = 'sky';
  return sky;
}
