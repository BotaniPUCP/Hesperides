import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpeciesDetailScreen } from '../SpeciesDetailScreen';
import { PageFrame } from '@/components/layouts/PageFrame';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { rememberListQuery } from '@/lib/listMemory';
import { p01, page, palmeraReina } from '../__fixtures__/inventario';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/inventario-verde/especies/syagrus-romanzoffiana',
}));
const mockUseAuth = jest.fn(() => ({ user: null as { role: { code: string } } | null }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: { speciesBySlug: jest.fn(), specimens: jest.fn(), locations: jest.fn() },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

beforeEach(() => mockUseAuth.mockReturnValue({ user: null }));
afterEach(() => jest.resetAllMocks());

describe('SpeciesDetailScreen', () => {
  it('ofrece editar solo a quien puede registrar', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReina);
    api.locations.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { role: { code: 'SUPERVISOR' } } });

    const { unmount } = render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);

    expect(await screen.findByRole('link', { name: 'Editar especie' })).toHaveAttribute(
      'href', '/inventario-verde/especies/syagrus-romanzoffiana/editar',
    );
    unmount();

    mockUseAuth.mockReturnValue({ user: null });
    render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);
    await screen.findByRole('heading', { name: palmeraReina.commonName });
    expect(screen.queryByRole('link', { name: 'Editar especie' })).not.toBeInTheDocument();
  });

  it('el breadcrumb y la flecha regresan a la lista con sus últimos filtros', async () => {
    rememberListQuery('/inventario-verde', 'type=PALM&page=1');
    api.speciesBySlug.mockResolvedValue(palmeraReina);
    api.locations.mockResolvedValue([]);

    render(<PageFrame><SpeciesDetailScreen slug="syagrus-romanzoffiana" /></PageFrame>);

    const crumb = await screen.findByRole('link', { name: 'Especies' });
    expect(crumb).toHaveAttribute('href', '/inventario-verde?type=PALM&page=1');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/inventario-verde?type=PALM&page=1');
    window.sessionStorage.clear();
  });

  it('muestra la especie, sus otros nombres y el enlace al catastro de ejemplares', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReina);
    api.locations.mockResolvedValue([{ location: 'Educación', count: 1 }]);

    render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);

    expect(await screen.findByRole('heading', { name: 'Palmera reina' })).toBeInTheDocument();
    expect(screen.getByText('Palmera bruja')).toBeInTheDocument();
    expect(screen.getByText(/Presencia y Catastro de Ejemplares/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver ejemplares en Catastro/i })).toBeInTheDocument();
    expect(api.speciesBySlug).toHaveBeenCalledWith('syagrus-romanzoffiana');
  });

  it('muestra «no encontrada» si la especie no existe', async () => {
    api.speciesBySlug.mockRejectedValue(new ApiError(404, 'Species not found'));
    api.locations.mockRejectedValue(new ApiError(404, 'Species not found'));

    render(<SpeciesDetailScreen slug="no-existe" />);

    await waitFor(() => expect(screen.getByText('Especie no encontrada')).toBeInTheDocument());
  });

  it('dice que no se pudo cargar si falla la red', async () => {
    api.speciesBySlug.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));
    api.locations.mockResolvedValue([]);

    render(<SpeciesDetailScreen slug="roystonea-regia" />);

    expect(await screen.findByText('No se pudo cargar la especie')).toBeInTheDocument();
  });

  it('el enlace de ver ejemplares apunta a /catastro/ejemplares con el nombre de la especie', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReina);
    api.locations.mockResolvedValue([{ location: 'Educación', count: 1 }]);

    render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);

    const link = await screen.findByRole('link', { name: /Ver ejemplares en Catastro/i });
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/catastro/ejemplares?search=Palmera%20reina'),
    );
  });

  it('no muestra el enlace de catastro si la especie tiene 0 ejemplares censados', async () => {
    api.speciesBySlug.mockResolvedValue({ ...palmeraReina, specimenCount: 0 });
    api.locations.mockResolvedValue([]);

    render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);

    expect(await screen.findByText(/Esta especie no cuenta con ejemplares censados/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver ejemplares en Catastro/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sin ejemplares censados')).toBeInTheDocument();
  });
});
