import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MaintenanceFrequency } from '@shared/types';
import { MaintenanceFrequenciesScreen } from '../MaintenanceFrequenciesScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { rememberedHref, rememberListQuery } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { maintenanceApi } from '@/lib/maintenance-api';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 3, role: { code: 'SUPERVISOR' } } }) }));
jest.mock('../FrequenciesTable', () => ({
  FrequenciesTable: ({ frequencies }: { frequencies: MaintenanceFrequency[] }) => (
    <ul>{frequencies.map((f) => <li key={f.id}>{f.activityType.label}</li>)}</ul>
  ),
}));
jest.mock('@/lib/maintenance-api', () => ({
  maintenanceApi: {
    list: jest.fn(), getActivityTypes: jest.fn(), getRuleTypes: jest.fn(),
  },
}));
jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { list: jest.fn().mockResolvedValue([]) } }));

const LIST = '/intervenciones/frecuencias';
const frequency = (id: number, label: string, regime: string) => ({
  id, regime, notes: null, activityType: { label }, frequencyRuleType: { code: 'INTERVAL_DAYS' },
}) as unknown as MaintenanceFrequency;

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
  jest.mocked(maintenanceApi.list).mockResolvedValue([frequency(1, 'Poda', 'IN_HOUSE'), frequency(2, 'Riego', 'OUTSOURCED')]);
  jest.mocked(maintenanceApi.getActivityTypes).mockResolvedValue([]);
  jest.mocked(maintenanceApi.getRuleTypes).mockResolvedValue([]);
});

it('la flecha regresa a Reportes, con su pestaña y mes, si se llegó desde allí', async () => {
  window.history.replaceState(null, '', LIST);
  rememberListQuery('/reportes', 'tab=mensual&month=2026-10');
  restartTrail('/reportes');
  recordVisit(LIST);
  render(<PageFrame><MaintenanceFrequenciesScreen /></PageFrame>);

  expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/reportes?tab=mensual&month=2026-10');
});

it('recupera la posición del scroll cuando terminan de cargar los datos', async () => {
  const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  saveListScroll(LIST, 'regime=IN_HOUSE', 900);
  window.history.replaceState(null, '', `${LIST}?regime=IN_HOUSE`);
  render(<MaintenanceFrequenciesScreen />);

  await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 900));
  scrollTo.mockRestore();
});

it('reabre con los filtros que trae la URL', async () => {
  window.history.replaceState(null, '', `${LIST}?regime=OUTSOURCED`);
  render(<MaintenanceFrequenciesScreen />);

  expect(await screen.findByText('Riego')).toBeInTheDocument();
  expect(screen.queryByText('Poda')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Modalidad de ejecución')).toHaveValue('OUTSOURCED');
});

it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
  window.history.replaceState(null, '', `${LIST}?search=poda&regime=IN_HOUSE`);
  render(<MaintenanceFrequenciesScreen />);
  await screen.findByText('Poda');
  expect(screen.getByLabelText('Buscar actividad')).toHaveValue('poda');

  act(() => window.history.pushState(null, '', LIST));

  await waitFor(() => expect(screen.getByLabelText('Buscar actividad')).toHaveValue(''));
  expect(screen.getByLabelText('Modalidad de ejecución')).toHaveValue('');
  expect(screen.getByText('Riego')).toBeInTheDocument();
  await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
});
