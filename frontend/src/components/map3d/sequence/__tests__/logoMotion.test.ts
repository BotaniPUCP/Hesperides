import { LOGO_ANCHOR_M, LOGO_APPEAR_S, LOGO_IMAGE_WIDTH, LOGO_LANDED_S, LOGO_SETTLE_S, logoAt, type LogoState } from '../logoMotion';
import { SEQUENCE_DURATION_S } from '../sequencePath';
import { SWAP_AT_S } from '../sequenceTimeline';

const ASPECT = 16 / 9;
/** La hoja dentro de la imagen de 1080×1080. */
const LEAF = { w: 965 / 1080, h: 421 / 1080 };

/** Fracción de la pantalla que tapa la hoja (solo la parte dentro del cuadro). */
function coverage(s: LogoState, aspect: number): number {
  if (!s.visible) return 0;
  const w = s.width * LEAF.w, h = s.width * LEAF.h * aspect;
  const x = Math.max(0, Math.min(1, s.x + w / 2) - Math.max(0, s.x - w / 2));
  const y = Math.max(0, Math.min(1, s.y + h / 2) - Math.max(0, s.y - h / 2));
  return x * y;
}

describe('movimiento del logo', () => {
  it('cae de 2 a 4 s, queda en pantalla hasta los 6 s y ahí se ancla a 300 m', () => {
    expect([LOGO_APPEAR_S, LOGO_LANDED_S, LOGO_SETTLE_S, LOGO_ANCHOR_M]).toEqual([2, 4, 6, 300]);
  });

  it('no se ve antes del segundo 2', () => {
    expect(logoAt(0, ASPECT).visible).toBe(false);
    expect(logoAt(LOGO_APPEAR_S - 0.01, ASPECT).visible).toBe(false);
  });

  it('aparece arriba al centro, pequeño, girando una vuelta y transparente', () => {
    const s = logoAt(LOGO_APPEAR_S, ASPECT);
    expect(s).toMatchObject({ visible: true, image: 'pixel', x: 0.5, opacity: 0 });
    expect(s.y).toBeCloseTo(0.15, 9);
    expect(s.width).toBeCloseTo(LOGO_IMAGE_WIDTH * 0.15, 9);
    expect(s.rotationDeg).toBeCloseTo(360, 9);
    expect(logoAt(LOGO_APPEAR_S + 0.3, ASPECT).opacity).toBeCloseTo(1, 9);
  });

  it('a los 4 s está en el centro, a tamaño completo y sin girar', () => {
    const s = logoAt(LOGO_LANDED_S, ASPECT);
    expect(s.x).toBeCloseTo(0.5, 6);
    expect(s.y).toBeCloseTo(0.5, 6);
    expect(s.width).toBeCloseTo(LOGO_IMAGE_WIDTH, 6);
    expect(s.rotationDeg).toBeCloseTo(0, 6);
    expect(s.width * LEAF.w).toBeCloseTo(0.4, 6);
  });

  it('el giro es sutil y frena: nunca más de 8° por cuadro', () => {
    const turn = (t: number) => logoAt(t, ASPECT).rotationDeg - logoAt(t + 1 / 60, ASPECT).rotationDeg;
    expect(turn(LOGO_APPEAR_S)).toBeLessThan(8);
    expect(turn(LOGO_APPEAR_S)).toBeGreaterThan(turn(3));
    expect(turn(3)).toBeGreaterThan(turn(3.9));
    expect(turn(3.9)).toBeGreaterThanOrEqual(0);
  });

  it('de 4 a 6 s se desliza suave hacia arriba a la izquierda, sin girar ni cambiar de tamaño', () => {
    const settle = logoAt(LOGO_SETTLE_S - 1e-9, ASPECT);
    expect(settle.x).toBeCloseTo(0.35, 6);
    expect(settle.y).toBeCloseTo(0.35, 6);
    const mid = logoAt(5, ASPECT);
    expect(mid.x).toBeCloseTo(0.425, 6);
    expect(mid.width).toBeCloseTo(LOGO_IMAGE_WIDTH, 9);
    expect(mid.rotationDeg).toBe(0);
    // Arranca y llega despacio.
    expect(Math.abs(logoAt(4.05, ASPECT).x - 0.5)).toBeLessThan(0.002);
  });

  it('cambia de imagen junto con el mapa', () => {
    expect(logoAt(SWAP_AT_S - 1e-6, ASPECT).image).toBe('pixel');
    expect(logoAt(SWAP_AT_S, ASPECT).image).toBe('original');
    expect(logoAt(8, ASPECT).image).toBe('original');
  });

  it.each([16 / 9, 4 / 3, 21 / 9])('anclado (aspecto %f): sin salto en el segundo 6', (aspect) => {
    const before = logoAt(LOGO_SETTLE_S - 1e-6, aspect), after = logoAt(LOGO_SETTLE_S + 1e-6, aspect);
    expect(Math.abs(after.x - before.x)).toBeLessThan(1e-3);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1e-3);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1e-3);
  });

  it('la cámara lo pasa por un costado sin tapar más de un tercio de la pantalla', () => {
    let worst = 0, gone = SEQUENCE_DURATION_S;
    for (let t = LOGO_SETTLE_S; t <= SEQUENCE_DURATION_S; t += 1 / 60) {
      const s = logoAt(t, ASPECT), c = coverage(s, ASPECT);
      worst = Math.max(worst, c);
      if (c === 0) { gone = t; break; }
    }
    expect(worst).toBeLessThan(1 / 3);
    expect(gone).toBeGreaterThan(9.5);
    expect(gone).toBeLessThan(11);
    const leaving = logoAt(gone - 0.5, ASPECT);
    expect(leaving.x).toBeLessThan(0.35);
    expect(leaving.y).toBeLessThan(0.35);
  });

  it('se mueve sin saltos entre cuadros mientras está en cuadro', () => {
    for (let t = LOGO_APPEAR_S; t < 10; t += 1 / 60) {
      const a = logoAt(t, ASPECT), b = logoAt(t + 1 / 60, ASPECT);
      if (!a.visible || !b.visible) continue;
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.05);
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.05);
    }
  });
});
