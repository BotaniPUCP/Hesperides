import { renderHook, waitFor } from '@testing-library/react';
import type { CatalogItem } from '@shared/types';
import { catalogsApi } from '@/lib/catalogs-api';
import {
  __resetCatalogCache,
  invalidarCatalogo,
  useCatalog,
  useCatalogOptions,
  useChildCatalogOptions,
} from '../useCatalog';

jest.mock('@/lib/catalogs-api');

const activeItems = catalogsApi.activeItems as jest.MockedFunction<typeof catalogsApi.activeItems>;

function item(code: string, label: string, parentCode: string | null = null): CatalogItem {
  return { code, label, sortOrder: 1, isActive: true, parentCode };
}

const PODA = item('PODA', 'Poda');
const PODA_SANITARIA = item('PODA_SANITARIA', 'Poda sanitaria', 'PODA');
const CANTEO = item('CANTEO', 'Canteo', 'MANTENIMIENTO');

describe('useCatalog', () => {
  beforeEach(() => {
    __resetCatalogCache();
    jest.clearAllMocks();
  });

  it('devuelve los ítems del catálogo pedido', async () => {
    activeItems.mockResolvedValue([PODA]);

    const { result } = renderHook(() => useCatalog('INTERVENTION_CLASS'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([PODA]);
    expect(activeItems).toHaveBeenCalledWith('INTERVENTION_CLASS');
  });

  it('no repite la petición dentro del TTL aunque se monte dos veces', async () => {
    // CA-06: dos pantallas que usan el mismo catálogo en menos de 5 minutos
    // provocan una sola llamada de red.
    activeItems.mockResolvedValue([PODA]);

    const primero = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    await waitFor(() => expect(primero.result.current.isLoading).toBe(false));

    const segundo = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    await waitFor(() => expect(segundo.result.current.items).toEqual([PODA]));

    expect(activeItems).toHaveBeenCalledTimes(1);
  });

  it('el segundo montaje no pasa por estado de carga', async () => {
    activeItems.mockResolvedValue([PODA]);

    const primero = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    await waitFor(() => expect(primero.result.current.isLoading).toBe(false));

    // Ya hay opciones que mostrar: un desplegable no debe parpadear.
    const segundo = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    expect(segundo.result.current.isLoading).toBe(false);
    expect(segundo.result.current.items).toEqual([PODA]);
  });

  it('dos catálogos distintos se piden por separado', async () => {
    activeItems.mockImplementation(async (typeCode: string) =>
      typeCode === 'INTERVENTION_CLASS' ? [PODA] : [PODA_SANITARIA],
    );

    const clases = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    const tipos = renderHook(() => useCatalog('INTERVENTION_TYPE'));

    await waitFor(() => expect(clases.result.current.items).toEqual([PODA]));
    await waitFor(() => expect(tipos.result.current.items).toEqual([PODA_SANITARIA]));
    expect(activeItems).toHaveBeenCalledTimes(2);
  });

  it('un fallo de red deja un mensaje y la lista vacía', async () => {
    activeItems.mockRejectedValue(new Error('sin conexión'));

    const { result } = renderHook(() => useCatalog('INTERVENTION_CLASS'));

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('invalidar obliga a volver a pedirlo', async () => {
    activeItems.mockResolvedValue([PODA]);

    const primero = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    await waitFor(() => expect(primero.result.current.isLoading).toBe(false));

    invalidarCatalogo('INTERVENTION_CLASS');
    const segundo = renderHook(() => useCatalog('INTERVENTION_CLASS'));
    await waitFor(() => expect(segundo.result.current.items).toEqual([PODA]));

    expect(activeItems).toHaveBeenCalledTimes(2);
  });
});

describe('useCatalogOptions', () => {
  beforeEach(() => {
    __resetCatalogCache();
    jest.clearAllMocks();
  });

  it('entrega la forma que el Select espera', async () => {
    activeItems.mockResolvedValue([PODA]);

    const { result } = renderHook(() => useCatalogOptions('INTERVENTION_CLASS'));

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0]).toEqual({ id: 1, code: 'PODA', label: 'Poda' });
  });
});

describe('useChildCatalogOptions', () => {
  beforeEach(() => {
    __resetCatalogCache();
    jest.clearAllMocks();
  });

  it('sin clase elegida la lista va vacía', async () => {
    activeItems.mockResolvedValue([PODA_SANITARIA, CANTEO]);

    const { result } = renderHook(() => useChildCatalogOptions('INTERVENTION_TYPE', null));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Vacía y no completa: nadie debe registrar un tipo sin decir de qué clase es.
    expect(result.current.options).toEqual([]);
  });

  it('elegida una clase, solo ofrece sus tipos', async () => {
    // CA-07: el selector encadenado es la razón de que parentCode viaje.
    activeItems.mockResolvedValue([PODA_SANITARIA, CANTEO]);

    const { result } = renderHook(() => useChildCatalogOptions('INTERVENTION_TYPE', 'PODA'));

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.options[0].code).toBe('PODA_SANITARIA');
  });
});
