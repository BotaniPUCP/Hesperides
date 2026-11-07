import { act, render, screen } from '@testing-library/react';
import { InterventionDetail } from '../InterventionDetail';
import { PageFrame } from '@/components/layouts/PageFrame';
import { interventionsApi, type InterventionDetail as Detail, type InterventionOptions } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';
import { rememberListQuery } from '@/lib/listMemory';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => '/intervenciones/10' }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 3, role: { code: 'OPERARIO' } } }) }));
jest.mock('@/hooks/useCatalog', () => ({ useCatalog: () => ({ items: [], isLoading: false, errorMessage: null }) }));
jest.mock('@/components/ui', () => ({ ...jest.requireActual('@/components/ui'), useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/lib/interventions-api', () => ({
  ...jest.requireActual('@/lib/interventions-api'),
  interventionsApi: { detail: jest.fn(), options: jest.fn() },
}));

const LIST = '/intervenciones';
const DETAIL = `${LIST}/10`;
const work = {
  id: 10, code: 'INT-000010', version: 1, classItemId: 1, typeItemId: null, scheduledDate: '2026-10-23',
  statusCode: 'COMPLETED', planningStatusCode: 'ASSIGNED', completedLocationCount: 0, validatedLocationCount: 0,
  locationCount: 0, pendingEvidenceCount: 0, approvedForCounting: false, locations: [], sourceIncidents: [], history: [],
} as unknown as Detail;

beforeEach(() => {
  jest.clearAllMocks();
  window.sessionStorage.clear();
  jest.mocked(interventionsApi.detail).mockResolvedValue(work);
  jest.mocked(interventionsApi.options).mockResolvedValue({ teams: [], places: [], zones: [], catalogs: [] } as InterventionOptions);
  act(() => restartTrail(DETAIL));
});

it('sin recorrido, breadcrumb y flecha llevan al listado con sus últimos filtros', async () => {
  rememberListQuery(LIST, 'status=COMPLETED&page=2');
  render(<PageFrame><InterventionDetail id={10} /></PageFrame>);

  const crumb = await screen.findByRole('link', { name: 'Intervenciones' });
  expect(crumb).toHaveAttribute('href', `${LIST}?status=COMPLETED&page=2`);
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', `${LIST}?status=COMPLETED&page=2`);
});

it.each([
  ['Frecuencias, con su reporte consultado', '/admin/frecuencias', 'from=2026-10-01&to=2026-10-31'],
  ['la ficha del ejemplar', '/catastro/ejemplares/EV-000001', ''],
  ['la incidencia, con sus filtros', '/incidencias/7', 'search=rama&status=OPEN'],
  ['el listado, con sus filtros', LIST, 'status=COMPLETED'],
])('la flecha regresa a %s', async (_name, origin, query) => {
  if (query) rememberListQuery(origin, query);
  act(() => {
    restartTrail(origin);
    recordVisit(DETAIL);
  });

  render(<PageFrame><InterventionDetail id={10} /></PageFrame>);

  const back = await screen.findByRole('link', { name: 'Volver' });
  expect(back).toHaveAttribute('href', query ? `${origin}?${query}` : origin);
});

it('si no carga, también ofrece volver al listado filtrado', async () => {
  rememberListQuery(LIST, 'page=2');
  jest.mocked(interventionsApi.detail).mockRejectedValue(new ApiError(503, 'Unavailable'));

  render(<InterventionDetail id={10} />);

  expect(await screen.findByRole('link', { name: 'Volver al listado' })).toHaveAttribute('href', `${LIST}?page=2`);
});
