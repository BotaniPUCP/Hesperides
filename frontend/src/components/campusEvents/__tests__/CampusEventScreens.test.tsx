import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CampusEventForm } from '../CampusEventForm';
import { CampusEventsScreen } from '../CampusEventsScreen';
import { campusEventsApi } from '@/lib/campus-events-api';

let mockRole = 'COORDINADOR';
jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole } } }) }));
jest.mock('@/lib/campus-events-api', () => ({
  campusEventsApi: { occurrences: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), get: jest.fn() },
}));
jest.mock('@/lib/green-area-sets-api', () => ({
  greenAreaSetsApi: { sectionOptions: jest.fn().mockResolvedValue([
    { id: 1, code: 'S1', name: 'Sector verde 01', sections: [{ id: 11, code: 'AV-0011', name: 'Jardín Letras' }] }]) },
}));

const api = campusEventsApi as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'COORDINADOR';
  window.history.replaceState(null, '', '/calendario?mes=2026-11');
});

describe('CampusEventsScreen (SPEC-114 §5.2)', () => {
  const occurrence = (date: string, name: string, extra = {}) => ({
    eventId: 7, name, typeCode: 'BLOCKING', typeLabel: 'Bloqueante', scope: 'SECTION', zoneId: 11,
    zoneName: 'Jardín Letras', zoneActive: true, date, startTime: '14:00', endTime: '18:00', ...extra,
  });

  it('lista el mes por día, con horario, ámbito y tipo; coordinación ve Editar', async () => {
    api.occurrences.mockResolvedValue([occurrence('2026-11-05', 'Jueves cultural'), occurrence('2026-11-12', 'Jueves cultural')]);
    render(<CampusEventsScreen />);

    expect(await screen.findAllByText('Jueves cultural')).toHaveLength(2);
    expect(screen.getAllByText('14:00–18:00')).toHaveLength(2);
    expect(screen.getAllByText('Jardín Letras')[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute('href', '/calendario/7');
    expect(api.occurrences).toHaveBeenCalledWith('2026-11-01', '2026-11-30', undefined);
  });

  it('el capataz lee pero no registra ni edita (CA-02)', async () => {
    mockRole = 'SUPERVISOR';
    api.occurrences.mockResolvedValue([occurrence('2026-11-05', 'Jueves cultural')]);
    render(<CampusEventsScreen />);

    await screen.findByText('Jueves cultural');
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Registrar evento' })).not.toBeInTheDocument();
  });

  it('un mes vacío lo dice', async () => {
    api.occurrences.mockResolvedValue([]);
    render(<CampusEventsScreen />);
    expect(await screen.findByText('No hay eventos en noviembre')).toBeInTheDocument();
  });
});

describe('CampusEventForm (SPEC-114 §5.1)', () => {
  it('un feriado fija el ámbito en todo el campus (CA-03)', () => {
    render(<CampusEventForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Feriado' }));

    expect(screen.getByRole('button', { name: 'Un sector' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Todo el campus' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('muestra el resumen en vivo y envía la regla con sus días', async () => {
    api.create.mockResolvedValue({ id: 1 });
    render(<CampusEventForm />);

    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Jueves cultural' } });
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-03-18' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-07-01' } });
    fireEvent.click(screen.getByLabelText(/Con horario/));
    fireEvent.click(screen.getByLabelText('Jueves'));

    expect(screen.getByText('16 jueves, del 18 mar al 1 jul, de 14:00 a 18:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Jueves cultural', scope: 'CAMPUS', startDate: '2027-03-18', endDate: '2027-07-01',
      startTime: '14:00', endTime: '18:00', weekdays: [4] })));
  });
});
