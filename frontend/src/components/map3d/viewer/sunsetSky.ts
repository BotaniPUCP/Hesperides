import * as THREE from 'three';

/**
 * Cielo del modo Atardecer, dirigido a mano en vez de físico (el Sky de three,
 * Preetham, queda beige a esta hora): cenit azul grisáceo, horizonte ámbar,
 * halo y disco del sol, y una capa de nubes procedurales iluminadas desde el sol
 * por debajo. Los colores van en lineal y antes de la exposición: el pase final
 * los lleva por el mismo ACES que la escena.
 */

/** El color del horizonte: también el de la bruma, para que el suelo lejano se funda con el cielo. */
export const HORIZON = new THREE.Color().setRGB(1.0, 0.5, 0.24);

const SKY_GLSL = {
  vertex: /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w; // en el plano lejano: detrás de todo
}`,
  fragment: /* glsl */ `
uniform vec3 sunDir;
uniform vec3 horizon;
/** 1 en pantalla; menos al hornear los reflejos, para que el disco no deje manchas en el suelo. */
uniform float sunPower;
varying vec3 vDir;

float skyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skyNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), u.x), mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float skyFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * skyNoise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float toward = max(dot(dir, sunDir), 0.0);
  // Degradado: horizonte ámbar, una franja durazno, cenit azul grisáceo. Del lado del sol todo es más cálido.
  vec3 zenith = vec3(0.12, 0.17, 0.32);
  vec3 band = mix(vec3(0.6, 0.36, 0.34), vec3(1.0, 0.46, 0.2), toward);
  // Justo en el horizonte el cielo es la bruma: sin costura con el suelo lejano.
  vec3 low = horizon * (1.0 + 0.2 * toward);
  vec3 col = mix(horizon, low, smoothstep(0.0, 0.02, h));
  col = mix(col, band, smoothstep(0.02, 0.16, h));
  col = mix(col, zenith, smoothstep(0.1, 0.65, h));
  // Halo ancho, halo cercano y disco.
  col += vec3(1.2, 0.42, 0.08) * pow(toward, 5.0) * 0.6;
  col += vec3(1.6, 0.6, 0.14) * pow(toward, 30.0) * 0.55;
  col += vec3(2.4, 1.3, 0.55) * pow(toward, 90.0) * sunPower;
  col += vec3(70.0, 44.0, 18.0) * smoothstep(0.99975, 0.99988, toward) * sunPower;
  // Nubes en un plano alto: estratocúmulos en jirones, con el borde del lado del sol encendido.
  if (h > 0.0) {
    vec2 uv = dir.xz / (h + 0.06) * 0.9;
    float n = skyFbm(uv * vec2(0.9, 2.6) + vec2(3.0, 1.0));
    float cover = smoothstep(0.42, 0.7, n) * smoothstep(0.015, 0.07, h) * (1.0 - smoothstep(0.5, 0.9, h));
    // Panza violácea lejos del sol, borde encendido cerca; lo más denso, más oscuro.
    float edge = smoothstep(0.46, 0.6, n) - smoothstep(0.62, 0.8, n);
    vec3 belly = vec3(0.26, 0.17, 0.22);
    vec3 lit = mix(belly, vec3(1.9, 0.8, 0.3), pow(toward, 9.0));
    lit += vec3(1.3, 0.52, 0.18) * edge * (0.35 + 0.9 * pow(toward, 3.0));
    col = mix(col, lit, cover * 0.9);
  } else {
    // Bajo el horizonte (detrás del suelo lejano): la bruma.
    col = horizon;
  }
  gl_FragColor = vec4(col, 1.0);
}`,
};

export interface SunsetSky {
  mesh: THREE.Mesh;
  setSun: (dir: THREE.Vector3) => void;
  /** Para hornear los reflejos: sin disco ni halo cercano. */
  setSunPower: (power: number) => void;
}

export function createSunsetSky(radius: number): SunsetSky {
  const material = new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: new THREE.Vector3(0, 1, 0) }, horizon: { value: HORIZON.clone() }, sunPower: { value: 1 } },
    vertexShader: SKY_GLSL.vertex,
    fragmentShader: SKY_GLSL.fragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  mesh.scale.setScalar(radius);
  mesh.frustumCulled = false;
  mesh.renderOrder = -20;
  mesh.raycast = () => undefined;
  return {
    mesh,
    setSun: (dir) => material.uniforms.sunDir.value.copy(dir).normalize(),
    setSunPower: (power) => { material.uniforms.sunPower.value = power; },
  };
}
