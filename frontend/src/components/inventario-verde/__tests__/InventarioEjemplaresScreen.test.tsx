import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioEjemplaresScreen } from '../InventarioEjemplaresScreen';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { rememberedHref } from '@/lib/listMemory';
import { saveListScroll } from '@/lib/listScroll';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';
import { page, p01, p02, summary } from '../__fixtures__/inventario';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);

const LIST = '/catastro/ejemplares';

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
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
  restartTrail(LIST);
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

  describe('conservar la pantalla para regresar', () => {
    it('recupera la posición del scroll cuando terminan de cargar los datos', async () => {
      const scrollTo = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      saveListScroll(LIST, 'type=PALM', 900);
      window.history.replaceState(null, '', `${LIST}?type=PALM`);
      render(<InventarioEjemplaresScreen />);

      await screen.findByText('EV-000001');
      await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 900));
      scrollTo.mockRestore();
    });

    it('reabre con los filtros, el orden, la vista y la página que trae la URL', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM&location=Educación&sort=location&view=table&page=2`);
      render(<InventarioEjemplaresScreen />);

      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'real', vegetationType: 'PALM', location: 'Educación', sortBy: 'location', page: 2,
          }),
        ),
      );
      expect(screen.getByPlaceholderText(/Buscar por código, referencia/i)).toHaveValue('real');
      expect(await screen.findByText('Código')).toBeInTheDocument();
    });

    it('un orden o una página manipulados en la URL vuelven al valor por defecto', async () => {
      window.history.replaceState(null, '', `${LIST}?sort=photo_url;drop&dir=x&view=y&page=-4`);
      render(<InventarioEjemplaresScreen />);

      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'code', sortDirection: 'asc', page: 0 }),
        ),
      );
    });

    it('lleva a la URL lo que se filtra y lo recuerda para el breadcrumb', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera (250)' });

      await userEvent.selectOptions(screen.getByRole('combobox', { name: /tipo de ejemplar/i }), 'PALM');

      await waitFor(() => expect(window.location.search).toBe('?type=PALM'));
      await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?type=PALM`));
    });

    it('cambiar el orden conserva campo y dirección, que llegan en dos avisos seguidos', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');

      await userEvent.selectOptions(screen.getByLabelText('Ordenar por:'), 'reference:desc');

      await waitFor(() => expect(window.location.search).toBe('?sort=reference&dir=desc'));
    });

    it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
      window.history.replaceState(null, '', `${LIST}?search=real&type=PALM`);
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera (250)' });

      act(() => window.history.pushState(null, '', LIST));

      expect(await screen.findByPlaceholderText(/Buscar por código, referencia/i)).toHaveValue('');
      expect(screen.getByRole('combobox', { name: /tipo de ejemplar/i })).toHaveValue('ALL');
      await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
    });

    it('muestra la flecha solo si se llegó desde otra pantalla', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');
      expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();

      act(() => {
        restartTrail('/inventario-verde/especies/roystonea-regia');
        recordVisit(LIST);
      });

      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
        'href', '/inventario-verde/especies/roystonea-regia',
      );
    });
  });

  describe('filtro por tipo de ejemplar', () => {
    const typeFilter = () => screen.findByRole('combobox', { name: /tipo de ejemplar/i });

    it('ofrece solo los tipos que tienen ejemplares, con su conteo', async () => {
      render(<InventarioEjemplaresScreen />);

      expect(await screen.findByRole('option', { name: 'Palmera (250)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Árbol (570)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Todos los tipos' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Cubresuelo/ })).not.toBeInTheDocument();
    });

    it('pide los ejemplares del tipo elegido y vuelve a la primera página', async () => {
      api.allSpecimens.mockImplementation(async () => page([mockSpecimenGlobal1], 40, 0, 16));
      render(<InventarioEjemplaresScreen />);
      await screen.findByText('EV-000001');
      await userEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })),
      );

      await screen.findByRole('option', { name: 'Palmera (250)' });
      await userEvent.selectOptions(await typeFilter(), 'PALM');

      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenLastCalledWith(
          expect.objectContaining({ vegetationType: 'PALM', page: 0 }),
        ),
      );
    });

    it('se combina con el filtro de ubicación', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera (250)' });
      await screen.findByRole('option', { name: 'Educación (5)' });

      await userEvent.selectOptions(await typeFilter(), 'PALM');
      await userEvent.selectOptions(screen.getByDisplayValue('Todas las ubicaciones'), 'Educación');

      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenLastCalledWith(
          expect.objectContaining({ vegetationType: 'PALM', location: 'Educación' }),
        ),
      );
    });

    it('«Restablecer filtros» aparece con un tipo elegido y lo quita', async () => {
      render(<InventarioEjemplaresScreen />);
      await screen.findByRole('option', { name: 'Palmera (250)' });
      expect(screen.queryByRole('button', { name: 'Restablecer filtros' })).not.toBeInTheDocument();

      await userEvent.selectOptions(await typeFilter(), 'PALM');
      await userEvent.click(await screen.findByRole('button', { name: 'Restablecer filtros' }));

      expect(await typeFilter()).toHaveValue('ALL');
      await waitFor(() =>
        expect(api.allSpecimens).toHaveBeenLastCalledWith(
          expect.objectContaining({ vegetationType: 'ALL' }),
        ),
      );
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
