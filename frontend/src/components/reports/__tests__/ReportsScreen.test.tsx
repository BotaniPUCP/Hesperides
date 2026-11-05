import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/hooks/useAuth';
import { ReportsScreen } from '../ReportsScreen';

const push = jest.fn();
const replace = jest.fn();
let search = new URLSearchParams();

jest.mock('@/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => search,
}));

function as(role: string, query = '') {
  search = new URLSearchParams(query);
  jest.mocked(useAuth).mockReturnValue({ user: { id: 1, role: { code: role } } } as ReturnType<typeof useAuth>);
  return render(<ReportsScreen />);
}

beforeEach(() => jest.clearAllMocks());

describe('ReportsScreen (SPEC-202 D-13, CA-G01, CA-G03)', () => {
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

  it('el operario no ve pestañas', () => {
    as('OPERARIO', 'tab=mensual');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('No tienes acceso a los reportes')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
