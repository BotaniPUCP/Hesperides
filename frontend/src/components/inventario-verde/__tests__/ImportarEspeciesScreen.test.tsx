import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportPreview, ImportResult } from '@shared/types';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { guardarArchivo } from '@/lib/download';
import { ESTANDAR_ESPECIES } from '@/components/catastro/estandares';
import { ImportarEspeciesScreen } from '../ImportarEspeciesScreen';

const mockUseAuth = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/catastro-api', () => ({
  catastroApi: {
    previewImport: jest.fn(),
    confirmImport: jest.fn(),
    template: jest.fn(),
    exportSpecimens: jest.fn(),
    exportSpecies: jest.fn(),
  },
}));
jest.mock('@/lib/download', () => ({ guardarArchivo: jest.fn() }));

const api = jest.mocked(catastroApi);

const VISTA_ESPECIES: ImportPreview = {
  batchId: 44,
  kind: 'species',
  totalRows: 3,
  toCreate: 2,
  toUpdate: 1,
  unknownSpecies: [],
  duplicates: [],
  issues: [],
  decimalComma: false,
  canConfirm: true,
  expiresAt: '2026-10-02T12:00:00',
  photoSets: [],
};

const RESULTADO_ESPECIES: ImportResult = {
  batchId: 44,
  created: 2,
  updated: 1,
  omittedDuplicates: 0,
  unknownSpecies: [],
  photoWarnings: [],
  createdCodes: ['tabebuia-rosea', 'plumbago-auriculata'],
};

function pantalla(rol = 'COORDINADOR') {
  mockUseAuth.mockReturnValue({ user: { role: { code: rol } } });
  render(
    <ToastProvider>
      <ImportarEspeciesScreen />
    </ToastProvider>,
  );
}

