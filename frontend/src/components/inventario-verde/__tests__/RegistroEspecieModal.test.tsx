import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { RegistroEspecieModal } from '../RegistroEspecieModal';

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    registerSpecies: jest.fn(),
  },
}));

jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: (type: string) => {
    if (type === 'SPECIES_TYPE') {
      return {
        items: [
          { id: 1, code: 'TREE', label: 'Árbol' },
          { id: 2, code: 'SHRUB', label: 'Arbusto' },
        ],
        isLoading: false,
        errorMessage: null,
      };
    }
    if (type === 'SPECIES_ORIGIN') {
      return {
        items: [
          { id: 10, code: 'INTRODUCED', label: 'Introducida' },
          { id: 11, code: 'NATIVE', label: 'Nativa' },
        ],
        isLoading: false,
        errorMessage: null,
      };
    }
    return { items: [], isLoading: false, errorMessage: null };
  },
}));

describe('RegistroEspecieModal', () => {
  const onCreated = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no muestra el contenido si isOpen es false', () => {
    render(
      <RegistroEspecieModal
        isOpen={false}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
    expect(screen.queryByText('Registrar nueva especie botánica')).not.toBeInTheDocument();
  });

  it('muestra el modal y valida nombre científico obligatorio', async () => {
    render(
      <RegistroEspecieModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
      />
    );

    expect(screen.getByText('Registrar nueva especie botánica')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Guardar especie' });
    await userEvent.click(submitBtn);

    expect(screen.getByText('El nombre científico es obligatorio')).toBeInTheDocument();
    expect(inventarioVerdeApi.registerSpecies).not.toHaveBeenCalled();
  });

  it('guarda exitosamente una nueva especie y notifica al padre', async () => {
    const mockNuevaEspecie = {
      slug: 'ginkgo-biloba',
      scientificName: 'Ginkgo biloba',
      commonName: 'Árbol de los 40 escudos',
      otherNames: [],
      family: 'Ginkgoaceae',
      vegetationTypeCode: 'TREE',
      vegetationTypeName: 'Árbol',
      specimenCount: 0,
      imageUrl: null,
      imageSource: null,
      photos: [],
    };

    jest.mocked(inventarioVerdeApi.registerSpecies).mockResolvedValue(mockNuevaEspecie);

    render(
      <RegistroEspecieModal
        isOpen={true}
        onClose={onClose}
        initialScientificName="Ginkgo biloba"
        onCreated={onCreated}
      />
    );

    expect(screen.getByLabelText(/Nombre científico/)).toHaveValue('Ginkgo biloba');

    await userEvent.type(screen.getByLabelText(/Nombre común/), 'Árbol de los 40 escudos');
    await userEvent.type(screen.getByLabelText(/Familia botánica/), 'Ginkgoaceae');

    const submitBtn = screen.getByRole('button', { name: 'Guardar especie' });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(inventarioVerdeApi.registerSpecies).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificName: 'Ginkgo biloba',
          commonName: 'Árbol de los 40 escudos',
          family: 'Ginkgoaceae',
          vegetationTypeCode: 'TREE',
        }),
        null
      );
      expect(onCreated).toHaveBeenCalledWith(mockNuevaEspecie);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('muestra mensaje de error cuando la especie ya existe (409 Conflict)', async () => {
    jest.mocked(inventarioVerdeApi.registerSpecies).mockRejectedValue(
      new ApiError(409, 'La especie «Ceiba speciosa» ya está registrada en el catálogo')
    );

    render(
      <RegistroEspecieModal
        isOpen={true}
        onClose={onClose}
        initialScientificName="Ceiba speciosa"
        onCreated={onCreated}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Guardar especie' });
    await userEvent.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La especie «Ceiba speciosa» ya está registrada en el catálogo'
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
