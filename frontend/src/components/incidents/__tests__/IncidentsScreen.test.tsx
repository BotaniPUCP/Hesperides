import { render, screen } from '@testing-library/react';
import { IncidentsScreen } from '../IncidentsScreen';
import { IncidentDetailScreen } from '../IncidentDetailScreen';
import { IncidentCaptureScreen } from '../IncidentCaptureScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentDetail, useIncidentMine, useIncidentNavigation, useIncidentOptions, useIncidents } from '@/hooks/useIncidents';
import { incidentHref } from '@/lib/incidentNavigation';
import { rememberedHref, rememberListQuery } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { restartTrail } from '@/lib/navigationTrail';
import { incidentMine, incidentOptions, incidentPage, pendingDetail } from '../__fixtures__/incidents';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useIncidents', () => ({
  useIncidentNavigation: jest.fn(), useIncidents: jest.fn(), useIncidentOptions: jest.fn(), useIncidentMine: jest.fn(), useIncidentDetail: jest.fn(),
}));
let mockPathname = '/incidencias';
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => mockPathname }));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const filters = { search: 'rama', status: 'REPORTED', page: 2 };
const query = 'search=rama&status=REPORTED&page=2';

function as(role: string) {
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, fullName: 'Óscar', role: { code: role } } } as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/incidencias';
  as('COORDINADOR');
  jest.mocked(useIncidentNavigation).mockReturnValue({
    filters, href: (path) => incidentHref(path, filters), listHref: incidentHref('/incidencias', filters), changeFilters: jest.fn(),
  });
  jest.mocked(useIncidents).mockReturnValue({ ...idle, data: incidentPage });
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: incidentOptions });
  jest.mocked(useIncidentMine).mockReturnValue({ ...idle, data: incidentMine });
  jest.mocked(useIncidentDetail).mockReturnValue({ ...idle, data: pendingDetail });
});

it('links to capture and detail with the current filters', () => {
  render(<IncidentsScreen />);
  expect(screen.getByRole('link', { name: 'Informar una incidencia' })).toHaveAttribute('href', `/incidencias/nueva?${query}`);
  expect(screen.getByRole('link', { name: /INC-2026-0007/ })).toHaveAttribute('href', `/incidencias/7?${query}`);
});

it('shows the code, whether it is still to activate and the deadline of each incident', () => {
  render(<IncidentsScreen />);
  expect(screen.getByText('INC-2026-0007')).toBeInTheDocument();
  expect(screen.getByText('Por activar')).toBeInTheDocument();
  expect(screen.getByText('A tiempo')).toBeInTheDocument();
});

it('recupera la posición del scroll de la lista con los mismos filtros', () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  saveListScroll('/incidencias', query, 900);
  render(<IncidentsScreen />);
  expect(scrollTo).toHaveBeenCalledWith(0, 900);
  scrollTo.mockRestore();
  window.sessionStorage.clear();
});

it('shows the list when the filter options fail', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  render(<IncidentsScreen />);
  expect(screen.getByText('Rama rajada sobre el Pontódromo')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('a foreman or operator sees their own reports counted apart (SPEC-201 §3.11)', () => {
  as('OPERARIO');
  render(<IncidentsScreen />);
  const mine = screen.getByRole('region', { name: 'Mis reportes' });
  expect(mine).toHaveTextContent('Por activar');
  expect(mine).toHaveTextContent('1');
});

it('coordination does not get the own-reports block', () => {
  render(<IncidentsScreen />);
  expect(screen.queryByRole('region', { name: 'Mis reportes' })).not.toBeInTheDocument();
});

it('keeps the detail visible when options fail and offers a breadcrumb back to the filtered list', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  mockPathname = '/incidencias/7';
  rememberListQuery('/incidencias', query);
  render(<PageFrame><IncidentDetailScreen id={7} /></PageFrame>);
  expect(screen.getByRole('heading', { name: 'INC-2026-0007' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', `/incidencias?${query}`);
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('sin recorrido, la flecha del detalle lleva a la lista filtrada', () => {
  mockPathname = '/incidencias/7';
  rememberListQuery('/incidencias', query);
  restartTrail('/incidencias/7');
  render(<PageFrame><IncidentDetailScreen id={7} /></PageFrame>);
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', `/incidencias?${query}`);
});

it('recuerda sus filtros para que al regresar de una intervención no se pierdan', () => {
  render(<IncidentDetailScreen id={7} />);
  expect(rememberedHref('/incidencias/7')).toBe(`/incidencias/7?${query}`);
});

it('uses a route-level heading and filtered breadcrumb for capture', () => {
  mockPathname = '/incidencias/nueva';
  rememberListQuery('/incidencias', query);
  render(<PageFrame><IncidentCaptureScreen /></PageFrame>);
  expect(screen.getByRole('heading', { level: 1, name: 'Informar una incidencia' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', `/incidencias?${query}`);
});

it('ADMIN revisa y activa como coordinación', () => {
  as('ADMIN');
  render(<IncidentDetailScreen id={7} />);
  expect(screen.getByRole('button', { name: 'Enviar comentario' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Activar incidencia' })).toBeInTheDocument();
});
