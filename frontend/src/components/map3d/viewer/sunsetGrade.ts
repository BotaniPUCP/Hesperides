import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { WebGLRenderTarget } from 'three';

/**
 * Pase final del modo Atardecer, en una sola lectura de la escena:
 * oclusión ambiental de pantalla (sobre la profundidad del render principal, sin
 * volver a dibujar la escena), el ACES de three con la misma exposición que los
 * materiales, una gradación de hora dorada y una viñeta. Sale sin sRGB, como el mapa.
 */

/**
 * Un reflejo del sol en una superficie muy brillante puede pasar del máximo de media precisión (65504) y quedar
 * infinito; el desenfoque del bloom lo esparciría y la pantalla quedaría negra. Lo no finito pasa a 0 y lo
 * enorme se recorta: lo usan el bloom y este pase, los dos que leen la escena.
 */
export const SANITIZE_GLSL = /* glsl */ `
float sunsetFinite(float x) { return (x >= 0.0 && x < 1e4) ? x : (x >= 1e4 ? 64.0 : 0.0); }
vec3 sunsetFinite(vec3 c) { return vec3(sunsetFinite(c.r), sunsetFinite(c.g), sunsetFinite(c.b)); }
`;

export const GRADE = {
  vignette: 0.2,
  /** Oclusión: radio en metros, cuánto oscurece y hasta qué distancia de la cámara se ve (después la bruma manda). */
  ao: { radiusM: 5, strength: 1.35, farM: 1800 },
  /** Aristas que miran al sol: su brillo ámbar y hasta qué distancia se ven. */
  edge: { color: [1.0, 0.52, 0.2], strength: 0.55, farM: 1100 },
  /** Rayos de sol: cuánto avanza cada muestra hacia el sol, cuánto se apagan y su color. */
  rays: { samples: 36, density: 0.85, decay: 0.955, strength: 0.035, color: [1.0, 0.6, 0.28] },
  /** Bruma baja: escala de altura (m), densidad por metro y cuánto tapa como máximo. */
  lowFog: { heightM: 16, density: 0.0004, max: 0.38 },
} as const;

