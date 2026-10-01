import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MapLayersResponse } from '@shared/types';
import { MapScreen } from '../MapScreen';
import { sampleLayers } from '../__fixtures__/mapLayers';
import { createViewer, type Viewer, type ViewerCallbacks } from '../viewer/createViewer';
import { useMapLayers, type UseMapLayersResult } from '@/hooks/useMapLayers';
import { mapApi } from '@/lib/map-api';
import { ApiError } from '@/lib/api';

jest.mock('../viewer/createViewer', () => ({ createViewer: jest.fn() }));
jest.mock('@/hooks/useMapLayers', () => ({ useMapLayers: jest.fn() }));
jest.mock('@/lib/map-api', () => ({ mapApi: { describe: jest.fn() } }));

const mockedCreate = createViewer as jest.MockedFunction<typeof createViewer>;
const mockedLayers = useMapLayers as jest.MockedFunction<typeof useMapLayers>;
const mockedDescribe = mapApi.describe as jest.MockedFunction<typeof mapApi.describe>;

function fakeViewer(): jest.Mocked<Viewer> {
  return {
    setPaint: jest.fn(), setLayerVisible: jest.fn(), select: jest.fn(), setNight: jest.fn(), setHour: jest.fn(),
    setShadows: jest.fn(), setLabels: jest.fn(), setGrayBuildings: jest.fn(), fit: jest.fn(), top: jest.fn(),
    north: jest.fn(), toggleSpin: jest.fn(), dispose: jest.fn(),
  };
}

const loaded = (data: MapLayersResponse = sampleLayers): UseMapLayersResult => ({ data, isLoading: false, errorMessage: null, stale: false });

let viewer: jest.Mocked<Viewer>;
let callbacks: ViewerCallbacks;

async function renderLoaded(data?: MapLayersResponse) {
  mockedLayers.mockReturnValue(loaded(data));
  render(<MapScreen />);
  await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
}

beforeEach(() => {
  viewer = fakeViewer();
  mockedCreate.mockImplementation((_c, _l, _d, cb) => {
    callbacks = cb;
    return viewer;
  });
});

afterEach(() => jest.clearAllMocks());

describe('MapScreen', () => {
  it('muestra un esqueleto mientras llegan las capas', () => {
    mockedLayers.mockReturnValue({ data: null, isLoading: true, errorMessage: null, stale: false });
    render(<MapScreen />);
    expect(screen.queryByTestId('map-3d')).not.toBeInTheDocument();
  });

  it('informa si no hay capas que mostrar', () => {
    mockedLayers.mockReturnValue({ data: null, isLoading: false, errorMessage: 'Sin conexión. Verifique su red.', stale: false });
    render(<MapScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('arranca con las capas de gestión apagadas', async () => {
    await renderLoaded();
    expect(viewer.setLayerVisible).toHaveBeenCalledWith('supervision', false);
    expect(viewer.setLayerVisible).toHaveBeenCalledWith('reserve', false);
    expect(viewer.setLayerVisible).not.toHaveBeenCalledWith('greenAreas', false);
  });

  it('buscar y elegir un resultado lleva la cámara y abre su ficha', async () => {
    await renderLoaded();
    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar en el mapa' }), { target: { value: 'tinkuy' } });
    fireEvent.click(screen.getByRole('option', { name: /Tinkuy/ }));

    expect(viewer.select).toHaveBeenCalledWith({ layer: 'references', index: 0 }, true);
    expect(screen.getByRole('region', { name: 'Tinkuy' })).toBeInTheDocument();
  });

  it('un clic en la maqueta abre la ficha del elemento, y cerrarla quita la selección', async () => {
    await renderLoaded();
    act(() => callbacks.onSelect({ layer: 'greenAreas', index: 0 }));
    const card = screen.getByRole('region', { name: 'AV-0001' });
    expect(within(card).getByText('Sector verde 01')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));
    expect(viewer.select).toHaveBeenCalledWith(null, false);
    expect(screen.queryByRole('region', { name: 'AV-0001' })).not.toBeInTheDocument();
  });

  it('un clic en el suelo describe el punto con el texto del servidor', async () => {
    mockedDescribe.mockResolvedValue({
      sectionCode: 'AV-0001', sectionName: 'Jardín', buildingName: 'Pabellón Z', relation: 'INSIDE', distanceM: 0,
      text: 'Jardín · dentro de Pabellón Z',
    });
    await renderLoaded();
    act(() => callbacks.onGroundPick(-12.07, -77.08));

    expect(mockedDescribe).toHaveBeenCalledWith(-12.07, -77.08);
    expect(await screen.findByText('Jardín · dentro de Pabellón Z')).toBeInTheDocument();
  });

  it('si no se puede describir el punto lo dice en la ficha', async () => {
    mockedDescribe.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));
    await renderLoaded();
    act(() => callbacks.onGroundPick(-12.07, -77.08));
    expect(await screen.findByText(/Sin conexión/)).toBeInTheDocument();
  });

  it('cambiar el modo repinta las áreas verdes y apagar una categoría la atenúa', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Riego' }));
    expect(viewer.setPaint).toHaveBeenLastCalledWith('riego', new Set());

    fireEvent.click(screen.getByRole('button', { name: 'Goteo' }));
    expect(viewer.setPaint).toHaveBeenLastCalledWith('riego', new Set(['Riego por goteo']));
  });

  it('encender una capa la muestra en la maqueta', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Zonas de supervisión' }));
    expect(viewer.setLayerVisible).toHaveBeenLastCalledWith('supervision', true);
  });

  it('las opciones de vista llegan al visor', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Noche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Orientar al norte' }));
    expect(viewer.setNight).toHaveBeenCalledWith(true);
    expect(viewer.north).toHaveBeenCalled();
  });

  it('sin WebGL muestra las áreas verdes en una lista con su ficha', async () => {
    mockedCreate.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });
    await renderLoaded();

    expect(await screen.findByRole('status')).toHaveTextContent('no puede mostrar la maqueta 3D');
    fireEvent.click(screen.getByText(/Sector verde 01/));
    fireEvent.click(screen.getByRole('button', { name: 'AV-0001' }));
    expect(screen.getByRole('region', { name: 'AV-0001' })).toBeInTheDocument();
  });

  it('atribuye OpenStreetMap solo mientras se muestran sus edificios', async () => {
    await renderLoaded();
    expect(screen.getByRole('link', { name: /OpenStreetMap/ })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  });

  it('sin edificios de OpenStreetMap no muestra la atribución', async () => {
    await renderLoaded({ ...sampleLayers, attributionRequired: false });
    expect(screen.queryByRole('link', { name: /OpenStreetMap/ })).not.toBeInTheDocument();
  });

  it('sin red avisa que el mapa puede estar desactualizado', async () => {
    mockedLayers.mockReturnValue({ ...loaded(), stale: true });
    render(<MapScreen />);
    expect(await screen.findByText(/última versión descargada/)).toBeInTheDocument();
  });

  it('con datos al día no muestra ese aviso', async () => {
    await renderLoaded();
    expect(screen.queryByText(/última versión descargada/)).not.toBeInTheDocument();
  });

  it('al salir de la pantalla libera el visor', async () => {
    mockedLayers.mockReturnValue(loaded());
    const { unmount } = render(<MapScreen />);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    unmount();
    expect(viewer.dispose).toHaveBeenCalled();
  });
});
