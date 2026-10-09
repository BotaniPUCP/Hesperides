import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PlaceDetail } from '@shared/types';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import { placesApi } from '@/lib/places-api';
import { PerspectiveEditor } from '../PerspectiveEditor';

jest.mock('@/lib/places-api', () => ({
  placesApi: { previewPerspective: jest.fn(), createPerspective: jest.fn(), updatePerspective: jest.fn() },
}));
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

const preview = placesApi.previewPerspective as jest.MockedFunction<typeof placesApi.previewPerspective>;
const create = placesApi.createPerspective as jest.MockedFunction<typeof placesApi.createPerspective>;

const place = {
  code: 'LUG-0001', name: 'CIA', kind: { code: 'OUTDOOR', label: 'Exterior' },
  outline: { source: 'BUILDING', buildingId: 1, zoneCode: null, featureCode: null, centerLat: -12.07, centerLon: -77.08 },
  perspectives: [{ id: 3, side: { code: 'BACK', label: 'Espalda' }, displayName: 'Espalda de CIA', compass: 'SOUTH',
    landmark: null, lat: -12.0702, lon: -77.08, headingDeg: 0, photos: [] }],
} as unknown as PlaceDetail;

afterEach(() => jest.clearAllMocks());

describe('PerspectiveEditor', () => {
  it('el primer clic marca el punto, el segundo la dirección, y muestra el nombre antes de guardar', async () => {
    preview.mockResolvedValue({ displayName: 'Al lado de CIA · oeste' });
    create.mockResolvedValue({} as never);
    const onSaved = jest.fn();
    render(<PerspectiveEditor place={place} perspective={null} onClose={jest.fn()} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: 'Al lado' }));
    expect(screen.getByRole('button', { name: 'Guardar perspectiva' })).toBeDisabled();
    act(() => map.onPointPick?.(-12.07, -77.0802));
    expect(screen.getByText(/Ahora haz clic hacia donde mira/)).toBeInTheDocument();
    act(() => map.onPointPick?.(-12.07, -77.0799));

    expect(await screen.findByText('Al lado de CIA · oeste')).toBeInTheDocument();
    expect(preview).toHaveBeenLastCalledWith('LUG-0001', expect.objectContaining({ sideCode: 'SIDE', lat: -12.07, lon: -77.0802 }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perspectiva' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][1].headingDeg).toBeCloseTo(90, 0);
    expect(onSaved).toHaveBeenCalled();
  });

  it('no ofrece una segunda espalda', () => {
    render(<PerspectiveEditor place={place} perspective={null} onClose={jest.fn()} onSaved={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Espalda' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Frente' })).toBeEnabled();
  });

  it('al editar, parte del punto y la dirección guardados', async () => {
    preview.mockResolvedValue({ displayName: 'Espalda de CIA' });
    render(<PerspectiveEditor place={place} perspective={place.perspectives[0]} onClose={jest.fn()} onSaved={jest.fn()} />);

    expect(await screen.findByText('Espalda de CIA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Espalda' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Guardar perspectiva' })).toBeEnabled();
  });
});
