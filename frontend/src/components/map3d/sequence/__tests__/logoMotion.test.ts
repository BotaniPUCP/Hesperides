import {
  LOGO_ANCHOR_M, LOGO_APPEARED_S, LOGO_END_S, LOGO_IMAGE_WIDTH, LOGO_LANDED_S, LOGO_SETTLE_S, logoAt, logoSourceAt, type LogoState,
} from '../logoMotion';
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

const same = (a: LogoState, b: LogoState, digits = 9) => {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.width).toBeCloseTo(b.width, digits);
};

describe('coreografía del logo (a velocidad original)', () => {
  it('quieto en el centro hasta los 4 s, se desliza hasta los 6 s y ahí se ancla a 300 m', () => {
    expect([LOGO_LANDED_S, LOGO_SETTLE_S, LOGO_ANCHOR_M]).toEqual([4, 6, 300]);
    const s = logoSourceAt(3, ASPECT);
    expect(s).toMatchObject({ visible: true, x: 0.5, y: 0.5, rotationDeg: 0, opacity: 1 });
    expect(s.width * LEAF.w).toBeCloseTo(0.4, 9);
  });

  it('de 4 a 6 s se desliza suave hacia arriba a la izquierda, sin cambiar de tamaño', () => {
    const settle = logoSourceAt(LOGO_SETTLE_S - 1e-9, ASPECT);
    expect(settle.x).toBeCloseTo(0.35, 6);
    expect(settle.y).toBeCloseTo(0.35, 6);
    expect(logoSourceAt(5, ASPECT).x).toBeCloseTo(0.425, 6);
    expect(logoSourceAt(5, ASPECT).width).toBeCloseTo(LOGO_IMAGE_WIDTH, 9);
    expect(Math.abs(logoSourceAt(4.05, ASPECT).x - 0.5)).toBeLessThan(0.002);
  });

  it.each([16 / 9, 4 / 3, 21 / 9])('anclado (aspecto %f): sin salto en el segundo 6', (aspect) => {
    same(logoSourceAt(LOGO_SETTLE_S + 1e-6, aspect), logoSourceAt(LOGO_SETTLE_S - 1e-6, aspect), 5);
  });

  it('la cámara lo pasa por un costado sin tapar más de un tercio de la pantalla', () => {
    let worst = 0;
    for (let t = LOGO_SETTLE_S; t <= SEQUENCE_DURATION_S; t += 1 / 60) worst = Math.max(worst, coverage(logoSourceAt(t, ASPECT), ASPECT));
    expect(worst).toBeLessThan(1 / 3);
  });
});

describe('el logo en la secuencia', () => {
  it('se ve desde el primer cuadro hasta los 6 s', () => {
    expect(LOGO_END_S).toBe(6);
    expect(logoAt(0, ASPECT).visible).toBe(true);
    expect(logoAt(LOGO_END_S, ASPECT).visible).toBe(false);
    expect(logoAt(11, ASPECT).visible).toBe(false);
  });

  it('aparece quieto en el centro, de transparente a opaco, sin girar', () => {
    expect(logoAt(0, ASPECT)).toMatchObject({ x: 0.5, y: 0.5, rotationDeg: 0, opacity: 0, image: 'pixel' });
    expect(logoAt(1.25, ASPECT).opacity).toBeCloseTo(0.5, 5);
    expect(logoAt(2.5, ASPECT).opacity).toBe(1);
    // Arranca lento: el primer cuarto de segundo apenas se nota.
    expect(logoAt(0.25, ASPECT).opacity).toBeLessThan(0.05);
  });

  it('mientras aparece "respira": crece de 92 % a 100 % y llega quieto al deslizamiento', () => {
    expect(logoAt(0, ASPECT).width).toBeCloseTo(LOGO_IMAGE_WIDTH * 0.92, 9);
    expect(logoAt(LOGO_APPEARED_S - 1e-6, ASPECT).width).toBeCloseTo(LOGO_IMAGE_WIDTH, 6);
    for (let t = 0; t < LOGO_APPEARED_S; t += 0.1) expect(logoAt(t + 0.1, ASPECT).width).toBeGreaterThanOrEqual(logoAt(t, ASPECT).width);
    same(logoAt(LOGO_APPEARED_S + 1e-6, ASPECT), logoAt(LOGO_APPEARED_S - 1e-6, ASPECT), 5);
    expect(LOGO_APPEARED_S).toBeCloseTo(2 + 2 / 2.2, 9);
  });

  it('de 5 a 6 s muestra exactamente lo que la coreografía muestra de 8 a 9 s', () => {
    for (let i = 0; i < 10; i++) same(logoAt(5 + i / 10, ASPECT), logoSourceAt(8 + i / 10, ASPECT));
  });

  it('la velocidad baja sin frenazo antes del segundo 5', () => {
    const h = 1e-3;
    const speed = (f: (t: number) => LogoState, t: number) => (f(t + h).x - f(t).x) / h;
    expect(speed((t) => logoAt(t, ASPECT), 5 - 2 * h)).toBeCloseTo(speed((t) => logoSourceAt(t, ASPECT), 8 - 2 * h), 1);
  });

  it('cambia de imagen en el segundo 5,25, con el mapa', () => {
    expect(logoAt(SWAP_AT_S - 1e-6, ASPECT).image).toBe('pixel');
    expect(logoAt(SWAP_AT_S, ASPECT).image).toBe('original');
  });

  it('se desvanece de 5,7 a 6 s, ya pasado el desenfoque', () => {
    expect(logoAt(5.6, ASPECT).opacity).toBe(1);
    expect(logoAt(5.85, ASPECT).opacity).toBeCloseTo(0.5, 5);
    expect(logoAt(LOGO_END_S - 1e-6, ASPECT).opacity).toBeLessThan(0.001);
  });

  it('se mueve sin saltos entre cuadros', () => {
    for (let t = 0; t < LOGO_END_S - 1 / 60; t += 1 / 60) {
      const a = logoAt(t, ASPECT), b = logoAt(t + 1 / 60, ASPECT);
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.08);
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.08);
      expect(Math.abs(b.opacity - a.opacity)).toBeLessThan(0.1);
    }
  });
});
