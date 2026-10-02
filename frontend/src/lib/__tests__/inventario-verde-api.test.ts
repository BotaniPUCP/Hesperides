import { inventarioVerdeApi } from '../inventario-verde-api';
import { apiClient } from '../api';
import { API_BASE_URL } from '../constants';
import { p01, p01Detail, page, palmeraReal } from '@/components/inventario-verde/__fixtures__/inventario';

jest.mock('../api', () => ({ apiClient: { get: jest.fn() }, ApiError: class ApiError extends Error {} }));

const mockedGet = apiClient.get as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('inventarioVerdeApi: fotos', () => {
  it('una foto guardada en nuestro almacenamiento se pide al backend', async () => {
    mockedGet.mockResolvedValue({ ...palmeraReal, imageUrl: '/files/species/3?size=thumb' });

    const species = await inventarioVerdeApi.speciesBySlug('roystonea-regia');

    expect(species.imageUrl).toBe(`${API_BASE_URL}/files/species/3?size=thumb`);
  });

  it('resuelve también las fotos de la galería de la especie', async () => {
    mockedGet.mockResolvedValue({
      ...palmeraReal,
      photos: [{ thumbnailUrl: '/files/species/3?size=thumb', imageUrl: '/files/species/3?size=full', author: 'Ana', license: 'CC0', sourceUrl: null }],
    });

    const species = await inventarioVerdeApi.speciesBySlug('roystonea-regia');

    expect(species.photos[0].thumbnailUrl).toBe(`${API_BASE_URL}/files/species/3?size=thumb`);
    expect(species.photos[0].imageUrl).toBe(`${API_BASE_URL}/files/species/3?size=full`);
    expect(species.photos[0].author).toBe('Ana');
  });

  it('un enlace externo (Drive) se deja tal cual', async () => {
    mockedGet.mockResolvedValue(palmeraReal);

    const species = await inventarioVerdeApi.speciesBySlug('roystonea-regia');

    expect(species.imageUrl).toBe(palmeraReal.imageUrl);
  });

  it('resuelve las fotos de cada ejemplar de una página', async () => {
    mockedGet.mockResolvedValue(page([{ ...p01, imageUrl: '/files/green-elements/9?size=full', thumbnailUrl: '/files/green-elements/9?size=thumb' }]));

    const result = await inventarioVerdeApi.specimens('roystonea-regia', { sortBy: 'code', sortDirection: 'asc', page: 0, size: 12 });

    expect(result.content[0].imageUrl).toBe(`${API_BASE_URL}/files/green-elements/9?size=full`);
    expect(result.content[0].thumbnailUrl).toBe(`${API_BASE_URL}/files/green-elements/9?size=thumb`);
  });

  it('en la ficha resuelve la foto del ejemplar y la de su especie', async () => {
    mockedGet.mockResolvedValue({
      ...p01Detail,
      thumbnailUrl: '/files/green-elements/9?size=thumb',
      species: { ...palmeraReal, imageUrl: '/files/species/3?size=thumb' },
    });

    const detail = await inventarioVerdeApi.specimen('EV-000001');

    expect(detail.thumbnailUrl).toBe(`${API_BASE_URL}/files/green-elements/9?size=thumb`);
    expect(detail.species.imageUrl).toBe(`${API_BASE_URL}/files/species/3?size=thumb`);
  });
});
