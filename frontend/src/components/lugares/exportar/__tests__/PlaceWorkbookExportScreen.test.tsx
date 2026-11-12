import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { placesApi } from '@/lib/places-api';
import { PlaceWorkbookExportScreen } from '../PlaceWorkbookExportScreen';

const mockCatalog = {
  items: [{ code: 'EDIFICIO', label: 'Edificio', sortOrder: 1, isActive: true, parentCode: null }],
  isLoading: false,
  errorMessage: null,
};
const mockPlaces = {
  places: [{ code: 'LUG-0001', name: 'Biblioteca', parent: null }],
  errorMessage: null,
};

jest.mock('@/components/lugares/edit/useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/hooks/useCatalog', () => ({ useCatalog: () => mockCatalog }));
jest.mock('@/hooks/usePlaces', () => ({ usePlaces: () => mockPlaces }));
jest.mock('@/lib/places-api', () => ({ placesApi: { exportPlaces: jest.fn() } }));

const exportPlaces = placesApi.exportPlaces as jest.MockedFunction<typeof placesApi.exportPlaces>;
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');

describe('PlaceWorkbookExportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
  });

  it('envía los filtros opcionales y descarga el libro Excel', async () => {
    const blob = new Blob(['workbook']);
    exportPlaces.mockResolvedValue(blob);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn().mockReturnValue('blob:places'),
    });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<PlaceWorkbookExportScreen />);

    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'EDIFICIO' } });
    fireEvent.change(screen.getByLabelText('Alias exacto'), { target: { value: 'biblioteca vieja' } });
    fireEvent.change(screen.getByLabelText('Dentro de'), { target: { value: 'LUG-0001' } });
    fireEvent.change(screen.getByLabelText('Creado desde'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Creado hasta'), { target: { value: '2026-12-31' } });
    const coordinates = screen.getAllByRole('spinbutton');
    fireEvent.change(coordinates[0], { target: { value: '-12.1' } });
    fireEvent.change(coordinates[1], { target: { value: '-77.2' } });
    fireEvent.change(coordinates[2], { target: { value: '-12.1' } });
    fireEvent.change(coordinates[3], { target: { value: '-77.1' } });
    fireEvent.change(coordinates[4], { target: { value: '-12.0' } });
    fireEvent.change(coordinates[5], { target: { value: '-77.1' } });
    fireEvent.click(screen.getByLabelText('Exportar perspectivas con su punto cardinal, ubicación, rumbo e imagen'));
    fireEvent.click(screen.getByLabelText('Espalda'));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel' }));

    await waitFor(() => expect(exportPlaces).toHaveBeenCalledWith({
      categoryCode: 'EDIFICIO',
      alias: 'biblioteca vieja',
      parentCode: 'LUG-0001',
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
      point1Lat: -12.1,
      point1Lon: -77.2,
      point2Lat: -12.1,
      point2Lon: -77.1,
      point3Lat: -12,
      point3Lon: -77.1,
      includePerspectives: true,
      perspectiveSides: ['FRONT', 'SIDE'],
    }));
    expect(click).toHaveBeenCalled();
  });

  it('no envía una zona si falta alguna coordenada de sus tres puntos', async () => {
    render(<PlaceWorkbookExportScreen />);
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '-12.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Completa latitud y longitud de los tres puntos');
    expect(exportPlaces).not.toHaveBeenCalled();
  });
});
