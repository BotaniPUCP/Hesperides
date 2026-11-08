import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { directoryApi } from '@/lib/directory-api';
import { DirectorioScreen } from '../DirectorioScreen';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { organizations: jest.fn(), contacts: jest.fn(), similarOrganizations: jest.fn(), similarContacts: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  window.history.replaceState(null, '', '/directorio');
  api.organizations.mockResolvedValue({ page: 0, size: 20, total: 1, items: [
    { code: 'ORG-0001', name: 'OIE', type: { code: 'PUCP_UNIT', label: 'Unidad PUCP' }, phone: '6262000', contactCount: 2 },
  ] });
  api.contacts.mockResolvedValue({ page: 0, size: 20, total: 1, items: [
    { code: 'CON-0007', fullName: 'Juan Diego Villasante', extension: '4549', mobile: null, email: null,
      organizations: [{ code: 'ORG-0001', name: 'OIE', active: true }] },
  ] });
  api.similarOrganizations.mockResolvedValue([]);
});

describe('DirectorioScreen', () => {
  it('lista las organizaciones con su tipo y número de contactos', async () => {
    render(<DirectorioScreen />);

    expect(await screen.findAllByText('OIE')).not.toHaveLength(0);
    expect(screen.getAllByText('Unidad PUCP').length).toBeGreaterThan(0);
  });

  it('coordinación puede registrar una organización', async () => {
    render(<DirectorioScreen />);

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar organización' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('el capataz solo ve y busca (CA-03)', async () => {
    mockRole.current = 'SUPERVISOR';
    render(<DirectorioScreen />);

    await screen.findAllByText('OIE');
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('la pestaña de contactos filtra a los que no tienen organización vigente', async () => {
    render(<DirectorioScreen />);

    fireEvent.click(screen.getByRole('tab', { name: 'Contactos' }));
    expect(await screen.findAllByText('Juan Diego Villasante')).not.toHaveLength(0);
    fireEvent.click(screen.getByLabelText('Sin organización vigente'));

    await waitFor(() => expect(api.contacts).toHaveBeenLastCalledWith(
      expect.objectContaining({ withoutOrganization: true }), 0));
  });
});
