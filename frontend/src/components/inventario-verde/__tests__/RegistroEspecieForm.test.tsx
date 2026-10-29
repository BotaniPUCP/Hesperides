import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistroEspecieForm } from '../RegistroEspecieForm';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { ApiError } from '@/lib/api';
import { palmeraReal } from '../__fixtures__/inventario';

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    registerSpecies: jest.fn(),
  },
}));

jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({
    items: [
      { id: 1, code: 'TREE', label: 'Árbol' },
      { id: 2, code: 'PALM', label: 'Palmera' },
    ],
    isLoading: false,
  }),
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

afterEach(() => jest.resetAllMocks());

describe('RegistroEspecieForm', () => {
  it('renderiza los campos botánicos obligatorios y opcionales', () => {
    render(<RegistroEspecieForm />);

    expect(screen.getByLabelText(/Nombre científico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre común principal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Familia botánica/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de vegetación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Origen biogeográfico/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar especie/i })).toBeInTheDocument();
  });

  it('exige el nombre científico para poder enviar', async () => {
    render(<RegistroEspecieForm />);

    fireEvent.click(screen.getByRole('button', { name: /Registrar especie/i }));

    expect(await screen.findByText('El nombre científico es obligatorio')).toBeInTheDocument();
    expect(api.registerSpecies).not.toHaveBeenCalled();
  });

  it('envía los datos botánicos al endpoint y muestra confirmación de registro', async () => {
    api.registerSpecies.mockResolvedValue(palmeraReal);
    const onSuccess = jest.fn();

    render(<RegistroEspecieForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/Nombre científico/i), 'Roystonea regia');
    await userEvent.type(screen.getByLabelText(/Nombre común principal/i), 'Palmera real');
    await userEvent.type(screen.getByLabelText(/Familia botánica/i), 'Arecaceae');

    fireEvent.click(screen.getByRole('button', { name: /Registrar especie/i }));

    await waitFor(() => {
      expect(api.registerSpecies).toHaveBeenCalledWith(
        expect.objectContaining({
          scientificName: 'Roystonea regia',
          commonName: 'Palmera real',
          family: 'Arecaceae',
          vegetationTypeCode: 'TREE',
        }),
        null,
      );
    });

    expect(await screen.findByText(/Especie registrada exitosamente/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver ficha de la especie/i })).toHaveAttribute(
      'href',
      '/inventario-verde/especies/roystonea-regia',
    );
    expect(onSuccess).toHaveBeenCalledWith(palmeraReal);
  });

  it('informa si el nombre científico ya se encuentra registrado (409 Conflict)', async () => {
    api.registerSpecies.mockRejectedValue(new ApiError(409, 'Conflict'));

    render(<RegistroEspecieForm />);

    await userEvent.type(screen.getByLabelText(/Nombre científico/i), 'Roystonea regia');
    fireEvent.click(screen.getByRole('button', { name: /Registrar especie/i }));

    expect(
      await screen.findByText('Ya existe una especie con este nombre científico en el catálogo.'),
    ).toBeInTheDocument();
  });
});
