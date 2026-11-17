import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Árboles del modo Atardecer: los mismos ejemplares del catastro, con formas más
 * creíbles que las del mapa (que son las del prototipo y se quedan para el modo de
 * siempre). Copas de hoja ancha en racimo, con bultos y oscuras por debajo; palmeras
 * con tronco curvo y penacho de frondas recortadas; coníferas en pisos. Todo es
 * procedural e instanciado: no se descargan modelos.
 */

/** Capa de three que la cámara no dibuja pero el clic sí toca: las copas del modo de siempre, en el Atardecer. */
export const PICK_ONLY_LAYER = 1;

/** Pseudoaleatorio con semilla. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Ruido de valor 3D barato, de -1 a 1: los bultos de la copa. */
function lumpNoise(x: number, y: number, z: number, seed: number): number {
  const h = (i: number, j: number, k: number) => {
    const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 13.13) * 43758.5453;
    return n - Math.floor(n);
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const fx = f(x - xi), fy = f(y - yi), fz = f(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dy: number, dz: number) => lerp(h(xi, yi + dy, zi + dz), h(xi + 1, yi + dy, zi + dz), fx);
  return lerp(lerp(c(0, 0), c(1, 0), fy), lerp(c(0, 1), c(1, 1), fy), fz) * 2 - 1;
}

/** Color por vértice: más oscuro abajo y adentro (oclusión), con algo de variación. */
function shadeVertices(geo: THREE.BufferGeometry, rnd: () => number, base = 0.5) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const out = Math.hypot(pos.getX(i), pos.getZ(i));
    const ao = base + (1 - base) * THREE.MathUtils.smoothstep(y + out * 0.35, -0.7, 0.75);
    const v = ao * (0.92 + rnd() * 0.16);
    colors.set([v, v, v], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Copa de hoja ancha en la esfera unidad: un racimo de esferas desiguales, fundidas y con bultos. El
 * modo de siempre usa una sola esfera con la misma escala, así que se apoya igual.
 */
export function broadleafCrown(seed: number, detail = 2, minLobes = 7): THREE.BufferGeometry {
  const rnd = seeded(seed);
  const parts: THREE.BufferGeometry[] = [];
  const lobes = minLobes + Math.floor(rnd() * 4);
  for (let i = 0; i < lobes; i++) {
    const a = rnd() * Math.PI * 2, e = (rnd() - 0.35) * 1.2, d = 0.25 + rnd() * 0.3;
    const r = 0.38 + rnd() * 0.22;
    parts.push(new THREE.IcosahedronGeometry(r, detail).translate(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d * 0.8, Math.sin(a) * Math.cos(e) * d));
  }
  const geo = mergeBufferGeometries(parts) as THREE.BufferGeometry;
  parts.forEach((p) => p.dispose());
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = lumpNoise(v.x * 3.2, v.y * 3.2, v.z * 3.2, seed) * 0.6 + lumpNoise(v.x * 8, v.y * 8, v.z * 8, seed + 7) * 0.4;
    v.multiplyScalar(1 + n * 0.12);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  shadeVertices(geo, rnd, 0.42);
  return geo;
}

/** Conífera en la unidad (base en 0, punta en 1): tres pisos de follaje algo torcidos. */
export function coniferCrown(seed: number): THREE.BufferGeometry {
  const rnd = seeded(seed);
  const tiers = [0, 0.3, 0.56].map((y, i) => new THREE.ConeGeometry(1 - i * 0.24, 0.55 - i * 0.08, 9, 2)
    .rotateY(rnd() * Math.PI).translate((rnd() - 0.5) * 0.06, y + (0.55 - i * 0.08) / 2, (rnd() - 0.5) * 0.06));
  const geo = mergeBufferGeometries(tiers) as THREE.BufferGeometry;
  geo.computeVertexNormals();
  shadeVertices(geo, rnd, 0.5);
  return geo;
}

/** Tronco en la unidad (de 0 a 1 de alto, radio 1 abajo), cónico y con una curva suave. */
export function trunkGeometry(bend: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.62, 1, 1, 8, 6).translate(0, 0.5, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) + bend * y * y);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Penacho de palmera en la unidad (radio 1): frondas que salen hacia arriba y caen en arco, cada una una
 * cinta que la textura recorta en foliolos.
 */
