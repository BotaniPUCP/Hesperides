import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpecimenEditModal } from '../SpecimenEditModal';
import { catastroApi } from '@/lib/catastro-api';
import type { SpecimenDetail } from '@shared/types';

jest.mock('@/lib/catastro-api', () => ({
  catastroApi: {
    update: jest.fn(),
  },
}));

const mockCatastroApi = catastroApi as jest.Mocked<typeof catastroApi>;

const EJEMPLO_SPECIMEN: SpecimenDetail = {
  code: 'EV-000001',
  species: {
    slug: 'palmera-real',
    scientificName: 'Roystonea regia',
    commonName: 'Palmera real',
    otherNames: [],
    family: 'Arecaceae',
    vegetationTypeCode: 'PALM',
    vegetationTypeName: 'Palmera',
    specimenCount: 1,
    imageUrl: null,
    imageSource: null,
    photos: [],
    critical: true,
    referenceHeightM: null,
    referenceHeightSourceCode: null,
    referenceHeightSourceName: null,
    referenceCrownRadiusM: null,
    referenceCrownRadiusSourceCode: null,
    referenceCrownRadiusSourceName: null,
    usesTrunkHeight: true,
    usesDbh: true,
    unmeasuredSpecimenCount: 0,
    extraMeasures: [],
  },
  extraMeasures: [],
  measuredAt: '2026-01-01',
  speciesCritical: true,
  measurementStatus: 'MEASURED',
  referenceHeightM: null,
  referenceCrownRadiusM: null,
  referenceHeightSourceName: null,
  referenceCrownRadiusSourceName: null,
  lastPruningDate: null,
  measuredBeforeLastPruning: false,
  pruningAssignment: 'THIRD_PARTY',
  elementTypeCode: 'INDIVIDUAL',
  elementTypeName: 'Ejemplar',
  dataSource: 'MEASURED',
  sourceLocation: 'Campus PUCP',
  sourceReference: 'p01',
  legacyCode: 'LEG-001',
  quantity: 1,
  heightM: 10,
  trunkHeightM: 6,
  dbhCm: 150,
  crownRadiusM: 3.23,
  isBanded: true,
  notes: 'Buen estado general',
  latitude: -12.068,
  longitude: -77.081,
  photoUrl: null,
  imageUrl: null,
  thumbnailUrl: null,
  section: null,
};

