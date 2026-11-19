import { dateLocal, todayLocal, todayLima } from '../local-date';

describe('dateLocal', () => {
  // Ambos extremos del día: en cualquier zona que no sea UTC, uno de los dos
  // cae en otra fecha UTC y delataría un cálculo con toISOString.
  it.each([
    [new Date(2026, 10, 6, 0, 30), '2026-11-06'],
    [new Date(2026, 10, 6, 23, 30), '2026-11-06'],
  ])('usa el día del calendario local (%s)', (dia, esperado) => {
    expect(dateLocal(dia)).toBe(esperado);
  });

  it('rellena con cero el mes y el día', () => {
    expect(dateLocal(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('todayLocal', () => {
  afterEach(() => jest.useRealTimers());

  it('devuelve el día local aunque en UTC ya sea mañana', () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 6, 23, 30) });

    expect(todayLocal()).toBe('2026-11-06');
  });
});

 it('usa el d?a de Lima al cruzar medianoche UTC y Lima', () => {
   expect(todayLima(new Date('2026-11-06T00:30:00Z'))).toBe('2026-11-05');
   expect(todayLima(new Date('2026-11-06T05:00:00Z'))).toBe('2026-11-06');
 });
