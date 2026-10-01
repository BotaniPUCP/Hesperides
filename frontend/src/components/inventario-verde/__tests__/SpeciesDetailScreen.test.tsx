import { render, screen, waitFor } from '@testing-library/react';
import { SpeciesDetailScreen } from '../SpeciesDetailScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { p01, page, palmeraReina } from '../__fixtures__/inventario';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: { speciesBySlug: jest.fn(), specimens: jest.fn(), locations: jest.fn() },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

afterEach(() => jest.resetAllMocks());

describe('SpeciesDetailScreen', () => {
  it('muestra la especie, sus otros nombres y la tabla de ejemplares', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReina);
    api.specimens.mockResolvedValue(page([p01], 1));
    api.locations.mockResolvedValue([{ location: 'Educación', count: 1 }]);

    render(<SpeciesDetailScreen slug="syagrus-romanzoffiana" />);

    expect(await screen.findByRole('heading', { name: 'Palmera reina' })).toBeInTheDocument();
    expect(screen.getByText('Palmera bruja')).toBeInTheDocument();
    expect(await screen.findByText('EV-000001')).toBeInTheDocument();
    expect(api.speciesBySlug).toHaveBeenCalledWith('syagrus-romanzoffiana');
  });

  it('muestra «no encontrada» si la especie no existe', async () => {
    api.speciesBySlug.mockRejectedValue(new ApiError(404, 'Species not found'));
    api.specimens.mockRejectedValue(new ApiError(404, 'Species not found'));
    api.locations.mockRejectedValue(new ApiError(404, 'Species not found'));

    render(<SpeciesDetailScreen slug="no-existe" />);

    await waitFor(() => expect(screen.getByText('Especie no encontrada')).toBeInTheDocument());
  });

  it('dice que no se pudo cargar si falla la red', async () => {
    api.speciesBySlug.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));
    api.specimens.mockResolvedValue(page([]));
    api.locations.mockResolvedValue([]);

    render(<SpeciesDetailScreen slug="roystonea-regia" />);

    expect(await screen.findByText('No se pudo cargar la especie')).toBeInTheDocument();
  });
});
