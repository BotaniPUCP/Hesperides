import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ImportPreview, ImportResult } from '@shared/types';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { ImportarScreen } from '../importar/ImportarScreen';

const mockUseAuth = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
jest.mock('@/lib/catastro-api', () => ({
  catastroApi: { previewImport: jest.fn(), confirmImport: jest.fn(), template: jest.fn(), exportSpecimens: jest.fn() },
}));

const api = jest.mocked(catastroApi);

const VISTA: ImportPreview = {
  batchId: 12,
  kind: 'specimens',
  totalRows: 10,
  toCreate: 5,
  toUpdate: 1,
  unknownSpecies: [{ name: 'Planta inventada', rows: 4 }],
  duplicates: [{ line: 3, label: 'Roystonea regia', speciesSlug: 'roystonea-regia', duplicateOf: 'EV-000001', distanceM: 0.8 }],
  issues: [],
  decimalComma: false,
  canConfirm: true,
  expiresAt: '2026-10-02T12:00:00',
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
  beforeEach(() => jest.clearAllMocks());

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
      '/inventario-verde/especies/roystonea-regia/ejemplares/EV-000001',
    );
  });

  it('no confirma hasta decidir cada duplicado, y envía la decisión', async () => {
    api.previewImport.mockResolvedValue(VISTA);
    api.confirmImport.mockResolvedValue(RESULTADO);
    pantalla();
    await subirYRevisar();

    const confirmar = await screen.findByRole('button', { name: 'Confirmar carga' });
    expect(confirmar).toBeDisabled();
    expect(screen.getByText('Falta decidir 1 posible duplicado.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Omitir' }));
    await userEvent.click(confirmar);

    expect(api.confirmImport).toHaveBeenCalledWith(12, { 3: false });
    expect(await screen.findByText('Carga confirmada')).toBeInTheDocument();
    expect(screen.getByText(/EV-000966 a EV-000970/)).toBeInTheDocument();
    expect(screen.getByText('Línea 4: La foto no se guardó: Drive respondió con error 404')).toBeInTheDocument();
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
});

