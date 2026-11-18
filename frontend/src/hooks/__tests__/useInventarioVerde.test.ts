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
import { listed, p01, p01Detail, p02, palmeraReal, palmeraReina, summary } from '@/components/inventario-verde/__fixtures__/inventario';

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    summary: jest.fn(),
    allSpecies: jest.fn(),
    speciesBySlug: jest.fn(),
    allSpecimens: jest.fn(),
    locations: jest.fn(),
    allLocations: jest.fn(),
    specimen: jest.fn(),
  },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

afterEach(() => jest.resetAllMocks());

describe('useInventarioVerde', () => {
  it('filtra y pagina el catálogo precargado en el navegador (SPEC-119)', async () => {
    api.allSpecies.mockResolvedValue([palmeraReal, palmeraReina, { ...palmeraReal, slug: 'otra', vegetationTypeCode: 'TREE', searchKey: 'otra' }]);

    const { result, rerender } = renderHook(({ search }) =>
      useInventarioVerdeSpecies({ search, vegetationType: 'PALM', page: 1, pageSize: 1 }), { initialProps: { search: 'palmera' } });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.species).toEqual([palmeraReina]);
    expect(result.current.totalElements).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPage).toBe(1);

    rerender({ search: 'bruja' });
    expect(result.current.totalElements).toBe(1);
    expect(api.allSpecies).toHaveBeenCalledTimes(1);
  });

  it('busca una especie por su slug', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReal);

    const { result } = renderHook(() => useInventarioVerdeSpeciesBySlug('roystonea-regia'));

    await waitFor(() => expect(result.current.species).toEqual(palmeraReal));
    expect(api.speciesBySlug).toHaveBeenCalledWith('roystonea-regia');
  });

  it('vuelve a cargar la especie cuando cambia la clave de revalidación', async () => {
    api.speciesBySlug.mockResolvedValue(palmeraReal);
    const { result, rerender } = renderHook(
      ({ revision }) => useInventarioVerdeSpeciesBySlug('roystonea-regia', revision),
      { initialProps: { revision: 0 } },
    );
    await waitFor(() => expect(result.current.species).toEqual(palmeraReal));

    rerender({ revision: 1 });
    await waitFor(() => expect(api.speciesBySlug).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.species).toEqual(palmeraReal));
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

  it('filtra los ejemplares de la especie, los ordena y trae sus ubicaciones', async () => {
    api.allSpecimens.mockResolvedValue([listed(p01), listed(p02), listed({ ...p01, code: 'EV-000900' }, { speciesSlug: 'otra' })]);
    api.locations.mockResolvedValue([{ location: 'Educación', count: 12 }]);

    const { result } = renderHook(() =>
      useInventarioVerdeSpecimens('roystonea-regia', { location: 'Educación', sortBy: 'code', sortDirection: 'desc', pageSize: 1 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.specimens.map((s) => s.code)).toEqual(['EV-000002']);
    expect(result.current.totalElements).toBe(2);
    expect(result.current.totalPages).toBe(2);
    expect(api.locations).toHaveBeenCalledWith('roystonea-regia');
    await waitFor(() => expect(result.current.availableLocations).toEqual([{ location: 'Educación', count: 12 }]));
  });

  it('sin especie usa todos los ejemplares y filtra por tipo en el navegador', async () => {
    api.allSpecimens.mockResolvedValue([listed(p01), listed(p02, { vegetationTypeCode: 'TREE' })]);
    api.allLocations.mockResolvedValue([]);

    const { result } = renderHook(() => useInventarioVerdeSpecimens(null, { vegetationType: 'PALM' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.specimens.map((s) => s.code)).toEqual(['EV-000001']);
    expect(api.allLocations).toHaveBeenCalled();
  });

  it('busca un ejemplar por su código y expone su especie', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    const { result } = renderHook(() => useInventarioVerdeSpecimenByCode('EV-000001'));

    await waitFor(() => expect(result.current.specimen).toEqual(p01Detail));
    expect(result.current.species).toEqual(palmeraReal);
  });

  it('recarga el ejemplar si cambia reloadKey', async () => {
    api.specimen.mockResolvedValue(p01Detail);

    const { result, rerender } = renderHook(
      ({ key }) => useInventarioVerdeSpecimenByCode('EV-000001', key),
      { initialProps: { key: 0 } },
    );

    await waitFor(() => expect(result.current.specimen).toEqual(p01Detail));
    expect(api.specimen).toHaveBeenCalledTimes(1);

    const updated = { ...p01Detail, heightM: 9.5 };
    api.specimen.mockResolvedValue(updated);

    rerender({ key: 1 });
    await waitFor(() => expect(result.current.specimen?.heightM).toBe(9.5));
    expect(api.specimen).toHaveBeenCalledTimes(2);
  });

  it('el resumen solo ofrece los tipos que tienen ejemplares', async () => {
    api.summary.mockResolvedValue(summary);

    const { result } = renderHook(() => useInventarioVerdeStats());

    await waitFor(() => expect(result.current.totalSpecies).toBe(90));
    expect(result.current.totalSpecimens).toBe(965);
    expect(result.current.vegetationTypes.map((t) => t.code)).toEqual(['TREE', 'PALM']);
  });
});
