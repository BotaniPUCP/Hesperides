/**
 * TEMPORAL: grabación de la perspectiva del mapa para estudiar movimientos de cámara (por
 * ejemplo, saltos en el modo de administrador). Lógica pura: arma cada muestra, decide si la
 * vista cambió y escribe el archivo. Se quita junto con el botón «Grabar vista».
 */

type Vec3 = [number, number, number];

/** Lo que el visor sabe de su cámara en este instante, no el destino de un vuelo. */
export interface LivePerspective {
  position: Vec3;
  target: Vec3;
  fovDeg: number;
  /** Un vuelo programado (encuadrar, ir a un elemento) está moviendo la cámara. */
  flying: boolean;
  adminMode: boolean;
  cameraLatLon: [number, number];
  targetLatLon: [number, number];
}

export interface PerspectiveSample {
  /** Milisegundos desde que empezó la grabación. */
  tMs: number;
  /** Coordenadas de la escena en metros: x al este, y arriba, z al sur. */
  position: Vec3;
  target: Vec3;
  camera: { lat: number; lon: number; heightM: number };
  lookingAt: { lat: number; lon: number; heightM: number };
  distanceM: number;
  /** Hacia dónde mira, en grados desde el norte en sentido horario. */
  headingDeg: number;
  /** Negativo mirando hacia abajo. */
  pitchDeg: number;
  fovDeg: number;
  flying: boolean;
  adminMode: boolean;
}

/** Menos de un milímetro no se ve: no merece una muestra. */
const MIN_CHANGE_M = 0.001;

const round = (n: number, digits: number) => Number(n.toFixed(digits));
const roundVec = (v: Vec3): Vec3 => [round(v[0], 3), round(v[1], 3), round(v[2], 3)];
const DEG = 180 / Math.PI;

export function toSample(p: LivePerspective, tMs: number): PerspectiveSample {
  const [dx, dy, dz] = [p.target[0] - p.position[0], p.target[1] - p.position[1], p.target[2] - p.position[2]];
  const heading = (Math.atan2(dx, -dz) * DEG + 360) % 360;
  return {
    tMs: Math.round(tMs),
    position: roundVec(p.position),
    target: roundVec(p.target),
    camera: { lat: round(p.cameraLatLon[0], 7), lon: round(p.cameraLatLon[1], 7), heightM: round(p.position[1], 3) },
    lookingAt: { lat: round(p.targetLatLon[0], 7), lon: round(p.targetLatLon[1], 7), heightM: round(p.target[1], 3) },
    distanceM: round(Math.hypot(dx, dy, dz), 3),
    headingDeg: round(heading, 2),
    pitchDeg: round(Math.atan2(dy, Math.hypot(dx, dz)) * DEG, 2),
    fovDeg: p.fovDeg,
    flying: p.flying,
    adminMode: p.adminMode,
  };
}

const moved = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) >= MIN_CHANGE_M;

/** Si la muestra nueva se distingue de la anterior: así una vista quieta no llena el archivo. */
export function changed(previous: PerspectiveSample | undefined, next: PerspectiveSample): boolean {
  if (!previous) return true;
  return moved(previous.position, next.position) || moved(previous.target, next.target)
    || previous.flying !== next.flying || previous.adminMode !== next.adminMode || previous.fovDeg !== next.fovDeg;
}

const two = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;

export function recordingFile(samples: readonly PerspectiveSample[], startedAt: Date, endedAt: Date): { name: string; content: string } {
  const body = {
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    sampleCount: samples.length,
    note: 'Una muestra por cuadro en que la cámara cambió. Escena en metros: x este, y arriba, z sur.',
    samples,
  };
  return { name: `perspectiva-${stamp(startedAt)}.json`, content: JSON.stringify(body, null, 2) };
}
