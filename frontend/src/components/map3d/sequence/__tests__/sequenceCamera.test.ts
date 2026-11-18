import type { CameraPose } from '../../viewer/cameraRig';
import { LOGO_ANCHOR_SCREEN, LOGO_ANCHORED_S, LOGO_DRIFT_FROM_S } from '../logoMotion';
import { cameraPoseAt, SEQUENCE_DURATION_S } from '../sequencePath';
import { GAZE_PEAK_S, GAZE_START_S, shotPoseAt } from '../sequenceCamera';

type Vec3 = [number, number, number];
const ASPECT = 16 / 9;
const HALF_FOV_TAN = Math.tan((38 * Math.PI) / 360);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => { const l = Math.sqrt(dot(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; };

/** Dónde cae un punto del espacio en el cuadro de esa pose, como lo dibuja la cámara (lookAt con el arriba del mundo). */
function screenOf(pose: CameraPose, point: Vec3, aspect: number) {
  const f = unit(sub(pose.target, pose.position)), r = unit(cross(f, [0, 1, 0])), u = cross(r, f);
  const v = sub(point, pose.position), z = dot(v, f);
  return { x: 0.5 + dot(v, r) / z / (HALF_FOV_TAN * aspect) / 2, y: 0.5 - dot(v, u) / z / HALF_FOV_TAN / 2 };
}

const angleBetween = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, dot(unit(a), unit(b)))) * (180 / Math.PI);
const gazeOf = (p: CameraPose) => sub(p.target, p.position);

describe('la mirada de la cámara en la toma', () => {
  it('gira en el mismo tramo en que el logo se desliza', () => {
    expect(GAZE_START_S).toBe(LOGO_DRIFT_FROM_S);
    expect(GAZE_PEAK_S).toBe(LOGO_ANCHORED_S);
  });

  it('antes del giro y al final es la ruta de siempre', () => {
    for (const t of [0, 1, GAZE_START_S - 1e-6]) expect(shotPoseAt(t, ASPECT)).toEqual(cameraPoseAt(t));
    expect(shotPoseAt(SEQUENCE_DURATION_S, ASPECT)).toEqual(cameraPoseAt(SEQUENCE_DURATION_S));
  });

  it.each([16 / 9, 4 / 3])('en el pico, lo que estaba al centro queda donde termina el logo (aspecto %f)', (aspect) => {
    const base = cameraPoseAt(GAZE_PEAK_S);
    const ahead = base.position.map((p, i) => p + (base.target[i] - p) * 2) as Vec3;
    const seen = screenOf(shotPoseAt(GAZE_PEAK_S, aspect), ahead, aspect);
    expect(seen.x).toBeCloseTo(LOGO_ANCHOR_SCREEN.x, 2);
    expect(seen.y).toBeCloseTo(LOGO_ANCHOR_SCREEN.y, 2);
  });

  it('el giro es sutil: unos 10° en el pico y vuelve poco a poco', () => {
    const peak = angleBetween(gazeOf(shotPoseAt(GAZE_PEAK_S, ASPECT)), gazeOf(cameraPoseAt(GAZE_PEAK_S)));
    expect(peak).toBeGreaterThan(8);
    expect(peak).toBeLessThan(14);
    const later = angleBetween(gazeOf(shotPoseAt(6, ASPECT)), gazeOf(cameraPoseAt(6)));
    expect(later).toBeLessThan(peak);
    expect(later).toBeGreaterThan(peak * 0.5);
  });

  it('la cámara no cambia de lugar: solo hacia dónde mira', () => {
    for (const t of [GAZE_PEAK_S, 6, 9]) expect(shotPoseAt(t, ASPECT).position).toEqual(cameraPoseAt(t).position);
  });

  it('gira sin tirones: menos de 0,5° por cuadro', () => {
    for (let t = 0; t < SEQUENCE_DURATION_S; t += 1 / 60) {
      const a = shotPoseAt(t, ASPECT), b = shotPoseAt(t + 1 / 60, ASPECT);
      const turn = angleBetween(gazeOf(a), gazeOf(b)) - angleBetween(gazeOf(cameraPoseAt(t)), gazeOf(cameraPoseAt(t + 1 / 60)));
      expect(Math.abs(turn)).toBeLessThan(0.5);
    }
  });
});

describe('la ruta corrida al noroeste (D-15)', () => {
  /** El edificio que Jean Piero marcó en el cuadro del segundo 6, a nivel del suelo. */
  const BUILDING: Vec3 = [-30, 22, 265];

  it('a los 6 s el edificio cae abajo a la derecha', () => {
    const seen = screenOf(shotPoseAt(6, ASPECT), BUILDING, ASPECT);
    expect(seen.x).toBeGreaterThan(0.8);
    expect(seen.x).toBeLessThan(0.92);
    expect(seen.y).toBeGreaterThan(0.8);
    expect(seen.y).toBeLessThan(0.92);
  });

  it('al terminar el desenfoque ya va hacia esa esquina, y a los 7 s salió del cuadro', () => {
    const early = screenOf(shotPoseAt(4.9, ASPECT), BUILDING, ASPECT);
    expect(early.x).toBeGreaterThan(0.55);
    expect(early.y).toBeGreaterThan(0.55);
    const late = screenOf(shotPoseAt(7, ASPECT), BUILDING, ASPECT);
    expect(late.x > 1 || late.y > 1).toBe(true);
  });
});
