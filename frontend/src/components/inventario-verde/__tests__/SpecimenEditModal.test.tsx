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
  },
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
