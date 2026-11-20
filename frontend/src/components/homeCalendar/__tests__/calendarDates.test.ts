import { monthGrid, rangeOf, shiftAnchor, titleOf, weekOf } from '../calendarDates';

describe('fechas del calendario del inicio', () => {
  it('la semana va de lunes a domingo, también si el día es domingo', () => {
    expect(weekOf('2026-11-19')).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
    expect(weekOf('2026-11-22')[0]).toBe('2026-11-16');
    expect(weekOf('2026-11-16')[0]).toBe('2026-11-16');
  });

  it('cruza meses y años', () => {
    expect(weekOf('2027-01-01')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });

  it('la cuadrícula del mes empieza el lunes antes del día 1 y termina el domingo después del último', () => {
    const grid = monthGrid('2026-11');
    expect(grid[0][0]).toBe('2026-10-26');
    expect(grid[grid.length - 1][6]).toBe('2026-12-06');
    expect(grid.every((week) => week.length === 7)).toBe(true);
    // Noviembre de 2026 empieza en domingo: necesita seis semanas.
    expect(grid).toHaveLength(6);
    // Febrero de 2027 empieza en lunes y tiene 28 días: cuatro semanas justas.
    expect(monthGrid('2027-02')).toHaveLength(4);
  });

  it('el rango que se pide al backend cubre lo que se ve, y nunca pasa de 62 días', () => {
    expect(rangeOf('week', '2026-11-19')).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(rangeOf('day', '2026-11-19')).toEqual({ from: '2026-11-19', to: '2026-11-19' });
    expect(rangeOf('month', '2026-11-19')).toEqual({ from: '2026-10-26', to: '2026-12-06' });
  });

  it('las flechas mueven un día, una semana o un mes', () => {
    expect(shiftAnchor('day', '2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftAnchor('week', '2026-11-19', -1)).toBe('2026-11-12');
    expect(shiftAnchor('month', '2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftAnchor('month', '2026-03-15', -1)).toBe('2026-02-01');
  });

  it('el título dice qué se está viendo', () => {
    expect(titleOf('month', '2026-11-19')).toBe('Noviembre de 2026');
    expect(titleOf('week', '2026-11-19')).toBe('16 – 22 nov 2026');
    expect(titleOf('week', '2026-11-30')).toBe('30 nov – 6 dic 2026');
    expect(titleOf('week', '2026-12-30')).toBe('28 dic 2026 – 3 ene 2027');
    expect(titleOf('day', '2026-11-19')).toBe('Jueves, 19 de noviembre de 2026');
  });
});
