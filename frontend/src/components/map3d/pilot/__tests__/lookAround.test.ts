import { directionOf, MAX_PITCH, turnView, viewOf } from '../lookAround';

const expectDirection = (actual: { x: number; y: number; z: number }, x: number, y: number, z: number) => {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
  expect(actual.z).toBeCloseTo(z);
};

describe('viewOf y directionOf', () => {
  it('sin giro se mira hacia -Z, como la cámara de three.js', () => {
    expectDirection(directionOf({ yaw: 0, pitch: 0 }), 0, 0, -1);
  });

  it('son inversas', () => {
    const direction = { x: 0.48, y: 0.6, z: -0.64 };
    expectDirection(directionOf(viewOf(direction)), 0.48, 0.6, -0.64);
  });

  it('aceptan una dirección sin normalizar', () => {
    expectDirection(directionOf(viewOf({ x: 0, y: 0, z: -10 })), 0, 0, -1);
  });
});

describe('turnView', () => {
  const ahead = { yaw: 0, pitch: 0 };

  it('arrastrar a la derecha mira a la derecha (+X)', () => {
    expect(directionOf(turnView(ahead, 100, 0, Math.PI / 200)).x).toBeCloseTo(1);
  });

  it('arrastrar hacia arriba mira hacia arriba', () => {
    expect(directionOf(turnView(ahead, 0, -10, 0.01)).y).toBeGreaterThan(0);
  });

  it('no pasa de la vertical, ni arriba ni abajo', () => {
    expect(turnView(ahead, 0, -1e6, 0.01).pitch).toBe(MAX_PITCH);
    expect(turnView(ahead, 0, 1e6, 0.01).pitch).toBe(-MAX_PITCH);
  });

  it('sin arrastre no cambia', () => {
    expect(turnView({ yaw: 1, pitch: 0.5 }, 0, 0, 0.01)).toEqual({ yaw: 1, pitch: 0.5 });
  });
});
