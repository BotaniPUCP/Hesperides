import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { SetMap } from '../SetMap';
import { setClusters } from '../setClusters';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false }),
}));
jest.mock('../setClusters', () => ({ setClusters: jest.fn() }));
let map: Map3DViewProps;
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: (props: Map3DViewProps) => { map = props; return <div data-testid="map-3d" />; },
}));

const clusters = setClusters as jest.Mock;
const ZONES = ['A', 'B', 'C'];
const PLANTS = ['P1'];

function viewer() {
  return { setMarkedSections: jest.fn(), setMarkedSpecimens: jest.fn(), focusSections: jest.fn(), setLayerVisible: jest.fn() } as unknown as jest.Mocked<Viewer>;
}

describe('SetMap: un conjunto disperso se recorre por grupos', () => {
  beforeEach(() => clusters.mockReset());

  it('empieza en el grupo más grande y avanza, retrocede o muestra todo', async () => {
    clusters.mockReturnValue([{ zoneCodes: ['A', 'B'], specimenCodes: [] }, { zoneCodes: ['C'], specimenCodes: ['P1'] }]);
    const v = viewer();
    render(<SetMap zoneCodes={ZONES} specimenCodes={PLANTS} />);
    act(() => map.onReady?.(v));

    expect(screen.getByText('Grupo 1 de 2 · 2 jardines')).toBeInTheDocument();
    expect(v.focusSections).toHaveBeenLastCalledWith(['A', 'B'], []);
    expect(v.setMarkedSections).toHaveBeenLastCalledWith(ZONES);

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }));
    expect(screen.getByText('Grupo 2 de 2 · 1 jardín · 1 ejemplar')).toBeInTheDocument();
    expect(v.focusSections).toHaveBeenLastCalledWith(['C'], ['P1']);
    expect(screen.getByRole('button', { name: 'Siguiente ›' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Ver todo' }));
    expect(screen.getByText('Todo · 2 grupos')).toBeInTheDocument();
    expect(v.focusSections).toHaveBeenLastCalledWith(ZONES, PLANTS);

    await userEvent.click(screen.getByRole('button', { name: 'Por grupos' }));
    expect(screen.getByText('Grupo 1 de 2 · 2 jardines')).toBeInTheDocument();
  });

  it('si todo está junto no muestra el recorrido y encuadra el conjunto entero', () => {
    clusters.mockReturnValue([{ zoneCodes: ZONES, specimenCodes: PLANTS }]);
    const v = viewer();
    render(<SetMap zoneCodes={ZONES} specimenCodes={PLANTS} />);
    act(() => map.onReady?.(v));

    expect(screen.queryByRole('group', { name: 'Recorrer el conjunto por grupos' })).not.toBeInTheDocument();
    expect(v.focusSections).toHaveBeenLastCalledWith(ZONES, PLANTS);
  });
});
