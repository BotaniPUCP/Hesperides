import * as THREE from 'three';
import { seeded } from './sunsetTrees';

/**
 * La vida de las calles del entorno en el modo Atardecer, sobre las vías de OSM:
 * veredas, líneas discontinuas al centro de las avenidas, postes con su luz
 * cálida y su charco en el suelo, y autos en sus carriles con faros y luces
 * traseras. Las luces van en HDR: el bloom las hace brillar.
 */

export const STREETS = {
  sidewalkM: 2.5,
  sidewalk: '#a39582',
  /** Veredas desde este ancho (los caminos de servicio de un estacionamiento no llevan). */
  sidewalkFromM: 7,
  marking: '#d6cfbd',
  /** Avenidas con línea al centro y autos: desde este ancho; postes, desde `lampFromM`. */
  avenueM: 10,
  lampFromM: 8,
  lampEveryM: 30,
  lampHeightM: 8,
  lampLight: new THREE.Color().setRGB(9, 5.6, 2.6),
  pool: new THREE.Color().setRGB(0.55, 0.32, 0.12),
  poolRadiusM: 7,
  /** Un auto cada tanto por carril. */
  carEveryM: 34,
  carColors: ['#e8e6e1', '#b9bcc0', '#2b2d31', '#8d1f1f', '#23395d', '#6f7378', '#d9d4c7', '#3d4a3a'],
  headlight: new THREE.Color().setRGB(7, 6.6, 5.4),
  taillight: new THREE.Color().setRGB(6, 0.25, 0.15),
} as const;

type ToScene = (x: number, y: number) => [number, number];

interface Segment { ax: number; ay: number; bx: number; by: number; len: number; dx: number; dy: number; w: number }

function segmentsOf(vias: number[][]): Segment[] {
  const out: Segment[] = [];
  for (const v of vias) {
    for (let i = 1; i + 3 < v.length; i += 2) {
      const [ax, ay, bx, by] = [v[i], v[i + 1], v[i + 2], v[i + 3]];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 0.5) continue;
      out.push({ ax, ay, bx, by, len, dx: (bx - ax) / len, dy: (by - ay) / len, w: v[0] });
    }
  }
  return out;
}

/** Un rectángulo a lo largo de un segmento: de `t0` a `t1` metros desde su inicio y de `s0` a `s1` de costado. */
function pushStrip(pos: number[], s: Segment, t0: number, t1: number, s0: number, s1: number, y: number, at: ToScene) {
  const nx = -s.dy, ny = s.dx;
  const p = (t: number, o: number) => at(s.ax + s.dx * t + nx * o, s.ay + s.dy * t + ny * o);
  const [a, b, c, d] = [p(t0, s0), p(t1, s0), p(t1, s1), p(t0, s1)];
  pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1], a[0], y, a[1], c[0], y, c[1], d[0], y, d[1]);
}

function flatMesh(pos: number[], material: THREE.Material): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.raycast = () => undefined;
  return mesh;
}

/** Un degradé radial para el charco de luz de los postes. */
function poolTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  if (c) {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number, shadow = false): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = shadow;
  mesh.raycast = () => undefined;
  return mesh;
}

/**
 * Arma las calles. `blocked(x, y)`: el punto cae donde no va nada (el campus); `groundY`: la cota de la
 * calzada.
 */
