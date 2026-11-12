import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportConfirmationSummary, ImportPreview, ImportResult, SpeciesImportOption } from '@shared/types';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ImportarScreen } from '../importar/ImportarScreen';

const mockUseAuth = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/catastro-api', () => ({
  catastroApi: {
    previewImport: jest.fn(), reanalyzeImport: jest.fn(), speciesImportOptions: jest.fn(),
    confirmationSummary: jest.fn(), confirmImport: jest.fn(), template: jest.fn(), exportSpecimens: jest.fn(),
  },
}));
jest.mock('@/lib/inventario-verde-api', () => ({ inventarioVerdeApi: { registerSpecies: jest.fn() } }));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: (type: string) => ({
    items: type === 'SPECIES_TYPE' ? [{ id: 1, code: 'TREE', label: 'Árbol' }] : [],
    isLoading: false,
    errorMessage: null,
  }),
}));

const api = jest.mocked(catastroApi);
const registerSpecies = jest.mocked(inventarioVerdeApi.registerSpecies);

const VISTA: ImportPreview = {
  batchId: 12,
  kind: 'specimens',
  totalRows: 10,
  toCreate: 5,
  toUpdate: 1,
  unknownSpecies: [{ name: 'Planta inventada', rows: 4, sourceKey: 'planta inventada', reason: 'NOT_FOUND' }],
  duplicates: [{ line: 3, label: 'Roystonea regia', speciesSlug: 'roystonea-regia', duplicateOf: 'EV-000001', distanceM: 0.8 }],
  issues: [],
  decimalComma: false,
  canConfirm: true,
  expiresAt: '2026-10-02T12:00:00',
  planFingerprint: 'preview-fingerprint-12',
  photoSets: [],
};

const RESULTADO: ImportResult = {
  batchId: 12,
  created: 5,
  updated: 1,
  omittedDuplicates: 0,
  unknownSpecies: [{ name: 'Planta inventada', rows: 4 }],
  photoWarnings: [{ line: 4, column: 'foto', message: 'Photo not saved: HTTP 404' }],
  createdCodes: ['EV-000966', 'EV-000970'],
};

function resumenBackend(batchId: number, decisions: Record<number, boolean>): ImportConfirmationSummary {
  const omitidas = Object.values(decisions).filter((include) => !include).length;
  return {
    batchId,
    toCreate: VISTA.toCreate - omitidas,
    toUpdate: VISTA.toUpdate,
    fingerprint: `fingerprint-${batchId}-${JSON.stringify(Object.entries(decisions).sort(([a], [b]) => Number(a) - Number(b)))}`,
  };
}

function pantalla(rol = 'COORDINADOR') {
  mockUseAuth.mockReturnValue({ user: { role: { code: rol } } });
  render(
    <ToastProvider>
      <ImportarScreen />
    </ToastProvider>,
  );
}

async function subirYRevisar() {
  await userEvent.upload(screen.getByLabelText(/^Archivo CSV de/), new File(['a;b'], 'carga.csv', { type: 'text/csv' }));
  await userEvent.click(screen.getByRole('button', { name: 'Revisar archivo' }));
}