describe('ImportarEspeciesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('las columnas de ESTANDAR_ESPECIES coinciden con la plantilla especies.csv en orden', () => {
    const plantilla = readFileSync(
      join(__dirname, '../../../../../docs/estandares/plantillas', ESTANDAR_ESPECIES.archivo),
      'utf8',
    ).replace(/^\uFEFF/, '');
    const cabecera = plantilla.split(/\r?\n/)[0].split(';');
    expect(ESTANDAR_ESPECIES.grupos.flatMap((g) => g.columnas.map((c) => c.nombre))).toEqual(cabecera);
  });

  it('el supervisor no puede usar la carga masiva de especies', () => {
    pantalla('SUPERVISOR');
    expect(screen.queryByLabelText('Archivo CSV de especies')).not.toBeInTheDocument();
    expect(screen.getByText(/es de administración y coordinación/)).toBeInTheDocument();
  });

  it('descarga la plantilla y exporta el catálogo de especies', async () => {
    const blob = new Blob(['x']);
    api.template.mockResolvedValue(blob);
    api.exportSpecies.mockResolvedValue(blob);
    pantalla('ADMIN');

    await userEvent.click(screen.getByRole('button', { name: 'Plantilla de especies' }));
    expect(api.template).toHaveBeenCalledWith('species');
    expect(guardarArchivo).toHaveBeenCalledWith(blob, 'plantilla-especies.csv');

    await userEvent.click(screen.getByRole('button', { name: 'Exportar especies' }));
    expect(api.exportSpecies).toHaveBeenCalled();
    expect(guardarArchivo).toHaveBeenCalledWith(blob, 'especies.csv');
  });

  it('previsualiza y confirma la importación masiva de especies', async () => {
    api.previewImport.mockResolvedValue(VISTA_ESPECIES);
    api.confirmImport.mockResolvedValue(RESULTADO_ESPECIES);
    pantalla('COORDINADOR');

    await userEvent.upload(
      screen.getByLabelText('Archivo CSV de especies'),
      new File(['nombre_cientifico\nTabebuia rosea'], 'especies.csv', { type: 'text/csv' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(api.previewImport).toHaveBeenCalledWith('species', expect.any(File), null);
    expect(await screen.findByText('especies nuevas')).toBeInTheDocument();
    expect(screen.getByText('especies a actualizar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    expect(api.confirmImport).toHaveBeenCalledWith(44, {});
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
    expect(screen.getByText('especies actualizadas')).toBeInTheDocument();
  });

  it('informa y omite las filas de especies inactivas sin editar ni reactivar', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA_ESPECIES,
      totalRows: 1,
      toCreate: 0,
      toUpdate: 0,
      skippedInactiveSpecies: [{ line: 2, scientificName: 'Schinus molle' }],
    });
    api.confirmImport.mockResolvedValue({
      ...RESULTADO_ESPECIES,
      created: 0,
      updated: 0,
      createdCodes: [],
      omittedInactiveSpecies: 1,
    });
    pantalla('ADMIN');

    await userEvent.upload(
      screen.getByLabelText('Archivo CSV de especies'),
      new File(['nombre_cientifico;nombre_comun\nSchinus molle;Nombre cambiado'], 'especies.csv', { type: 'text/csv' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByRole('status', { name: 'Especies inactivas omitidas' }))
      .toHaveTextContent('Las especies inactivas no se editarán ni reactivarán');
    expect(screen.getByText('Schinus molle')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    expect(await screen.findByText(/filas de especies inactivas omitidas/)).toBeInTheDocument();
    expect(api.confirmImport).toHaveBeenCalledWith(44, {});
  });

  it('permite reintentar la confirmación de especies tras un error de conexión', async () => {
    api.previewImport.mockResolvedValue(VISTA_ESPECIES);
    api.confirmImport.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce(RESULTADO_ESPECIES);
    pantalla('ADMIN');

    await userEvent.upload(
      screen.getByLabelText('Archivo CSV de especies'),
      new File(['nombre_cientifico\nTabebuia rosea'], 'especies.csv', { type: 'text/csv' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar carga' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    expect(api.confirmImport).toHaveBeenCalledTimes(2);
    expect(api.confirmImport).toHaveBeenNthCalledWith(1, 44, {});
    expect(api.confirmImport).toHaveBeenNthCalledWith(2, 44, {});
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
  });

  it('permite actualizar una vista previa de especies obsoleta sin volver a elegir el archivo', async () => {
    api.previewImport.mockResolvedValueOnce(VISTA_ESPECIES).mockResolvedValueOnce({
      ...VISTA_ESPECIES,
      batchId: 45,
    });
    api.confirmImport.mockRejectedValueOnce(new ApiError(422, 'A species changed after the preview. Re-analyze the file'));
    pantalla('ADMIN');
    await userEvent.upload(
      screen.getByLabelText('Archivo CSV de especies'),
      new File(['nombre_cientifico\nTabebuia rosea'], 'especies.csv', { type: 'text/csv' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar carga' }));
    expect(await screen.findByRole('button', { name: 'Actualizar vista previa' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar vista previa' }));

    expect(await screen.findByText('especies nuevas')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledTimes(2);
    expect(api.previewImport.mock.calls[1][1].name).toBe('especies.csv');
  });

  it('muestra los errores de validación por fila y columna e impide confirmar', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA_ESPECIES,
      canConfirm: false,
      decimalComma: true,
      issues: [
        { line: 2, column: 'nombre_cientifico', message: 'Species «Tabebuia rosea» is repeated in the file' },
        { line: 3, column: 'tipo_vegetacion', message: '«Helecho» is not a valid value. Use: Árbol, Arbusto' },
        { line: 4, column: 'altura_promedio_m', message: 'Una especie no crítica necesita altura y radio de copa promedio' },
      ],
    });
    pantalla('ADMIN');

    await userEvent.upload(
      screen.getByLabelText('Archivo CSV de especies'),
      new File(['nombre_cientifico\nTabebuia rosea'], 'especies.csv', { type: 'text/csv' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText(/3 errores de formato/)).toBeInTheDocument();
    expect(screen.getByText('La especie «Tabebuia rosea» está repetida en el archivo')).toBeInTheDocument();
    expect(screen.getByText('«Helecho» no es un valor válido. Usa: Árbol, Arbusto')).toBeInTheDocument();
    expect(screen.getByText('Una especie no crítica necesita altura y radio de copa promedio')).toBeInTheDocument();
    expect(screen.getByText(/El archivo usa coma decimal/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled();
  });

  it('mantiene el archivo elegido si falla la vista previa y deja volver a intentarlo', async () => {
    api.previewImport.mockRejectedValueOnce(new ApiError(0, 'Sin conexión')).mockResolvedValueOnce(VISTA_ESPECIES);
    pantalla('ADMIN');
    const file = new File(['nombre_cientifico\nTabebuia rosea'], 'especies.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('Archivo CSV de especies'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/especies\.csv/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));

    expect(await screen.findByText('especies nuevas')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenCalledTimes(2);
  });
});
