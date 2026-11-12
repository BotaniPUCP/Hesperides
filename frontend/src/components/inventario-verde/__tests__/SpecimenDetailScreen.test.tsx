import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SpecimenDetailScreen } from '../SpecimenDetailScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { rememberListQuery } from '@/lib/listMemory';
import { medidasDeEspecieCritica, p01Detail, palmeraReal } from '../__fixtures__/inventario';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/catastro/ejemplares/EV-000001',
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user:null, isLoading:false }) }));
jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { specimen: jest.fn() } }));

jest.mock('@/lib/catastro-api', () => ({ catastroApi: { assessments: jest.fn() } }));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;
const assessments = jest.mocked(catastroApi.assessments);

const EVALUACION = {
  id: 1, date: '2026-01-01', hasDisease: false, hasPests: false, hasMechanicalDamage: null, isLeaning: null,
  hasDeadBranches: true, hasCavitiesOrRot: null, hasExposedRoots: null, interferesWithInfrastructure: null,
  recommendedManagement: 'Poda de ramas secas', observation: null, assessedBy: null,
};

beforeEach(() => assessments.mockResolvedValue([]));
afterEach(() => jest.resetAllMocks());

describe('SpecimenDetailScreen', () => {
  it('el breadcrumb y la flecha regresan a la lista con sus últimos filtros', async () => {
    rememberListQuery('/catastro/ejemplares', 'search=real&type=PALM');
    api.specimen.mockResolvedValue(p01Detail);

    render(<PageFrame><SpecimenDetailScreen code="EV-000001" /></PageFrame>);

    const crumb = await screen.findByRole('link', { name: 'Ejemplares' });
    expect(crumb).toHaveAttribute('href', '/catastro/ejemplares?search=real&type=PALM');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/catastro/ejemplares?search=real&type=PALM');
    window.sessionStorage.clear();
  });

  it('muestra la ficha con su sección, su origen en el catastro y sus medidas', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByRole('heading', { name: 'EV-000001' })).toBeInTheDocument();
    expect(screen.getByText('D 3 (AV-0312)')).toBeInTheDocument();
    expect(screen.getByText(/Ref:\s*p01/)).toBeInTheDocument();
    expect(screen.getByText('Medido en campo')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName.toLowerCase() === 'dd' && /^7[.,]5\s*m$/.test(element.textContent?.trim() ?? ''))
    ).toBeInTheDocument();
  });

  it('un ejemplar sin medir no muestra alturas y lo dice', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null,
      isBanded: null, section: null, measuredAt: null, measurementStatus: 'NOT_MEASURED',
      pruningAssignment: 'FIELD_VERIFICATION',
    });

    render(<SpecimenDetailScreen code="EV-000458" />);

    expect(await screen.findByText('Sin medir')).toBeInTheDocument();
    expect(screen.getByText(/Nadie ha medido este ejemplar/)).toBeInTheDocument();
    expect(screen.getByText('Fuera de las áreas verdes')).toBeInTheDocument();
    expect(screen.queryByText('Altura total')).not.toBeInTheDocument();
  });

  it('un ejemplar no crítico sin medir muestra el promedio indicado como no medido', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null,
      isBanded: null, measuredAt: null, speciesCritical: false, measurementStatus: 'REFERENCE',
      referenceHeightM: 3, referenceCrownRadiusM: 0.25, referenceHeightSourceName: 'Ficha botánica',
      referenceCrownRadiusSourceName: 'Estimación del equipo', pruningAssignment: 'STABLE_STAFF',
    });

    render(<SpecimenDetailScreen code="EV-000100" />);

    expect(await screen.findByText('Promedio de la especie · No medido')).toBeInTheDocument();
    expect(screen.getByText(/^3\s*m$/)).toBeInTheDocument();
    expect(screen.getByText(/^0[.,]25\s*m$/)).toBeInTheDocument();
    expect(screen.getByText(/Altura: Ficha botánica/)).toBeInTheDocument();
    expect(screen.getByText(/Radio de copa: Estimación del equipo/)).toBeInTheDocument();
    expect(screen.queryByText('Medido en campo')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nadie ha medido este ejemplar/)).not.toBeInTheDocument();
  });

  it('un ejemplar sin medida vigente también ofrece su historial', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null,
      measuredAt: null, speciesCritical: false, measurementStatus: 'REFERENCE', referenceHeightM: 3, referenceCrownRadiusM: 1,
      referenceHeightSourceName: 'Ficha botánica', referenceCrownRadiusSourceName: 'Ficha botánica',
    });

    render(<SpecimenDetailScreen code="EV-000100" />);

    expect(await screen.findByRole('button', { name: /Ver historial de medidas/ })).toBeInTheDocument();
  });

  it('muestra las medidas adicionales aunque el ejemplar siga sin medir', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null,
      measuredAt: null, measurementStatus: 'NOT_MEASURED',
      extraMeasures: [{ code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', value: 3, measuredAt: '2026-02-01' }],
    });

    render(<SpecimenDetailScreen code="EV-000100" />);

    expect(await screen.findByText('Número de tallos')).toBeInTheDocument();
    expect(screen.getByText(/^3\s*und$/)).toBeInTheDocument();
    expect(screen.getByText(/1 feb 2026/)).toBeInTheDocument();
    expect(screen.getByText('Sin medir')).toBeInTheDocument();
  });

  it('avisa si la medida es anterior a la última poda', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, measuredBeforeLastPruning: true, lastPruningDate: '2026-03-03',
    });

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByText(/Medido el 1 ene 2026, antes de la poda del 3 mar 2026/)).toBeInTheDocument();
  });

  it('distingue una especie inactiva sin cambiar el estado ni la consulta del ejemplar', async () => {
    api.specimen.mockResolvedValue({ ...p01Detail, species: { ...palmeraReal, isActive: false } });

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByText('Especie inactiva')).toBeInTheDocument();
    expect(screen.queryByText('Inactiva')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'EV-000001' })).toBeInTheDocument();
  });

  it('vuelve a consultar la ficha del ejemplar cuando recupera el foco', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByRole('heading', { name: 'EV-000001' })).toBeInTheDocument();
    fireEvent.blur(window);
    fireEvent.focus(window);

    await waitFor(() => expect(api.specimen).toHaveBeenCalledTimes(2));
  });

  it('un valor que falta se muestra con un guion legible', async () => {
    api.specimen.mockResolvedValue({ ...p01Detail, trunkHeightM: null });

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('no muestra fuste ni DAP vacíos si no aplican a la especie', async () => {
    api.specimen.mockResolvedValue({
      ...p01Detail, trunkHeightM: null, dbhCm: null,
      species: { ...p01Detail.species, usesTrunkHeight: false, usesDbh: false },
    });

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(await screen.findByText('Altura total')).toBeInTheDocument();
    expect(screen.queryByText('Altura fuste')).not.toBeInTheDocument();
    expect(screen.queryByText('DAP (tronco)')).not.toBeInTheDocument();
  });

  it('muestra «no encontrado» si el código no existe', async () => {
    api.specimen.mockRejectedValue(new ApiError(404, 'Specimen not found'));

    render(<SpecimenDetailScreen code="EV-999999" />);

    expect(await screen.findByRole('heading', { name: 'Ejemplar no encontrado' })).toBeInTheDocument();
  });

  it('muestra el historial de evaluaciones con la vigente primero (CA-08)', async () => {
    api.specimen.mockResolvedValue(p01Detail);
    assessments.mockResolvedValue([
      { ...EVALUACION, id: 2, date: '2026-08-01', hasDeadBranches: false, recommendedManagement: null, assessedBy: 'Rosa Quispe' },
      EVALUACION,
    ]);

    render(<SpecimenDetailScreen code="EV-000001" />);

    const items = within(await screen.findByRole('list', { name: 'Historial de evaluaciones' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('vigente');
    expect(items[0]).toHaveTextContent('Rosa Quispe');
    expect(items[0]).toHaveTextContent('Sin problemas en lo evaluado');
    expect(items[1]).toHaveTextContent('Con ramas secas');
    expect(items[1]).toHaveTextContent('Manejo recomendado: Poda de ramas secas');
  });

  it('sin evaluaciones lo dice', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    render(<SpecimenDetailScreen code="EV-000001" />);

    expect(
      await screen.findByText(/No se registran evaluaciones fitosanitarias/i),
    ).toBeInTheDocument();
  });

  it('renderiza sin caerse la ficha del ejemplar del mango (EV-000660)', async () => {
    const mangoDetail = {
      id: 660,
      code: 'EV-000660',
      sourceReference: 'SA-50',
      sourceLocation: 'Pista de Salud',
      latitude: -12.0653920588178,
      longitude: -77.0817645639143,
      photoUrl: 'https://drive.google.com/file/d/1Xw6yHnlypBUrDWHnhtRPzfF-e-vHSzCM/view?usp=drivesdk',
      imageUrl: 'https://drive.google.com/thumbnail?id=1Xw6yHnlypBUrDWHnhtRPzfF-e-vHSzCM&sz=w1000',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=1Xw6yHnlypBUrDWHnhtRPzfF-e-vHSzCM&sz=w1000',
      quantity: 1,
      notes: null,
      legacyCode: null,
      elementTypeCode: 'INDIVIDUAL',
      elementTypeName: 'Ejemplar',
      heightM: null,
      trunkHeightM: null,
      dbhCm: null,
      crownRadiusM: null,
      isBanded: null,
      dataSource: 'UNKNOWN' as const,
      measurementStatus: 'NOT_MEASURED' as const,
      measuredAt: null,
      pruningAssignment: 'FIELD_VERIFICATION' as const,
      speciesCritical: true,
      referenceHeightM: null,
      referenceCrownRadiusM: null,
      referenceHeightSourceName: null,
      referenceCrownRadiusSourceName: null,
      lastPruningDate: null,
      measuredBeforeLastPruning: false,
      extraMeasures: [],
      section: null,
      species: {
        slug: 'mangifera-indica',
        isActive: true,
        scientificName: 'Mangifera indica',
        commonName: 'Mango',
        otherNames: [],
        family: 'Anacardiaceae',
        vegetationTypeCode: 'TREE',
        vegetationTypeName: 'Árbol',
        specimenCount: 1,
        imageUrl: 'https://drive.google.com/thumbnail?id=1Xw6yHnlypBUrDWHnhtRPzfF-e-vHSzCM&sz=w1000',
        imageSource: 'SPECIMEN' as const,
        photos: [],
        ...medidasDeEspecieCritica,
      },
    };

    api.specimen.mockResolvedValue(mangoDetail);

    render(<SpecimenDetailScreen code="EV-000660" />);

    expect(await screen.findByRole('heading', { name: 'EV-000660' })).toBeInTheDocument();
    expect(screen.getAllByText('Mango').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mangifera indica')).toBeInTheDocument();
  });
});
