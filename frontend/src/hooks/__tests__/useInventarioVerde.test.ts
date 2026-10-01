import { renderHook, waitFor } from '@testing-library/react';
import {
  useInventarioVerdeSpecies,
  useInventarioVerdeSpeciesById,
  useInventarioVerdeSpecimens,
  useInventarioVerdeSpecimenById,
  useInventarioVerdeStats,
} from '../useInventarioVerde';

describe('useInventarioVerde', () => {
  it('useInventarioVerdeSpecies devuelve especies filtradas y paginadas', async () => {
    const { result } = renderHook(() =>
      useInventarioVerdeSpecies({ search: 'Palmera', page: 0, pageSize: 10 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.species.length).toBeGreaterThan(0);
    expect(result.current.species[0].commonName).toContain('Palmera');
    expect(result.current.totalElements).toBeGreaterThan(0);
  });

  it('useInventarioVerdeSpeciesById devuelve la especie solicitada por ID', async () => {
    const { result } = renderHook(() => useInventarioVerdeSpeciesById(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.species).not.toBeNull();
    expect(result.current.species?.id).toBe(1);
    expect(result.current.species?.commonName).toBe('Palmera Real');
  });

  it('useInventarioVerdeSpecimens devuelve ejemplares y ubicaciones disponibles', async () => {
    // Especie 1 tiene 164 ejemplares
    const { result } = renderHook(() =>
      useInventarioVerdeSpecimens(1, { page: 0, pageSize: 12 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalElements).toBe(164);
    expect(result.current.specimens.length).toBe(12);
    expect(result.current.totalPages).toBe(Math.ceil(164 / 12));
    expect(result.current.availableLocations.length).toBeGreaterThan(0);
  });

  it('useInventarioVerdeSpecimenById devuelve el ejemplar y la especie asociada', async () => {
    const { result } = renderHook(() => useInventarioVerdeSpecimenById(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.specimen).not.toBeNull();
    expect(result.current.specimen?.id).toBe(1);
    expect(result.current.species).not.toBeNull();
  });

  it('useInventarioVerdeStats devuelve totales coherentes', () => {
    const { result } = renderHook(() => useInventarioVerdeStats());

    expect(result.current.totalSpecies).toBe(92);
    expect(result.current.totalSpecimens).toBe(962);
    expect(result.current.vegetationTypes.length).toBe(6);
  });
});
