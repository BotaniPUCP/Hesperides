import type { Reservation, ReservationPage } from '@shared/types';
import { campusEventsApi } from '@/lib/campus-events-api';
import { reservationsApi } from '@/lib/reservations-api';
import { loadCalendarEntries, loadReservations, RESERVATIONS_PER_REQUEST } from '../loadCalendar';

jest.mock('@/lib/reservations-api', () => ({ reservationsApi: { list: jest.fn() } }));
jest.mock('@/lib/campus-events-api', () => ({ campusEventsApi: { occurrences: jest.fn() } }));

const reservation = (code: string): Reservation => ({
  code, place: { id: 1, name: 'Jardín' }, requestedBy: { name: 'Org' }, purpose: null, state: 'UPCOMING',
  startsAt: '2026-11-20T10:00:00-05:00', endsAt: '2026-11-20T11:00:00-05:00',
} as unknown as Reservation);

const page = (n: number, codes: string[], total: number): ReservationPage =>
  ({ page: n, size: RESERVATIONS_PER_REQUEST, total, items: codes.map(reservation) });

describe('carga del calendario del inicio', () => {
  beforeEach(() => jest.resetAllMocks());

  it('pide las reservas página por página hasta tenerlas todas', async () => {
    jest.mocked(reservationsApi.list)
      .mockResolvedValueOnce(page(0, ['A', 'B'], 3))
      .mockResolvedValueOnce(page(1, ['C'], 3));
    const all = await loadReservations('2026-11-16', '2026-11-22');
    expect(all.map((r) => r.code)).toEqual(['A', 'B', 'C']);
    expect(reservationsApi.list).toHaveBeenNthCalledWith(1, { from: '2026-11-16', to: '2026-11-22' }, 0, RESERVATIONS_PER_REQUEST);
    expect(reservationsApi.list).toHaveBeenNthCalledWith(2, { from: '2026-11-16', to: '2026-11-22' }, 1, RESERVATIONS_PER_REQUEST);
  });

  it('una página vacía corta la carga aunque el total diga otra cosa', async () => {
    jest.mocked(reservationsApi.list).mockResolvedValueOnce(page(0, [], 5));
    expect(await loadReservations('2026-11-16', '2026-11-22')).toEqual([]);
    expect(reservationsApi.list).toHaveBeenCalledTimes(1);
  });

  it('pide 50 por vez: el máximo que acepta el backend', () => {
    expect(RESERVATIONS_PER_REQUEST).toBe(50);
  });

  it('junta los eventos del campus y las reservas en una sola lista', async () => {
    jest.mocked(reservationsApi.list).mockResolvedValueOnce(page(0, ['A'], 1));
    jest.mocked(campusEventsApi.occurrences).mockResolvedValueOnce([{
      eventId: 1, name: 'Feriado', typeCode: 'HOLIDAY', typeLabel: 'Feriado', scope: 'CAMPUS', zoneId: null,
      zoneName: null, zoneActive: true, date: '2026-11-20', startTime: null, endTime: null,
    }]);
    const entries = await loadCalendarEntries('2026-11-16', '2026-11-22');
    expect(entries.map((e) => e.kind).sort()).toEqual(['HOLIDAY', 'RESERVATION']);
    expect(campusEventsApi.occurrences).toHaveBeenCalledWith('2026-11-16', '2026-11-22');
  });
});
