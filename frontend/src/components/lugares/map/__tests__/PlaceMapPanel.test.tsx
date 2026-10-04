import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PlaceDetail } from '@shared/types';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { placesApi } from '@/lib/places-api';
import { PlaceMapPanel } from '../PlaceMapPanel';
import { isPlacePage } from '../PlacesShell';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('@/lib/places-api', () => ({ placesApi: { saveMapView: jest.fn(), clearMapView: jest.fn() } }));
jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false }),
}));

let map: Map3DViewProps;
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: (props: Map3DViewProps) => {
    map = props;
    return <div data-testid="map-3d" />;
  },
}));

function fakeViewer(): jest.Mocked<Viewer> {
  return {
    setPaint: jest.fn(), setLayerVisible: jest.fn(), select: jest.fn(), setNight: jest.fn(), setHour: jest.fn(),
    setShadows: jest.fn(), setLabels: jest.fn(), setGrayBuildings: jest.fn(), fit: jest.fn(), top: jest.fn(),
    north: jest.fn(), toggleSpin: jest.fn(), setViewCones: jest.fn(), focusViewCone: jest.fn(), focusLatLon: jest.fn(),
    flyToPose: jest.fn(), dispose: jest.fn(),
    pose: jest.fn(() => ({ position: [10, 222, 30] as [number, number, number], target: [0, 22, 0] as [number, number, number] })),
  };
}

const view = { camera: { lat: -12.0705, lon: -77.08, heightM: 150 }, target: { lat: -12.07, lon: -77.08, heightM: 0 } };

function place(overrides: Partial<PlaceDetail> = {}): PlaceDetail {
  return {
    code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' }, category: { code: 'EDIFICIO', label: 'Edificio' },
    outline: { source: 'BUILDING', buildingId: 1, zoneCode: null, featureCode: null, centerLat: -12.07, centerLon: -77.08 },
    aliases: [], children: [], mainPhotos: [], interior: [], mapView: null,
    perspectives: [{ id: 5, side: { code: 'BACK', label: 'Espalda' }, displayName: 'Espalda de CIA', compass: null, landmark: null,
      lat: -12.0702, lon: -77.08, headingDeg: 0, photos: [] }],
    ...overrides,
  };
}

let viewer: jest.Mocked<Viewer>;
beforeEach(() => {
  viewer = fakeViewer();
});
afterEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

function renderPanel(p: PlaceDetail, onChanged = jest.fn()) {
  const utils = render(<PlaceMapPanel place={p} focusedPerspective={null} onChanged={onChanged} />);
  act(() => map.onReady(viewer));
  return utils;
}

describe('PlaceMapPanel', () => {
  it('sin vista guardada usa el encuadre automático: resalta y enfoca el edificio', () => {
    renderPanel(place());

    expect(viewer.select).toHaveBeenCalledWith({ layer: 'campusBuildings', index: 0 }, true);
    expect(viewer.flyToPose).not.toHaveBeenCalled();
    expect(viewer.setViewCones).toHaveBeenCalledWith([{ id: 5, lat: -12.0702, lon: -77.08, headingDeg: 0 }]);
  });

  it('con vista guardada vuela a ella y solo resalta el edificio', () => {
    renderPanel(place({ mapView: view }));

    expect(viewer.flyToPose).toHaveBeenCalledTimes(1);
    expect(viewer.select).toHaveBeenCalledWith({ layer: 'campusBuildings', index: 0 }, false);
  });

  it('al pasar a otro lugar el mismo mapa vuela al nuevo', () => {
    const { rerender } = renderPanel(place({ mapView: view }));

    rerender(<PlaceMapPanel place={place({ code: 'LUG-0002', name: 'Gelarti', mapView: { ...view, camera: { ...view.camera, heightM: 300 } } })}
      focusedPerspective={null} onChanged={jest.fn()} />);

    expect(viewer.flyToPose).toHaveBeenCalledTimes(2);
    expect(viewer.dispose).not.toHaveBeenCalled();
  });

  it('recargar el mismo lugar (por subir una foto) no mueve la cámara', () => {
    const { rerender } = renderPanel(place({ mapView: view }));

    rerender(<PlaceMapPanel place={place({ mapView: { ...view } })} focusedPerspective={null} onChanged={jest.fn()} />);

    expect(viewer.flyToPose).toHaveBeenCalledTimes(1);
  });

  it('quien edita guarda la vista actual en lat/lon y altura sobre el suelo', async () => {
    (placesApi.saveMapView as jest.Mock).mockResolvedValue(undefined);
    const onChanged = jest.fn();
    renderPanel(place(), onChanged);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar esta vista' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const saved = (placesApi.saveMapView as jest.Mock).mock.calls[0];
    expect(saved[0]).toBe('LUG-0001');
    expect(saved[1].camera.heightM).toBeCloseTo(200, 6);
    expect(saved[1].target.heightM).toBeCloseTo(0, 6);
  });

  it('restablecer solo aparece si hay vista guardada', () => {
    renderPanel(place());
    expect(screen.queryByRole('button', { name: 'Restablecer vista' })).not.toBeInTheDocument();
  });

  it('quien no edita no ve los botones', () => {
    mockRole.current = 'OPERARIO';
    renderPanel(place({ mapView: view }));

    expect(screen.queryByRole('button', { name: 'Guardar esta vista' })).not.toBeInTheDocument();
  });
});

describe('isPlacePage', () => {
  it.each([
    ['/lugares/LUG-0001', true],
    ['/lugares', false],
    ['/lugares/nuevo', false],
    ['/lugares/migracion', false],
    ['/lugares/LUG-0001/editar', false],
  ])('%s → %s', (path, expected) => {
    expect(isPlacePage(path)).toBe(expected);
  });
});
