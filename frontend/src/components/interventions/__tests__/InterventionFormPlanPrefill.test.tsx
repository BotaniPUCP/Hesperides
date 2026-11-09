import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannedInterventionForm } from '../PlannedInterventionForm';
import { InterventionForm } from '../InterventionForm';
import { interventionsApi } from '@/lib/interventions-api';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { planningApi } from '@/lib/planning-api';
import { planningRow } from '@/components/planning/__fixtures__/planningFixtures';

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1, role: { code: 'COORDINADOR' } } }) }));
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: jest.fn() }),
}));
jest.mock('@/lib/interventions-api', () => ({
  ...jest.requireActual('@/lib/interventions-api'),
  interventionsApi: { options: jest.fn(), create: jest.fn() },
}));
jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { get: jest.fn() } }));
jest.mock('@/lib/planning-api', () => ({ planningApi: { rows: jest.fn(), recentAttention: jest.fn() } }));

const options = {
  places: [], teams: [],
  zones: [{ id: 112, name: 'Sección 112' }, { id: 113, name: 'Sección 113' }],
  catalogs: [
    { id: 12, code: 'MANTENIMIENTO', label: 'Mantenimiento de césped', typeCode: 'INTERVENTION_CLASS', parentItemId: null },
    { id: 13, code: 'PODA', label: 'Poda', typeCode: 'INTERVENTION_CLASS', parentItemId: null },
    { id: 30, code: 'CORTE_CESPED', label: 'Corte de césped', typeCode: 'INTERVENTION_TYPE', parentItemId: 12 },
  ],
};

function zones(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: 1000 + i, code: `AV-${i}`, name: `Sección ${i}`, displayName: `Sección ${i}`,
    landscapeCode: null, sectorName: null }));
}

beforeEach(() => {
  jest.clearAllMocks();
  (interventionsApi.options as jest.Mock).mockResolvedValue(options);
  (interventionsApi.create as jest.Mock).mockResolvedValue({ id: 99 });
  (planningApi.rows as jest.Mock).mockResolvedValue([planningRow({ suggestedDate: '2026-11-08' })]);
  (planningApi.recentAttention as jest.Mock).mockResolvedValue([]);
  (greenAreaSetsApi.get as jest.Mock).mockResolvedValue({ id: 3, name: 'Ingreso Riva-Agüero', description: null, version: 0,
    activities: [], warnings: [], zones: zones(0).concat([
      { id: 112, code: 'AV-112', name: 'Sección 112', displayName: 'Sección 112', landscapeCode: null, sectorName: null },
      { id: 113, code: 'AV-113', name: 'Sección 113', displayName: 'Sección 113', landscapeCode: null, sectorName: null }]) });
});

describe('Registro de intervención desde la planificación (SPEC-203 §5.6)', () => {
  it('llega lleno con la actividad, la fecha sugerida y un jardín por ubicación', async () => {
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByDisplayValue('Planificada desde: Corte de césped en Ingreso Riva-Agüero')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-11-08')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ubicación 2' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear intervención' }));

    await waitFor(() => expect(interventionsApi.create).toHaveBeenCalled());
    const body = (interventionsApi.create as jest.Mock).mock.calls[0][0];
    expect(body).toMatchObject({ classItemId: 12, typeItemId: 30, scheduledDate: '2026-11-08' });
    expect(body.locations.map((l: { zoneId: number }) => l.zoneId)).toEqual([112, 113]);
  });

  it('avisa del jardín atendido hace poco y deja quitarlo o mantenerlo', async () => {
    (planningApi.recentAttention as jest.Mock).mockResolvedValue([
      { zoneId: 113, displayName: 'Sección 113', lastDate: '2026-11-05', daysSinceLast: 3, minDays: 30 }]);
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByText('Sección 113 ya tuvo Corte de césped hace 3 días (el mínimo es 30)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar de esta intervención' }));

    expect(screen.queryByRole('heading', { name: 'Ubicación 2' })).not.toBeInTheDocument();
  });

  it('si ya hay una intervención abierta lo dice, sin bloquear', async () => {
    (planningApi.rows as jest.Mock).mockResolvedValue([planningRow({ state: 'SCHEDULED',
      openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-12', startedDate: null } })]);
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByRole('link', { name: 'INT-000081' })).toHaveAttribute('href', '/intervenciones/81');
    expect(screen.getByText(/Ya hay una intervención abierta para esto/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear intervención' })).toBeEnabled());
  });

  it('el aviso también sale en una intervención creada a mano', async () => {
    (planningApi.recentAttention as jest.Mock).mockResolvedValue([
      { zoneId: 112, displayName: 'Sección 112', lastDate: '2026-11-05', daysSinceLast: 3, minDays: 30 }]);
    render(<InterventionForm prefill={{ typeId: 30, date: '2026-11-08', locations: [{ clientReference: 'x', zoneId: 112,
      placeId: null, location: null, elementIds: [], description: '', unitItemId: null, requestedQuantity: null }] }} />);

    expect(await screen.findByText(/Sección 112 ya tuvo Corte de césped/)).toBeInTheDocument();
  });

  it('un conjunto de 530 jardines llega completo al registro (Review Focus 1)', async () => {
    (greenAreaSetsApi.get as jest.Mock).mockResolvedValue({ id: 3, name: 'Todo el campus', description: null, version: 0,
      activities: [], warnings: [], zones: zones(530) });
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByText('Y 510 jardines más del conjunto, sin datos propios de ubicación.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ubicación 20' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ubicación 21' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear intervención' }));

    await waitFor(() => expect(interventionsApi.create).toHaveBeenCalled());
    expect((interventionsApi.create as jest.Mock).mock.calls[0][0].locations).toHaveLength(530);
  }, 30000);
});
