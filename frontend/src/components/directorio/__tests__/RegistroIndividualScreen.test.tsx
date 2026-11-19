import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { directoryApi } from '@/lib/directory-api';
import { organization } from '@/test-utils/directoryFixtures';
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
  directoryApi: { allOrganizations: jest.fn(), allContacts: jest.fn(),
    createOrganization: jest.fn(), createContact: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.allContacts.mockResolvedValue([]);
  api.allOrganizations.mockResolvedValue([
    organization('ORG-0012', 'OIE', { aliases: ['Oficina de Intercambio Estudiantil'] }),
    organization('ORG-0031', 'CF Psicología'),
  ]);
});

const renderScreen = () => render(<RegistroIndividualScreen />);

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
    expect(await screen.findByRole('button', { name: 'OIE' })).toBeInTheDocument(); // Sugerencias de la lista precargada.
    fireEvent.keyDown(screen.getByLabelText('Agregar organización'), { key: 'Enter' });
    expect(await screen.findByText('OIE')).toBeInTheDocument(); // Chip añadido; la fila se oculta.

    // Segunda organización: solo vía «+», junto al tachito.
    fireEvent.click(screen.getByRole('button', { name: 'Añadir organización' }));
    fireEvent.change(screen.getByLabelText('Agregar organización'), { target: { value: 'CF Psicología' } });
    fireEvent.keyDown(screen.getByLabelText('Agregar organización'), { key: 'Enter' });

    fireEvent.click(await screen.findByRole('button', { name: /Quitar OIE/ }));
    expect(screen.queryByText('OIE')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.createContact).toHaveBeenCalledWith(expect.objectContaining({
      organizationCodes: ['ORG-0031'],
    })));
  });

  it('el capataz no registra', () => {
    mockRole.current = 'SUPERVISOR';
    renderScreen();

    expect(screen.getByText(/solo coordinación/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
