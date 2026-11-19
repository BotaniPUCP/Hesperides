import {
  flyActionFor, flySpeed, flyStep, isAdminModeToggle, limitDescent, MIN_FLY_SPEED_M_S, type FlyAction,
} from '../flyMotion';

const north = { x: 0, z: -1 };
const step = (actions: FlyAction[], heading = north, distance = 1) => flyStep(new Set(actions), heading, distance);

describe('flyActionFor', () => {
  it.each([
    ['KeyW', 'forward'], ['KeyS', 'back'], ['KeyA', 'left'], ['KeyD', 'right'],
    ['Space', 'up'], ['ShiftLeft', 'down'], ['ShiftRight', 'down'],
  ])('%s mueve hacia %s', (code, action) => {
    expect(flyActionFor(code)).toBe(action);
  });

  it('ignora las teclas que no mueven', () => {
    expect(flyActionFor('KeyQ')).toBeUndefined();
    expect(flyActionFor('')).toBeUndefined();
  });
});

describe('flyStep', () => {
  it('sin teclas no se mueve', () => {
    expect(step([])).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('W avanza hacia donde mira y S retrocede', () => {
    expect(step(['forward'])).toEqual({ x: 0, y: 0, z: -1 });
    expect(step(['back'])).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('A va a la izquierda y D a la derecha de la mirada', () => {
    expect(step(['right'])).toEqual({ x: 1, y: 0, z: 0 });
    expect(step(['left'])).toEqual({ x: -1, y: 0, z: 0 });
    const east = { x: 1, z: 0 };
    expect(step(['right'], east)).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('Espacio sube y Shift baja sobre la altura', () => {
    expect(step(['up'], north, 2)).toEqual({ x: 0, y: 2, z: 0 });
    expect(step(['down'], north, 2)).toEqual({ x: 0, y: -2, z: 0 });
  });

  it('en diagonal no va más rápido que en línea recta', () => {
    const { x, z } = step(['forward', 'right']);
    expect(Math.hypot(x, z)).toBeCloseTo(1);
  });

  it('las teclas opuestas se anulan', () => {
    expect(step(['forward', 'back', 'up', 'down'])).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('una mirada inclinada solo cuenta su dirección sobre el piso', () => {
    const { x, z } = step(['forward'], { x: 0.3, z: 0.4 }, 5);
    expect(x).toBeCloseTo(3);
    expect(z).toBeCloseTo(4);
  });

  it('mirando en vertical no avanza, pero sí sube y baja', () => {
    expect(step(['forward', 'up'], { x: 0, z: 0 })).toEqual({ x: 0, y: 1, z: 0 });
  });
});

describe('limitDescent', () => {
  it('deja bajar mientras quede sobre el piso', () => {
    expect(limitDescent(10, -2, 1)).toBe(-2);
  });

  it('se detiene en el piso', () => {
    expect(limitDescent(1.5, -2, 1)).toBe(-0.5);
    expect(limitDescent(1, -2, 1)).toBe(0);
  });

  it('subir nunca se limita, aunque esté bajo el piso', () => {
    expect(limitDescent(0, 3, 1)).toBe(3);
  });
});

describe('isAdminModeToggle', () => {
  const keys = { code: 'KeyU', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };

  it('Ctrl+Shift+U cambia de modo', () => {
    expect(isAdminModeToggle(keys)).toBe(true);
  });

  it.each([
    ['sin Ctrl', { ...keys, ctrlKey: false }],
    ['sin Shift', { ...keys, shiftKey: false }],
    ['con Alt', { ...keys, altKey: true }],
    ['con otra letra', { ...keys, code: 'KeyI' }],
  ])('%s no cambia', (_, event) => {
    expect(isAdminModeToggle(event)).toBe(false);
  });
});

describe('velocidad de vuelo según la holgura', () => {
  it('a la altura de una persona, un cuarto de segundo avanza menos de un metro', () => {
    expect(flySpeed(1.7, 40) * 0.25).toBeLessThan(1);
  });

  it('crece con la holgura hasta el tope', () => {
    expect(flySpeed(10, 40)).toBeGreaterThan(flySpeed(2, 40));
    expect(flySpeed(500, 40)).toBe(40);
  });

  it('pegado a algo nunca se queda quieto', () => {
    expect(flySpeed(0, 40)).toBe(MIN_FLY_SPEED_M_S);
    expect(flySpeed(-3, 40)).toBe(MIN_FLY_SPEED_M_S);
  });
});
