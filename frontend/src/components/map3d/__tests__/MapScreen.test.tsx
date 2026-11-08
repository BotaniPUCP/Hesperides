import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MapLayersResponse } from '@shared/types';
import { MapScreen } from '../MapScreen';
import { layersWithTwoBlocks, sampleLayers, SECOND_BLOCK_ID } from '../__fixtures__/mapLayers';
import type { CameraPose } from '../viewer/cameraRig';
import { createViewer, type Viewer, type ViewerCallbacks } from '../viewer/createViewer';
import { useMapLayers, type UseMapLayersResult } from '@/hooks/useMapLayers';
import { mapApi } from '@/lib/map-api';
import { ApiError } from '@/lib/api';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';
import { placesApi } from '@/lib/places-api';
import type { MapCatalog } from '@shared/types';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../viewer/createViewer', () => ({ createViewer: jest.fn() }));
jest.mock('@/hooks/useMapLayers', () => ({ useMapLayers: jest.fn() }));
jest.mock('@/lib/map-api', () => ({ mapApi: { describe: jest.fn() } }));
jest.mock('@/lib/places-api', () => ({ placesApi: { map: jest.fn() } }));

const mockedCreate = createViewer as jest.MockedFunction<typeof createViewer>;
const mockedLayers = useMapLayers as jest.MockedFunction<typeof useMapLayers>;
const mockedDescribe = mapApi.describe as jest.MockedFunction<typeof mapApi.describe>;

// Cada test es una persona distinta: la memoria del mapa es por persona, así no se cuela de un test a otro.
let mockUser: { email: string };
let testNumber = 0;

function fakeViewer(): jest.Mocked<Viewer> {
  return {
    setPaint: jest.fn(), setMarkedSections: jest.fn(), setSectionColors: jest.fn(), setMarkedBuildings: jest.fn(), sectionCodesInScreenRect: jest.fn(), setLayerVisible: jest.fn(), select: jest.fn(), setNight: jest.fn(), setHour: jest.fn(),
    setShadows: jest.fn(), setLabels: jest.fn(), setGrayBuildings: jest.fn(), fit: jest.fn(), top: jest.fn(),
    north: jest.fn(), toggleSpin: jest.fn(), pose: jest.fn(() => SAVED_POSE),
    setViewCones: jest.fn(), flyToPose: jest.fn(), focusViewCone: jest.fn(), focusLatLon: jest.fn(), setPinLatLon: jest.fn(), dispose: jest.fn(),
  };
}

const SAVED_POSE: CameraPose = { position: [10, 400, 250], target: [12, 0, -30] };

const loaded = (data: MapLayersResponse = sampleLayers): UseMapLayersResult => ({ data, isLoading: false, errorMessage: null, stale: false });

let viewer: jest.Mocked<Viewer>;
let callbacks: ViewerCallbacks;

async function renderLoaded(data?: MapLayersResponse) {
  mockedLayers.mockReturnValue(loaded(data));
  const result = render(<MapScreen />);
  await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
  return result;
}

const catalog: MapCatalog = {
  places: [{ code: 'LUG-0001', name: 'Edificio de prueba', parentName: null, buildingIds: [1], lat: -12.07, lon: -77.08 }],
  perspectives: [{ id: 7, place: { code: 'LUG-0001', name: 'Edificio de prueba' }, displayName: 'Espalda de Edificio de prueba',
    lat: -12.0701, lon: -77.08, headingDeg: 0, thumbnailUrl: 'http://api/files/places/3?size=thumb' }],
};

