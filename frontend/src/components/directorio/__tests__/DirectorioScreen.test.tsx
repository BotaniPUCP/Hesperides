import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { directoryApi } from '@/lib/directory-api';
import { contact, organization } from '@/test-utils/directoryFixtures';
import { DirectorioScreen } from '../DirectorioScreen';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { allOrganizations: jest.fn(), allContacts: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
  window.history.replaceState(null, '', '/directorio');
  api.allOrganizations.mockResolvedValue([
    organization('ORG-0001', 'OIE', { phone: '6262000', contactCount: 2 }),
    organization('ORG-0002', 'Jardines del Sur SAC', { company: true, aliases: ['JDS'] }),
  ]);
  api.allContacts.mockResolvedValue([
    contact('CON-0007', 'Juan Diego Villasante', [{ code: 'ORG-0001', name: 'OIE', active: true }], { extension: '4549' }),
    contact('CON-0008', 'Ana Torres', [{ code: 'ORG-0009', name: 'DAF', active: false }]),
    contact('CON-0010', 'Pedro Dado de Baja', [], { active: false }),
  ]);
});

describe('DirectorioScreen', () => {
  it('lista las organizaciones con su tipo y número de contactos', async () => {
    render(<DirectorioScreen />);

    expect(await screen.findAllByText('OIE')).not.toHaveLength(0);
    expect(screen.getAllByText('Unidad PUCP').length).toBeGreaterThan(0);
  });

  it('un solo «Registrar» lleva al registro individual, donde se elige qué registrar', async () => {
    render(<DirectorioScreen />);

    expect(await screen.findByRole('link', { name: 'Registrar' })).toHaveAttribute('href', '/directorio/registrar');
    expect(screen.queryByRole('button', { name: /Registrar organización/ })).not.toBeInTheDocument();
  });

  it('el capataz solo ve y busca (CA-03)', async () => {
    mockRole.current = 'SUPERVISOR';
    render(<DirectorioScreen />);

    await screen.findAllByText('OIE');
    expect(screen.queryByRole('link', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('la pestaña de contactos filtra a los que no tienen organización vigente', async () => {
    render(<DirectorioScreen />);

    fireEvent.click(screen.getByRole('tab', { name: 'Contactos' }));
    expect(await screen.findAllByText('Juan Diego Villasante')).not.toHaveLength(0);
    fireEvent.click(screen.getByLabelText('Sin organización vigente'));

    await waitFor(() => expect(screen.queryAllByText('Juan Diego Villasante')).toHaveLength(0));
    expect(screen.getAllByText('Ana Torres').length).toBeGreaterThan(0);
    // La tabla es de contactos vigentes: los dados de baja solo salen en los buscadores.
    expect(screen.queryAllByText('Pedro Dado de Baja')).toHaveLength(0);
    expect(api.allContacts).toHaveBeenCalledTimes(1);
  });

  it('busca por alias en el navegador, con la lista pedida una sola vez (SPEC-119)', async () => {
    window.history.replaceState(null, '', '/directorio?search=jds');
    render(<DirectorioScreen />);

    expect(await screen.findAllByText('Jardines del Sur SAC')).not.toHaveLength(0);
    expect(screen.queryAllByText('OIE')).toHaveLength(0);
    expect(api.allOrganizations).toHaveBeenCalledTimes(1);
  });

  it('filtra por tipo en el navegador', async () => {
    window.history.replaceState(null, '', '/directorio?type=EXTERNAL_COMPANY');
    render(<DirectorioScreen />);

    expect(await screen.findAllByText('Jardines del Sur SAC')).not.toHaveLength(0);
    expect(screen.queryAllByText('OIE')).toHaveLength(0);
  });
});
