import { renderHook, waitFor } from '@testing-library/react';
import type { MapLayersResponse } from '@shared/types';
import { useMapLayers } from '../useMapLayers';
import { mapApi } from '@/lib/map-api';
import { ApiError } from '@/lib/api';
import type { CachedLayers, LayerStore } from '@/components/map3d/layerCache';

jest.mock('@/lib/map-api', () => ({ mapApi: { layers: jest.fn() } }));
const layers = mapApi.layers as jest.MockedFunction<typeof mapApi.layers>;

const LAYER_KEYS = ['sectors', 'sections', 'subsections', 'supervisionZones', 'references', 'buildings', 'features', 'vegetation'];
const response = (version: number, without?: string) =>
  ({
    version,
    layers: Object.fromEntries(LAYER_KEYS.filter((k) => k !== without).map((k) => [k, { type: 'FeatureCollection', features: [] }])),
  }) as unknown as MapLayersResponse;

interface MemoryStore extends LayerStore {
  saved: CachedLayers | null;
  read: jest.Mock<Promise<CachedLayers | null>, []>;
  write: jest.Mock<Promise<void>, [CachedLayers]>;
}

function memoryStore(initial: CachedLayers | null): MemoryStore {
  const store: MemoryStore = {
    saved: initial,
    read: jest.fn(async () => store.saved),
    write: jest.fn(async (entry: CachedLayers) => {
      store.saved = entry;
    }),
  };
  return store;
}

afterEach(() => jest.resetAllMocks());

describe('useMapLayers', () => {
  it('sin copia local descarga las capas y las guarda con su etiqueta', async () => {
    const store = memoryStore(null);
    layers.mockResolvedValue({ changed: true, data: response(3), etag: '"3"' });

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.data).toEqual(response(3)));
    expect(layers).toHaveBeenCalledWith(null);
    expect(store.saved).toEqual({ etag: '"3"', data: response(3) });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.stale).toBe(false);
  });

  it('con copia local vigente usa la copia cuando el servidor responde 304', async () => {
    const store = memoryStore({ etag: '"3"', data: response(3) });
    layers.mockResolvedValue({ changed: false });

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.data).toEqual(response(3)));
    expect(layers).toHaveBeenCalledWith('"3"');
    expect(store.write).not.toHaveBeenCalled();
  });

  it('reemplaza la copia local cuando los datos del mapa cambiaron', async () => {
    const store = memoryStore({ etag: '"3"', data: response(3) });
    layers.mockResolvedValue({ changed: true, data: response(4), etag: '"4"' });

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.data).toEqual(response(4)));
    expect(store.saved?.etag).toBe('"4"');
  });

  it('sin red sigue mostrando la copia local', async () => {
    const store = memoryStore({ etag: '"3"', data: response(3) });
    layers.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(response(3));
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.stale).toBe(true);
  });

  it('sin red y sin copia local informa el error', async () => {
    const store = memoryStore(null);
    layers.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('descarta una copia guardada a la que le falta una capa y descarga de nuevo', async () => {
    // Una copia de antes de la capa de vegetación no sirve aunque su etiqueta coincida.
    const store = memoryStore({ etag: '"39"', data: response(39, 'vegetation') });
    layers.mockResolvedValue({ changed: true, data: response(39), etag: '"39-f2"' });

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.data).toEqual(response(39)));
    expect(layers).toHaveBeenCalledWith(null);
    expect(store.saved?.etag).toBe('"39-f2"');
  });

  it('sin red tampoco usa una copia incompleta', async () => {
    const store = memoryStore({ etag: '"39"', data: response(39, 'vegetation') });
    layers.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.errorMessage).toMatch(/Sin conexión/);
  });

  it('si la copia local no se puede leer, descarga como la primera vez', async () => {
    const store = memoryStore(null);
    store.read.mockRejectedValue(new Error('IndexedDB bloqueado'));
    layers.mockResolvedValue({ changed: true, data: response(5), etag: '"5"' });

    const { result } = renderHook(() => useMapLayers(store));

    await waitFor(() => expect(result.current.data).toEqual(response(5)));
    expect(layers).toHaveBeenCalledWith(null);
  });
});
