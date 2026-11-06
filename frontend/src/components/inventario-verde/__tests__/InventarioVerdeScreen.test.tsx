import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioVerdeScreen } from '../InventarioVerdeScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { rememberedHref } from '@/lib/listMemory';
import { page, palmeraReal, palmeraReina, summary } from '../__fixtures__/inventario';

const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/lib/inventario-verde-api', () => ({
  inventarioVerdeApi: {
    summary: jest.fn(),
    species: jest.fn(),
    searchSpecimens: jest.fn(),
    specimen: jest.fn(),
    registerSpecies: jest.fn(),
  },
}));

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);

const api = inventarioVerdeApi as jest.Mocked<typeof inventarioVerdeApi>;
const LIST = '/inventario-verde';

beforeEach(() => {
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
  mockUseAuth.mockReturnValue({ user: null });
  api.summary.mockResolvedValue(summary);
  api.species.mockImplementation(async ({ search }) =>
    page(search ? [palmeraReina] : [palmeraReal, palmeraReina]),
  );
  api.searchSpecimens.mockResolvedValue([]);
  api.specimen.mockResolvedValue(null as any);
});

afterEach(() => jest.resetAllMocks());

describe('InventarioVerdeScreen', () => {
  describe('conservar la pantalla para regresar', () => {
    it('reabre con la búsqueda, el tipo, el orden y la página que trae la URL', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM&sort=count:desc&page=2`);
      render(<InventarioVerdeScreen />);

      await waitFor(() =>
        expect(api.species).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'real', vegetationType: 'PALM', page: 2 }),
        ),
      );
      expect(screen.getByPlaceholderText(/Buscar por nombre común/i)).toHaveValue('real');
      expect(await screen.findByDisplayValue(/Más censadas/)).toHaveValue('count:desc');
    });

    it('lleva a la URL el tipo elegido y lo recuerda para el breadcrumb', async () => {
      render(<InventarioVerdeScreen />);

      await userEvent.click(await screen.findByRole('tab', { name: /Palmera/ }));

      await waitFor(() => expect(window.location.search).toBe('?type=PALM'));
      await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?type=PALM`));
    });

    it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM`);
      render(<InventarioVerdeScreen />);
      await screen.findByRole('tab', { name: /Palmera/ });

      act(() => window.history.pushState(null, '', LIST));

      expect(await screen.findByPlaceholderText(/Buscar por nombre común/i)).toHaveValue('');
      expect(screen.getByRole('tab', { name: /Todos/ })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('muestra los totales del backend y las especies', async () => {
    render(<InventarioVerdeScreen />);

    expect(screen.getByRole('heading', { name: 'Inventario de Especies' })).toBeInTheDocument();
    expect((await screen.findAllByText('965')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Palmera real')).toBeInTheDocument();
  });

  it('busca en el backend, también por los otros nombres', async () => {
    render(<InventarioVerdeScreen />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre común/i), 'bruja');

    await waitFor(() => expect(api.species).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bruja', page: 0 })));
    await waitFor(() => expect(screen.queryByText('Palmera real')).not.toBeInTheDocument());
    expect(screen.getAllByText('Palmera reina').length).toBeGreaterThanOrEqual(1);
  });

  it('la búsqueda carga directamente en el inventario de especies sin popovers de ejemplares', async () => {
    render(<InventarioVerdeScreen />);

    await userEvent.type(screen.getByPlaceholderText(/Buscar por nombre común/i), 'reina');

    await waitFor(() =>
      expect(api.species).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'reina', page: 0 }),
      ),
    );
    expect(screen.queryByText('Ir directo a la ficha')).not.toBeInTheDocument();
    expect(screen.getAllByText('Palmera reina').length).toBeGreaterThanOrEqual(1);
  });

  it('no muestra botones al vuelo de registro ni tabs superiores de módulos en la cabecera', async () => {
    mockUseAuth.mockReturnValue({
      user: { role: { code: 'COORDINADOR' } },
    });

    render(<InventarioVerdeScreen />);

    expect(await screen.findByText('Palmera real')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Registrar especie/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Catastro de Ejemplares/i })).not.toBeInTheDocument();
  });
});

