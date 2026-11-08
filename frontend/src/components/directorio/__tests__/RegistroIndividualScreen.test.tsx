import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { directoryApi } from '@/lib/directory-api';
import { RegistroIndividualScreen } from '../RegistroIndividualScreen';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/directorio/registrar',
}));
const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { organizations: jest.fn(), similarOrganizations: jest.fn(), similarContacts: jest.fn(),
    createOrganization: jest.fn(), createContact: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.similarOrganizations.mockResolvedValue([]);
  api.similarContacts.mockResolvedValue([]);
  api.organizations.mockResolvedValue({ page: 0, size: 20, total: 1, items: [
    { code: 'ORG-0012', name: 'OIE', type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, phone: null, contactCount: 0 },
  ] });
});

describe('RegistroIndividualScreen', () => {
  it('primero se elige qué registrar; sin elegir no hay formulario', () => {
    render(<RegistroIndividualScreen />);

    expect(screen.getByRole('radio', { name: /Organización/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Contacto/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('registra una organización y abre su ficha', async () => {
    api.createOrganization.mockResolvedValue({ code: 'ORG-0040' });
    render(<RegistroIndividualScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Organización/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Facultad de Derecho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/directorio/ORG-0040'));
  });

  it('registra un contacto con su organización y abre su ficha', async () => {
    api.createContact.mockResolvedValue({ code: 'CON-0050' });
    render(<RegistroIndividualScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Contacto/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Xiomara Torres' } });
    fireEvent.change(screen.getByLabelText('Agregar organización'), { target: { value: 'oie' } });
    fireEvent.click(await screen.findByRole('button', { name: 'OIE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/directorio/contactos/CON-0050'));
    expect(api.createContact).toHaveBeenCalledWith(expect.objectContaining({ organizationCodes: ['ORG-0012'] }));
  });

  it('el capataz no registra', () => {
    mockRole.current = 'SUPERVISOR';
    render(<RegistroIndividualScreen />);

    expect(screen.getByText(/solo coordinación/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
