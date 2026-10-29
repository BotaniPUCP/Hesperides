import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapaSelector } from '../registrar/MapaSelector';
import type { Viewer } from '@/components/map3d/viewer/createViewer';

const mockUseMapLayers = jest.fn();
jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => mockUseMapLayers(),
}));

const mockFocusLatLon = jest.fn();
const mockSetPinLatLon = jest.fn();
const mockClearPin = jest.fn();
let lastPointPickCb: ((lat: number, lon: number) => void) | undefined;
let lastReadyCb: ((viewer: Viewer) => void) | undefined;

jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: ({
    onPointPick,
    onReady,
  }: {
    onPointPick: (lat: number, lon: number) => void;
    onReady: (viewer: Viewer) => void;
  }) => {
    lastPointPickCb = onPointPick;
    lastReadyCb = onReady;
    return (
      <div data-testid="mock-map3d">
        <button
          type="button"
          onClick={() => onPointPick(-12.072068, -77.079909)}
        >
          Picar Punto
        </button>
      </div>
    );
  },
}));

jest.mock('@/components/map3d/sceneData', () => ({
  toSceneData: (resp: unknown) => ({
    campus: [],
    campusBuildings: [],
    greenAreas: { meta: [], mesh: { visible: true }, extra: [], options: { color: () => '#fff' } },
    vegetation: [],
    plane: {
      toPlane: (lat: number, lon: number) => ({ x: (lon - (-77.08)) * 100000, y: (lat - (-12.07)) * 100000 }),
      toLatLon: (p: { x: number; y: number }) => [-12.07 + p.y / 100000, -77.08 + p.x / 100000],
    },
  }),
}));

describe('MapaSelector - Sincronización Bidireccional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseMapLayers.mockReturnValue({
      data: { campus: {}, buildings: [], greenAreas: [] },
      isLoading: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('llama a onElegir al hacer clic en el mapa 3D', async () => {
    const onElegir = jest.fn();
    render(<MapaSelector onElegir={onElegir} etiqueta="Haz clic donde está la planta" />);

    expect(screen.getByText('Haz clic donde está la planta')).toBeInTheDocument();

    act(() => {
      lastPointPickCb?.(-12.072068, -77.079909);
    });

    expect(onElegir).toHaveBeenCalledWith(-12.072068, -77.079909);
  });

  it('sincroniza las coordenadas hacia el visor llamando a focusLatLon y setPinLatLon cuando el viewer está listo', async () => {
    const onElegir = jest.fn();
    const mockViewer = {
      focusLatLon: mockFocusLatLon,
      setPinLatLon: mockSetPinLatLon,
      clearPin: mockClearPin,
    } as unknown as Viewer;

    const { rerender } = render(
      <MapaSelector
        onElegir={onElegir}
        lat="-12.071500"
        lon="-77.081200"
      />
    );

    act(() => {
      lastReadyCb?.(mockViewer);
    });

    expect(mockFocusLatLon).toHaveBeenCalledWith(-12.0715, -77.0812);
    expect(mockSetPinLatLon).toHaveBeenCalledWith(-12.0715, -77.0812);

    // Cambiar las coordenadas desde los inputs
    rerender(
      <MapaSelector
        onElegir={onElegir}
        lat="-12.072100"
        lon="-77.080500"
      />
    );

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(mockFocusLatLon).toHaveBeenCalledWith(-12.0721, -77.0805);
    expect(mockSetPinLatLon).toHaveBeenCalledWith(-12.0721, -77.0805);
  });

  it('no reenfoca si la coordenada es la misma recién picada en el mapa', async () => {
    const onElegir = jest.fn();
    const mockViewer = {
      focusLatLon: mockFocusLatLon,
    } as unknown as Viewer;

    const { rerender } = render(
      <MapaSelector onElegir={onElegir} lat="" lon="" />
    );

    act(() => {
      lastReadyCb?.(mockViewer);
    });

    mockFocusLatLon.mockClear();

    // Simula clic en mapa
    act(() => {
      lastPointPickCb?.(-12.072068, -77.079909);
    });

    // El padre actualiza las props lat/lon con el valor recién picado
    rerender(
      <MapaSelector
        onElegir={onElegir}
        lat="-12.072068"
        lon="-77.079909"
      />
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // No debe llamarse de nuevo porque proviene del mismo clic
    expect(mockFocusLatLon).not.toHaveBeenCalled();
  });
});
