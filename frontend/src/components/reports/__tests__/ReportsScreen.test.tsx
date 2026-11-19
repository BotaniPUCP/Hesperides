import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/hooks/useAuth';
import { rememberedHref } from '@/lib/listMemory';
import { resetReportDemo } from '@/lib/reportDemo';
import { reportsApi } from '@/lib/reports-api';
import { ReportsScreen } from '../ReportsScreen';

const push = jest.fn();
const replace = jest.fn();
let search = new URLSearchParams();

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => search,
}));
// Pending forever: these tests look at which endpoints a panel requests, not at their data.
jest.mock('@/lib/reports-api', () => ({
  reportsApi: {
    options: jest.fn(() => new Promise(() => undefined)),
    sections: jest.fn(() => new Promise(() => undefined)),
    monthly: jest.fn(() => new Promise(() => undefined)),
    weekly: jest.fn(() => new Promise(() => undefined)),
    direction: jest.fn(() => new Promise(() => undefined)),
  },
}));

function as(role: string, query = '') {
  search = new URLSearchParams(query);
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, role: { code: role } } } as ReturnType<typeof useAuth>);
  return render(<ReportsScreen />);
}

beforeEach(() => jest.clearAllMocks());

describe('ReportsScreen (SPEC-202 D-13, CA-G01, CA-G03)', () => {
  it('recuerda pestaña y filtros para que la flecha de otra pantalla regrese a ellos', () => {
    as('ADMIN', 'tab=mensual&sectorId=2');
    expect(rememberedHref('/reportes')).toBe('/reportes?tab=mensual&sectorId=2');
    window.sessionStorage.clear();
  });

  it('abre la pestaña de la URL dentro de su panel', () => {
    as('COORDINADOR', 'tab=semanal');
    expect(screen.getByRole('tab', { name: 'Semanal del sector' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'report-tab-semanal');
    expect(replace).not.toHaveBeenCalled();
  });

  it('cambiar de pestaña hace push solo con la pestaña nueva', async () => {
    as('ADMIN', 'tab=mensual&sectorId=2');
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Resumen para OSG' }));
    expect(push).toHaveBeenCalledWith('/reportes?tab=direccion', { scroll: false });
  });

  it('al activar una pestaña enfoca el título del panel y lo anuncia', async () => {
    const { rerender } = as('ADMIN', 'tab=mensual');
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Semanal del sector' }));
    search = new URLSearchParams('tab=semanal');
    rerender(<ReportsScreen />);
    expect(screen.getByRole('heading', { level: 2, name: 'Semanal del sector' })).toHaveFocus();
    expect(screen.getByText('Mostrando Semanal del sector')).toBeInTheDocument();
  });

  it('el capataz que pide la dirección queda en su semanal, sin error', () => {
    as('SUPERVISOR', 'tab=direccion');
    expect(replace).toHaveBeenCalledWith('/reportes?tab=semanal', { scroll: false });
    expect(screen.queryByRole('tab', { name: 'Resumen para OSG' })).not.toBeInTheDocument();
    expect(screen.getByText('Datos de tus cuadrillas.')).toBeInTheDocument();
  });

  it('sin pestaña en la URL reemplaza por la del rol', () => {
    as('COORDINADOR');
    expect(replace).toHaveBeenCalledWith('/reportes?tab=mensual', { scroll: false });
  });

  it('cada panel consulta solo cuando está activo', () => {
    const { unmount } = as('COORDINADOR', 'tab=semanal');
    expect(reportsApi.monthly).not.toHaveBeenCalled();
    unmount();
    as('COORDINADOR', 'tab=mensual&sectorId=1');
    expect(reportsApi.monthly).toHaveBeenCalledTimes(1);
    expect(reportsApi.monthly).toHaveBeenCalledWith(expect.objectContaining({ sectorId: 1 }));
  });

  it('el operario no ve pestañas', () => {
    as('OPERARIO', 'tab=mensual');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('No tienes acceso a los reportes')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('ReportsScreen: datos de demostración', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    resetReportDemo();
  });

  it('el interruptor muestra los JSON de demostración sin consultar el backend, y avisa que son de ejemplo', async () => {
    as('COORDINADOR', 'tab=direccion');
    expect(reportsApi.direction).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver con datos de demostración' }));

    expect(await screen.findByText(/Datos de demostración: las cifras son de ejemplo/)).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /Cobertura de los últimos 6 meses/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a los datos reales' })).toBeInTheDocument();
    expect(reportsApi.direction).toHaveBeenCalledTimes(1);
    expect(reportsApi.options).toHaveBeenCalledTimes(1);
  });
});
