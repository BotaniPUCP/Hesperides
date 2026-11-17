import { LOGO_ANCHOR_M, LOGO_APPEAR_S, LOGO_IMAGE_WIDTH, LOGO_SETTLE_S, logoAt } from '../logoMotion';
import { SEQUENCE_DURATION_S } from '../sequencePath';
import { SWAP_AT_S } from '../sequenceTimeline';

const ASPECT = 16 / 9;

describe('movimiento del logo', () => {
  it('no se ve antes del segundo 4', () => {
    expect(logoAt(0, ASPECT).visible).toBe(false);
    expect(logoAt(LOGO_APPEAR_S - 0.01, ASPECT).visible).toBe(false);
  });

  it('aparece arriba al centro, pequeño, girando y transparente', () => {
    const s = logoAt(LOGO_APPEAR_S, ASPECT);
    expect(s).toMatchObject({ visible: true, image: 'pixel', x: 0.5, opacity: 0 });
    expect(s.y).toBeCloseTo(0.15, 9);
    expect(s.width).toBeCloseTo(LOGO_IMAGE_WIDTH * 0.15, 9);
    expect(s.rotationDeg).toBeCloseTo(3 * 360, 9);
    expect(logoAt(LOGO_APPEAR_S + 0.3, ASPECT).opacity).toBeCloseTo(1, 9);
  });

  it('a los 7 s está en el centro, a tamaño completo y sin girar', () => {
    const s = logoAt(LOGO_SETTLE_S, ASPECT);
    expect(s.x).toBeCloseTo(0.5, 6);
    expect(s.y).toBeCloseTo(0.5, 6);
    expect(s.width).toBeCloseTo(LOGO_IMAGE_WIDTH, 6);
    expect(s.rotationDeg).toBeCloseTo(0, 6);
    // La hoja ocupa el 40 % del ancho: la imagen es algo más ancha que la hoja.
    expect(s.width * (965 / 1080)).toBeCloseTo(0.4, 6);
  });

  it('el giro frena: cada vez gira menos por cuadro', () => {
    const turn = (t: number) => logoAt(t, ASPECT).rotationDeg - logoAt(t + 1 / 60, ASPECT).rotationDeg;
    expect(turn(LOGO_APPEAR_S)).toBeGreaterThan(turn(5.5));
    expect(turn(5.5)).toBeGreaterThan(turn(6.9));
    expect(turn(6.9)).toBeGreaterThanOrEqual(0);
  });

  it('cambia de imagen junto con el mapa', () => {
    expect(logoAt(SWAP_AT_S - 1e-6, ASPECT).image).toBe('pixel');
    expect(logoAt(SWAP_AT_S, ASPECT).image).toBe('original');
    expect(logoAt(10, ASPECT).image).toBe('original');
  });

  it('anclado: sin salto en el segundo 7, luego crece y sale por arriba a la izquierda', () => {
    const before = logoAt(LOGO_SETTLE_S - 1e-6, ASPECT), after = logoAt(LOGO_SETTLE_S + 1e-6, ASPECT);
    expect(Math.abs(after.x - before.x)).toBeLessThan(1e-3);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1e-3);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1e-3);
    const nine = logoAt(9, ASPECT);
    expect(nine.width).toBeGreaterThan(LOGO_IMAGE_WIDTH);
    expect(nine.x).toBeLessThan(0.5);
    expect(nine.y).toBeLessThan(0.5);
    const late = logoAt(10.5, ASPECT);
    expect(late.visible === false || late.x + late.width / 2 < 0 || late.y < 0).toBe(true);
  });

  it('se mueve sin saltos entre cuadros mientras está en cuadro', () => {
    for (let t = LOGO_APPEAR_S; t < 10; t += 1 / 60) {
      const a = logoAt(t, ASPECT), b = logoAt(t + 1 / 60, ASPECT);
      if (!a.visible || !b.visible) continue;
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.1);
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.1);
    }
  });

  it('cuando la cámara ya lo pasó, no se dibuja', () => {
    expect(logoAt(SEQUENCE_DURATION_S, ASPECT).visible).toBe(false);
    expect(LOGO_ANCHOR_M).toBe(200);
  });
});
