import { plannedFrom } from '../planNavigation';

describe('plannedFrom (SPEC-203 §5.6)', () => {
  it('lee el conjunto y la actividad de la dirección', () => {
    expect(plannedFrom({ conjunto: '3', actividad: '30' })).toEqual({ setId: 3, activityId: 30, onlyPending: false });
    expect(plannedFrom({ conjunto: '3', actividad: '30', pendientes: '1' })).toEqual({ setId: 3, activityId: 30, onlyPending: true });
  });

  it.each([
    [{ conjunto: 'abc', actividad: '30' }],
    [{ conjunto: '3' }],
    [{ conjunto: '-1', actividad: '30' }],
    [{ conjunto: ['3', '4'], actividad: '30' }],
    [{}],
  ])('con datos inválidos no prellena nada: %j', (query) => {
    expect(plannedFrom(query)).toBeNull();
  });
});