describe('ImportarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.confirmationSummary.mockImplementation(async (batchId, decisions) => resumenBackend(batchId, decisions));
  });

  it('el supervisor no puede cargar CSV (CA-02)', () => {
    pantalla('SUPERVISOR');
    expect(screen.queryByLabelText(/^Archivo CSV de/)).not.toBeInTheDocument();
    expect(screen.getByText(/es de administración y coordinación/)).toBeInTheDocument();
  });

  it('no se puede revisar sin archivo', () => {
    pantalla();
    expect(screen.getByRole('button', { name: 'Revisar archivo' })).toBeDisabled();
  });

  it('muestra cifras, especies omitidas con su cantidad y los duplicados', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    pantalla();

    await subirYRevisar();

    expect(await screen.findByText('ejemplares nuevos')).toBeInTheDocument();
    expect(screen.getByText('Planta inventada')).toBeInTheDocument();
    expect(screen.getByText(/4 filas/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'EV-000001' })).toHaveAttribute(
      'href',
      '/catastro/ejemplares/EV-000001',
    );
  });

  it('no confirma hasta decidir cada duplicado, y envía la decisión', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.confirmImport.mockResolvedValue({
      ...RESULTADO, created: 4, omittedDuplicates: 1, createdCodes: ['EV-000966', 'EV-000969'],
    });
    pantalla();
    await subirYRevisar();

    const confirmar = await screen.findByRole('button', { name: 'Confirmar carga' });
    expect(confirmar).toBeDisabled();
    expect(screen.getByText('1 pendiente')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Omitir' }));
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);

    const dialog = await screen.findByRole('dialog', { name: 'Confirmar importación' });
    expect(within(dialog).getByText('Nuevos registros')).toBeInTheDocument();
    expect(within(dialog).getByText('4')).toBeInTheDocument();
    expect(within(dialog).getByText('Actualizaciones')).toBeInTheDocument();
    expect(api.confirmImport).not.toHaveBeenCalled();
    expect(api.confirmationSummary).toHaveBeenCalledWith(12, { 3: false }, VISTA.planFingerprint);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar e importar' }));

    expect(api.confirmImport).toHaveBeenCalledWith(12, { 3: false }, resumenBackend(12, { 3: false }).fingerprint);
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
    expect(screen.getByText(/EV-000966 a EV-000969/)).toBeInTheDocument();
    expect(screen.getByText('Línea 4: La foto no se guardó: Drive respondió con error 404')).toBeInTheDocument();
  });

  it('Volver cierra el resumen y conserva las decisiones de revisión', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('radio', { name: 'Omitir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));

    const dialog = await screen.findByRole('dialog', { name: 'Confirmar importación' });
    expect(within(dialog).getByText('4')).toBeInTheDocument();
    expect(within(dialog).queryByText(/Línea 3|EV-000001|motivo/i)).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Volver' }));

    expect(screen.queryByRole('dialog', { name: 'Confirmar importación' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Omitir' })).toBeChecked();
    expect(api.confirmImport).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('radio', { name: 'Ingresar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    const refreshedDialog = await screen.findByRole('dialog', { name: 'Confirmar importación' });
    expect(within(refreshedDialog).getByText('5')).toBeInTheDocument();
    expect(api.confirmationSummary).toHaveBeenCalledTimes(2);
    expect(api.confirmationSummary).toHaveBeenLastCalledWith(12, { 3: true }, VISTA.planFingerprint);
  });

  it('no solicita dos resúmenes si se pulsa varias veces mientras carga', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    let resolveSummary!: (summary: ImportConfirmationSummary) => void;
    api.confirmationSummary.mockReturnValue(new Promise((resolve) => { resolveSummary = resolve; }));
    pantalla();
    await subirYRevisar();
    const openSummary = screen.getByRole('button', { name: 'Confirmar carga' });

    await userEvent.click(openSummary);
    expect(openSummary).toBeDisabled();
    await userEvent.click(openSummary);
    expect(api.confirmationSummary).toHaveBeenCalledTimes(1);
    expect(api.confirmImport).not.toHaveBeenCalled();

    await act(async () => resolveSummary(resumenBackend(12, {})));
    expect(await screen.findByRole('dialog', { name: 'Confirmar importación' })).toBeInTheDocument();
  });

  it('no abre un resumen si el backend detecta que la vista previa ya cambió', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.confirmationSummary.mockRejectedValue(new ApiError(422, 'This preview changed. Re-analyze the file before confirming'));
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('radio', { name: 'Ingresar' }));

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La vista previa cambió');
    expect(await screen.findByRole('button', { name: 'Actualizar vista previa' })).toBeEnabled();
    expect(screen.queryByRole('dialog', { name: 'Confirmar importación' })).not.toBeInTheDocument();
    expect(api.confirmImport).not.toHaveBeenCalled();
  });

  it('un error de formato bloquea y dice línea, columna y problema en español (CA-04)', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      canConfirm: false,
      issues: [{ line: 2, column: 'latitud', message: 'Required value is empty' }],
    });
    pantalla();
    await subirYRevisar();

    expect(await screen.findByText(/1 error de formato/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'latitud' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Es obligatorio y está vacío' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled();
  });

  it('un archivo ilegible se explica sin salir del paso de subida', async () => {
    api.previewImport.mockRejectedValue(new ApiError(400, 'The separator must be a semicolon (;), not a comma'));
    pantalla();
    await subirYRevisar();

    expect(await screen.findByRole('alert')).toHaveTextContent('El separador debe ser punto y coma (;), no coma');
    expect(screen.getByLabelText(/^Archivo CSV de/)).toBeInTheDocument();
  });

  it('carga bebederos en su estándar, sin cifras de especie', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, kind: 'drinking-fountains', unknownSpecies: [], duplicates: [] });
    pantalla();

    await userEvent.click(screen.getByRole('radio', { name: 'Bebederos' }));
    expect(screen.getByLabelText('Archivo CSV de bebederos')).toBeInTheDocument();
    await subirYRevisar();

    expect(api.previewImport).toHaveBeenCalledWith('drinking-fountains', expect.any(File), null);
    expect(await screen.findByText('bebederos nuevos')).toBeInTheDocument();
    expect(screen.queryByText('filas omitidas por especie')).not.toBeInTheDocument();
  });

  it('un duplicado de tacho se muestra sin enlace al inventario', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA, kind: 'waste-bins', unknownSpecies: [],
      duplicates: [{ line: 2, label: 'Frente a Ciencias', speciesSlug: null, duplicateOf: 'PT_44', distanceM: 0.5 }],
    });
    pantalla();
    await userEvent.click(screen.getByRole('radio', { name: 'Tachos' }));
    await subirYRevisar();

    expect(await screen.findByText('PT_44')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'PT_44' })).not.toBeInTheDocument();
  });

  it('con un archivo elegido, cambiar de estándar pregunta antes de descartarlo', async () => {
    pantalla();
    await userEvent.upload(screen.getByLabelText(/^Archivo CSV de/), new File(['a;b'], 'carga.csv', { type: 'text/csv' }));

    await userEvent.click(screen.getByRole('radio', { name: /Bebederos/ }));

    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
  });

  it('permite abrir el modal de registro de especie desde la lista de especies no registradas', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    pantalla();
    await subirYRevisar();

    expect(await screen.findByText('Planta inventada')).toBeInTheDocument();
    const btnRegistrar = screen.getByRole('button', { name: '+ Registrar nueva especie' });
    expect(btnRegistrar).toBeInTheDocument();

    await userEvent.click(btnRegistrar);
    expect(await screen.findByRole('dialog', { name: 'Registrar nueva especie botánica' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Planta inventada')).toBeInTheDocument();
  });

  it('cancelar el registro nuevo conserva el lote pendiente y no crea la especie', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: '+ Registrar nueva especie' }));
    expect(await screen.findByRole('dialog', { name: 'Registrar nueva especie botánica' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Registrar nueva especie botánica' })).not.toBeInTheDocument();
    expect(screen.getByText('Planta inventada')).toBeInTheDocument();
    expect(api.reanalyzeImport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled();
  });

  it('vincula un grupo desconocido a una especie existente y actualiza la misma vista previa', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.speciesImportOptions.mockResolvedValue([{
      slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle serrano',
      vegetationTypeName: 'Árbol', active: false,
    }]);
    api.reanalyzeImport.mockResolvedValue({
      ...VISTA,
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: false, resolution: 'USER_SELECTED',
      }],
    });
    pantalla();
    await subirYRevisar();

    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    await userEvent.clear(screen.getByLabelText(/Buscar especie para/));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'Schinus');
    const result = await screen.findByRole('option', { name: /Schinus molle/ });
    expect(result).not.toHaveTextContent(/activa|inactiva/i);
    await userEvent.click(result);

    expect(await screen.findByText('Especies que se asociarán a los ejemplares')).toBeInTheDocument();
    expect(screen.getByText('Planta inventada')).toBeInTheDocument();
    expect(screen.queryByText(/inactiva/i)).not.toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenCalledWith(12, expect.any(File), null, {
      'planta inventada': 'schinus-molle',
    });
  });

  it('permite cambiar una asociación existente y después quitarla', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: false, resolution: 'USER_SELECTED',
      }],
    });
    api.speciesImportOptions.mockResolvedValue([{
      slug: 'tipuana-tipu', scientificName: 'Tipuana tipu', commonName: null,
      vegetationTypeName: 'Árbol', active: false,
    }]);
    api.reanalyzeImport
      .mockResolvedValueOnce({
        ...VISTA,
        duplicates: [],
        unknownSpecies: [],
        speciesBindings: [{
          sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
          speciesSlug: 'tipuana-tipu', scientificName: 'Tipuana tipu', active: false, resolution: 'USER_SELECTED',
        }],
      })
      .mockResolvedValueOnce({
        ...VISTA,
        duplicates: [],
        speciesBindings: [],
        unknownSpecies: [{ name: 'Planta inventada', rows: 4, sourceKey: 'planta inventada', reason: 'USER_UNRESOLVED' }],
      });
    pantalla();
    await subirYRevisar();

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar especie' }));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'Tipuana');
    await userEvent.click(await screen.findByRole('option', { name: /Tipuana tipu/ }));
    expect(await screen.findByText('Tipuana tipu')).toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenNthCalledWith(1, 12, expect.any(File), null, {
      'planta inventada': 'tipuana-tipu',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Quitar asociación' }));
    expect(await screen.findByText(/asociación pendiente de seleccionar/i)).toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenNthCalledWith(2, 12, expect.any(File), null, {
      'planta inventada': '',
    });
  });

  it('informa un fallo de búsqueda del catálogo y permite reintentar', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    api.speciesImportOptions
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce([{
        slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle',
        vegetationTypeName: 'Árbol', active: true,
      }]);
    api.reanalyzeImport.mockResolvedValue({ ...VISTA, duplicates: [], unknownSpecies: [] });
    pantalla();
    await subirYRevisar();

    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    await userEvent.clear(screen.getByLabelText(/Buscar especie para/));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'Schinus');
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la búsqueda');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }));
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    expect(await screen.findByRole('option', { name: /Schinus molle/ })).toBeInTheDocument();
  });

  it('distingue una búsqueda sin coincidencias y permite limpiar para buscar otro nombre', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    api.speciesImportOptions.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      slug: 'tipuana-tipu', scientificName: 'Tipuana tipu', commonName: null,
      vegetationTypeName: 'Árbol', active: true,
    }]);
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    const search = screen.getByRole('combobox', { name: /Buscar especie para/ });
    await userEvent.type(search, 'Z');
    expect(await screen.findByText(/Sin coincidencias para «Z»/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.getByRole('combobox', { name: /Buscar especie para/ })).toHaveValue('');
    await userEvent.type(screen.getByRole('combobox', { name: /Buscar especie para/ }), 'T');
    expect(await screen.findByRole('option', { name: /Tipuana tipu/ })).toBeInTheDocument();
    expect(api.speciesImportOptions).toHaveBeenNthCalledWith(1, 'Z');
    expect(api.speciesImportOptions).toHaveBeenNthCalledWith(2, 'T');
  });

  it('conserva la asociación pendiente si falla el reanálisis y permite reintentarla', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    api.speciesImportOptions.mockResolvedValue([{
      slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle',
      vegetationTypeName: 'Árbol', active: false,
    }]);
    api.reanalyzeImport
      .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
      .mockResolvedValueOnce({
        ...VISTA,
        duplicates: [],
        unknownSpecies: [],
        speciesBindings: [{
          sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
          speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: false, resolution: 'USER_SELECTED',
        }],
      });
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'S');
    await userEvent.click(await screen.findByRole('option', { name: /Schinus molle/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: 'Re-analizar cambios' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Re-analizar cambios' }));
    expect(await screen.findByText('Especies que se asociarán a los ejemplares')).toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenCalledTimes(2);
    expect(api.reanalyzeImport).toHaveBeenLastCalledWith(12, expect.any(File), null, {
      'planta inventada': 'schinus-molle',
    });
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeEnabled();
  });

  it('bloquea un segundo clic mientras la confirmación está pendiente', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    let resolveConfirm!: (result: ImportResult) => void;
    api.confirmImport.mockReturnValue(new Promise((resolve) => { resolveConfirm = resolve; }));
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    const confirm = await screen.findByRole('button', { name: 'Confirmar e importar' });

    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(api.confirmImport).toHaveBeenCalledTimes(1);
    expect(api.confirmationSummary).toHaveBeenCalledTimes(1);

    await act(async () => resolveConfirm(RESULTADO));
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
  });

  it('si la confirmación falla por conexión, conserva decisiones y permite repetirla', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.confirmImport.mockRejectedValueOnce(new ApiError(0, 'Sin conexión')).mockResolvedValueOnce(RESULTADO);
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('radio', { name: 'Omitir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar importación' });
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar e importar' });
    await userEvent.click(confirm);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('radio', { name: 'Omitir' })).toBeChecked();
    await userEvent.click(confirm);

    const fingerprint = resumenBackend(12, { 3: false }).fingerprint;
    expect(api.confirmationSummary).toHaveBeenCalledWith(12, { 3: false }, VISTA.planFingerprint);
    expect(api.confirmImport).toHaveBeenNthCalledWith(1, 12, { 3: false }, fingerprint);
    expect(api.confirmImport).toHaveBeenNthCalledWith(2, 12, { 3: false }, fingerprint);
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
  });

  it('permite actualizar el plan obsoleto y vuelve a pedir las decisiones que dependen del plan', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.confirmImport.mockRejectedValueOnce(new ApiError(422, 'A specimen changed after the preview. Re-analyze the file'));
    api.reanalyzeImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('radio', { name: 'Ingresar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar e importar' }));

    expect(await screen.findByRole('button', { name: 'Actualizar vista previa' })).toBeEnabled();
    expect(screen.queryByRole('dialog', { name: 'Confirmar importación' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar vista previa' }));

    expect(await screen.findByText('Especies pendientes de asociación')).toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenCalledWith(12, expect.any(File), null, {});
    expect(screen.queryByText('1 pendiente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeEnabled();
  });

  it('al vencer la vista previa renueva el lote y conserva la asociación de especie', async () => {
    const linkedPreview: ImportPreview = {
      ...VISTA,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: false, resolution: 'USER_SELECTED',
      }],
    };
    api.previewImport.mockResolvedValueOnce({ ...VISTA, duplicates: [] }).mockResolvedValueOnce({
      ...linkedPreview,
      batchId: 13,
    });
    api.speciesImportOptions.mockResolvedValue([{
      slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle',
      vegetationTypeName: 'Árbol', active: false,
    }]);
    api.reanalyzeImport.mockResolvedValue(linkedPreview);
    api.confirmImport.mockRejectedValueOnce(new ApiError(422, 'The preview expired: upload the file again'));
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'S');
    await userEvent.click(await screen.findByRole('option', { name: /Schinus molle/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar e importar' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Crear una vista previa nueva' }));

    expect(await screen.findByText('Especies que se asociarán a los ejemplares')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenNthCalledWith(2, 'specimens', expect.any(File), null, {
      'planta inventada': 'schinus-molle',
    });
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeEnabled();
  });

  it('si vence el lote, crea otra vista previa con la misma asociación y archivo', async () => {
    const linkedPreview: ImportPreview = {
      ...VISTA,
      batchId: 13,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: false, resolution: 'USER_SELECTED',
      }],
    };
    api.previewImport.mockResolvedValueOnce({ ...VISTA, duplicates: [] }).mockResolvedValueOnce(linkedPreview);
    api.speciesImportOptions.mockResolvedValue([{
      slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle',
      vegetationTypeName: 'Árbol', active: false,
    }]);
    api.reanalyzeImport.mockResolvedValue(linkedPreview);
    api.confirmImport.mockRejectedValueOnce(new ApiError(422, 'The preview expired: upload the file again'));
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));
    await userEvent.type(screen.getByLabelText(/Buscar especie para/), 'S');
    await userEvent.click(await screen.findByRole('option', { name: /Schinus molle/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar carga' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar e importar' }));

    expect(await screen.findByRole('button', { name: 'Crear una vista previa nueva' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Crear una vista previa nueva' }));

    expect(await screen.findByText('Especies que se asociarán a los ejemplares')).toBeInTheDocument();
    expect(api.previewImport).toHaveBeenNthCalledWith(2, 'specimens', expect.any(File), null, {
      'planta inventada': 'schinus-molle',
    });
  });

  it('consulta desde la primera letra y descarta respuestas obsoletas', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    let resolveFirst!: (value: SpeciesImportOption[]) => void;
    let resolveSecond!: (value: SpeciesImportOption[]) => void;
    api.speciesImportOptions
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar especie existente' }));

    const search = screen.getByRole('combobox', { name: /Buscar especie para/ });
    await userEvent.type(search, 'F');
    await waitFor(() => expect(api.speciesImportOptions).toHaveBeenCalledTimes(1));
    expect(api.speciesImportOptions).toHaveBeenLastCalledWith('F');

    await userEvent.type(search, 'i');
    await waitFor(() => expect(api.speciesImportOptions).toHaveBeenCalledTimes(2));
    expect(api.speciesImportOptions).toHaveBeenLastCalledWith('Fi');
    expect(screen.getByRole('status')).toHaveTextContent('Buscando en el catálogo');

    await act(async () => {
      resolveSecond([{
        slug: 'ficus-reciente', scientificName: 'Ficus reciente', commonName: 'Ficus nuevo',
        vegetationTypeName: 'Árbol', active: true,
      }]);
    });
    expect(await screen.findByRole('option', { name: /Ficus reciente/ })).toBeInTheDocument();

    await act(async () => {
      resolveFirst([{
        slug: 'ficus-anterior', scientificName: 'Ficus anterior', commonName: null,
        vegetationTypeName: 'Árbol', active: true,
      }]);
    });
    expect(screen.getByRole('option', { name: /Ficus reciente/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Ficus anterior/ })).not.toBeInTheDocument();
  });

  it('si se corrige el nombre al crear una especie, conserva la asociación con el nombre original del CSV', async () => {
    api.previewImport.mockResolvedValue({ ...VISTA, duplicates: [] });
    api.reanalyzeImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'planta-corregida', scientificName: 'Planta corregida', active: true,
        resolution: 'USER_SELECTED',
      }],
    });
    registerSpecies.mockResolvedValue({
      slug: 'planta-corregida', isActive: true, scientificName: 'Planta corregida', commonName: '', otherNames: [],
      family: null, vegetationTypeCode: 'TREE', vegetationTypeName: 'Árbol', originCode: null, originName: null,
      description: null, careNotes: null, specimenCount: 0, imageUrl: null, imageSource: null, photos: [],
      critical: true, referenceHeightM: null, referenceHeightSourceCode: null, referenceHeightSourceName: null,
      referenceCrownRadiusM: null, referenceCrownRadiusSourceCode: null, referenceCrownRadiusSourceName: null,
      usesTrunkHeight: true, usesDbh: true, unmeasuredSpecimenCount: 0, extraMeasures: [],
    });
    pantalla();
    await subirYRevisar();
    await userEvent.click(screen.getByRole('button', { name: '+ Registrar nueva especie' }));
    const scientificName = screen.getByLabelText(/Nombre científico/);
    await userEvent.clear(scientificName);
    await userEvent.type(scientificName, 'Planta corregida');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar especie' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar y registrar' }));

    expect(await screen.findByText('Especies que se asociarán a los ejemplares')).toBeInTheDocument();
    expect(api.reanalyzeImport).toHaveBeenCalledWith(12, expect.any(File), null, {
      'planta inventada': 'planta-corregida',
    });
  });

  it('una asociación pendiente no permite confirmar mientras se reanaliza', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [{
        sourceKey: 'planta inventada', sourceName: 'Planta inventada', rows: 4,
        speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: true, resolution: 'USER_SELECTED',
      }],
    });
    let finishReanalysis!: (value: ImportPreview) => void;
    api.reanalyzeImport.mockReturnValue(new Promise((resolve) => { finishReanalysis = resolve; }));
    pantalla();
    await subirYRevisar();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar asociación' }));
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled();
    expect(api.reanalyzeImport).toHaveBeenCalledWith(12, expect.any(File), null, { 'planta inventada': '' });

    finishReanalysis({
      ...VISTA,
      duplicates: [],
      speciesBindings: [],
      unknownSpecies: [{ name: 'Planta inventada', rows: 4, sourceKey: 'planta inventada', reason: 'USER_UNRESOLVED' }],
    });
    expect(await screen.findByText(/asociación pendiente de seleccionar/i)).toBeInTheDocument();
  });

  it('compacta y busca asociaciones largas sin ocultar grupos no resueltos', async () => {
    const speciesBindings = Array.from({ length: 7 }, (_, index) => ({
      sourceKey: `origen ${index + 1}`,
      sourceName: `Origen ${index + 1}`,
      rows: 1,
      speciesSlug: `especie-${index + 1}`,
      scientificName: `Especie ${index + 1}`,
      active: true,
      resolution: 'SCIENTIFIC_NAME' as const,
    }));
    api.previewImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      speciesBindings,
      unknownSpecies: [{ name: 'Pendiente sin resolver', rows: 1, reason: 'AMBIGUOUS' }],
    });
    pantalla();
    await subirYRevisar();

    const list = screen.getByRole('list', { name: 'Asociaciones de especies' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Ver todas (7)' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Pendiente sin resolver')).toBeInTheDocument();

    const expand = screen.getByRole('button', { name: 'Ver todas (7)' });
    expand.focus();
    await userEvent.keyboard('{Enter}');
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute('aria-expanded', 'true');
    screen.getByRole('button', { name: 'Mostrar menos' }).focus();
    await userEvent.keyboard(' ');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar asociación por nombre de origen o especie' }), 'Origen 7');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Especie 7')).toBeInTheDocument();
    expect(screen.getByText('Pendiente sin resolver')).toBeInTheDocument();
  });

  it('mantiene pendiente un alias ambiguo y solo lo asocia tras una selección explícita por teclado', async () => {
    const alias = 'Alias ambiguo prueba';
    const aliasKey = 'alias ambiguo prueba';
    const schinusBinding = {
      sourceKey: 'schinus molle', sourceName: 'Schinus molle', rows: 1,
      speciesSlug: 'schinus-molle', scientificName: 'Schinus molle', active: true,
      resolution: 'SCIENTIFIC_NAME' as const,
    };
    api.previewImport.mockResolvedValue({
      ...VISTA,
      totalRows: 2,
      toCreate: 2,
      toUpdate: 0,
      duplicates: [],
      unknownSpecies: [{ name: alias, rows: 1, sourceKey: aliasKey, reason: 'AMBIGUOUS' }],
      speciesBindings: [schinusBinding],
    });
    api.speciesImportOptions.mockResolvedValue([
      { slug: 'schinus-molle', scientificName: 'Schinus molle', commonName: 'Molle', vegetationTypeName: 'Árbol', active: true },
      { slug: 'tipuana-tipu', scientificName: 'Tipuana tipu', commonName: 'Tipa', vegetationTypeName: 'Árbol', active: true },
    ]);
    api.reanalyzeImport.mockResolvedValue({
      ...VISTA,
      totalRows: 2,
      toCreate: 2,
      toUpdate: 0,
      duplicates: [],
      unknownSpecies: [],
      speciesBindings: [
        schinusBinding,
        {
          sourceKey: aliasKey, sourceName: alias, rows: 1, speciesSlug: 'tipuana-tipu',
          scientificName: 'Tipuana tipu', active: true, resolution: 'USER_SELECTED',
        },
      ],
    });
    pantalla();
    await subirYRevisar();

    const pending = screen.getByRole('region', { name: /Especies pendientes de asociación/ });
    expect(within(pending).getByText(alias)).toBeInTheDocument();
    expect(within(pending).getByText('Coincidencias ambiguas: selecciona una especie')).toBeInTheDocument();
    const initialBindings = screen.getByRole('list', { name: 'Asociaciones de especies' });
    expect(within(initialBindings).getAllByRole('listitem')).toHaveLength(1);
    expect(within(initialBindings).getByRole('listitem')).toHaveTextContent('Schinus molle');
    expect(within(initialBindings).queryByText(alias)).not.toBeInTheDocument();

    await userEvent.click(within(pending).getByRole('button', { name: 'Seleccionar especie existente' }));
    const search = screen.getByRole('combobox', { name: /Alias ambiguo prueba/ });
    await userEvent.type(search, 'a');
    const schinusOption = await screen.findByRole('option', { name: /Schinus molle/ });
    const tipuanaOption = await screen.findByRole('option', { name: /Tipuana tipu/ });
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(schinusOption).not.toHaveFocus();
    expect(tipuanaOption).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    expect(api.reanalyzeImport).toHaveBeenCalledWith(12, expect.any(File), null, {
      [aliasKey]: 'tipuana-tipu',
    });
    const updatedBindings = screen.getByRole('list', { name: 'Asociaciones de especies' });
    await waitFor(() => expect(within(updatedBindings).getByText(alias)).toBeInTheDocument());
    const aliasBinding = within(updatedBindings).getByText(alias).closest('li');
    expect(aliasBinding).toBeInTheDocument();
    expect(aliasBinding).toHaveTextContent('Tipuana tipu');
    expect(aliasBinding).toHaveTextContent('Selección del usuario');
  });

  it('muestra la especie anterior y la propuesta para una actualización', async () => {
    api.previewImport.mockResolvedValue({
      ...VISTA,
      duplicates: [],
      speciesChanges: [{
        code: 'EV-000001', previousScientificName: 'Roystonea regia', nextScientificName: 'Schinus molle',
      }],
    });
    pantalla();
    await subirYRevisar();

    const changes = screen.getByRole('list', { name: 'Cambios de especie propuestos' });
    expect(within(changes).getByText('EV-000001')).toBeInTheDocument();
    expect(within(changes).getByText('Roystonea regia')).toBeInTheDocument();
    expect(within(changes).getByText('Schinus molle')).toBeInTheDocument();
  });
});

