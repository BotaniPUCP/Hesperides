import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannedInterventionForm } from '../PlannedInterventionForm';
import { InterventionForm } from '../InterventionForm';
import { interventionsApi } from '@/lib/interventions-api';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { planningApi } from '@/lib/planning-api';
import { planningRow } from '@/components/planning/__fixtures__/planningFixtures';
import type { CampusOptions, InterventionDetail, InterventionLocation } from '@/lib/interventions-api';

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1, role: { code: 'COORDINADOR' } } }) }));
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ confirm: (fn: () => void) => fn(), dialog: null, navigate: jest.fn() }),
}));
jest.mock('@/lib/interventions-api', () => ({
  ...jest.requireActual('@/lib/interventions-api'),
  interventionsApi: { options: jest.fn(), create: jest.fn(), campusOptions: jest.fn(), campusPreview: jest.fn() },
}));
jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { get: jest.fn() } }));
jest.mock('@/lib/planning-api', () => ({ planningApi: { rows: jest.fn(), recentAttention: jest.fn() } }));
// El mapa 3D no corre en jsdom: se reemplaza por lo que interesa aquí, lo que llega marcado.
jest.mock('../InterventionCampusMap', () => ({
  InterventionCampusMap: ({ selected }: { selected: InterventionLocation[] }) => (
    <ul aria-label="Marcado en el mapa">{selected.map((l) => <li key={l.clientReference}>{l.zoneId ?? `ejemplar ${l.elementIds[0]}`}</li>)}</ul>
  ),
}));

const REVISION = 'a'.repeat(64);
// Una fecha futura: el registro nuevo no acepta fechas pasadas, y la sugerida nunca lo es (SPEC-203 §5.6).
const SUGGESTED = '2099-11-08';
const options = {
  places: [], teams: [], zones: [],
  catalogs: [
    { id: 12, code: 'MANTENIMIENTO', label: 'Mantenimiento de césped', typeCode: 'INTERVENTION_CLASS', parentItemId: null },
    { id: 13, code: 'PODA', label: 'Poda', typeCode: 'INTERVENTION_CLASS', parentItemId: null },
    { id: 30, code: 'CORTE_CESPED', label: 'Corte de césped', typeCode: 'INTERVENTION_TYPE', parentItemId: 12 },
  ],
};

const setZone = (id: number) => ({ id, code: `AV-${id}`, name: `Sección ${id}`, displayName: `Sección ${id}`, landscapeCode: null, sectorName: null });
const campusZone = (id: number) => ({ id, code: `AV-${id}`, name: `Sección ${id}`, geometryValid: true,
  geometry: { type: 'Polygon' as const, coordinates: [] }, areaM2: 100, point: { latitude: -12, longitude: -77 }, polygonCount: 1 });
const specimen = (id: number) => ({ id, code: `EV-000${id}`, name: `Árbol ${id}`, point: { latitude: -12, longitude: -77 },
  typeCode: 'TREE', scientificName: 'Ficus', heightM: 5, crownRadiusM: 2, quantity: 1 });
const ids = (n: number) => Array.from({ length: n }, (_, i) => 1000 + i);

function campus(zoneIds: number[], specimenIds: number[] = [501, 502]): CampusOptions {
  return { selectionRevision: REVISION, zones: zoneIds.map(campusZone), specimens: specimenIds.map(specimen) };
}

function givenSet(zoneIds: number[], elementIds: number[] = []) {
  (greenAreaSetsApi.get as jest.Mock).mockResolvedValue({ id: 3, name: 'Ingreso Riva-Agüero', description: null, version: 0,
    activities: [], warnings: [], zones: zoneIds.map(setZone), elements: elementIds.map((id) => ({ id, code: `EV-000${id}` })) });
}

const createdBody = () => (interventionsApi.create as jest.Mock).mock.calls[0][0];
const counter = (text: string) => screen.findByText(text, { selector: 'p[role="status"]' });

async function createIntervention() {
  const submit = screen.getByRole('button', { name: 'Crear intervención' });
  await waitFor(() => expect(submit).toBeEnabled());
  await userEvent.click(submit);
  await waitFor(() => expect(interventionsApi.create).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  (interventionsApi.options as jest.Mock).mockResolvedValue(options);
  (interventionsApi.create as jest.Mock).mockResolvedValue({ id: 99 });
  (interventionsApi.campusOptions as jest.Mock).mockResolvedValue(campus([112, 113, ...ids(530)]));
  (interventionsApi.campusPreview as jest.Mock).mockImplementation(async (_: string, zones: number[], specimens: number[]) =>
    ({ surfaceM2: zones.length * 100, areaCount: zones.length, specimenCount: specimens.length }));
  (planningApi.rows as jest.Mock).mockResolvedValue([planningRow({ suggestedDate: SUGGESTED })]);
  (planningApi.recentAttention as jest.Mock).mockResolvedValue([]);
  givenSet([112, 113]);
});

