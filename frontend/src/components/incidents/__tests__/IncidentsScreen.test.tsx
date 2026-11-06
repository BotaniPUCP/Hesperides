import { render, screen } from '@testing-library/react';
import { IncidentsScreen } from '../IncidentsScreen';
import { IncidentDetailScreen } from '../IncidentDetailScreen';
import { IncidentCaptureScreen } from '../IncidentCaptureScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentDetail, useIncidentNavigation, useIncidentOptions, useIncidents, useIncidentSummary } from '@/hooks/useIncidents';
import { incidentHref } from '@/lib/incidentNavigation';
import { rememberedHref, rememberListQuery } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { restartTrail } from '@/lib/navigationTrail';
import { incidentOptions, incidentPage, pendingDetail } from '../__fixtures__/incidents';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useIncidents', () => ({
  useIncidentNavigation: jest.fn(), useIncidents: jest.fn(), useIncidentOptions: jest.fn(), useIncidentSummary: jest.fn(), useIncidentDetail: jest.fn(),
}));
let mockPathname = '/incidencias';
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), usePathname: () => mockPathname }));
jest.mock('../IncidentMyReports',() => ({IncidentMyReports:() => <aside>Mis reportes</aside>}));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const filters = { search: 'rama', status: 'OPEN', page: 2 };
beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/incidencias';
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, fullName: 'Óscar', role: { code: 'COORDINADOR' } } } as ReturnType<typeof useAuth>);
  jest.mocked(useIncidentNavigation).mockReturnValue({
    filters, href: (path) => incidentHref(path, filters), listHref: incidentHref('/incidencias', filters), changeFilters: jest.fn(),
  });
  jest.mocked(useIncidents).mockReturnValue({ ...idle, data: incidentPage });
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: incidentOptions });
  jest.mocked(useIncidentSummary).mockReturnValue({ ...idle, data: null });
  jest.mocked(useIncidentDetail).mockReturnValue({ ...idle, data: pendingDetail });
});

it('links to capture and detail with the current filters rather than switching local views', () => {
  render(<IncidentsScreen />);
  expect(screen.getByRole('link', { name: 'Informar una incidencia' })).toHaveAttribute('href', '/incidencias/nueva?search=rama&status=OPEN&page=2');
  expect(screen.getByRole('link', { name: /Rama caída/ })).toHaveAttribute('href', '/incidencias/7?search=rama&status=OPEN&page=2');
});

it('recupera la posición del scroll de la lista con los mismos filtros', () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  saveListScroll('/incidencias', 'search=rama&status=OPEN&page=2', 900);
  render(<IncidentsScreen />);
  expect(scrollTo).toHaveBeenCalledWith(0, 900);
  scrollTo.mockRestore();
  window.sessionStorage.clear();
});

it('does not restore a scroll position saved for different OSG filters', () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  saveListScroll('/incidencias', 'search=rama&status=OPEN&page=2&severity=HIGH', 900);
  render(<IncidentsScreen />);
  expect(scrollTo).not.toHaveBeenCalled();
  scrollTo.mockRestore();
  window.sessionStorage.clear();
});

it('shows the list when summary and filter options fail', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  jest.mocked(useIncidentSummary).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  render(<IncidentsScreen />);
  expect(screen.getAllByText('Rama caída en puerta principal').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Reintentar resumen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('keeps the detail visible when options fail and offers a breadcrumb back to the filtered list', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  mockPathname = '/incidencias/7';
  rememberListQuery('/incidencias', 'search=rama&status=OPEN&page=2');
  render(<PageFrame><IncidentDetailScreen id={7} /></PageFrame>);
  expect(screen.getByRole('heading', { name: 'Incidencia #7' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', '/incidencias?search=rama&status=OPEN&page=2');
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('sin recorrido, la flecha del detalle lleva a la lista filtrada', () => {
  mockPathname = '/incidencias/7';
  rememberListQuery('/incidencias', 'search=rama&status=OPEN&page=2');
  restartTrail('/incidencias/7');
  render(<PageFrame><IncidentDetailScreen id={7} /></PageFrame>);
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/incidencias?search=rama&status=OPEN&page=2');
});

it('recuerda sus filtros para que al regresar de una intervención no se pierdan', () => {
  render(<IncidentDetailScreen id={7} />);
  expect(rememberedHref('/incidencias/7')).toBe('/incidencias/7?search=rama&status=OPEN&page=2');
});

it('uses a route-level heading and filtered breadcrumb for capture', () => {
  mockPathname = '/incidencias/nueva';
  rememberListQuery('/incidencias', 'search=rama&status=OPEN&page=2');
  render(<PageFrame><IncidentCaptureScreen /></PageFrame>);
  expect(screen.getByRole('heading', { level: 1, name: 'Informar una incidencia' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', '/incidencias?search=rama&status=OPEN&page=2');
});
