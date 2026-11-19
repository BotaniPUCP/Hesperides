import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  return { setMarkedSections: jest.fn(), setMarkedSpecimens: jest.fn(), focusSections: jest.fn(), setLayerVisible: jest.fn() } as unknown as jest.Mocked<Viewer>;
}

function setWith(...codes: string[]) {
  return { zones: codes.map((code) => ({ code })), elements: [] as { code: string }[] };
}

describe('PlanningMap', () => {
  beforeEach(() => get.mockReset());

  it('al elegir un conjunto, el mapa viaja hasta sus jardines', async () => {
    get.mockResolvedValue(setWith('AV-01', 'AV-02'));
    const viewer = fakeViewer();
    render(<PlanningMap setId={3} />);
    act(() => map.onReady?.(viewer));
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-01', 'AV-02'], []));
    expect(viewer.setMarkedSections).toHaveBeenLastCalledWith(['AV-01', 'AV-02']);
  });

  it('al cambiar de conjunto vuelve a viajar, ahora hasta el nuevo', async () => {
    get.mockImplementation((id: number) => Promise.resolve(id === 3 ? setWith('AV-01') : setWith('AV-07')));
    const viewer = fakeViewer();
    const { rerender } = render(<PlanningMap setId={3} />);
    act(() => map.onReady?.(viewer));
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-01'], []));
    rerender(<PlanningMap setId={6} />);
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-07'], []));
  });

  it('un conjunto con ejemplares los marca y los encuadra junto a sus jardines', async () => {
    get.mockResolvedValue({ zones: [{ code: 'AV-01' }], elements: [{ code: 'EV-000501' }] });
    const viewer = fakeViewer();
    render(<PlanningMap setId={3} />);
    act(() => map.onReady?.(viewer));
    await waitFor(() => expect(viewer.focusSections).toHaveBeenLastCalledWith(['AV-01'], ['EV-000501']));
    expect(viewer.setMarkedSpecimens).toHaveBeenLastCalledWith(['EV-000501']);
  });

  describe('con avance parcial', () => {
    const comedor = { zones: [{ id: 11, code: 'AV-11' }, { id: 12, code: 'AV-12' }, { id: 13, code: 'AV-13' }],
      elements: [{ id: 501, code: 'EV-501' }, { id: 502, code: 'EV-502' }] };

    it('resalta solo lo que falta y lo dice', async () => {
      get.mockResolvedValue(comedor);
      const viewer = fakeViewer();
      render(<PlanningMap setId={3} pendingZoneIds={[13]} pendingElementIds={[502]} pendingLabel="1 jardín y 1 ejemplar" />);
      act(() => map.onReady?.(viewer));

      expect(await screen.findByText('Resaltado: lo que falta (1 jardín y 1 ejemplar)')).toBeInTheDocument();
      await waitFor(() => expect(viewer.setMarkedSections).toHaveBeenLastCalledWith(['AV-13']));
      expect(viewer.setMarkedSpecimens).toHaveBeenLastCalledWith(['EV-502']);
    });

    it('deja ver el conjunto entero y volver a lo que falta', async () => {
      get.mockResolvedValue(comedor);
      const viewer = fakeViewer();
      render(<PlanningMap setId={3} pendingZoneIds={[13]} pendingElementIds={[]} pendingLabel="1 jardín" />);
      act(() => map.onReady?.(viewer));

      await userEvent.click(await screen.findByRole('button', { name: 'Ver todo el conjunto' }));
      expect(screen.getByText('Resaltado: todo el conjunto')).toBeInTheDocument();
      await waitFor(() => expect(viewer.setMarkedSections).toHaveBeenLastCalledWith(['AV-11', 'AV-12', 'AV-13']));

      await userEvent.click(screen.getByRole('button', { name: 'Ver solo lo que falta' }));
      await waitFor(() => expect(viewer.setMarkedSections).toHaveBeenLastCalledWith(['AV-13']));
    });

    it('sin avance parcial no hay aviso de qué se resalta', async () => {
      get.mockResolvedValue(comedor);
      render(<PlanningMap setId={3} />);
      await waitFor(() => expect(get).toHaveBeenCalled());

      expect(screen.queryByRole('group', { name: 'Qué se resalta' })).not.toBeInTheDocument();
    });
  });

  it('sin conjunto no pide nada y no encuadra jardines', () => {
    const viewer = fakeViewer();
    render(<PlanningMap setId={null} />);
    act(() => map.onReady?.(viewer));
    expect(get).not.toHaveBeenCalled();
    expect(viewer.focusSections).toHaveBeenLastCalledWith([], []);
  });
});
