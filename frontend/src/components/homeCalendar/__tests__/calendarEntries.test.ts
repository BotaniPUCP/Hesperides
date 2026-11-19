import type { CampusEventOccurrence, Reservation } from '@shared/types';
import { entriesOfDay, fromOccurrence, fromReservation, layoutTimed, type CalendarEntry } from '../calendarEntries';

const occurrence = (over: Partial<CampusEventOccurrence> = {}): CampusEventOccurrence => ({
  eventId: 7, name: 'Graduación', typeCode: 'BLOCKING', typeLabel: 'Bloqueante', scope: 'CAMPUS',
  zoneId: null, zoneName: null, zoneActive: true, date: '2026-11-20', startTime: '09:00', endTime: '11:30', ...over,
});

const reservation = (over: Partial<Reservation> = {}): Reservation => ({
  code: 'RES-0001', place: { id: 3, name: 'Jardín de Letras' } as Reservation['place'],
  requestedBy: { code: 'ORG-1', name: 'Centro Federado' } as Reservation['requestedBy'],
  requester: {} as Reservation['requester'], requestedFor: null, responsible: {} as Reservation['responsible'],
  responsibleHistory: [], usageHistory: [], startsAt: '2026-11-20T14:00:00-05:00', endsAt: '2026-11-20T16:00:00-05:00',
  purpose: 'Feria', state: 'UPCOMING', cancelReason: null, spaceUsed: false, usageState: 'NOT_RECORDED',
  canRecordUsage: false, version: 0, warnings: [], ...over,
});

describe('eventos del calendario del inicio', () => {
  it('un evento bloqueante con horas va en su día, de su hora de inicio a la de fin', () => {
    expect(fromOccurrence(occurrence())).toEqual({
      key: 'event:7:2026-11-20', kind: 'BLOCKING', title: 'Graduación', detail: 'Todo el campus',
      date: '2026-11-20', start: 540, end: 690, href: '/calendario?fecha=2026-11-20',
    });
  });

  it('un feriado o un evento sin horas ocupan el día completo', () => {
    const holiday = fromOccurrence(occurrence({ typeCode: 'HOLIDAY', name: 'Feriado', startTime: null, endTime: null }));
    expect(holiday).toMatchObject({ kind: 'HOLIDAY', start: null, end: null });
  });

  it('un evento de una zona dice cuál', () => {
    expect(fromOccurrence(occurrence({ scope: 'SECTION', zoneName: 'Jardín Central' })).detail).toBe('Jardín Central');
    expect(fromOccurrence(occurrence({ scope: 'SECTION', zoneName: 'Jardín Central', zoneActive: false })).detail)
      .toBe('Jardín Central (zona dada de baja)');
  });

  it('una reserva va en su día y su horario, con el jardín y la organización', () => {
    expect(fromReservation(reservation())).toEqual([{
      key: 'reservation:RES-0001:2026-11-20', kind: 'RESERVATION', title: 'Jardín de Letras',
      detail: 'Centro Federado · Feria', date: '2026-11-20', start: 840, end: 960, href: '/reservas/RES-0001',
    }]);
  });

  it('una reserva de varios días se parte en un tramo por día', () => {
    const parts = fromReservation(reservation({ startsAt: '2026-11-20T18:00:00-05:00', endsAt: '2026-11-22T10:00:00-05:00' }));
    expect(parts.map((p) => [p.date, p.start, p.end])).toEqual([
      ['2026-11-20', 1080, 1440], ['2026-11-21', 0, 1440], ['2026-11-22', 0, 600],
    ]);
  });

  it('una reserva que termina justo a medianoche no deja un tramo vacío al día siguiente', () => {
    const parts = fromReservation(reservation({ startsAt: '2026-11-20T20:00:00-05:00', endsAt: '2026-11-21T00:00:00-05:00' }));
    expect(parts.map((p) => [p.date, p.start, p.end])).toEqual([['2026-11-20', 1200, 1440]]);
  });

  it('las reservas canceladas no se muestran', () => {
    expect(fromReservation(reservation({ state: 'CANCELLED' }))).toEqual([]);
  });

  it('los de un día: primero los de todo el día, luego por hora', () => {
    const entries: CalendarEntry[] = [
      { ...fromOccurrence(occurrence({ eventId: 1, startTime: '15:00', endTime: '16:00' })) },
      { ...fromOccurrence(occurrence({ eventId: 2, startTime: null, endTime: null })) },
      { ...fromOccurrence(occurrence({ eventId: 3, startTime: '08:00', endTime: '09:00' })) },
      { ...fromOccurrence(occurrence({ eventId: 4, date: '2026-11-21' })) },
    ];
    expect(entriesOfDay(entries, '2026-11-20').map((e) => e.key)).toEqual([
      'event:2:2026-11-20', 'event:3:2026-11-20', 'event:1:2026-11-20',
    ]);
  });
});

describe('acomodo de los que se cruzan', () => {
  const timed = (key: string, start: number, end: number): CalendarEntry =>
    ({ key, kind: 'RESERVATION', title: key, detail: '', date: '2026-11-20', start, end, href: '/' });

  it('los que no se cruzan ocupan todo el ancho', () => {
    expect(layoutTimed([timed('a', 60, 120), timed('b', 120, 180)]).map((l) => [l.entry.key, l.column, l.columns]))
      .toEqual([['a', 0, 1], ['b', 0, 1]]);
  });

  it('los que se cruzan se reparten el ancho', () => {
    const laid = layoutTimed([timed('a', 60, 180), timed('b', 90, 150), timed('c', 120, 240)]);
    expect(laid.map((l) => [l.entry.key, l.column, l.columns])).toEqual([['a', 0, 3], ['b', 1, 3], ['c', 2, 3]]);
  });

  it('un hueco libre se reutiliza sin ensanchar el grupo', () => {
    const laid = layoutTimed([timed('a', 60, 240), timed('b', 60, 120), timed('c', 130, 200)]);
    expect(laid.map((l) => [l.entry.key, l.column, l.columns])).toEqual([['a', 0, 2], ['b', 1, 2], ['c', 1, 2]]);
  });

  it('un evento muy corto conserva un alto mínimo para poder leerse', () => {
    const [only] = layoutTimed([timed('a', 600, 605)]);
    expect(only.end - only.start).toBeGreaterThanOrEqual(30);
  });
});
