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
  id: 1,
  code: 'EV-000001',
  species: {
    slug: 'palmera-real',
    isActive: true,
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

    await user.clear(screen.getByLabelText(/Altura total/i));
    await user.type(screen.getByLabelText(/Altura total/i), '12');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    await user.click(await screen.findByRole('button', { name: /Confirmar y guardar/i }));

    await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
    expect(mockCatastroApi.update.mock.calls[0][1].measurement?.extraValues).toEqual([]);
  });

  describe('cuándo se registra una medición', () => {
    const guardarYConfirmar = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));
      await user.click(await screen.findByRole('button', { name: /Confirmar y guardar/i }));
      await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
      return mockCatastroApi.update.mock.calls[0][1];
    };
    const verificacion = () => screen.queryByRole('checkbox', { name: /Verifiqué en campo/i });

    beforeEach(() => mockCatastroApi.update.mockResolvedValue({} as never));

    it('corregir solo una nota no crea una medición', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.type(screen.getByLabelText(/observaciones|notas/i), ' revisado');
      await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

      expect(await screen.findByText('Confirmar cambios')).toBeInTheDocument();
      expect(screen.getByText(/no se registra una medición nueva/i)).toBeInTheDocument();
      expect(screen.queryByText(/Confirmar nueva medición/i)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Confirmar y guardar/i }));
      await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
      expect(mockCatastroApi.update.mock.calls[0][1]).toEqual(expect.objectContaining({
        measurement: null,
        notes: 'Buen estado general revisado',
      }));
    });

    it('escribir el mismo número con otro formato no es un cambio', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.clear(screen.getByLabelText(/Altura total/i));
      await user.type(screen.getByLabelText(/Altura total/i), '10.0');

      expect((await guardarYConfirmar(user)).measurement).toBeNull();
    });

    it('cambiar solo la fecha no crea una medición', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.clear(screen.getByLabelText(/Fecha de la medición/i));
      await user.type(screen.getByLabelText(/Fecha de la medición/i), '2026-01-02');

      expect((await guardarYConfirmar(user)).measurement).toBeNull();
    });

    it.each([
      ['la altura', /Altura total/i, '12'],
      ['el fuste', /Altura del fuste/i, '7'],
      ['el DAP', /DAP/i, '151'],
      ['el radio de copa', /Radio de copa/i, '4'],
    ])('cambiar %s crea una medición', async (_campo, etiqueta, valor) => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.clear(screen.getByLabelText(etiqueta));
      await user.type(screen.getByLabelText(etiqueta), valor);

      expect((await guardarYConfirmar(user)).measurement).not.toBeNull();
    });

    it('cambiar el zunchado crea una medición', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.selectOptions(screen.getByLabelText(/Zunchado/i), 'no');

      expect((await guardarYConfirmar(user)).measurement).toEqual(expect.objectContaining({ banded: false }));
    });

    it('borrar un valor crea una medición sin ese valor', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.clear(screen.getByLabelText(/Radio de copa/i));

      expect((await guardarYConfirmar(user)).measurement).toEqual(expect.objectContaining({ crownRadiusM: null, heightM: 10 }));
    });

    it('verificar en campo registra los mismos valores con la fecha indicada', async () => {
      const user = userEvent.setup();
      render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

      await user.click(screen.getByRole('checkbox', { name: /Verifiqué en campo/i }));
      await user.clear(screen.getByLabelText(/Fecha de la medición/i));
      await user.type(screen.getByLabelText(/Fecha de la medición/i), '2026-01-02');
      await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));

      expect(await screen.findByText(/Confirmar nueva medición/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Confirmar y guardar/i }));
      await waitFor(() => expect(mockCatastroApi.update).toHaveBeenCalled());
      expect(mockCatastroApi.update.mock.calls[0][1].measurement).toEqual(expect.objectContaining({
        date: '2026-01-02', heightM: 10, trunkHeightM: 6, dbhCm: 150, crownRadiusM: 3.23,
      }));
    });

    it('la verificación solo se ofrece si hay medidas y no cambiaron', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);
      expect(verificacion()).toBeInTheDocument();

      await user.clear(screen.getByLabelText(/Altura total/i));
      await user.type(screen.getByLabelText(/Altura total/i), '12');
      expect(verificacion()).not.toBeInTheDocument();
      unmount();

      render(
        <SpecimenEditModal
          specimen={{ ...EJEMPLO_SPECIMEN, measurementStatus: 'NOT_MEASURED', dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null, isBanded: null }}
          isOpen onClose={jest.fn()} onSuccess={jest.fn()}
        />,
      );
      expect(verificacion()).not.toBeInTheDocument();
    });

    it('un ejemplar sin medir no crea una medición si no se escribe nada', async () => {
      const user = userEvent.setup();
      render(
        <SpecimenEditModal
          specimen={{ ...EJEMPLO_SPECIMEN, measurementStatus: 'NOT_MEASURED', dataSource: 'UNKNOWN', heightM: null, trunkHeightM: null, dbhCm: null, crownRadiusM: null, isBanded: null }}
          isOpen onClose={jest.fn()} onSuccess={jest.fn()}
        />,
      );

      expect((await guardarYConfirmar(user)).measurement).toBeNull();
    });
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
    render(<SpecimenEditModal specimen={EJEMPLO_SPECIMEN} isOpen onClose={jest.fn()} onSuccess={jest.fn()} />);

    await user.clear(screen.getByLabelText(/DAP/i));
    await user.type(screen.getByLabelText(/DAP/i), '0');
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

    await user.clear(screen.getByLabelText(/Altura total/i));
    await user.type(screen.getByLabelText(/Altura total/i), '12');

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
            heightM: 12,
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

    await user.clear(screen.getByLabelText(/Altura total/i));
    await user.type(screen.getByLabelText(/Altura total/i), '12');
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
