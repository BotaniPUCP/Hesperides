import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ContactDetail, OrganizationDetail } from '@shared/types';
import { directoryApi } from '@/lib/directory-api';
import { ContactDetailScreen } from '../ContactDetailScreen';
import { OrganizationDetailScreen } from '../OrganizationDetailScreen';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { organization: jest.fn(), contact: jest.fn(), deactivateOrganization: jest.fn(),
    deactivateContact: jest.fn(), similarOrganizations: jest.fn(), similarContacts: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

const oie: OrganizationDetail = {
  code: 'ORG-0012', name: 'OIE', type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, ruc: null, phone: '6262000',
  aliases: ['Oficina de Intercambio'], active: true,
  contacts: [{ code: 'CON-0007', fullName: 'Juan Diego Villasante', extension: '4549', mobile: null, email: null }],
};
const juanDiego: ContactDetail = {
  code: 'CON-0007', fullName: 'Juan Diego Villasante', extension: '4549', mobile: '987654321', email: null,
  active: true, hasActiveOrganization: false, organizations: [{ code: 'ORG-0012', name: 'OIE', active: false }],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  api.organization.mockResolvedValue(oie);
  api.contact.mockResolvedValue(juanDiego);
});

describe('OrganizationDetailScreen', () => {
  it('muestra datos, alias y contactos', async () => {
    render(<OrganizationDetailScreen code="ORG-0012" />);

    expect(await screen.findByRole('heading', { name: 'OIE' })).toBeInTheDocument();
    expect(screen.getByText('Oficina de Intercambio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Juan Diego Villasante' })).toHaveAttribute('href', '/directorio/contactos/CON-0007');
  });

  it('coordinación la da de baja tras confirmar', async () => {
    api.deactivateOrganization.mockResolvedValue(null);
    render(<OrganizationDetailScreen code="ORG-0012" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Dar de baja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, dar de baja' }));

    await waitFor(() => expect(api.deactivateOrganization).toHaveBeenCalledWith('ORG-0012'));
  });

  it('el capataz no edita, no da de baja ni registra contactos', async () => {
    mockRole.current = 'SUPERVISOR';
    render(<OrganizationDetailScreen code="ORG-0012" />);

    await screen.findByRole('heading', { name: 'OIE' });
    expect(screen.queryByRole('button', { name: /Editar|Dar de baja|Registrar/ })).not.toBeInTheDocument();
  });

  it('una dada de baja se puede leer pero no cambiar', async () => {
    api.organization.mockResolvedValue({ ...oie, active: false });
    render(<OrganizationDetailScreen code="ORG-0012" />);

    expect(await screen.findByText('Dada de baja')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar|Dar de baja/ })).not.toBeInTheDocument();
  });
});

describe('ContactDetailScreen', () => {
  it('avisa cuando el contacto se quedó sin organización vigente', async () => {
    render(<ContactDetailScreen code="CON-0007" />);

    expect(await screen.findByRole('heading', { name: 'Juan Diego Villasante' })).toBeInTheDocument();
    expect(screen.getByText(/sin organización vigente/i)).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();
  });

  it('el capataz no edita ni da de baja', async () => {
    mockRole.current = 'SUPERVISOR';
    render(<ContactDetailScreen code="CON-0007" />);

    await screen.findByRole('heading', { name: 'Juan Diego Villasante' });
    expect(screen.queryByRole('button', { name: /Editar|Dar de baja/ })).not.toBeInTheDocument();
  });
});
