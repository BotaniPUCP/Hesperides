import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DirectoryImportPlan } from '@shared/types';
import { ApiError } from '@/lib/api';
import { directoryApi } from '@/lib/directory-api';
import { guardarArchivo } from '@/lib/download';
import { RegistroMasivoScreen } from '../RegistroMasivoScreen';

const mockRole = { current: 'COORDINADOR' };
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/lib/download', () => ({ guardarArchivo: jest.fn() }));
jest.mock('@/lib/directory-api', () => ({
  ...jest.requireActual('@/lib/directory-api'),
  directoryApi: { importTemplate: jest.fn(), previewImport: jest.fn(), confirmImport: jest.fn() },
}));

const api = directoryApi as jest.Mocked<typeof directoryApi>;
const csv = () => new File(['nombre;tipo;ruc;telefono;otros_nombres\nOIE;Unidad PUCP;;;\n'], 'orgs.csv', { type: 'text/csv' });

const plan = (overrides: Partial<DirectoryImportPlan> = {}): DirectoryImportPlan => ({
  batchId: 7, kind: 'organizations', totalRows: 2, toCreate: 1, toSkip: 1, toOmit: 0, errors: 0,
  rows: [
    { line: 2, name: 'OIE', action: 'CREATE', issues: [], missing: [] },
    { line: 3, name: 'DAF', action: 'SKIP', issues: [], missing: [] },
  ],
  missingOrganizations: [], canConfirm: true, expiresAt: '2026-11-08T17:00:00',
  ...overrides,
});

function review(kind: RegExp) {
  fireEvent.click(screen.getByRole('radio', { name: kind }));
  fireEvent.change(screen.getByLabelText('Archivo CSV'), { target: { files: [csv()] } });
  fireEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'COORDINADOR';
});

describe('RegistroMasivoScreen', () => {
  it('revisa el archivo, muestra qué pasará con cada fila y confirma el lote revisado', async () => {
    api.previewImport.mockResolvedValue(plan());
    api.confirmImport.mockResolvedValue({
      batchId: 7, created: 1, skipped: 1, omitted: 0, missingOrganizations: [], createdCodes: ['ORG-0001'],
    });
    render(<RegistroMasivoScreen />);

    review(/Organizaciones/);

    expect(await screen.findByText('Se crea')).toBeInTheDocument();
    expect(screen.getByText('Ya existe, se omite')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }));

    expect(await screen.findByText(/Se registraron 1; 1 ya existían/)).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('organizations', expect.any(File));
    expect(api.confirmImport).toHaveBeenCalledWith(7);
  });

  it('con filas con error no se puede confirmar, se ve el motivo en español y se pueden copiar', async () => {
    api.previewImport.mockResolvedValue(plan({
      toCreate: 0, toSkip: 0, errors: 1, canConfirm: false,
      rows: [{ line: 2, name: 'Jardines SAC', action: 'ERROR', missing: [],
        issues: [{ line: 2, column: 'ruc', code: 'RUC_FORMAT', detail: '123' }] }],
    }));
    render(<RegistroMasivoScreen />);

    review(/Organizaciones/);

    expect(await screen.findByText('El RUC debe tener 11 dígitos y empezar con 10 o 20.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar registro' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copiar lista de errores' })).toBeInTheDocument();
  });

  it('un contacto con una organización que falta se omite, se cuenta y no bloquea el archivo', async () => {
    api.previewImport.mockResolvedValue(plan({
      kind: 'contacts', toCreate: 1, toSkip: 0, toOmit: 1,
      rows: [
        { line: 2, name: 'Ana Torres', action: 'OMIT', issues: [], missing: ['Facultad Inexistente'] },
        { line: 3, name: 'Luis Ramos', action: 'CREATE', issues: [], missing: [] },
      ],
      missingOrganizations: [{ name: 'Facultad Inexistente', rows: 1 }],
    }));
    render(<RegistroMasivoScreen />);

    review(/Contactos/);

    expect(await screen.findByText('Se omite: falta su organización')).toBeInTheDocument();
    expect(screen.getByText('«Facultad Inexistente» no está en el Directorio.')).toBeInTheDocument();
    expect(screen.getByText('«Facultad Inexistente»: 1 fila')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar registro' })).toBeEnabled();
  });

  it('un archivo sin las columnas de la plantilla muestra el error traducido', async () => {
    api.previewImport.mockRejectedValue(new ApiError(400, 'The file is missing the columns: tipo', null));
    render(<RegistroMasivoScreen />);

    review(/Contactos/);

    expect(await screen.findByText(/Al archivo le faltan las columnas: tipo/)).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledWith('contacts', expect.any(File));
  });

  it('una columna desconocida muestra el error traducido', async () => {
    api.previewImport.mockRejectedValue(new ApiError(400,
      'The file has unknown columns: razon_social. Check the spelling against the standard', null));
    render(<RegistroMasivoScreen />);

    review(/Organizaciones/);

    expect(await screen.findByText(/columnas que no son del estándar: razon_social/)).toBeInTheDocument();
  });

  it('una revisión vencida pide volver a subir el archivo', async () => {
    api.previewImport.mockResolvedValue(plan());
    api.confirmImport.mockRejectedValue(new ApiError(422, 'The preview expired: upload the file again', null));
    render(<RegistroMasivoScreen />);

    review(/Organizaciones/);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar registro' }));

    expect(await screen.findByText(/La vista previa venció/)).toBeInTheDocument();
  });

  it('cambiar de tipo con una revisión pendiente pide confirmar', async () => {
    api.previewImport.mockResolvedValue(plan());
    render(<RegistroMasivoScreen />);

    review(/Organizaciones/);
    await screen.findByText('Se crea');
    fireEvent.click(screen.getByRole('radio', { name: /Contactos/ }));

    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
  });

  it('descarga la plantilla del tipo elegido con el nombre del estándar', async () => {
    const blob = new Blob(['x']);
    api.importTemplate.mockResolvedValue(blob);
    render(<RegistroMasivoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Contactos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar plantilla' }));

    await waitFor(() => expect(guardarArchivo).toHaveBeenCalledWith(blob, 'contactos.csv'));
    expect(api.importTemplate).toHaveBeenCalledWith('contacts');
  });

  it('el capataz no registra', () => {
    mockRole.current = 'SUPERVISOR';
    render(<RegistroMasivoScreen />);

    expect(screen.getByText(/solo coordinación/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo CSV')).not.toBeInTheDocument();
  });
});
