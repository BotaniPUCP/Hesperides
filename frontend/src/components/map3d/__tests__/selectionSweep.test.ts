import { createSelectionSweep, sweepKindOf } from '../viewer/selectionSweep';
import type { Target } from '../target';

/** Qué hay bajo cada x de la pantalla (y no importa): ejemplares, jardines y un edificio. */
const SCREEN: Record<number, Target> = {
  10: { layer: 'vegetation', index: 1 },
  20: { layer: 'greenAreas', index: 7 },
  30: { layer: 'vegetation', index: 2 },
  40: { layer: 'xerophytic', index: 3 },
  50: { layer: 'campusBuildings', index: 0 },
};

function setup(enabled: (kind: 'section' | 'specimen') => boolean = () => true) {
  const callbacks = { enabled: jest.fn(enabled), onSelect: jest.fn(), onState: jest.fn() };
  const hooks = { begin: jest.fn(), end: jest.fn(), requestRender: jest.fn() };
  const sweep = createSelectionSweep({ pickAt: (x) => SCREEN[x] ?? null, callbacks, ...hooks });
  return { sweep, callbacks, hooks };
}

/** Recorre la pantalla de a una celda, para que el barrido no interpole entre ellas. */
function sweepOver(sweep: ReturnType<typeof setup>['sweep'], xs: number[]) {
  sweep.onStart(xs[0], 0);
  xs.slice(1).forEach((x) => sweep.onMove(x, 0));
  sweep.onEnd();
}

const selected = (onSelect: jest.Mock) => onSelect.mock.calls.map(([t]) => `${t.layer}:${t.index}`);

describe('selectionSweep: mantener pulsado y arrastrar elige solo lo del tipo con que empezó', () => {
  it('ejemplares, jardines y nada más', () => {
    expect(sweepKindOf('vegetation')).toBe('specimen');
    expect(sweepKindOf('greenAreas')).toBe('section');
    expect(sweepKindOf('xerophytic')).toBe('section');
    expect(sweepKindOf('reserve')).toBe('section');
    expect(sweepKindOf('campusBuildings')).toBeNull();
  });

  it('empezando en un ejemplar, solo agrega ejemplares aunque pase por jardines', () => {
    const { sweep, callbacks } = setup();
    sweepOver(sweep, [10, 20, 30, 40]);

    expect(selected(callbacks.onSelect)).toEqual(['vegetation:1', 'vegetation:2']);
  });

  it('empezando en un jardín, solo agrega jardines aunque pase por ejemplares', () => {
    const { sweep, callbacks } = setup();
    sweepOver(sweep, [20, 10, 30, 40]);

    expect(selected(callbacks.onSelect)).toEqual(['greenAreas:7', 'xerophytic:3']);
  });

  it('pasar dos veces por lo mismo lo agrega una sola vez', () => {
    const { sweep, callbacks } = setup();
    sweepOver(sweep, [10, 30, 10, 30]);

    expect(selected(callbacks.onSelect)).toEqual(['vegetation:1', 'vegetation:2']);
  });

  it('solo arranca sobre un jardín o un ejemplar que la pantalla acepta', () => {
    const onlyGardens = setup((kind) => kind === 'section');
    expect(onlyGardens.sweep.canStart(50, 0)).toBe(false);
    expect(onlyGardens.sweep.canStart(60, 0)).toBe(false);
    expect(onlyGardens.sweep.canStart(10, 0)).toBe(false);
    expect(onlyGardens.sweep.canStart(20, 0)).toBe(true);
  });

  it('avisa dónde va el barrido y lo cierra al soltar', () => {
    const { sweep, callbacks, hooks } = setup();
    sweepOver(sweep, [10, 30]);

    expect(hooks.begin).toHaveBeenCalledTimes(1);
    expect(callbacks.onState).toHaveBeenNthCalledWith(1, { clientX: 10, clientY: 0 });
    expect(callbacks.onState).toHaveBeenLastCalledWith(null);
    expect(hooks.end).toHaveBeenCalledTimes(1);
  });

  it('un barrido nuevo vuelve a empezar: lo de antes se puede agregar otra vez', () => {
    const { sweep, callbacks } = setup();
    sweepOver(sweep, [10]);
    sweepOver(sweep, [10]);

    expect(callbacks.onSelect).toHaveBeenCalledTimes(2);
  });
});
