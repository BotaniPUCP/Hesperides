import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SANITIZE_GLSL, SunsetGradePass } from './sunsetGrade';
import { createSunsetSky, HORIZON } from './sunsetSky';

/**
 * Modo «Atardecer»: el campus a la hora dorada, como un render de arquitectura.
 * Cielo de atardecer con nubes (`sunsetSky.ts`), reflejos tomados de ese
 * mismo cielo, bruma cálida que funde lo lejano con el horizonte, una ciudad de
 * relleno alrededor para que el campus no flote, y posprocesado: bloom del sol y
 * de las ventanas encendidas, y una gradación cálida con viñeta.
 *
 * Con el modo encendido la escena se dibuja en un render target de media
 * precisión sin tone mapping; el pase final aplica el mismo ACES con la misma
 * exposición que los materiales (y, como el mapa, sin pasar a sRGB), así el color
 * de las fichas de fachada no cambia (SPEC-109 D-07).
 */

/** Hora del sol en el atardecer: unos 4° sobre el horizonte, por el oeste. */
export const SUNSET_HOUR = 17.72;

export const SUNSET = {
  exposure: 1.3,
  /** La bruma empieza pasado lo que se mira y se cierra hacia el horizonte: múltiplos de la distancia de la cámara. */
  fogNear: 0.85,
  fogFar: 5.5,
  ground: '#4c5338',
  groundRadiusM: 8000,
  /** Umbral en HDR (antes del tono): solo el sol, sus reflejos fuertes y las ventanas encendidas. */
  bloom: { strength: 0.55, radius: 0.5, threshold: 2.2 },
  /** Ciudad de relleno: manzanas de `blockM` separadas por calles de `streetM`, hasta `outerM` del centro. */
  city: { blockM: 70, streetM: 18, innerMarginM: 60, outerM: 4200, fill: 0.8, trees: 14000, lowWithinM: 700 },
  /** Cuánto se encienden las ventanas al atardecer respecto de la noche. */
  windowGlow: 5,
} as const;

/** Pseudoaleatorio con semilla: la ciudad de relleno no cambia entre cargas. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const noRaycast = () => undefined;
const DEG = Math.PI / 180;

/** La toma del modo: oblicua, mirando hacia el sol pero ladeada, como un render de arquitectura a contraluz. */
/** Cuánto puede bajar la cámara en el modo, en radianes desde la vertical (unos 6° sobre el horizonte). */
export const SUNSET_MAX_POLAR = 1.47;

export const SUNSET_VIEW = { yawDeg: 9, pitchDeg: 8, distanceM: 760, aheadM: 260 } as const;

/** Dónde poner la cámara para la toma del atardecer, mirando al centro del campus. */
export function sunsetPose(center: THREE.Vector3, sunDir: THREE.Vector3): { position: [number, number, number]; target: [number, number, number] } {
  const look = new THREE.Vector3(sunDir.x, 0, sunDir.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), SUNSET_VIEW.yawDeg * DEG);
  const pitch = SUNSET_VIEW.pitchDeg * DEG;
  // Se mira un poco más allá del centro: el campus llena la mitad de abajo y el cielo, la franja de arriba.
  const target = center.clone().addScaledVector(look, SUNSET_VIEW.aheadM);
  const position = target.clone()
    .addScaledVector(look, -SUNSET_VIEW.distanceM * Math.cos(pitch))
    .add(new THREE.Vector3(0, SUNSET_VIEW.distanceM * Math.sin(pitch), 0));
  return { position: position.toArray() as [number, number, number], target: target.toArray() as [number, number, number] };
}

interface Finish { roughness: number; clearcoat: number; sheen: number }

/**
 * Al atardecer el suelo es mate: con el sol rasante, el barniz y el terciopelo del césped y el brillo del
 * asfalto lo harían ver mojado. Guarda el acabado de siempre en el material para devolverlo.
 */
export function setGroundMatte(materials: THREE.Material[], on: boolean): void {
  materials.forEach((m) => {
    const s = m as THREE.MeshStandardMaterial & Partial<Finish>;
    const kept = (s.userData.finish ??= { roughness: s.roughness, clearcoat: s.clearcoat ?? 0, sheen: s.sheen ?? 0 }) as Finish;
    s.roughness = on ? 0.95 : kept.roughness;
    if (s.clearcoat !== undefined) s.clearcoat = on ? 0 : kept.clearcoat;
    if (s.sheen !== undefined) s.sheen = on ? 0 : kept.sheen;
  });
}

