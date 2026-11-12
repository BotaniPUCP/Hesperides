import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InterventionsList } from '../InterventionsList';
import { PageFrame } from '@/components/layouts/PageFrame';
import { interventionsApi, type InterventionPage } from '@/lib/interventions-api';
import { rememberedHref } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 3, role: { code: 'COORDINADOR' } } }) }));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({ items: [{ code: 'COMPLETED', label: 'Ejecutada' }], isLoading: false, errorMessage: null }),
}));
jest.mock('@/lib/interventions-api', () => ({
  ...jest.requireActual('@/lib/interventions-api'),
  interventionsApi: { list: jest.fn() },
}));

const LIST = '/intervenciones';
const list = jest.mocked(interventionsApi.list);
const onePage = (totalPages = 3) => ({
  content: [{
    id: 10, code: 'INT-000010', statusCode: 'COMPLETED', scheduledDate: '2026-10-23', completedLocationCount: 1,
    locationCount: 2, validatedLocationCount: 0, pendingEvidenceCount: 0, approvedForCounting: false,
  }],
  page: { number: 0, size: 12, totalElements: 30, totalPages },
}) as unknown as InterventionPage;

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
  restartTrail(LIST);
  list.mockResolvedValue(onePage());
});

it('recupera la posición del scroll cuando terminan de cargar los datos', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  saveListScroll(LIST, 'page=1', 900);
  window.history.replaceState(null, '', `${LIST}?page=1`);
  render(<InterventionsList />);

  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 900));
  scrollTo.mockRestore();
});

it('reabre con el estado, las fechas y la página que trae la URL', async () => {
  window.history.replaceState(null, '', `${LIST}?status=COMPLETED&from=2026-10-01&to=2026-10-31&page=2`);
  render(<InterventionsList />);

  await waitFor(() => expect(list).toHaveBeenCalledWith(2, 'COMPLETED', '2026-10-01', '2026-10-31', undefined));
  expect(await screen.findByText('Página 3 de 3')).toBeInTheDocument();
  expect(screen.getByLabelText('Desde')).toHaveValue('2026-10-01');
});

it('una fecha o página manipuladas en la URL no llegan al backend', async () => {
  window.history.replaceState(null, '', `${LIST}?from=ayer&to=2026-13&page=-3`);
  render(<InterventionsList />);

  await waitFor(() => expect(list).toHaveBeenCalledWith(0, '', '', '', undefined));
});

it('lleva los filtros a la URL, vuelve a la primera página y los recuerda', async () => {
  window.history.replaceState(null, '', `${LIST}?page=2`);
  render(<InterventionsList />);
  await screen.findByText('INT-000010');

  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });

  await waitFor(() => expect(window.location.search).toBe('?from=2026-10-01'));
  await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?from=2026-10-01`));
});

it('pasar de página queda en la URL', async () => {
  render(<InterventionsList />);
  await screen.findByText('INT-000010');

  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  await waitFor(() => expect(window.location.search).toBe('?page=1'));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(1, '', '', '', undefined));
});

it('filtrar no pierde el ejemplar por el que se llegó', async () => {
  window.history.replaceState(null, '', `${LIST}?greenElementCode=EV-000001`);
  render(<InterventionsList greenElementCode="EV-000001" />);
  await screen.findByText('INT-000010');

  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-10-31' } });

  await waitFor(() => expect(window.location.search).toBe('?greenElementCode=EV-000001&to=2026-10-31'));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(0, '', '', '2026-10-31', 'EV-000001'));
});

it('filtrar conserva la identidad inmutable cuando el código puede reutilizarse', async () => {
  window.history.replaceState(null, '', `${LIST}?greenElementId=42&greenElementCode=EV-000001`);
  render(<InterventionsList greenElementCode="EV-000001" greenElementId="42" />);
  await screen.findByText('INT-000010');

  fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'COMPLETED' } });

  await waitFor(() => expect(window.location.search).toBe('?greenElementCode=EV-000001&greenElementId=42&status=COMPLETED'));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(0, 'COMPLETED', '', '', undefined, '42'));
});

it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
  window.history.replaceState(null, '', `${LIST}?from=2026-10-01&page=2`);
  render(<InterventionsList />);
  await screen.findByText('INT-000010');

  act(() => window.history.pushState(null, '', LIST));

  await waitFor(() => expect(screen.getByLabelText('Desde')).toHaveValue(''));
  await waitFor(() => expect(list).toHaveBeenLastCalledWith(0, '', '', '', undefined));
  await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
});

it('la flecha va a Inicio sin recorrido y a la pantalla anterior si se llegó desde otra', async () => {
  window.history.replaceState(null, '', LIST);
  render(<PageFrame><InterventionsList /></PageFrame>);
  await screen.findByText('INT-000010');
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/');

  act(() => {
    restartTrail('/catastro/ejemplares/EV-000001');
    recordVisit(LIST);
  });

  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/catastro/ejemplares/EV-000001');
});
