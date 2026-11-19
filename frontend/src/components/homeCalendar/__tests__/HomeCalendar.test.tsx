import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { HomeCalendar } from '../HomeCalendar';
import { loadCalendarEntries } from '../loadCalendar';
import type { CalendarEntry } from '../calendarEntries';

jest.mock('../loadCalendar', () => ({ loadCalendarEntries: jest.fn() }));

let mockMobile = false;
jest.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => mockMobile }));

const entry = (over: Partial<CalendarEntry>): CalendarEntry => ({
  key: over.key ?? 'k', kind: 'BLOCKING', title: 'Evento', detail: 'Todo el campus', date: '2026-11-20',
  start: 540, end: 600, href: '/calendario?fecha=2026-11-20', ...over,
});

const ENTRIES: CalendarEntry[] = [
  entry({ key: 'graduacion', title: 'Graduación', date: '2026-11-20', start: 540, end: 690 }),
  entry({ key: 'feriado', kind: 'HOLIDAY', title: 'Día del Campus', date: '2026-11-18', start: null, end: null }),
  entry({ key: 'reserva', kind: 'RESERVATION', title: 'Jardín de Letras', detail: 'Centro Federado', date: '2026-11-17',
    start: 840, end: 960, href: '/reservas/RES-0001' }),
];

async function renderCalendar() {
  render(<HomeCalendar />);
  await act(async () => { await Promise.resolve(); });
}

describe('calendario del inicio', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Jueves 19 de noviembre de 2026, 10:00 en Lima.
    jest.setSystemTime(new Date('2026-11-19T15:00:00Z'));
    mockMobile = false;
    jest.mocked(loadCalendarEntries).mockResolvedValue(ENTRIES);
  });
  afterEach(() => jest.useRealTimers());

  it('abre en la semana de hoy, de lunes a domingo, con hoy marcado', async () => {
    await renderCalendar();
    expect(screen.getByRole('heading', { name: '16 – 22 nov 2026' })).toBeInTheDocument();
    expect(loadCalendarEntries).toHaveBeenCalledWith('2026-11-16', '2026-11-22');
    expect(screen.getByText('19').closest('[aria-current="date"]')).not.toBeNull();
  });

  it('muestra los eventos, los feriados y las reservas, cada uno con su enlace', async () => {
    await renderCalendar();
    expect(screen.getByRole('link', { name: /Graduación/ })).toHaveAttribute('href', '/calendario?fecha=2026-11-20');
    expect(screen.getByRole('link', { name: /Graduación/ })).toHaveTextContent('09:00 – 11:30');
    expect(screen.getByRole('link', { name: /Día del Campus/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Jardín de Letras/ })).toHaveAttribute('href', '/reservas/RES-0001');
  });

  it('marca la hora actual en el día de hoy', async () => {
    await renderCalendar();
    expect(screen.getByTestId('now-line')).toBeInTheDocument();
  });

  it('las flechas cambian de semana y «Hoy» vuelve', async () => {
    await renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('heading', { name: '23 – 29 nov 2026' })).toBeInTheDocument();
    expect(loadCalendarEntries).toHaveBeenLastCalledWith('2026-11-23', '2026-11-29');
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByRole('heading', { name: '16 – 22 nov 2026' })).toBeInTheDocument();
  });

  it('la vista de mes muestra el mes completo y agrupa lo que no cabe', async () => {
    const busy = Array.from({ length: 5 }, (_, i) => entry({ key: `e${i}`, title: `Evento ${i}`, date: '2026-11-25' }));
    jest.mocked(loadCalendarEntries).mockResolvedValue([...ENTRIES, ...busy]);
    await renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Mes' }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('heading', { name: 'Noviembre de 2026' })).toBeInTheDocument();
    expect(loadCalendarEntries).toHaveBeenLastCalledWith('2026-10-26', '2026-12-06');
    expect(screen.getByRole('link', { name: /Graduación/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2 más' }));
    expect(screen.getByRole('heading', { name: '23 – 29 nov 2026' })).toBeInTheDocument();
  });

  it('en el celular la vista de semana muestra un solo día', async () => {
    mockMobile = true;
    await renderCalendar();
    expect(screen.getByRole('heading', { name: 'Jueves, 19 de noviembre de 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Día' })).toBeInTheDocument();
    expect(loadCalendarEntries).toHaveBeenCalledWith('2026-11-19', '2026-11-19');
  });

  it('si no carga, lo dice sin esconder el calendario', async () => {
    jest.mocked(loadCalendarEntries).mockRejectedValue(new ApiError(500, 'boom'));
    await renderCalendar();
    expect(screen.getByRole('alert')).toHaveTextContent('Error del servidor');
    expect(within(screen.getByRole('region', { name: 'Calendario' })).getByRole('heading')).toBeInTheDocument();
  });
});