export interface Sunset {
  enabled: () => boolean;
  /** Prende o apaga el modo; `sunDir` es hacia dónde está el sol. */
  setEnabled: (on: boolean, sunDir: THREE.Vector3) => void;
  /** `distance`: de la cámara a lo que mira; la bruma se mide desde ahí. */
  render: (distance: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/** Suelo lejano y ciudad de relleno alrededor del campus: la bruma los funde con el horizonte. */
function createSurroundings(campus: THREE.Box3, groundY: number): THREE.Group {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(SUNSET.groundRadiusM, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: SUNSET.ground, roughness: 1 }),
  );
  ground.position.y = groundY - 0.3;
  ground.receiveShadow = true;
  ground.raycast = noRaycast;
  group.add(ground);

  const cx = (campus.min.x + campus.max.x) / 2, cz = (campus.min.z + campus.max.z) / 2;
  const half = [(campus.max.x - campus.min.x) / 2 + SUNSET.city.innerMarginM, (campus.max.z - campus.min.z) / 2 + SUNSET.city.innerMarginM];
  const rnd = seeded(0x51ce7);
  const inside = (x: number, z: number) => Math.abs(x - cx) < half[0] && Math.abs(z - cz) < half[1];
  /** Un punto al azar alrededor del campus; con `bias` mayor que 1, más denso cerca. */
  const around = (bias = 0.5): [number, number] => {
    for (;;) {
      const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), bias) * SUNSET.city.outerM;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!inside(x, z)) return [x, z];
    }
  };

  const palette = ['#a8705a', '#94654f', '#b5a189', '#a9a196', '#8a5a46', '#bdb09c', '#7f766d', '#9c907f'].map((c) => new THREE.Color(c));
  // Una trama de manzanas alineada con el campus: en cada manzana, de uno a cuatro edificios bajos y algún alto.
  const { blockM, streetM, outerM, fill } = SUNSET.city;
  const pitch = blockM + streetM, cells = Math.ceil(outerM / pitch);
  const lots: [number, number, number, number, number][] = [];
  for (let i = -cells; i <= cells; i++) {
    for (let j = -cells; j <= cells; j++) {
      const bx = cx + i * pitch, bz = cz + j * pitch;
      const r = Math.hypot(bx - cx, bz - cz);
      if (r > outerM || inside(bx, bz) || rnd() > fill * (1 - 0.35 * (r / outerM))) continue;
      const split = 1 + Math.floor(rnd() * 2);
      const w = blockM / split;
      for (let a = 0; a < split; a++) {
        for (let b = 0; b < split; b++) {
          if (rnd() < 0.12) continue;
          const x = bx - blockM / 2 + w * (a + 0.5), z = bz - blockM / 2 + w * (b + 0.5);
          if (inside(x, z)) continue;
          // Cerca del campus la ciudad es baja: no tapa la toma. Las torres quedan lejos, en la bruma.
          const near = Math.hypot(x - cx, z - cz) - Math.hypot(half[0], half[1]) < SUNSET.city.lowWithinM;
          const tall = !near && rnd() < 0.05;
          const h = tall ? 28 + rnd() * 50 : near ? 3 + rnd() * 6 : 4 + rnd() * 10 + (rnd() < 0.3 ? 6 : 0);
          lots.push([x, z, w * (0.62 + rnd() * 0.3), h, w * (0.62 + rnd() * 0.3)]);
        }
      }
    }
  }
  const blocks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    lots.length,
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  lots.forEach(([x, z, w, h, d], i) => {
    m.compose(p.set(x, groundY, z), q, s.set(w, h, d));
    blocks.setMatrixAt(i, m);
    // Lo bajo y cercano, más oscuro: no compite con el campus.
    const tint = palette[Math.floor(rnd() * palette.length)].clone();
    blocks.setColorAt(i, h < 10 ? tint.multiplyScalar(0.72) : tint);
  });
  blocks.castShadow = true;
  blocks.receiveShadow = true;
  blocks.raycast = noRaycast;
  group.add(blocks);

  const trees = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0).translate(0, 1, 0),
    new THREE.MeshStandardMaterial({ color: '#3f5a2c', roughness: 1, flatShading: true }),
    SUNSET.city.trees,
  );
  for (let i = 0; i < SUNSET.city.trees; i++) {
    // En las calles: sobre una línea de la trama, en un punto al azar de ella.
    let [x, z] = around(1.4);
    if (rnd() < 0.5) x = cx + (Math.round((x - cx) / pitch - 0.5) + 0.5) * pitch;
    else z = cz + (Math.round((z - cz) / pitch - 0.5) + 0.5) * pitch;
    const r = 3.5 + rnd() * 4.5;
    m.compose(p.set(x, groundY, z), q.identity(), s.set(r, r * (1.1 + rnd() * 0.6), r));
    trees.setMatrixAt(i, m);
  }
  trees.castShadow = true;
  trees.raycast = noRaycast;
  group.add(trees);
  group.visible = false;
  return group;
}