describe('SpecimenEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const conTallos: SpecimenDetail = {
    ...EJEMPLO_SPECIMEN,
    species: {
      ...EJEMPLO_SPECIMEN.species,
      extraMeasures: [{ code: 'STEM_COUNT', label: 'Número de tallos', unitCode: 'UNIT', referenceNote: '3 tallos (rango 2–4)' }],
    },
  };

  it('pide las medidas de la especie, con su referencia como ayuda y sin atribuirla', async () => {
    const user = userEvent.setup();
    mockCatastroApi.update.mockResolvedValueOnce({} as never);
    render(<SpecimenEditModal specimen={conTallos} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    const tallos = screen.getByLabelText(/Número de tallos/);
    expect(tallos).toHaveValue('');
    expect(screen.getByText('3 tallos (rango 2–4)')).toBeInTheDocument();

    await user.type(tallos, '3');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    await user.click(await screen.findByRole('button', { name: /Confirmar y guardar/i }));

    await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
    expect(mockCatastroApi.update.mock.calls[0][1].measurement?.extraValues).toEqual([{ code: 'STEM_COUNT', value: 3 }]);
  });

  it('una medida en blanco no se envía', async () => {
    const user = userEvent.setup();
    mockCatastroApi.update.mockResolvedValueOnce({} as never);
    render(<SpecimenEditModal specimen={conTallos} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    await user.click(await screen.findByRole('button', { name: /Confirmar y guardar/i }));

    await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
    expect(mockCatastroApi.update.mock.calls[0][1].measurement?.extraValues).toEqual([]);
  });

  it('un conteo debe ser entero', async () => {
    const user = userEvent.setup();
    render(<SpecimenEditModal specimen={conTallos} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.type(screen.getByLabelText(/Número de tallos/), '2.5');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByText('Número de tallos debe ser un número entero.')).toBeInTheDocument();
    expect(mockCatastroApi.update).not.toHaveBeenCalled();
  });

  it('acepta un DAP de 0, que es una medida real', async () => {
    const user = userEvent.setup();
    render(<SpecimenEditModal specimen={{ ...EJEMPLO_SPECIMEN, dbhCm: 0 }} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    expect(await screen.findByText(/Confirmar nueva medición/i)).toBeInTheDocument();
  });

  it('no pide fuste ni DAP si no aplican a la especie y no hay valor guardado', () => {
    render(
      <SpecimenEditModal
        specimen={{
          ...EJEMPLO_SPECIMEN, trunkHeightM: null, dbhCm: null,
          species: { ...EJEMPLO_SPECIMEN.species, usesTrunkHeight: false, usesDbh: false },
        }}
        isOpen onClose={jest.fn()} onSuccess={jest.fn()}
      />,
    );

    expect(screen.getByLabelText(/Altura total/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Altura del fuste/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/DAP/i)).not.toBeInTheDocument();
  });

  it('no muestra el modal si isOpen es false', () => {
    render(
      <SpecimenEditModal
        specimen={EJEMPLO_SPECIMEN}
        isOpen={false}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre el pop-up de confirmación al hacer clic en Guardar cambios y sólo ejecuta la API tras confirmar', async () => {
    const user = userEvent.setup();
    const handleSuccess = jest.fn();
    const handleClose = jest.fn();
    mockCatastroApi.update.mockResolvedValueOnce({} as any);

    render(
      <SpecimenEditModal
        specimen={EJEMPLO_SPECIMEN}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByText(/Actualizar Medidas · EV-000001/i)).toBeInTheDocument();

    // Hacemos clic en Guardar cambios
    const saveBtn = screen.getByRole('button', { name: /Guardar cambios/i });
    await user.click(saveBtn);

    // Debe mostrar el diálogo de confirmación con el resumen
    expect(await screen.findByText(/Confirmar nueva medición/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Confirmas registrar esta nueva medición para el ejemplar/i)).toBeInTheDocument();
    expect(screen.getByText(/150 cm/i)).toBeInTheDocument(); // DAP en resumen

    // La API aún no debe haber sido llamada antes de confirmar
    expect(mockCatastroApi.update).not.toHaveBeenCalled();

    // Hacemos clic en "Confirmar y guardar"
    const confirmBtn = screen.getByRole('button', { name: /Confirmar y guardar/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockCatastroApi.update).toHaveBeenCalledWith(
        'EV-000001',
        expect.objectContaining({
          measurement: expect.objectContaining({
            heightM: 10,
            trunkHeightM: 6,
            dbhCm: 150,
          }),
        }),
        null
      );
    });

    expect(handleSuccess).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('permite cancelar en la confirmación y volver al formulario sin perder datos', async () => {
    const user = userEvent.setup();
    render(
      <SpecimenEditModal
        specimen={EJEMPLO_SPECIMEN}
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Guardar cambios/i });
    await user.click(saveBtn);

    expect(await screen.findByText(/Confirmar nueva medición/i)).toBeInTheDocument();

    const cancelConfirmBtn = screen.getByRole('button', { name: /Revisar datos/i });
    await user.click(cancelConfirmBtn);

    // Se cerró el diálogo de confirmación pero el modal de edición sigue abierto
    expect(screen.queryByText(/¿Confirmas registrar esta nueva medición/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Actualizar Medidas · EV-000001/i)).toBeInTheDocument();
    expect(mockCatastroApi.update).not.toHaveBeenCalled();
  });
});
