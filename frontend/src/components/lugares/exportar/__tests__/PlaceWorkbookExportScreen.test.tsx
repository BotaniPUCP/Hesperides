import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { placesApi } from '@/lib/places-api';
import { PlaceWorkbookExportScreen } from '../PlaceWorkbookExportScreen';

const mockCatalog = {
  items: [{ code: 'EDIFICIO', label: 'Edificio', sortOrder: 1, isActive: true, parentCode: null }],
  isLoading: false,
  errorMessage: null,
};
const mockPlaces = {
  items: [{ code: 'LUG-0001', name: 'Biblioteca', parent: null }],
  loaded: true,
  errorMessage: null,
};

jest.mock('@/components/lugares/edit/useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/hooks/useCatalog', () => ({ useCatalog: () => mockCatalog }));
jest.mock('@/hooks/usePlaces', () => ({ usePlaceList: () => mockPlaces }));
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
    fireEvent.click(screen.getByLabelText('Exportar todas las perspectivas con su punto cardinal, ubicación, rumbo e imagen'));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Excel' }));

    await waitFor(() => expect(exportPlaces).toHaveBeenCalledWith({
      categoryCode: 'EDIFICIO',
      alias: 'biblioteca vieja',
      parentCode: 'LUG-0001',
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
      includePerspectives: true,
    }));
    expect(click).toHaveBeenCalled();
  });
});
