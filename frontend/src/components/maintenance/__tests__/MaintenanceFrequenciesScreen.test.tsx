import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MaintenanceFrequency } from '@shared/types';
import { MaintenanceFrequenciesScreen } from '../MaintenanceFrequenciesScreen';
import { rememberedHref, rememberListQuery } from '@/lib/listMemory';
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
    list: jest.fn(), getActivityTypes: jest.fn(), getRuleTypes: jest.fn(), getZones: jest.fn(), getCompliance: jest.fn(),
  },
}));

const LIST = '/admin/frecuencias';
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
  jest.mocked(maintenanceApi.getZones).mockResolvedValue([]);
  jest.mocked(maintenanceApi.getCompliance).mockResolvedValue([]);
});

it('muestra la flecha a Reportes, con su pestaña y mes, solo si se llegó desde allí', async () => {
  restartTrail(LIST);
  const { unmount } = render(<MaintenanceFrequenciesScreen />);
  await screen.findByText('Poda');
  expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
  unmount();

  rememberListQuery('/reportes', 'tab=mensual&month=2026-10');
  restartTrail('/reportes');
  recordVisit(LIST);
  render(<MaintenanceFrequenciesScreen />);

  expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/reportes?tab=mensual&month=2026-10');
});

it('reabre con los filtros que trae la URL', async () => {
  window.history.replaceState(null, '', `${LIST}?regime=OUTSOURCED`);
  render(<MaintenanceFrequenciesScreen />);

  expect(await screen.findByText('Riego')).toBeInTheDocument();
  expect(screen.queryByText('Poda')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Modalidad de ejecución')).toHaveValue('OUTSOURCED');
});

it('un filtro de la tabla no borra el periodo consultado, y viceversa', async () => {
  window.history.replaceState(null, '', `${LIST}?from=2026-10-01&to=2026-10-31`);
  render(<MaintenanceFrequenciesScreen />);
  await screen.findByText('Poda');

  fireEvent.change(screen.getByLabelText('Modalidad de ejecución'), { target: { value: 'IN_HOUSE' } });

  await waitFor(() => expect(window.location.search).toBe('?regime=IN_HOUSE&from=2026-10-01&to=2026-10-31'));
  await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?regime=IN_HOUSE&from=2026-10-01&to=2026-10-31`));

  fireEvent.change(screen.getByLabelText('Fecha final'), { target: { value: '2026-11-30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Consultar cumplimiento por lugar' }));

  await waitFor(() => expect(window.location.search).toBe('?regime=IN_HOUSE&from=2026-10-01&to=2026-11-30'));
});

it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
  window.history.replaceState(null, '', `${LIST}?search=poda&regime=IN_HOUSE&from=2026-10-01&to=2026-10-31`);
  render(<MaintenanceFrequenciesScreen />);
  await screen.findByText('Poda');
  expect(screen.getByLabelText('Buscar actividad')).toHaveValue('poda');

  act(() => window.history.pushState(null, '', LIST));

  await waitFor(() => expect(screen.getByLabelText('Buscar actividad')).toHaveValue(''));
  expect(screen.getByLabelText('Modalidad de ejecución')).toHaveValue('');
  expect(screen.getByLabelText('Fecha inicial')).toHaveValue('');
  expect(screen.getByText('Riego')).toBeInTheDocument();
  await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
});
