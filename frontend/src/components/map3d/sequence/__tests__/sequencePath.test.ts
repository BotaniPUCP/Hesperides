import { cameraPoseAt, SEQUENCE_DURATION_S, SEQUENCE_END, SEQUENCE_START, sequenceProgress } from '../sequencePath';

type Vec3 = [number, number, number];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('trayectoria de la secuencia', () => {
  it('empieza en la pose de inicio y termina en la final', () => {
    expect(cameraPoseAt(0)).toEqual(SEQUENCE_START);
    const end = cameraPoseAt(SEQUENCE_DURATION_S);
    expect(dist(end.position, SEQUENCE_END.position)).toBeLessThan(1e-9);
    expect(dist(end.target, SEQUENCE_END.target)).toBeLessThan(1e-9);
  });

  it('antes del inicio y después del final se queda en los extremos', () => {
    expect(cameraPoseAt(-3)).toEqual(cameraPoseAt(0));
    expect(cameraPoseAt(SEQUENCE_DURATION_S + 5)).toEqual(cameraPoseAt(SEQUENCE_DURATION_S));
  });

  it('el avance arranca en movimiento, nunca retrocede y frena hasta detenerse', () => {
    const h = 1e-4;
    const speedAt = (k: number) => (sequenceProgress(k + h) - sequenceProgress(k)) / h;
    expect(speedAt(0)).toBeGreaterThan(0.5);
    expect(Math.abs(speedAt(1 - h))).toBeLessThan(1e-3);
    for (let k = 0; k < 1; k += 0.01) expect(sequenceProgress(k + 0.01)).toBeGreaterThanOrEqual(sequenceProgress(k));
    expect(sequenceProgress(0)).toBe(0);
    expect(sequenceProgress(1)).toBe(1);
  });

  it('se mueve sin saltos: dos cuadros seguidos quedan a pocos metros', () => {
    const step = 1 / 60;
    for (let t = 0; t < SEQUENCE_DURATION_S; t += step) {
      expect(dist(cameraPoseAt(t).position, cameraPoseAt(t + step).position)).toBeLessThan(4);
      expect(dist(cameraPoseAt(t).target, cameraPoseAt(t + step).target)).toBeLessThan(4);
    }
  });

  it('baja sobre todo en la segunda mitad', () => {
    const drop = SEQUENCE_START.position[1] - SEQUENCE_END.position[1];
    const half = SEQUENCE_START.position[1] - cameraPoseAt(SEQUENCE_DURATION_S / 2).position[1];
    expect(half).toBeLessThan(drop * 0.6);
  });
});
