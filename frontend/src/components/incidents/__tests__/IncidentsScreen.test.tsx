import { render, screen } from '@testing-library/react';
import { IncidentsScreen } from '../IncidentsScreen';
import { IncidentDetailScreen } from '../IncidentDetailScreen';
import { IncidentCaptureScreen } from '../IncidentCaptureScreen';
import { useAuth } from '@/hooks/useAuth';
import { useIncidentDetail, useIncidentNavigation, useIncidentOptions, useIncidents, useIncidentSummary } from '@/hooks/useIncidents';
import { incidentHref } from '@/lib/incidentNavigation';
import { incidentOptions, incidentPage, pendingDetail } from '../__fixtures__/incidents';

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useIncidents', () => ({
  useIncidentNavigation: jest.fn(), useIncidents: jest.fn(), useIncidentOptions: jest.fn(), useIncidentSummary: jest.fn(), useIncidentDetail: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));

const idle = { loading: false, errorMessage: null, notFound: false, reload: jest.fn(), updateData: jest.fn() };
const filters = { search: 'rama', status: 'OPEN', page: 2 };
beforeEach(() => {
  jest.clearAllMocks();
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

it('shows the list when summary and filter options fail', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  jest.mocked(useIncidentSummary).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  render(<IncidentsScreen />);
  expect(screen.getByText('Rama caída en puerta principal')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar resumen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('keeps the detail visible when options fail and offers a breadcrumb back to the filtered list', () => {
  jest.mocked(useIncidentOptions).mockReturnValue({ ...idle, data: null, errorMessage: 'Error del servidor.' });
  render(<IncidentDetailScreen id={7} />);
  expect(screen.getByRole('heading', { name: 'Incidencia #7' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', '/incidencias?search=rama&status=OPEN&page=2');
  expect(screen.getByRole('button', { name: 'Reintentar opciones' })).toBeInTheDocument();
});

it('uses a route-level heading and filtered breadcrumb for capture', () => {
  render(<IncidentCaptureScreen />);
  expect(screen.getByRole('heading', { level: 1, name: 'Informar una incidencia' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Incidencias' })).toHaveAttribute('href', '/incidencias?search=rama&status=OPEN&page=2');
});
