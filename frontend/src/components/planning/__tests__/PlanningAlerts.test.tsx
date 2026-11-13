import { render, screen } from '@testing-library/react';
import { PlanningAlerts } from '../PlanningAlerts';
import { planningApi } from '@/lib/planning-api';
import { planningRow } from '../__fixtures__/planningFixtures';

jest.mock('@/lib/planning-api', () => ({ planningApi: { rows: jest.fn() } }));
let mockRole = 'COORDINADOR';
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole } } }) }));

const rows = planningApi.rows as jest.Mock;
const quota = { minDays: null, maxDays: null, seasonLabel: null, annualTarget: 4, windowStartMonth: null, windowEndMonth: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'COORDINADOR';
});

describe('PlanningAlerts (SPEC-203 §5.7)', () => {
  it('avisa de lo atrasado y de lo que vence en los próximos 7 días', async () => {
    rows.mockResolvedValue([
      planningRow({ setName: 'Pabellones', state: 'OVERDUE', days: 2 }),
      planningRow({ setId: 4, setName: 'Ruta de ingreso', state: 'OVERDUE', days: 4 }),
      planningRow({ setId: 5, setName: 'Letras', state: 'NOT_DUE', days: 7 }),
      planningRow({ setId: 6, setName: 'Bosque', state: 'NOT_DUE', days: 8 }),
    ]);

    render(<PlanningAlerts />);

    expect(await screen.findByText('2 conjuntos atrasados')).toBeInTheDocument();
    expect(screen.getByText('Corte de césped en Pabellones — 2 días tarde')).toBeInTheDocument();
    expect(screen.getByText('1 conjunto vence en los próximos 7 días')).toBeInTheDocument();
    expect(screen.getByText('Corte de césped en Letras — faltan 7 días')).toBeInTheDocument();
    expect(screen.queryByText(/Bosque/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Planificación' })).toHaveAttribute('href', '/intervenciones/planificacion');
  });

  it('la cuota anual dice su fecha estimada', async () => {
    rows.mockResolvedValue([planningRow({ activityLabel: 'Fitosanitario', setName: 'Todo el campus', state: 'DUE', days: 6,
      ruleKind: 'SEASONAL_PERIOD', rhythm: quota, estimatedDate: '2026-11-14', yearCount: 3 })]);

    render(<PlanningAlerts />);

    expect(await screen.findByText('Fitosanitario en Todo el campus — próxima estimada: 14 nov')).toBeInTheDocument();
  });

  it('sin nada pendiente no muestra nada', async () => {
    rows.mockResolvedValue([planningRow({ state: 'NOT_DUE', days: 20 })]);

    const { container } = render(<PlanningAlerts />);

    await screen.findByTestId('planning-alerts-ready');
    expect(container.querySelectorAll('section')).toHaveLength(0);
  });

  it('a un supervisor ni siquiera le pide los datos', () => {
    mockRole = 'SUPERVISOR';

    const { container } = render(<PlanningAlerts />);

    expect(rows).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
