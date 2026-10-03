import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MapLayersResponse } from '@shared/types';
import { MapScreen } from '../MapScreen';
import { sampleLayers } from '../__fixtures__/mapLayers';
import type { CameraPose } from '../viewer/cameraRig';
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
    north: jest.fn(), toggleSpin: jest.fn(), pose: jest.fn(() => SAVED_POSE),
    setViewCones: jest.fn(), focusViewCone: jest.fn(), focusLatLon: jest.fn(), dispose: jest.fn(),
  };
}

const SAVED_POSE: CameraPose = { position: [10, 400, 250], target: [12, 0, -30] };

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

  it('si las capas llegan incompletas avisa en vez de romper la página', () => {
    const { vegetation: _omitted, ...incomplete } = sampleLayers.layers;
    mockedLayers.mockReturnValue(loaded({ ...sampleLayers, layers: incomplete as typeof sampleLayers.layers }));
    render(<MapScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('Los datos del mapa están incompletos');
  });

  it('arranca con las capas de gestión apagadas', async () => {
    await renderLoaded();
    expect(viewer.setLayerVisible).toHaveBeenCalledWith('supervision', false);
    expect(viewer.setLayerVisible).toHaveBeenCalledWith('reserve', false);
    expect(viewer.setLayerVisible).not.toHaveBeenCalledWith('greenAreas', false);
  });

  it('arranca sin los edificios del entorno', async () => {
    await renderLoaded();
    expect(viewer.setLayerVisible).toHaveBeenCalledWith('contextBuildings', false);
    fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
    expect(screen.getByRole('checkbox', { name: 'Edificios del entorno' })).not.toBeChecked();
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

  it('elegir una planta abre su ficha con el enlace a su ficha del inventario', async () => {
    await renderLoaded();
    act(() => callbacks.onSelect({ layer: 'vegetation', index: 0 }));

    const card = screen.getByRole('region', { name: 'Palmera real' });
    expect(within(card).getByText('7.5 m (medida)')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Ver ficha en el inventario/ })).toHaveAttribute(
      'href',
      '/inventario-verde/especies/roystonea-regia/ejemplares/EV-000001',
    );
  });

  it('la capa de árboles empieza encendida', async () => {
    await renderLoaded();
    expect(viewer.setLayerVisible).not.toHaveBeenCalledWith('vegetation', false);
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

  it('al volver a la pantalla la cámara sigue donde se dejó', async () => {
    mockedLayers.mockReturnValue(loaded());
    const { unmount } = render(<MapScreen />);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    unmount();
    render(<MapScreen />);
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(2));
    expect(mockedCreate.mock.calls[1][4]).toEqual(SAVED_POSE);
  });

  describe('pantalla completa', () => {
    const request = jest.fn(() => Promise.resolve());
    const exit = jest.fn(() => Promise.resolve());

    beforeEach(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
      HTMLElement.prototype.requestFullscreen = request;
    });

    afterEach(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined });
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    });

    it('el botón expande el mapa y vuelve a pulsarse para salir', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
      expect(request).toHaveBeenCalled();
      expect(request.mock.contexts[0]).toContainElement(screen.getByTestId('map-3d'));

      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: request.mock.contexts[0] });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      fireEvent.click(screen.getByRole('button', { name: 'Salir de pantalla completa' }));
      expect(exit).toHaveBeenCalled();
    });

    it('sin soporte del navegador no muestra el botón', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
      await renderLoaded();
      expect(screen.queryByRole('button', { name: 'Pantalla completa' })).not.toBeInTheDocument();
    });
  });
});