describe('Registro de intervención desde la planificación (SPEC-203 §5.6)', () => {
  it('llega lleno con la actividad, la fecha sugerida y los jardines del conjunto marcados en el mapa', async () => {
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByDisplayValue('Planificada desde: Corte de césped en Ingreso Riva-Agüero')).toBeInTheDocument();
    expect(screen.getByDisplayValue(SUGGESTED)).toBeInTheDocument();
    expect(await counter('2 jardines y 0 ejemplares seleccionados')).toBeInTheDocument();
    await createIntervention();

    expect(createdBody()).toMatchObject({ classItemId: 12, typeItemId: 30, scheduledDate: SUGGESTED, campusSelectionRevision: REVISION });
    expect(createdBody().locations.map((l: InterventionLocation) => l.zoneId)).toEqual([112, 113]);
  });

  it('cada ejemplar del conjunto llega marcado por separado, como en el mapa', async () => {
    givenSet([112], [501, 502]);
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await counter('1 jardín y 2 ejemplares seleccionados')).toBeInTheDocument();
    await createIntervention();

    expect(createdBody().locations.map((l: InterventionLocation) => [l.zoneId, l.elementIds])).toEqual([[112, []], [null, [501]], [null, [502]]]);
  });

  it('avisa de lo del conjunto que ya no está en el inventario y no lo incluye', async () => {
    givenSet([112, 999], [501, 777]);
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByText('2 del conjunto ya no están en el mapa y no se incluyeron.')).toBeInTheDocument();
    expect(await counter('1 jardín y 1 ejemplar seleccionado')).toBeInTheDocument();
  });

  describe('con avance parcial, solo lo que falta', () => {
    beforeEach(() => {
      givenSet([112, 113], [501, 502]);
      (planningApi.rows as jest.Mock).mockResolvedValue([planningRow({ suggestedDate: SUGGESTED, elementCount: 2, zoneCount: 2,
        upToDateCount: 2, pendingZoneIds: [113], pendingElementIds: [502] })]);
    });

    it('propone solo el jardín y el ejemplar que faltan', async () => {
      render(<PlannedInterventionForm setId={3} activityId={30} onlyPending />);

      expect(await screen.findByText(/Se propone solo lo que falta: 1 jardín · 1 ejemplar./)).toBeInTheDocument();
      expect(await counter('1 jardín y 1 ejemplar seleccionado')).toBeInTheDocument();
      await createIntervention();

      expect(createdBody().locations.map((l: InterventionLocation) => [l.zoneId, l.elementIds])).toEqual([[113, []], [null, [502]]]);
    });

    it('«Incluir todo el conjunto» vuelve a armar el registro con todo', async () => {
      render(<PlannedInterventionForm setId={3} activityId={30} onlyPending />);

      await userEvent.click(await screen.findByRole('button', { name: 'Incluir todo el conjunto' }));

      expect(screen.queryByText(/Se propone solo lo que falta/)).not.toBeInTheDocument();
      expect(await counter('2 jardines y 2 ejemplares seleccionados')).toBeInTheDocument();
    });

    it('si no falta nada que recortar, llega el conjunto entero sin aviso', async () => {
      (planningApi.rows as jest.Mock).mockResolvedValue([planningRow({ elementCount: 2, zoneCount: 2,
        upToDateCount: 0, pendingZoneIds: [112, 113], pendingElementIds: [501, 502] })]);
      render(<PlannedInterventionForm setId={3} activityId={30} onlyPending />);

      expect(await counter('2 jardines y 2 ejemplares seleccionados')).toBeInTheDocument();
      expect(screen.queryByText(/Se propone solo lo que falta/)).not.toBeInTheDocument();
    });
  });

  it('avisa del jardín atendido hace poco y deja quitarlo', async () => {
    (planningApi.recentAttention as jest.Mock).mockResolvedValue([
      { zoneId: 113, displayName: 'Sección 113', lastDate: '2026-11-05', daysSinceLast: 3, minDays: 30 }]);
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await screen.findByText('Sección 113 ya tuvo Corte de césped hace 3 días (el mínimo es 30)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar de esta intervención' }));

    expect(await counter('1 jardín y 0 ejemplares seleccionados')).toBeInTheDocument();
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
    render(<InterventionForm prefill={{ typeId: 30, date: SUGGESTED, locations: [{ clientReference: 'x', zoneId: 112,
      placeId: null, location: null, elementIds: [], description: '', unitItemId: null, requestedQuantity: null }] }} />);

    expect(await screen.findByText(/Sección 112 ya tuvo Corte de césped/)).toBeInTheDocument();
  });

  it('al editar no avisa de sus propios jardines', async () => {
    const initial = { id: 7, code: 'INT-000007', version: 1, classItemId: 12, typeItemId: 30, scheduledDate: SUGGESTED,
      description: '', originItemId: 1, reportedByItemId: 1, externalCode: null, requestedAt: null, campusSelectionRevision: REVISION,
      locations: [{ id: 1, clientReference: 'r1', zoneId: 112, zoneSelectionRevision: REVISION, placeId: null, location: null,
        elementIds: [], description: '', unitItemId: null, requestedQuantity: null }] } as unknown as InterventionDetail;
    render(<InterventionForm initial={initial} />);

    expect(await counter('1 jardín y 0 ejemplares seleccionados')).toBeInTheDocument();
    expect(planningApi.recentAttention).not.toHaveBeenCalled();
  });

  it('un conjunto de 530 jardines llega completo al registro (Review Focus 1)', async () => {
    givenSet(ids(530));
    render(<PlannedInterventionForm setId={3} activityId={30} />);

    expect(await counter('530 jardines y 0 ejemplares seleccionados')).toBeInTheDocument();
    await createIntervention();

    expect(createdBody().locations).toHaveLength(530);
  }, 30000);
});
