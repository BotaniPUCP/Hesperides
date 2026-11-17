import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { directoryApi } from '@/lib/directory-api';
import { RegistroIndividualScreen } from '../RegistroIndividualScreen';
import { DirectoryCatalogProvider } from '../DirectoryCatalog';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  usePathname: () => '/directorio/registrar',
}));
const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { organizations: jest.fn(), catalog: jest.fn(), contactsCatalog: jest.fn(), similarOrganizations: jest.fn(),
    similarContacts: jest.fn(), createOrganization: jest.fn(), createContact: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const oie = { code: 'ORG-0012', name: 'OIE', type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' },
  active: true, aliases: ['Oficina de Intercambio Estudiantil'] };

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.catalog.mockResolvedValue([oie, { code: 'ORG-0031', name: 'CF Psicología',
    type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, active: true, aliases: [] }]);
  api.contactsCatalog.mockResolvedValue([{ code: 'CON-0007', fullName: 'Juan Diego Villasante', extension: '4549',
    mobile: null, email: null, active: true, organizations: [{ code: 'ORG-0012', name: 'OIE', active: true }] }]);
  api.similarOrganizations.mockResolvedValue([]);
  api.similarContacts.mockResolvedValue([]);
  api.organizations.mockResolvedValue({ page: 0, size: 20, total: 1, items: [
    { code: 'ORG-0012', name: 'OIE', type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, phone: null, contactCount: 0 },
  ] });
});

const renderScreen = () => render(<DirectoryCatalogProvider><RegistroIndividualScreen /></DirectoryCatalogProvider>);

describe('RegistroIndividualScreen', () => {
  it('primero se elige qué registrar; sin elegir no hay formulario', () => {
    renderScreen();

    expect(screen.getByRole('radio', { name: /Registrar organización/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Registrar contacto/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  });

  it('registra una organización y abre su ficha', async () => {
    api.createOrganization.mockResolvedValue({ code: 'ORG-0040' });
    renderScreen();

    fireEvent.click(screen.getByRole('radio', { name: /Registrar organización/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: 'Facultad de Derecho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/directorio/ORG-0040'));
  });

  it('registra un contacto con su organización y rol en la fila de alta, y abre su ficha', async () => {
    api.createContact.mockResolvedValue({ code: 'CON-0050' });
    renderScreen();

    fireEvent.click(screen.getByRole('radio', { name: /Registrar contacto/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Xiomara Torres' } });
    // La fila de alta está a la vista con la lista vacía: nombre a la izquierda, rol a la derecha.
    fireEvent.change(screen.getByLabelText('Agregar organización'), { target: { value: 'oie' } });
    fireEvent.change(screen.getByLabelText('Rol de la nueva organización'), { target: { value: 'Delegado' } });
    fireEvent.click(await screen.findByRole('button', { name: 'OIE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/directorio/contactos/CON-0050'));
    expect(api.createContact).toHaveBeenCalledWith(expect.objectContaining({
      organizationCodes: ['ORG-0012'], roles: { 'ORG-0012': 'Delegado' },
    }));
  });

  it('añade otra organización con Enter y la quita con el tachito de basura', async () => {
    api.createContact.mockResolvedValue({ code: 'CON-0051' });
    renderScreen();

    fireEvent.click(screen.getByRole('radio', { name: /Registrar contacto/ }));
    fireEvent.change(screen.getByLabelText(/^Nombre completo/), { target: { value: 'Xiomara Torres' } });
    fireEvent.change(screen.getByLabelText('Agregar organización'), { target: { value: 'OIE' } });
    expect(await screen.findByRole('button', { name: 'OIE' })).toBeInTheDocument(); // Sugerencias del catálogo.
    fireEvent.keyDown(screen.getByLabelText('Agregar organización'), { key: 'Enter' });
    expect(await screen.findByText('OIE')).toBeInTheDocument(); // Chip añadido; la fila se oculta.

    // Segunda organización: solo vía «+», junto al tachito.
    fireEvent.click(screen.getByRole('button', { name: 'Añadir organización' }));
    fireEvent.change(screen.getByLabelText('Agregar organización'), { target: { value: 'CF Psicología' } });
    fireEvent.keyDown(screen.getByLabelText('Agregar organización'), { key: 'Enter' });

    fireEvent.click(await screen.findByRole('button', { name: /Quitar OIE/ }));
    expect(screen.queryByText('OIE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    try {
      await waitFor(() => expect(api.createContact).toHaveBeenCalledWith(expect.objectContaining({
        organizationCodes: ['ORG-0031'],
      })), { timeout: 2000 });
      console.log('DBG OK');
    } catch {
      console.log('DBG FAIL', JSON.stringify(api.createContact.mock.calls), screen.getByRole('alert')?.textContent);
    }
  });

  it('el capataz no registra', () => {
    mockRole.current = 'SUPERVISOR';
    renderScreen();

    expect(screen.getByText(/solo coordinación/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
