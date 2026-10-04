import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import { sampleLayers } from '@/components/map3d/__fixtures__/mapLayers';
import { toSceneData } from '@/components/map3d/sceneData';
import { ApiError } from '@/lib/api';
import { placesApi } from '@/lib/places-api';
import { PlaceForm } from '../PlaceForm';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
jest.mock('@/lib/places-api', () => ({ placesApi: { create: jest.fn(), update: jest.fn(), list: jest.fn() } }));
jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false }),
}));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({ items: [{ code: 'EDIFICIO', label: 'Edificio', sortOrder: 1, isActive: true, parentCode: null }], isLoading: false, errorMessage: null }),
}));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));

let map: Map3DViewProps;
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: (props: Map3DViewProps) => {
    map = props;
    return <div data-testid="map-3d" />;
  },
}));

const create = placesApi.create as jest.MockedFunction<typeof placesApi.create>;
const list = placesApi.list as jest.MockedFunction<typeof placesApi.list>;
const data = toSceneData(sampleLayers);

beforeEach(() => list.mockResolvedValue([]));
afterEach(() => jest.clearAllMocks());

function fillBasics() {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'CIA' } });
  fireEvent.change(screen.getByLabelText(/Categoría/), { target: { value: 'EDIFICIO' } });
  fireEvent.change(screen.getByLabelText(/Alias/), { target: { value: 'Complejo de Innovación, CIA nuevo' } });
}

describe('PlaceForm', () => {
  it('crea un exterior con el edificio elegido en el mapa y abre su ficha', async () => {
    create.mockResolvedValue({ code: 'LUG-0005' });
    render(<PlaceForm />);
    fillBasics();

    act(() => map.onSelect({ layer: 'campusBuildings', index: 0 }));
    expect(screen.getByText(/Contorno:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({
      name: 'CIA', kindCode: 'OUTDOOR', categoryCode: 'EDIFICIO', parentCode: null,
      outline: { buildingId: data.campusBuildings[0].props.id }, aliases: ['Complejo de Innovación', 'CIA nuevo'],
    }));
    // Con cambios hay una entrada propia en el historial: se reemplaza al salir.
    expect(replace).toHaveBeenCalledWith('/lugares/LUG-0005');
  });

  it('un exterior sin contorno no se puede guardar', () => {
    render(<PlaceForm />);
    fillBasics();

    expect(screen.getByRole('button', { name: 'Guardar lugar' })).toBeDisabled();
  });

  it('en modo punto, un clic en el mapa marca el contorno', async () => {
    create.mockResolvedValue({ code: 'LUG-0006' });
    render(<PlaceForm />);
    fillBasics();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar un punto' }));
    act(() => map.onPointPick?.(-12.07, -77.08));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(create.mock.calls[0][0].outline).toEqual({ geometry: { type: 'Point', coordinates: [-77.08, -12.07] } }));
  });

  it('un interior no pide contorno pero sí el lugar donde está', async () => {
    list.mockResolvedValue([{ code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' },
      category: { code: 'EDIFICIO', label: 'Edificio' }, mainPhotoUrl: null, perspectiveCount: 0, hasFront: false, hasBack: false }]);
    create.mockResolvedValue({ code: 'LUG-0007' });
    render(<PlaceForm />);
    fillBasics();

    fireEvent.click(screen.getByRole('button', { name: 'Interior' }));
    expect(screen.queryByTestId('map-3d')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar lugar' })).toBeDisabled();
    fireEvent.change(await screen.findByLabelText(/Dentro de/), { target: { value: 'LUG-0001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(create.mock.calls[0][0]).toMatchObject({ kindCode: 'INDOOR', parentCode: 'LUG-0001', outline: {} }));
  });

  it('muestra el error del backend, por ejemplo un nombre repetido', async () => {
    create.mockRejectedValue(new ApiError(409, 'There is already a place named «CIA» there'));
    render(<PlaceForm />);
    fillBasics();
    act(() => map.onSelect({ layer: 'campusBuildings', index: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('cancelar con datos escritos pregunta antes de salir', () => {
    render(<PlaceForm />);
    fillBasics();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(replace).toHaveBeenCalledWith('/lugares');
  });

  it('cancelar sin haber escrito nada sale sin preguntar', () => {
    render(<PlaceForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/lugares');
  });
});
