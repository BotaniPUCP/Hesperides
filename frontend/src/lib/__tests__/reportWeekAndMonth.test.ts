import {
  directionHref, mondayOf, parseDirection, parseWeekly, shiftMonth, shiftWeeks, weeklyHref,
} from '../reportNavigation';

const params = (query: string) => new URLSearchParams(query);

describe('parámetros de la semanal y del resumen (SPEC-202 §3.6)', () => {
  it('la semana debe empezar un lunes; otro día invalida la URL', () => {
    expect(parseWeekly(params('weekStart=2026-10-26&sectorId=2')))
      .toEqual({ params: { weekStart: '2026-10-26', sectorId: 2 }, invalid: false });
    expect(parseWeekly(params('weekStart=2026-10-28')).invalid).toBe(true);
    expect(parseWeekly(params('sectorId=abc')).invalid).toBe(true);
    expect(weeklyHref({ weekStart: '2026-10-26', sectorId: 2 })).toBe('/reportes?tab=semanal&weekStart=2026-10-26&sectorId=2');
  });

  it('cualquier día lleva a su lunes y las semanas se mueven de siete en siete (CA-S07)', () => {
    expect(mondayOf('2026-10-28')).toBe('2026-10-26');
    expect(mondayOf('2026-11-01')).toBe('2026-10-26');
    expect(mondayOf('2026-10-26')).toBe('2026-10-26');
    expect(shiftWeeks('2026-10-26', -1)).toBe('2026-10-19');
  });

  it('el mes viaja como AAAA-MM y se mueve entre años', () => {
    expect(parseDirection(params('month=2026-10'))).toEqual({ month: '2026-10', invalid: false });
    expect(parseDirection(params('month=2026-13')).invalid).toBe(true);
    expect(parseDirection(params(''))).toEqual({ month: null, invalid: false });
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(directionHref('2026-09')).toBe('/reportes?tab=direccion&month=2026-09');
  });
});