beforeEach(() => {
  testNumber += 1;
  mockUser = { email: `persona-${testNumber}@pucp.edu.pe` };
  restartTrail('/mapa');
  (placesApi.map as jest.Mock).mockResolvedValue(catalog);
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
    expect(within(card).getByRole('link', { name: /Ver ficha en el catastro/ })).toHaveAttribute(
      'href',
      '/catastro/ejemplares/EV-000001',
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

  describe('al volver a la pantalla se ve como se dejó', () => {
    async function leaveAndReturn(unmount: () => void) {
      unmount();
      viewer = fakeViewer();
      mockedCreate.mockClear();
      const result = render(<MapScreen />);
      await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
      return result;
    }

    it('conserva las capas encendidas y apagadas, y el panel abierto', async () => {
      const { unmount } = await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Zonas de supervisión' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Árboles y plantas' }));

      await leaveAndReturn(unmount);

      expect(screen.getByRole('checkbox', { name: 'Zonas de supervisión' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Árboles y plantas' })).not.toBeChecked();
      await waitFor(() => expect(viewer.setLayerVisible).toHaveBeenCalledWith('vegetation', false));
      expect(viewer.setLayerVisible).not.toHaveBeenCalledWith('supervision', false);
      expect(viewer.setLayerVisible).toHaveBeenCalledWith('reserve', false);
    });

    it('conserva el modo de color y las categorías ocultas', async () => {
      const { unmount } = await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
      fireEvent.click(screen.getByRole('button', { name: 'Riego' }));
      fireEvent.click(screen.getByRole('button', { name: 'Goteo' }));

      await leaveAndReturn(unmount);

      await waitFor(() => expect(viewer.setPaint).toHaveBeenCalledWith('riego', new Set(['Riego por goteo'])));
    });

    it('conserva las opciones de vista y no repite las que siguen como al inicio', async () => {
      const { unmount } = await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Noche' }));

      await leaveAndReturn(unmount);

      await waitFor(() => expect(viewer.setNight).toHaveBeenCalledWith(true));
      expect(viewer.setShadows).not.toHaveBeenCalled();
    });

    it('conserva el elemento elegido y su ficha sin mover la cámara', async () => {
      const { unmount } = await renderLoaded();
      act(() => callbacks.onSelect({ layer: 'greenAreas', index: 0 }));

      await leaveAndReturn(unmount);

      expect(screen.getByRole('region', { name: 'AV-0001' })).toBeInTheDocument();
      await waitFor(() => expect(viewer.select).toHaveBeenCalledWith({ layer: 'greenAreas', index: 0 }, false));
      expect(viewer.select).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it('la ficha conservada muestra los datos actuales, no una copia vieja', async () => {
      const { unmount } = await renderLoaded();
      act(() => callbacks.onSelect({ layer: 'vegetation', index: 0 }));
      unmount();
      viewer = fakeViewer();
      mockedCreate.mockClear();

      const vegetation = sampleLayers.layers.vegetation;
      const [first, ...rest] = vegetation.features;
      await renderLoaded({
        ...sampleLayers,
        layers: {
          ...sampleLayers.layers,
          vegetation: { ...vegetation, features: [{ ...first, properties: { ...first.properties, heightM: 9 } }, ...rest] },
        },
      });

      const card = await screen.findByRole('region', { name: 'Palmera real' });
      await within(card).findByText('9 m (medida)');
    });

    it('si el elemento ya no existe en los datos actuales, descarta la selección', async () => {
      const { unmount } = await renderLoaded();
      act(() => callbacks.onSelect({ layer: 'vegetation', index: 1 }));
      unmount();
      viewer = fakeViewer();
      mockedCreate.mockClear();

      const vegetation = sampleLayers.layers.vegetation;
      await renderLoaded({
        ...sampleLayers,
        layers: { ...sampleLayers.layers, vegetation: { ...vegetation, features: vegetation.features.slice(0, 1) } },
      });

      await waitFor(() => expect(screen.queryByRole('region', { name: 'Ponciana' })).not.toBeInTheDocument());
      expect(viewer.select).not.toHaveBeenCalledWith({ layer: 'vegetation', index: 1 }, false);
    });

    it('una ficha que se cerró sigue cerrada', async () => {
      const { unmount } = await renderLoaded();
      act(() => callbacks.onSelect({ layer: 'greenAreas', index: 0 }));
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));

      await leaveAndReturn(unmount);

      expect(screen.queryByRole('region', { name: 'AV-0001' })).not.toBeInTheDocument();
      expect(viewer.select).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
    });

    it('conserva el punto descrito y su marcador sin volver a consultarlo', async () => {
      mockedDescribe.mockResolvedValue({
        sectionCode: 'AV-0001', sectionName: 'Jardín', buildingName: null, relation: 'INSIDE', distanceM: 0, text: 'Jardín central',
      });
      const { unmount } = await renderLoaded();
      act(() => callbacks.onGroundPick(-12.07, -77.08));
      await screen.findByText('Jardín central');
      mockedDescribe.mockClear();

      await leaveAndReturn(unmount);

      expect(screen.getByText('Jardín central')).toBeInTheDocument();
      await waitFor(() => expect(viewer.setPinLatLon).toHaveBeenCalledWith(-12.07, -77.08));
      expect(mockedDescribe).not.toHaveBeenCalled();
    });

    it('no recuerda un punto cuya descripción no llegó a tiempo', async () => {
      mockedDescribe.mockReturnValue(new Promise(() => undefined));
      const { unmount } = await renderLoaded();
      act(() => callbacks.onGroundPick(-12.07, -77.08));
      expect(screen.getByText('Calculando ubicación…')).toBeInTheDocument();

      await leaveAndReturn(unmount);

      expect(screen.queryByText('Calculando ubicación…')).not.toBeInTheDocument();
    });

    it('vuelve a dibujar los conos de Perspectivas en el visor nuevo', async () => {
      const { unmount } = await renderLoaded();
      await waitFor(() => expect(placesApi.map).toHaveBeenCalled());
      fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Perspectivas' }));
      await waitFor(() => expect(viewer.setViewCones).toHaveBeenLastCalledWith([{ id: 7, lat: -12.0701, lon: -77.08, headingDeg: 0 }]));

      await leaveAndReturn(unmount);

      await waitFor(() => expect(viewer.setViewCones).toHaveBeenLastCalledWith([{ id: 7, lat: -12.0701, lon: -77.08, headingDeg: 0 }]));
    });

    it('otra persona en la misma pestaña empieza de cero, también la cámara', async () => {
      const { unmount } = await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Noche' }));
      act(() => callbacks.onSelect({ layer: 'greenAreas', index: 0 }));
      mockUser = { email: 'otra@pucp.edu.pe' };

      await leaveAndReturn(unmount);

      expect(mockedCreate.mock.calls[0][4]).toBeUndefined();
      expect(screen.queryByRole('region', { name: 'AV-0001' })).not.toBeInTheDocument();
      expect(viewer.setNight).not.toHaveBeenCalled();
    });
  });

  describe('enlace directo a un ejemplar', () => {
    afterEach(() => window.history.replaceState(null, '', '/'));

    it('espera al visor para elegirlo y llevar la cámara hasta él', async () => {
      window.history.replaceState(null, '', '/mapa?codigo=EV-000001');
      await renderLoaded();

      await waitFor(() => expect(viewer.select).toHaveBeenCalledWith({ layer: 'vegetation', index: 0 }, true));
      expect(screen.getByRole('region', { name: 'Palmera real' })).toBeInTheDocument();
    });

    it('enciende su capa si la persona la había dejado apagada', async () => {
      const { unmount } = await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Árboles y plantas' }));
      unmount();
      viewer = fakeViewer();

      window.history.replaceState(null, '', '/mapa?codigo=EV-000001');
      await renderLoaded();

      await waitFor(() => expect(viewer.setLayerVisible).toHaveBeenLastCalledWith('vegetation', true));
      expect(screen.getByRole('checkbox', { name: 'Árboles y plantas' })).toBeChecked();
    });

    it('se consume una vez: al regresar a esa entrada no vuelve a mover la cámara', async () => {
      window.history.replaceState(null, '', '/mapa?codigo=EV-000001');
      const { unmount } = await renderLoaded();
      await waitFor(() => expect(viewer.select).toHaveBeenCalledWith({ layer: 'vegetation', index: 0 }, true));
      await waitFor(() => expect(window.location.search).toBe(''));

      unmount();
      viewer = fakeViewer();
      mockedCreate.mockClear();
      await renderLoaded();

      await waitFor(() => expect(viewer.select).toHaveBeenCalledWith({ layer: 'vegetation', index: 0 }, false));
      expect(viewer.select).not.toHaveBeenCalledWith(expect.anything(), true);
    });

    it('un código que no existe deja el mapa como estaba y no toca la dirección', async () => {
      window.history.replaceState(null, '', '/mapa?codigo=EV-999999');
      await renderLoaded();

      await waitFor(() => expect(viewer.setLayerVisible).toHaveBeenCalled());
      expect(viewer.select).not.toHaveBeenCalled();
      expect(window.location.search).toBe('?codigo=EV-999999');
    });
  });

  describe('flecha de volver', () => {
    it('al entrar por el menú no hay a dónde volver y no aparece', async () => {
      restartTrail('/mapa');
      await renderLoaded();

      expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
    });

    it('al llegar desde una ficha regresa a ella', async () => {
      restartTrail('/catastro/ejemplares/EV-000001');
      recordVisit('/mapa');
      await renderLoaded();

      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/catastro/ejemplares/EV-000001');
    });
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

  describe('catálogo de lugares', () => {
    it('la capa Perspectivas empieza apagada y al encenderla dibuja un cono por perspectiva', async () => {
      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Capas y leyenda' }));
      const toggle = screen.getByRole('checkbox', { name: 'Perspectivas' });
      expect(toggle).not.toBeChecked();
      expect(viewer.setLayerVisible).not.toHaveBeenCalledWith('perspectives', expect.anything());

      fireEvent.click(toggle);

      await waitFor(() => expect(viewer.setViewCones).toHaveBeenLastCalledWith([{ id: 7, lat: -12.0701, lon: -77.08, headingDeg: 0 }]));
    });

    it('pulsar un cono abre la ficha de la perspectiva con su foto y el enlace al lugar', async () => {
      await renderLoaded();
      await waitFor(() => expect(placesApi.map).toHaveBeenCalled());

      await act(async () => callbacks.onViewConePick?.(7));

      const card = await screen.findByRole('region', { name: 'Espalda de Edificio de prueba' });
      expect(within(card).getByRole('img')).toHaveAttribute('src', 'http://api/files/places/3?size=thumb');
      expect(within(card).getByRole('link', { name: /Ver Edificio de prueba en el catálogo/ })).toHaveAttribute('href', '/lugares/LUG-0001');
    });

    it('el buscador encuentra una perspectiva y lleva la cámara a su cono', async () => {
      await renderLoaded();
      await waitFor(() => expect(placesApi.map).toHaveBeenCalled());
      const box = screen.getByRole('combobox', { name: 'Buscar en el mapa' });
      fireEvent.change(box, { target: { value: 'espalda de edificio' } });
      fireEvent.click(await screen.findByRole('option', { name: /Espalda de Edificio de prueba/ }));

      expect(viewer.focusViewCone).toHaveBeenCalledWith(7);
      expect(screen.getByRole('region', { name: 'Espalda de Edificio de prueba' })).toBeInTheDocument();
    });

    it('la ficha de un edificio del catálogo enlaza a su lugar', async () => {
      await renderLoaded();
      await waitFor(() => expect(placesApi.map).toHaveBeenCalled());
      fireEvent.change(screen.getByRole('combobox', { name: 'Buscar en el mapa' }), { target: { value: 'edificio de prueba' } });
      fireEvent.click(await screen.findByRole('option', { name: /Edificio de prueba Lugar del catálogo/ }));

      expect(viewer.select).toHaveBeenCalledWith({ layer: 'campusBuildings', index: 0 }, true);
      expect(screen.getByRole('link', { name: /Ver en el catálogo/ })).toHaveAttribute('href', '/lugares/LUG-0001');
    });

    describe('un lugar de varios bloques', () => {
      const split = { code: 'LUG-0002', name: 'Pabellón partido', parentName: null, buildingIds: [1, SECOND_BLOCK_ID], lat: -12.0701, lon: -77.0801 };
      beforeEach(() => (placesApi.map as jest.Mock).mockResolvedValue({ places: [split], perspectives: [] }));

      it('al buscarlo marca todos sus bloques y lleva la cámara a su centro', async () => {
        await renderLoaded(layersWithTwoBlocks);
        await waitFor(() => expect(placesApi.map).toHaveBeenCalled());
        fireEvent.change(screen.getByRole('combobox', { name: 'Buscar en el mapa' }), { target: { value: 'pabellon partido' } });
        fireEvent.click(await screen.findByRole('option', { name: /Pabellón partido/ }));

        expect(viewer.setMarkedBuildings).toHaveBeenLastCalledWith([1, SECOND_BLOCK_ID]);
        expect(viewer.focusLatLon).toHaveBeenCalledWith(-12.0701, -77.0801);
        expect(screen.getByRole('region', { name: 'Pabellón partido' })).toBeInTheDocument();
      });

      it('cerrar su ficha quita las marcas', async () => {
        await renderLoaded(layersWithTwoBlocks);
        await waitFor(() => expect(placesApi.map).toHaveBeenCalled());
        fireEvent.change(screen.getByRole('combobox', { name: 'Buscar en el mapa' }), { target: { value: 'pabellon partido' } });
        fireEvent.click(await screen.findByRole('option', { name: /Pabellón partido/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));

        expect(viewer.setMarkedBuildings).toHaveBeenLastCalledWith([]);
      });

      it('pulsar cualquiera de sus bloques enlaza al lugar', async () => {
        await renderLoaded(layersWithTwoBlocks);
        await waitFor(() => expect(placesApi.map).toHaveBeenCalled());

        await act(async () => callbacks.onSelect({ layer: 'campusBuildings', index: 1 }));

        expect(screen.getByRole('link', { name: /Ver en el catálogo/ })).toHaveAttribute('href', '/lugares/LUG-0002');
      });
    });

    it('si el catálogo no carga, el mapa funciona igual', async () => {
      (placesApi.map as jest.Mock).mockRejectedValue(new Error('caído'));
      await renderLoaded();
      expect(screen.getByTestId('map-3d')).toBeInTheDocument();
    });
  });
});
