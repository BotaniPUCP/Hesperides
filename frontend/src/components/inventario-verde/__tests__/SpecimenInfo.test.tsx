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
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dar de baja' }));

  expect(inventarioVerdeApi.deactivateSpecimen).toHaveBeenCalledWith('EV-000001', 'Retiro en campo');
  expect(mockPush).toHaveBeenCalledWith('/intervenciones?greenElementId=1&greenElementCode=EV-000001');
});
