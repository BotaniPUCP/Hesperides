import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { placesApi } from '@/lib/places-api';
import { PlaceWorkbookImportScreen } from '../PlaceWorkbookImportScreen';

jest.mock('@/components/lugares/edit/useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/lib/places-api', () => ({
  placesApi: {
    placeImportTemplate: jest.fn(),
    previewPlaceImport: jest.fn(),
    importPlaces: jest.fn(),
  },
}));

describe('PlaceWorkbookImportScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revisa el .xlsx antes de habilitar la importación', async () => {
    const file = new File(['workbook'], 'lugares.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    (placesApi.previewPlaceImport as jest.Mock).mockResolvedValue({ rows: 2, canImport: true, errors: [], locationConflicts: [] });
    (placesApi.importPlaces as jest.Mock).mockResolvedValue({
      imported: 2, places: [{ code: 'LUG-0001', name: 'Biblioteca', replaced: false }],
    });
    render(<PlaceWorkbookImportScreen />);

    fireEvent.change(screen.getByLabelText('Archivo Excel (.xlsx)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    await screen.findByText('Validación correcta: 2 lugares listos para importar.');
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 lugares' }));

    await waitFor(() => expect(placesApi.importPlaces).toHaveBeenCalledWith(file, []));
    expect(await screen.findByText('Se importaron 2 lugares.')).toBeInTheDocument();
  });

  it('exige elegir el lugar existente por ubicación y permite consultar su ficha de solo lectura', async () => {
    const file = new File(['workbook'], 'lugares.xlsx');
    (placesApi.previewPlaceImport as jest.Mock).mockResolvedValue({
      rows: 1,
      canImport: true,
      errors: [],
      locationConflicts: [{
        row: 2, lat: -12.06, lon: -77.08,
        places: [
          { code: 'LUG-0001', name: 'Biblioteca antigua' },
          { code: 'LUG-0002', name: 'Biblioteca anexo' },
        ],
      }],
    });
    (placesApi.importPlaces as jest.Mock).mockResolvedValue({
      imported: 1, places: [{ code: 'LUG-0002', name: 'Biblioteca', replaced: true }],
    });
    render(<PlaceWorkbookImportScreen />);

    fireEvent.change(screen.getByLabelText('Archivo Excel (.xlsx)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    const importButton = await screen.findByRole('button', { name: 'Importar y sobrescribir un lugar' });
    expect(importButton).toBeDisabled();
    expect(screen.getAllByRole('link', { name: 'Detalle' })[0]).toHaveAttribute(
      'href',
      '/lugares/LUG-0001?soloLectura=1',
    );

    fireEvent.click(screen.getByLabelText('Sobrescribir Biblioteca anexo (LUG-0002)'));
    expect(importButton).toBeEnabled();
    fireEvent.click(importButton);

    await waitFor(() => expect(placesApi.importPlaces).toHaveBeenCalledWith(file, [{ row: 2, placeCode: 'LUG-0002' }]));
    expect(await screen.findByText(/sobrescrito/)).toBeInTheDocument();
  });

  it('no permite seleccionar el mismo lugar para sobrescribir dos filas', async () => {
    const file = new File(['workbook'], 'lugares.xlsx');
    (placesApi.previewPlaceImport as jest.Mock).mockResolvedValue({
      rows: 2,
      canImport: true,
      errors: [],
      locationConflicts: [
        { row: 2, lat: -12.06, lon: -77.08, places: [{ code: 'LUG-0001', name: 'Biblioteca' }] },
        { row: 3, lat: -12.07, lon: -77.09, places: [{ code: 'LUG-0001', name: 'Biblioteca' }] },
      ],
    });
    render(<PlaceWorkbookImportScreen />);

    fireEvent.change(screen.getByLabelText('Archivo Excel (.xlsx)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
    const choices = await screen.findAllByLabelText('Sobrescribir Biblioteca (LUG-0001)');
    fireEvent.click(choices[0]);

    expect(screen.getByLabelText(/Sobrescribir Biblioteca.*ya elegido en otra fila/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Importar y sobrescribir 2 lugares' })).toBeDisabled();
  });

  it('cancelar una importación con coincidencias no envía el archivo', async () => {
    const file = new File(['workbook'], 'lugares.xlsx');
    (placesApi.previewPlaceImport as jest.Mock).mockResolvedValue({
      rows: 1,
      canImport: true,
      errors: [],
      locationConflicts: [{
        row: 2, lat: -12.06, lon: -77.08, places: [{ code: 'LUG-0001', name: 'Biblioteca' }],
      }],
    });
    render(<PlaceWorkbookImportScreen />);

    fireEvent.change(screen.getByLabelText('Archivo Excel (.xlsx)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar importación' }));

    expect(await screen.findByText('Importación cancelada. No se guardó ningún lugar.')).toBeInTheDocument();
    expect(placesApi.importPlaces).not.toHaveBeenCalled();
  });

  it('no permite importar con errores y ofrece descargar el reporte', async () => {
    const file = new File(['workbook'], 'lugares.xlsx');
    (placesApi.previewPlaceImport as jest.Mock).mockResolvedValue({
      rows: 1,
      canImport: false,
      errors: [{ row: 2, column: 'Nombre', value: '', message: 'Ingresa el nombre del lugar.' }],
    });
    render(<PlaceWorkbookImportScreen />);

    fireEvent.change(screen.getByLabelText('Archivo Excel (.xlsx)'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText('Ingresa el nombre del lugar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar errores CSV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Importar/ })).not.toBeInTheDocument();
    expect(placesApi.importPlaces).not.toHaveBeenCalled();
  });
});
