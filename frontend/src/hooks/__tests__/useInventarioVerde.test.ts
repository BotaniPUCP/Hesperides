import { renderHook, waitFor } from '@testing-library/react';
import {
  useInventarioVerdeSpecies,
  useInventarioVerdeSpeciesBySlug,
  useInventarioVerdeSpecimenByCode,
  useInventarioVerdeSpecimens,
  useInventarioVerdeStats,
} from '../useInventarioVerde';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { p01, p01Detail, page, palmeraReal, summary } from '@/components/inventario-verde/__fixtures__/inventario';

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    summary: jest.fn(),
    species: jest.fn(),
    speciesBySlug: jest.fn(),
    specimens: jest.fn(),
    locations: jest.fn(),
    specimen: jest.fn(),
  },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

afterEach(() => jest.resetAllMocks());

describe('useInventarioVerde', () => {
  it('pide las especies al backend con la búsqueda, el tipo y la página', async () => {
    api.species.mockResolvedValue(page([palmeraReal], 30, 1, 24));

    const { result } = renderHook(() =>
      useInventarioVerdeSpecies({ search: 'palmera', vegetationType: 'PALM', page: 1, pageSize: 24 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.species).toHaveBeenCalledWith({ search: 'palmera', vegetationType: 'PALM', page: 1, size: 24 });
    expect(result.current.species).toEqual([palmeraReal]);
    expect(result.current.totalElements).toBe(30);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPage).toBe(1);
  });

  it('busca una especie por su slug', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReal);

    const { result } = renderHook(() => useInventarioVerdeSpeciesBySlug('roystonea-regia'));

    await waitFor(() => expect(result.current.species).toEqual(palmeraReal));
    expect(api.speciesBySlug).toHaveBeenCalledWith('roystonea-regia');
  });

  it('distingue una especie inexistente de un error de red', async () => {
    api.speciesBySlug.mockRejectedValueOnce(new ApiError(404, 'Species not found: x'));
    const { result } = renderHook(() => useInventarioVerdeSpeciesBySlug('x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(result.current.errorMessage).toBeNull();

    api.speciesBySlug.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.'));
    const { result: sinRed } = renderHook(() => useInventarioVerdeSpeciesBySlug('y'));
    await waitFor(() => expect(sinRed.current.loading).toBe(false));
    expect(sinRed.current.notFound).toBe(false);
    expect(sinRed.current.errorMessage).toMatch(/Sin conexión/);
  });

  it('pide los ejemplares con filtros y orden, y las ubicaciones de la especie', async () => {
    api.specimens.mockResolvedValue(page([p01], 167, 0, 12));
    api.locations.mockResolvedValue([{ location: 'Educación', count: 12 }]);

    const { result } = renderHook(() =>
      useInventarioVerdeSpecimens('roystonea-regia', { location: 'Educación', sortBy: 'code', sortDirection: 'desc', pageSize: 12 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.specimens).toHaveBeenCalledWith('roystonea-regia', {
      search: '', location: 'Educación', sortBy: 'code', sortDirection: 'desc', page: 0, size: 12,
    });
    expect(result.current.totalElements).toBe(167);
    expect(result.current.totalPages).toBe(14);
    await waitFor(() => expect(result.current.availableLocations).toEqual([{ location: 'Educación', count: 12 }]));
  });

  it('sin especie no pide ejemplares', () => {
    renderHook(() => useInventarioVerdeSpecimens(null));
    expect(api.specimens).not.toHaveBeenCalled();
  });

  it('busca un ejemplar por su código y expone su especie', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    const { result } = renderHook(() => useInventarioVerdeSpecimenByCode('EV-000001'));

    await waitFor(() => expect(result.current.specimen).toEqual(p01Detail));
    expect(result.current.species).toEqual(palmeraReal);
  });

  it('el resumen solo ofrece los tipos que tienen ejemplares', async () => {
    api.summary.mockResolvedValue(summary);

    const { result } = renderHook(() => useInventarioVerdeStats());

    await waitFor(() => expect(result.current.totalSpecies).toBe(90));
    expect(result.current.totalSpecimens).toBe(965);
    expect(result.current.vegetationTypes.map((t) => t.code)).toEqual(['TREE', 'PALM']);
  });
});
