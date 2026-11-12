import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import { layersWithTwoBlocks, SECOND_BLOCK_ID } from '@/components/map3d/__fixtures__/mapLayers';
import { toSceneData } from '@/components/map3d/sceneData';
import { ApiError } from '@/lib/api';
import { rememberListQuery } from '@/lib/listMemory';
import { placesApi } from '@/lib/places-api';
import { PlaceForm } from '../PlaceForm';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
jest.mock('@/lib/places-api', () => ({ placesApi: { create: jest.fn(), update: jest.fn(), list: jest.fn() } }));
jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').layersWithTwoBlocks, isLoading: false }),
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
const update = placesApi.update as jest.MockedFunction<typeof placesApi.update>;
const data = toSceneData(layersWithTwoBlocks);
const marks = { setMarkedBuildings: jest.fn(), select: jest.fn(), focusLatLon: jest.fn() };

beforeEach(() => list.mockResolvedValue([]));
afterEach(() => jest.clearAllMocks());

function fillBasics() {
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'CIA' } });
  fireEvent.change(screen.getByLabelText(/Categoría/), { target: { value: 'EDIFICIO' } });
  for (const alias of ['CIA', 'CIA2']) {
    fireEvent.change(screen.getByLabelText('Alias'), { target: { value: alias } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar alias' }));
  }
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
      outline: { buildingIds: [data.campusBuildings[0].props.id] }, aliases: ['CIA', 'CIA2'],
    }));
    // Con cambios hay una entrada propia en el historial: se reemplaza al salir.
    expect(replace).toHaveBeenCalledWith('/lugares/LUG-0005');
  });

  it('un lugar dibujado en varios bloques los lleva todos, marcados en el mapa', async () => {
    create.mockResolvedValue({ code: 'LUG-0008' });
    render(<PlaceForm />);
    fillBasics();
    act(() => map.onReady(marks as never));

    act(() => map.onSelect({ layer: 'campusBuildings', index: 0 }));
    act(() => map.onSelect({ layer: 'campusBuildings', index: 1 }));

    const ids = [data.campusBuildings[0].props.id, SECOND_BLOCK_ID];
    expect(marks.setMarkedBuildings).toHaveBeenLastCalledWith(ids);
    expect(screen.getByText(/2 edificios: .*Bloque B/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));
    await waitFor(() => expect(create.mock.calls[0][0].outline).toEqual({ buildingIds: ids }));
  });

  it('un edificio de la lista se puede quitar sin buscarlo en el mapa', () => {
    render(<PlaceForm />);
    act(() => map.onSelect({ layer: 'campusBuildings', index: 0 }));
    act(() => map.onSelect({ layer: 'campusBuildings', index: 1 }));

    fireEvent.click(screen.getByRole('button', { name: 'Quitar Bloque B' }));

    expect(screen.queryByText(/Bloque B/)).not.toBeInTheDocument();
  });

  it('un complejo toma el contorno de los lugares que contiene', async () => {
    create.mockResolvedValue({ code: 'LUG-0009' });
    render(<PlaceForm />);
    fillBasics();

    fireEvent.click(screen.getByRole('button', { name: 'De sus lugares internos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(create.mock.calls[0][0].outline).toEqual({ fromChildren: true }));
  });

  it('al editar conserva los bloques guardados y los nombra', async () => {
    update.mockResolvedValue(undefined as never);
    const ids = [data.campusBuildings[0].props.id, SECOND_BLOCK_ID];
    render(<PlaceForm place={{
      code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' }, category: { code: 'EDIFICIO', label: 'Edificio' },
      outline: { source: 'BUILDING', buildingIds: ids, zoneCode: null, featureCode: null, centerLat: -12.07, centerLon: -77.08 },
      aliases: [], children: [], mainPhotos: [], perspectives: [], interior: [], mapView: null,
    }} />);

    act(() => map.onReady(marks as never));

    expect(marks.focusLatLon).toHaveBeenCalledWith(-12.07, -77.08);
    expect(screen.getByText(/2 edificios: .*Bloque B/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'CIA nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(update.mock.calls[0][1].outline).toEqual({ buildingIds: ids }));
  });

  it('al editar permite reemplazar y quitar alias desde el modal de gestión', async () => {
    update.mockResolvedValue(undefined as never);
    render(<PlaceForm place={{
      code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' }, category: { code: 'EDIFICIO', label: 'Edificio' },
      outline: { source: 'BUILDING', buildingIds: [data.campusBuildings[0].props.id], zoneCode: null, featureCode: null, centerLat: null, centerLon: null },
      aliases: ['Nombre antiguo', 'CIA2'], children: [], mainPhotos: [], perspectives: [], interior: [], mapView: null,
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar alias' }));
    const dialog = screen.getByRole('dialog', { name: 'Gestionar alias' });
    fireEvent.change(within(dialog).getByLabelText('Alias 1'), { target: { value: 'CIA' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Quitar alias CIA2' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Listo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar lugar' }));

    await waitFor(() => expect(update.mock.calls[0][1].aliases).toEqual(['CIA']));
  });

  it('no permite agregar alias con espacios ni alias duplicados ignorando mayúsculas y tildes', () => {
    render(<PlaceForm />);

    fireEvent.change(screen.getByLabelText('Alias'), { target: { value: 'dos palabras' } });
    expect(screen.getByLabelText('Alias')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Agregar alias' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Alias'), { target: { value: 'Fisica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar alias' }));
    fireEvent.change(screen.getByLabelText('Alias'), { target: { value: 'física' } });

    expect(screen.getByRole('button', { name: 'Agregar alias' })).toBeDisabled();
  });

  it('al editar un complejo conserva que su contorno sale de sus hijos', () => {
    render(<PlaceForm place={{
      code: 'LUG-0002', name: 'Complejo', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' }, category: { code: 'EDIFICIO', label: 'Edificio' },
      outline: { source: 'CHILDREN', buildingIds: [], zoneCode: null, featureCode: null, centerLat: null, centerLon: null },
      aliases: [], children: [], mainPhotos: [], perspectives: [], interior: [], mapView: null,
    }} />);

    expect(screen.getByRole('button', { name: 'De sus lugares internos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Guardar lugar' })).toBeEnabled();
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

  it('cancelar un alta vuelve al catálogo con sus últimos filtros', () => {
    rememberListQuery('/lugares', 'kind=INDOOR');
    render(<PlaceForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(push).toHaveBeenCalledWith('/lugares?kind=INDOOR');
    window.sessionStorage.clear();
  });

  it('cancelar sin haber escrito nada sale sin preguntar', () => {
    render(<PlaceForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/lugares');
  });
});
