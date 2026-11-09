import { act, render, waitFor } from '@testing-library/react';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { PlanningMap } from '../PlanningMap';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false }),
}));
jest.mock('@/lib/green-area-sets-api', () => ({ greenAreaSetsApi: { get: jest.fn() } }));

let map: Map3DViewProps;
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: (props: Map3DViewProps) => {
    map = props;
    return <div data-testid="map-3d" />;
  },
}));

const get = greenAreaSetsApi.get as jest.Mock;

function fakeViewer() {
  return { setMarkedSections: jest.fn(), focusSections: jest.fn(), setLayerVisible: jest.fn() } as unknown as jest.Mocked<Viewer>;
}

function setWith(...codes: string[]) {
  return { zones: codes.map((code) => ({ code })) };
}

describe('PlanningMap', () => {
  beforeEach(() => get.mockReset());

  it('al elegir un conjunto, el mapa viaja hasta sus jardines', async () => {
    get.mockResolvedValue(setWith('AV-01', 'AV-02'));
    const viewer = fakeViewer();
    render(<PlanningMap setId={3} />);
    act(() => map.onReady?.(viewer));
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-01', 'AV-02']));
    expect(viewer.setMarkedSections).toHaveBeenLastCalledWith(['AV-01', 'AV-02']);
  });

  it('al cambiar de conjunto vuelve a viajar, ahora hasta el nuevo', async () => {
    get.mockImplementation((id: number) => Promise.resolve(id === 3 ? setWith('AV-01') : setWith('AV-07')));
    const viewer = fakeViewer();
    const { rerender } = render(<PlanningMap setId={3} />);
    act(() => map.onReady?.(viewer));
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-01']));
    rerender(<PlanningMap setId={6} />);
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-07']));
  });

  it('sin conjunto no pide nada y no encuadra jardines', () => {
    const viewer = fakeViewer();
    render(<PlanningMap setId={null} />);
    act(() => map.onReady?.(viewer));
    expect(get).not.toHaveBeenCalled();
    expect(viewer.focusSections).toHaveBeenLastCalledWith([]);
  });
});