export function palmCrown(seed: number): THREE.BufferGeometry {
  const rnd = seeded(seed);
  const fronds: THREE.BufferGeometry[] = [];
  const count = 13;
  const SEG = 10;
  for (let f = 0; f < count; f++) {
    const yaw = (f / count) * Math.PI * 2 + rnd() * 0.3;
    const lift = 0.55 + rnd() * 0.5 - (f % 3) * 0.25; // unas suben, otras ya cuelgan
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const reach = t;
      const y = Math.sin(lift) * t - t * t * 0.75;
      const w = 0.2 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.6) + 0.015;
      // Cinta en el plano de la fronda, algo plegada en V a lo largo del raquis.
      const along = new THREE.Vector3(Math.cos(yaw) * reach * Math.cos(lift * 0.5), y, Math.sin(yaw) * reach * Math.cos(lift * 0.5));
      const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(w);
      const fold = new THREE.Vector3(0, -w * 0.35, 0);
      positions.push(...along.clone().sub(side).add(fold).toArray(), ...along.clone().add(side).add(fold).toArray());
      uvs.push(0, t, 1, t);
      if (s < SEG) {
        const i = s * 2;
        index.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    fronds.push(g);
  }
  const geo = mergeBufferGeometries(fronds) as THREE.BufferGeometry;
  shadeVertices(geo, rnd, 0.55);
  return geo;
}

/** El material de las copas de hojas: recortadas por la textura, por las dos caras y también en la sombra. */
export function leafMaterials(texture: THREE.Texture, base?: THREE.MeshStandardMaterial): { material: THREE.MeshStandardMaterial; depth: THREE.MeshDepthMaterial } {
  const material = base ?? new THREE.MeshStandardMaterial({ roughness: 0.8 });
  Object.assign(material, { map: texture, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, normalMap: null });
  material.needsUpdate = true;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 });
  return { material, depth };
}

/** Textura de una fronda: raquis al centro y foliolos en diagonal; el alfa recorta lo que no es hoja. */
export function frondTexture(): THREE.Texture {
  const W = 64, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  // Sin canvas 2D (pruebas, navegadores raros), una textura vacía: las frondas no se ven, pero nada se rompe.
  if (!c) return texture;
  c.clearRect(0, 0, W, H);
  c.strokeStyle = '#ffffff';
  c.lineCap = 'round';
  const rnd = seeded(0xfa1a);
  for (let y = 8; y < H - 4; y += 4) {
    const len = (W / 2 - 3) * (0.75 + rnd() * 0.25);
    c.lineWidth = 2.2;
    for (const dir of [-1, 1]) {
      c.beginPath();
      c.moveTo(W / 2, H - y);
      c.lineTo(W / 2 + dir * len, H - y - len * 0.55);
      c.stroke();
    }
  }
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(W / 2, H);
  c.lineTo(W / 2, 0);
  c.stroke();
  return texture;
}

/**
 * Copa frondosa en la esfera unidad: tarjetas de hojas repartidas sobre una forma con bultos, mirando hacia
 * afuera y algo giradas, más algunas adentro para que no se vea hueca. Las normales son las de la copa
 * (hacia afuera), así la luz es suave como en un follaje real; la textura recorta las hojas.
 */
export function leafyCrown(seed: number, cards = 70): THREE.BufferGeometry {
  const rnd = seeded(seed);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], col: number[] = [];
  const out = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), c = new THREE.Vector3();
  const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (let k = 0; k < cards; k++) {
    // Un punto de la copa: en la superficie con bultos o, uno de cada cinco, más adentro.
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    out.set(r * Math.cos(a), z * 0.85, r * Math.sin(a)).normalize();
    const bump = 1 + lumpNoise(out.x * 2.6, out.y * 2.6, out.z * 2.6, seed) * 0.22;
    const inner = k % 5 === 0;
    const depth = inner ? 0.45 + rnd() * 0.3 : 0.82 + rnd() * 0.12;
    c.copy(out).multiplyScalar(bump * depth);
    // La tarjeta: perpendicular a la normal, girada al azar, de 0,45 a 0,7 de lado.
    t1.set(-out.z, 0, out.x);
    if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
    t1.normalize().applyAxisAngle(out, rnd() * Math.PI);
    t2.crossVectors(out, t1).normalize();
    const half = (0.45 + rnd() * 0.25) / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => c.clone().addScaledVector(t1, u * half).addScaledVector(t2, v * half));
    // Más oscuro abajo y adentro: la sombra propia de la copa.
    const shade = (0.62 + 0.38 * THREE.MathUtils.smoothstep(out.y, -0.8, 0.7)) * (inner ? 0.75 : 1) * (0.9 + rnd() * 0.2);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(corners[i].x, corners[i].y, corners[i].z);
      nor.push(out.x, out.y, out.z);
      uv.push(UV[i][0], UV[i][1]);
      col.push(shade, shade, shade);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

/** Un racimo de hojas: elipses en distintos verdes claros (el color del ejemplar las tiñe) sobre fondo transparente. */
export function leafTexture(): THREE.Texture {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const c = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  if (!c) return texture;
  const rnd = seeded(0x1eaf);
  for (let i = 0; i < 150; i++) {
    // Más hojas al centro: el borde del racimo queda recortado.
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * S * 0.42;
    const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
    const g = 190 + Math.floor(rnd() * 65);
    c.fillStyle = `rgb(${Math.floor(g * 0.82)},${g},${Math.floor(g * 0.62)})`;
    c.beginPath();
    c.ellipse(x, y, 4 + rnd() * 4, 2 + rnd() * 2, rnd() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  return texture;
}
