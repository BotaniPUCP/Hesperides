import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioEjemplaresScreen } from '../InventarioEjemplaresScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { page, p01, p02, summary } from '../__fixtures__/inventario';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    summary: jest.fn(),
    allSpecimens: jest.fn(),
    allLocations: jest.fn(),
    specimens: jest.fn(),
    locations: jest.fn(),
  },
}));

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;

const mockSpecimenGlobal1 = {
  ...p01,
  speciesSlug: 'roystonea-regia',
  speciesCommonName: 'Palmera real',
  speciesScientificName: 'Roystonea regia',
};

const mockSpecimenGlobal2 = {
  ...p02,
  speciesSlug: 'syagrus-romanzoffiana',
  speciesCommonName: 'Palmera reina',
  speciesScientificName: 'Syagrus romanzoffiana',
};

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: null });
  api.summary.mockResolvedValue(summary);
  api.allSpecimens.mockImplementation(async ({ search }) =>
    page(search ? [mockSpecimenGlobal2] : [mockSpecimenGlobal1, mockSpecimenGlobal2]),
  );
  api.allLocations.mockResolvedValue([
    { location: 'Educación', count: 5 },
    { location: 'Biblioteca Central', count: 25 },
  ]);
});

afterEach(() => jest.resetAllMocks());

describe('InventarioEjemplaresScreen', () => {
  it('renderiza la cabecera de Catastro de Ejemplares de forma limpia', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByRole('heading', { name: 'Catastro de Ejemplares' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Catálogo de Especies/i })).not.toBeInTheDocument();
    await screen.findByText('EV-000001');
  });

  it('muestra la lista de ejemplares globales con código, referencia y ubicación', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref: p01')).toBeInTheDocument();
    expect(screen.getAllByText('Educación').length).toBeGreaterThan(0);
    expect(screen.getByText('Palmera real')).toBeInTheDocument();
  });

  it('permite buscar ejemplares y actualiza los resultados', async () => {
    render(<InventarioEjemplaresScreen />);

    await screen.findByText('EV-000001');

    const searchInput = screen.getByPlaceholderText(/Buscar por código, referencia/i);
    await userEvent.type(searchInput, 'reina');

    await waitFor(() => {
      expect(api.allSpecimens).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'reina', page: 0 }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('EV-000001')).not.toBeInTheDocument();
      expect(screen.getByText('EV-000002')).toBeInTheDocument();
    });
  });

  it('arranca en vista de cuadrícula por defecto y permite alternar a tabla', async () => {
    render(<InventarioEjemplaresScreen />);

    expect(await screen.findByText('EV-000001')).toBeInTheDocument();
    expect(screen.getByText('Ref: p01')).toBeInTheDocument();

    const tablaButton = screen.getByRole('button', { name: /tabla/i });
    await userEvent.click(tablaButton);

    // En vista tabla se muestran las columnas de Código, Ubicación y Referencia
    expect(screen.getByText('Código')).toBeInTheDocument();
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Referencia')).toBeInTheDocument();
    expect(screen.getByText('EV-000001')).toBeInTheDocument();
  });

  it('no muestra botones al vuelo en la cabecera ya que la navegación se realiza por el sidebar', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'coordinador.verde',
        email: 'coordinador@pucp.edu.pe',
        role: { code: 'COORDINADOR', name: 'Coordinador' },
      },
    });

    render(<InventarioEjemplaresScreen />);

    await screen.findByText('EV-000001');
    expect(screen.queryByRole('link', { name: /\+ Registrar ejemplar/i })).not.toBeInTheDocument();
  });
});
