import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DirectoryImportPlan } from '@shared/types';
import { ApiError } from '@/lib/api';
import { directoryApi } from '@/lib/directory-api';
import { RegistroMasivoScreen } from '../RegistroMasivoScreen';

const mockRole = { current: 'COORDINADOR' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/download', () => ({ guardarArchivo: jest.fn() }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { importTemplate: jest.fn(), previewImport: jest.fn(), confirmImport: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const csv = () => new File(['nombre;tipo;ruc;telefono;otros_nombres\nOIE;Unidad PUCP;;;\n'], 'orgs.csv', { type: 'text/csv' });

const plan = (overrides: Partial<DirectoryImportPlan> = {}): DirectoryImportPlan => ({
  kind: 'organizaciones', creates: 1, skips: 1, errors: 0,
  rows: [
    { line: 2, name: 'OIE', action: 'CREATE', issues: [] },
    { line: 3, name: 'DAF', action: 'SKIP', issues: [] },
  ],
  ...overrides,
});

function chooseFile() {
  fireEvent.change(screen.getByLabelText('Archivo CSV'), { target: { files: [csv()] } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

describe('RegistroMasivoScreen', () => {
  it('revisa el archivo, muestra qué pasará con cada fila y confirma', async () => {
    api.previewImport.mockResolvedValue(plan());
    api.confirmImport.mockResolvedValue({ created: 1, skipped: 1 });
    render(<RegistroMasivoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Organizaciones/ }));
    chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText('Se crea')).toBeInTheDocument();
    expect(screen.getByText('Ya existe, se omite')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }));

    expect(await screen.findByText(/Se registraron 1 y se omitieron 1/)).toBeInTheDocument();
    expect(api.confirmImport).toHaveBeenCalledWith('organizaciones', expect.any(File));
  });

  it('con filas con error no se puede confirmar y se ve el motivo en español', async () => {
    api.previewImport.mockResolvedValue(plan({
      creates: 0, skips: 0, errors: 1,
      rows: [{ line: 2, name: 'Jardines SAC', action: 'ERROR',
        issues: [{ line: 2, column: 'ruc', code: 'RUC_FORMAT', detail: '123' }] }],
    }));
    render(<RegistroMasivoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Organizaciones/ }));
    chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText('El RUC debe tener 11 dígitos y empezar con 10 o 20.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar registro' })).toBeDisabled();
  });

  it('un archivo sin las columnas de la plantilla muestra el error traducido', async () => {
    api.previewImport.mockRejectedValue(new ApiError(400, 'The file is missing the columns: tipo', null));
    render(<RegistroMasivoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Contactos/ }));
    chooseFile();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText(/Al archivo le faltan las columnas: tipo/)).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('contactos', expect.any(File));
  });

  it('descarga la plantilla del tipo elegido', async () => {
    api.importTemplate.mockResolvedValue(new Blob(['x']));
    render(<RegistroMasivoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Contactos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar plantilla' }));

    await waitFor(() => expect(api.importTemplate).toHaveBeenCalledWith('contactos'));
  });

  it('el capataz no registra', () => {
    mockRole.current = 'SUPERVISOR';
    render(<RegistroMasivoScreen />);

    expect(screen.getByText(/solo coordinación/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo CSV')).not.toBeInTheDocument();
  });
});
