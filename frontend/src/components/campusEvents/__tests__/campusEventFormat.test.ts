import type { CampusEventOccurrence } from '@shared/types';
import { eventHours, groupByDay, monthLabel, monthRange, shiftMonth, summarize } from '../campusEventFormat';

const occurrence = (date: string, name: string): CampusEventOccurrence => ({
  eventId: 1, name, typeCode: 'BLOCKING', typeLabel: 'Bloqueante', scope: 'CAMPUS', zoneId: null, zoneName: null,
  zoneActive: true, date, startTime: null, endTime: null,
});

describe('el mes de la agenda (SPEC-114 §5.2)', () => {
  it('va del primero al último día, y se mueve de mes cruzando el año', () => {
    expect(monthRange('2027-02')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(monthLabel('2026-11')).toBe('Noviembre de 2026');
  });

  it('agrupa las ocurrencias por día, en orden', () => {
    const groups = groupByDay([occurrence('2026-11-05', 'A'), occurrence('2026-11-05', 'B'), occurrence('2026-11-12', 'C')]);
    expect(groups.map(([day, items]) => [day, items.map((i) => i.name)])).toEqual([
      ['2026-11-05', ['A', 'B']], ['2026-11-12', ['C']]]);
  });
});

describe('el resumen del formulario (SPEC-114 §5.1)', () => {
  it('cuenta los jueves del semestre con su horario', () => {
    expect(summarize({ startDate: '2027-03-18', endDate: '2027-07-01', weekdays: [4], startTime: '14:00', endTime: '18:00' }))
      .toBe('16 jueves, del 18 mar al 1 jul, de 14:00 a 18:00');
  });

  it('sin repetición dice los días y que es todo el día', () => {
    expect(summarize({ startDate: '2026-07-28', endDate: '2026-07-29', weekdays: [], startTime: null, endTime: null }))
      .toBe('2 días, del 28 jul al 29 jul, todo el día');
    expect(summarize({ startDate: '2026-07-28', endDate: '2026-07-28', weekdays: [], startTime: null, endTime: null }))
      .toBe('1 día, el 28 jul, todo el día');
  });

  it('en singular, «1 jueves» y «1 sábado»', () => {
    expect(summarize({ startDate: '2027-03-18', endDate: '2027-03-18', weekdays: [4], startTime: null, endTime: null }))
      .toBe('1 jueves, el 18 mar, todo el día');
    expect(summarize({ startDate: '2027-03-20', endDate: '2027-03-20', weekdays: [6], startTime: null, endTime: null }))
      .toBe('1 sábado, el 20 mar, todo el día');
  });

  it('una repetición que no cae en ninguna fecha lo avisa', () => {
    expect(summarize({ startDate: '2027-03-17', endDate: '2027-03-22', weekdays: [2], startTime: null, endTime: null }))
      .toBe('Con esos días de la semana no ocurre ningún día entre esas fechas');
  });

  it('el horario de una ocurrencia', () => {
    expect(eventHours(occurrence('2026-11-05', 'A'))).toBe('Todo el día');
    expect(eventHours({ ...occurrence('2026-11-05', 'A'), startTime: '14:00', endTime: '18:00' })).toBe('14:00–18:00');
  });
});