export function buildStreets(vias: number[][], at: ToScene, blocked: (x: number, y: number) => boolean, groundY: number): THREE.Group {
  const group = new THREE.Group();
  const rnd = seeded(0x57ee7);
  const segs = segmentsOf(vias).filter((s) => !blocked((s.ax + s.bx) / 2, (s.ay + s.by) / 2));

  // Veredas y líneas al centro.
  const walk: number[] = [], paint: number[] = [];
  for (const s of segs) {
    const half = s.w / 2;
    if (s.w >= STREETS.sidewalkFromM) {
      pushStrip(walk, s, 0, s.len, half, half + STREETS.sidewalkM, groundY + 0.1, at);
      pushStrip(walk, s, 0, s.len, -half - STREETS.sidewalkM, -half, groundY + 0.1, at);
    }
    if (s.w >= STREETS.avenueM) {
      for (let t = 1; t + 3 < s.len; t += 9) pushStrip(paint, s, t, t + 3, -0.09, 0.09, groundY + 0.09, at);
    }
  }
  group.add(flatMesh(walk, new THREE.MeshStandardMaterial({ color: STREETS.sidewalk, roughness: 0.9, side: THREE.DoubleSide })));
  group.add(flatMesh(paint, new THREE.MeshStandardMaterial({ color: STREETS.marking, roughness: 0.7, side: THREE.DoubleSide })));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  /** El ángulo en la escena de una dirección (dx, dy) del archivo: la z de la escena va al sur. */
  const yawOf = (dx: number, dy: number) => Math.atan2(dy, dx);

  // Postes: en las avenidas, alternando de vereda.
  const lamps: [number, number, number][] = [];
  for (const s of segs) {
    if (s.w < STREETS.lampFromM) continue;
    let side = 1;
    for (let t = rnd() * STREETS.lampEveryM; t < s.len; t += STREETS.lampEveryM) {
      const off = (s.w / 2 + 0.6) * side;
      const x = s.ax + s.dx * t - s.dy * off, y = s.ay + s.dy * t + s.dx * off;
      // La luminaria mira hacia la calzada: del lado +n, hacia -n.
      if (!blocked(x, y)) lamps.push([x, y, yawOf(s.dx, s.dy) + (side > 0 ? -Math.PI / 2 : Math.PI / 2)]);
      side = -side;
    }
  }
  const pole = instanced(new THREE.CylinderGeometry(0.07, 0.11, 1, 5).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#3a3a3c', roughness: 0.6, metalness: 0.4 }), lamps.length);
  const head = instanced(new THREE.BoxGeometry(0.9, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: STREETS.lampLight }), lamps.length);
  const pool = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: poolTexture(), color: STREETS.pool, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }), lamps.length);
  lamps.forEach(([x, y, yaw], k) => {
    const [sx, sz] = at(x, y);
    q.setFromAxisAngle(up, yaw);
    m.compose(p.set(sx, groundY, sz), q, sc.set(1, STREETS.lampHeightM, 1));
    pole.setMatrixAt(k, m);
    // La luminaria sale un poco hacia la calzada.
    const reach = 0.9;
    m.compose(p.set(sx + Math.cos(yaw) * reach, groundY + STREETS.lampHeightM, sz - Math.sin(yaw) * reach), q, sc.set(1, 1, 1));
    head.setMatrixAt(k, m);
    m.compose(p.set(sx + Math.cos(yaw) * 2.5, groundY + 0.14, sz - Math.sin(yaw) * 2.5), q, sc.set(STREETS.poolRadiusM * 2, 1, STREETS.poolRadiusM * 2));
    pool.setMatrixAt(k, m);
  });
  group.add(pole, head, pool);

  // Autos: en las avenidas, un carril por sentido, con faros adelante y luces rojas atrás.
  const cars: [number, number, number][] = [];
  for (const s of segs) {
    if (s.w < STREETS.avenueM - 2) continue;
    for (const dir of [1, -1]) {
      for (let t = rnd() * STREETS.carEveryM; t < s.len; t += STREETS.carEveryM * (0.6 + rnd() * 0.8)) {
        const off = -(s.w / 4) * dir;
        const x = s.ax + s.dx * t - s.dy * off, y = s.ay + s.dy * t + s.dx * off;
        if (!blocked(x, y)) cars.push([x, y, yawOf(s.dx * dir, s.dy * dir)]);
      }
    }
  }
  const body = instanced(new THREE.BoxGeometry(4.4, 0.75, 1.8).translate(0, 0.65, 0), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.5 }), cars.length, true);
  const cabin = instanced(new THREE.BoxGeometry(2.3, 0.6, 1.62).translate(-0.25, 1.32, 0),
    new THREE.MeshStandardMaterial({ color: '#1d2126', roughness: 0.15, metalness: 0.6 }), cars.length);
  const lightGeo = new THREE.BoxGeometry(0.06, 0.16, 0.34);
  const heads = instanced(lightGeo, new THREE.MeshBasicMaterial({ color: STREETS.headlight }), cars.length * 2);
  const tails = instanced(lightGeo, new THREE.MeshBasicMaterial({ color: STREETS.taillight }), cars.length * 2);
  const local = new THREE.Vector3();
  cars.forEach(([x, y, yaw], k) => {
    const [sx, sz] = at(x, y);
    q.setFromAxisAngle(up, yaw);
    m.compose(p.set(sx, groundY, sz), q, sc.set(1, 1, 1));
    body.setMatrixAt(k, m);
    cabin.setMatrixAt(k, m);
    body.setColorAt(k, new THREE.Color(STREETS.carColors[Math.floor(rnd() * STREETS.carColors.length)]));
    [-0.62, 0.62].forEach((side, j) => {
      local.set(2.21, 0.72, side).applyQuaternion(q);
      m.compose(p.set(sx + local.x, groundY + local.y, sz + local.z), q, sc.set(1, 1, 1));
      heads.setMatrixAt(k * 2 + j, m);
      local.set(-2.21, 0.78, side).applyQuaternion(q);
      m.compose(p.set(sx + local.x, groundY + local.y, sz + local.z), q, sc.set(1, 1, 1));
      tails.setMatrixAt(k * 2 + j, m);
    });
  });
  group.add(body, cabin, heads, tails);
  group.userData.counts = { lamps: lamps.length, cars: cars.length };
  return group;
}
