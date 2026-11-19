import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecimenInfo } from '../SpecimenInfo';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { p01Detail } from '../__fixtures__/inventario';

const mockPush = jest.fn();
const mockUser = { role: { code: 'ADMIN' } };

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('@/lib/inventario-verde-api', () => ({
  ...jest.requireActual('@/lib/inventario-verde-api'),
  inventarioVerdeApi: { deactivateSpecimen: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(inventarioVerdeApi.deactivateSpecimen).mockResolvedValue(undefined);
});

it('al dar de baja vuelve al historial usando el ID de la generación retirada', async () => {
  const user = userEvent.setup();
  render(<SpecimenInfo specimen={p01Detail} />);

  await user.click(screen.getByRole('button', { name: 'Dar de baja' }));
  await user.type(screen.getByLabelText('Motivo de la baja'), 'Retiro en campo');
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continuar →' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));

  expect(inventarioVerdeApi.deactivateSpecimen).toHaveBeenCalledWith('EV-000001', 'Retiro en campo');
  expect(mockPush).toHaveBeenCalledWith('/intervenciones?greenElementId=1&greenElementCode=EV-000001');
});

it('muestra la sección estandarizada de información del retiro y oculta acciones operativas para ejemplares dados de baja', () => {
  const retiredSpecimen = {
    ...p01Detail,
    isActive: false,
    retiredAt: '2026-06-15T10:00:00Z',
    retirementReason: 'Tronco podrido y riesgo inminente de desplome',
    retiredByName: 'María Coordinadora',
  };

  render(<SpecimenInfo specimen={retiredSpecimen} />);

  expect(screen.getByRole('region', { name: 'Información del retiro' })).toBeInTheDocument();
  expect(screen.getByText('Información del retiro')).toBeInTheDocument();
  expect(screen.getByText(/Tronco podrido y riesgo inminente de desplome/i)).toBeInTheDocument();
  expect(screen.getByText(/María Coordinadora/i)).toBeInTheDocument();
  expect(screen.getByText(/Fecha de retiro/i)).toBeInTheDocument();
  expect(screen.getByText(/Registrado por/i)).toBeInTheDocument();
  expect(screen.getByText(/Motivo del retiro/i)).toBeInTheDocument();

  // Acciones operativas exclusivas de vigentes ocultas
  expect(screen.queryByRole('button', { name: 'Editar ejemplar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver en Mapa 3D' })).not.toBeInTheDocument();
});