const fragmentShader = /* glsl */ `
${SANITIZE_GLSL}
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float uExposure;
uniform float uVignette;
uniform mat4 uProj;
uniform mat4 uInvProj;
uniform vec2 uResolution;
uniform vec3 uAo;
uniform vec3 uSunView;
uniform vec4 uEdge;
/** Sol en pantalla (uv) y cuánto se ve (0 si queda detrás de la cámara). */
uniform vec3 uSunScreen;
uniform vec3 uRayColor;
uniform mat4 uViewToWorld;
uniform float uGround;
uniform vec3 uFogColor;
varying vec2 vUv;
#define RAY_SAMPLES ${GRADE.rays.samples}


// El ACES de three (tonemapping_pars_fragment de r147).
vec3 gradeFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 gradeAces(vec3 color) {
  const mat3 inMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 outMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= uExposure / 0.6;
  color = outMat * gradeFit(inMat * color);
  return clamp(color, 0.0, 1.0);
}

vec3 viewPos(vec2 uv, float depth) {
  vec4 v = uInvProj * vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}

// Oclusión de pantalla (al estilo Alchemy): muestras en espiral alrededor del punto, con giro por píxel.
float ambientOcclusion(vec3 p, vec3 n) {
  float radius = uAo.x;
  float px = min(radius * uProj[1][1] * 0.5 * uResolution.y / -p.z, 48.0);
  if (px < 1.0) return 1.0;
  float spin = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float sum = 0.0;
  for (int i = 0; i < 12; i++) {
    float t = (float(i) + 0.5) / 12.0;
    float a = float(i) * 2.39996 + spin;
    vec2 uv = vUv + vec2(cos(a), sin(a)) * px * sqrt(t) / uResolution;
    float d = texture2D(tDepth, uv).x;
    if (d >= 1.0) continue;
    vec3 v = viewPos(uv, d) - p;
    float dist = length(v);
    float r = dist / radius;
    sum += max(dot(v, n) / (dist + 1e-3) - 0.1, 0.0) / (1.0 + r * r);
  }
  return clamp(1.0 - uAo.y * sum / 12.0, 0.0, 1.0);
}

// Rayos de sol: hacia el sol en pantalla se suma lo que es cielo; donde algo lo tapa, queda el haz de sombra.
vec3 sunRays() {
  if (uSunScreen.z <= 0.0) return vec3(0.0);
  vec2 stride = (uSunScreen.xy - vUv) * (${GRADE.rays.density.toFixed(3)} / float(RAY_SAMPLES));
  vec2 uv = vUv;
  float weight = 1.0, sum = 0.0;
  for (int i = 0; i < RAY_SAMPLES; i++) {
    uv += stride;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
    if (texture2D(tDepth, uv).x >= 1.0) {
      vec3 s = sunsetFinite(texture2D(tDiffuse, uv).rgb);
      sum += min(dot(s, vec3(0.2126, 0.7152, 0.0722)), 8.0) * weight;
    }
    weight *= ${GRADE.rays.decay.toFixed(3)};
  }
  return uRayColor * sum * uSunScreen.z / float(RAY_SAMPLES);
}

void main() {
  vec3 hdr = sunsetFinite(texture2D(tDiffuse, vUv).rgb);
  float depth = texture2D(tDepth, vUv).x;
  // En el cielo la posición sería infinita: se la acerca al plano lejano para que las derivadas no den NaN.
  vec3 p = viewPos(vUv, min(depth, 0.99999));
  // Las derivadas, fuera de cualquier rama.
  vec3 n = normalize(cross(dFdx(p), dFdy(p)));
  if (dot(n, -p) < 0.0) n = -n;
  if (uAo.z > 0.0 && depth < 1.0) {
    float fade = 1.0 - smoothstep(uAo.z * 0.5, uAo.z, -p.z);
    if (fade > 0.0) hdr *= mix(1.0, ambientOcclusion(p, n), fade);
  }
  // Aristas encendidas: donde la normal cambia de golpe (una esquina) y esa cara mira al sol.
  vec3 dn = fwidth(n);
  float crease = smoothstep(0.35, 1.0, dn.x + dn.y + dn.z);
  float sunny = smoothstep(0.05, 0.5, dot(n, uSunView));
  float near = 1.0 - smoothstep(uEdge.w * 0.6, uEdge.w, -p.z);
  if (depth < 1.0) hdr += uEdge.rgb * crease * sunny * near;
  // Bruma baja: más espesa cerca del suelo y con la distancia, del color del horizonte.
  if (depth < 1.0) {
    vec3 w = (uViewToWorld * vec4(p, 1.0)).xyz;
    float height = max(w.y - uGround, 0.0);
    float amount = (1.0 - exp(-length(p) * ${GRADE.lowFog.density})) * exp(-height / ${GRADE.lowFog.heightM.toFixed(1)});
    hdr = mix(hdr, uFogColor, min(amount, ${GRADE.lowFog.max}));
  }
  hdr += sunRays();
  vec3 c = gradeAces(hdr);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Hora dorada: sombras hacia el azul petróleo, luces hacia el ámbar.
  vec3 shadows = vec3(0.86, 0.95, 1.12), lights = vec3(1.1, 0.98, 0.84);
  c *= mix(shadows, lights, smoothstep(0.08, 0.75, l));
  c = mix(vec3(l), c, 1.18);
  c = clamp((c - 0.5) * 1.12 + 0.5, 0.0, 1.0);
  vec2 d = vUv - 0.5;
  c *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
  gl_FragColor = vec4(c, 1.0);
}`;

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** El pase lee también la profundidad del buffer que le toca y la cámara de este cuadro. */
export class SunsetGradePass extends ShaderPass {
  /** Sin `heavy` (pantallas táctiles), el pase no calcula la oclusión ambiental ni los rayos de sol. */
  constructor(private readonly camera: THREE.PerspectiveCamera, exposure: number, private readonly heavy = true) {
    super({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uExposure: { value: exposure },
        uVignette: { value: GRADE.vignette },
        uProj: { value: new THREE.Matrix4() },
        uInvProj: { value: new THREE.Matrix4() },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uAo: { value: new THREE.Vector3(GRADE.ao.radiusM, GRADE.ao.strength, heavy ? GRADE.ao.farM : 0) },
        uSunView: { value: new THREE.Vector3(0, 1, 0) },
        uEdge: { value: new THREE.Vector4(...GRADE.edge.color.map((v) => v * GRADE.edge.strength), GRADE.edge.farM) },
        uSunScreen: { value: new THREE.Vector3(0.5, 0.5, 0) },
        uRayColor: { value: new THREE.Vector3(...GRADE.rays.color.map((v) => v * GRADE.rays.strength)) },
        uViewToWorld: { value: new THREE.Matrix4() },
        uGround: { value: 0 },
        uFogColor: { value: new THREE.Color(1, 0.5, 0.25) },
      },
      vertexShader,
      fragmentShader,
    });
    Object.assign(this.material, { extensions: { derivatives: true } });
  }

  private readonly sunWorld = new THREE.Vector3(0, 1, 0);
  private readonly sunScreen = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  /** Hacia dónde está el sol (en la escena); el pase lo lleva a la vista en cada cuadro. */
  setSun(dir: THREE.Vector3) {
    this.sunWorld.copy(dir).normalize();
  }

  /** La cota de la calle y el color de la bruma baja (el del horizonte). */
  setGround(groundY: number, fog: THREE.Color) {
    this.uniforms.uGround.value = groundY;
    this.uniforms.uFogColor.value.copy(fog);
  }

  setExposure(exposure: number) {
    this.uniforms.uExposure.value = exposure;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.uProj.value.copy(this.camera.projectionMatrix);
    this.uniforms.uInvProj.value.copy(this.camera.projectionMatrixInverse);
    this.uniforms.uResolution.value.set(readBuffer.width, readBuffer.height);
    this.uniforms.uSunView.value.copy(this.sunWorld).transformDirection(this.camera.matrixWorldInverse);
    this.uniforms.uViewToWorld.value.copy(this.camera.matrixWorld);
    // El sol en pantalla: un punto lejano en su dirección. Se apaga detrás de la cámara y fuera del cuadro.
    const s = this.sunScreen.copy(this.sunWorld).multiplyScalar(5000).add(this.camera.position).project(this.camera);
    const facing = this.sunWorld.dot(this.camera.getWorldDirection(this.look));
    const inside = Math.max(Math.abs(s.x), Math.abs(s.y));
    const visible = !this.heavy || facing <= 0 ? 0 : THREE.MathUtils.clamp(1.6 - inside * 0.6, 0, 1);
    this.uniforms.uSunScreen.value.set(s.x * 0.5 + 0.5, s.y * 0.5 + 0.5, visible);
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}