/**
 * `onChange`: algo llegó tarde (la foto de las nubes) y hay que redibujar. `lite`: en pantallas táctiles,
 * sin oclusión ambiental y con menos muestras de antialiasing (la memoria y la GPU de un celular).
 */
export function createSunset(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, campus: THREE.Box3,
  groundY: number, onChange: () => void = () => undefined, lite = false): Sunset {
  const { mesh: sky, setSun, setSunPower } = createSunsetSky(SUNSET.groundRadiusM, () => {
    // Las nubes también se reflejan: con el modo prendido, se vuelve a hornear el entorno.
    env?.dispose();
    env = null;
    if (on) {
      bakeEnvironment(bakedSun.clone());
      scene.environment = (env as THREE.WebGLRenderTarget | null)?.texture ?? null;
    }
    onChange();
  });
  sky.visible = false;
  const surroundings = createSurroundings(campus, groundY);
  scene.add(sky, surroundings);
  const fog = new THREE.Fog(HORIZON.clone(), 1000, 6000);

  const size = renderer.getSize(new THREE.Vector2());
  // Media precisión (el sol y las ventanas pasan del blanco), 4 muestras (el antialiasing que el compositor
  // le quita al renderer) y la profundidad, que el pase final usa para la oclusión ambiental.
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: lite ? 2 : 4 });
  target.depthTexture = new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType);
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const { strength, radius, threshold } = SUNSET.bloom;
  const bloom = new UnrealBloomPass(size.clone(), strength, radius, threshold);
  // Sus buffers, también de media precisión: si no, el brillo se corta en 1 y el sol queda como un disco pálido.
  [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]
    .forEach((rt) => { rt.texture.type = THREE.HalfFloatType; });
  // El filtro de brillo del bloom lee la escena: también lo sanea (ver SANITIZE_GLSL).
  const highPass = bloom.materialHighPassFilter;
  highPass.fragmentShader = SANITIZE_GLSL + highPass.fragmentShader
    .replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv ); texel.rgb = sunsetFinite( texel.rgb );');
  composer.addPass(bloom);
  const grade = new SunsetGradePass(camera, SUNSET.exposure, !lite);
  composer.addPass(grade);

  let on = false;
  let env: THREE.WebGLRenderTarget | null = null;

  const bakedSun = new THREE.Vector3(0, -1, 0);

  /** Los reflejos salen del mismo cielo: el vidrio y los techos toman el naranja del atardecer. Solo si el sol se movió. */
  function bakeEnvironment(sunDir: THREE.Vector3) {
    if (env && bakedSun.distanceToSquared(sunDir) < 1e-8) return;
    bakedSun.copy(sunDir);
    const only = new THREE.Scene();
    const copy = new THREE.Mesh(sky.geometry, sky.material);
    copy.scale.setScalar(1000);
    only.add(copy);
    const pmrem = new THREE.PMREMGenerator(renderer);
    env?.dispose();
    setSunPower(0);
    env = pmrem.fromScene(only, 0, 0.1, 2000);
    setSunPower(1);
    pmrem.dispose();
  }

  return {
    enabled: () => on,
    setEnabled(next, sunDir) {
      if (next) {
        setSun(sunDir);
        bakeEnvironment(sunDir);
        scene.environment = env?.texture ?? null;
        scene.fog = fog;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.toneMappingExposure = SUNSET.exposure;
        grade.setExposure(SUNSET.exposure);
      } else {
        // El entorno y la exposición del tema los repone stage.applyTheme, que el visor llama después.
        scene.fog = null;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
      }
      on = next;
      sky.visible = next;
      surroundings.visible = next;
    },
    render(distance) {
      sky.position.copy(camera.position);
      fog.near = distance * SUNSET.fogNear;
      fog.far = distance * SUNSET.fogFar;
      composer.render();
    },
    resize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose() {
      env?.dispose();
      target.dispose();
      composer.passes.forEach((pass) => (pass as unknown as { dispose?: () => void }).dispose?.());
      scene.remove(sky, surroundings);
    },
  };
}
