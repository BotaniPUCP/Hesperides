import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PlaceSummary } from '@shared/types';
import { rememberedHref } from '@/lib/listMemory';
import { placesApi } from '@/lib/places-api';
import { LugaresScreen } from '../LugaresScreen';

jest.mock('next/navigation', () => jest.requireActual('@/test-utils/urlNavigationMock').urlNavigationMock);

const LIST = '/lugares';

const mockRole = { current: 'OPERARIO' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('@/lib/places-api', () => ({ placesApi: { list: jest.fn() } }));
jest.mock('@/hooks/useCatalog', () => ({
  useCatalog: () => ({ items: [{ code: 'DEPORTE', label: 'Deporte', sortOrder: 5, isActive: true, parentCode: null }], isLoading: false, errorMessage: null }),
}));

const list = placesApi.list as jest.MockedFunction<typeof placesApi.list>;

function place(overrides: Partial<PlaceSummary> = {}): PlaceSummary {
  return {
    code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' },
    category: { code: 'EDIFICIO', label: 'Edificio' }, mainPhotoUrl: 'http://api/files/places/1?size=thumb',
    perspectiveCount: 3, hasFront: true, hasBack: true, ...overrides,
  };
}

afterEach(() => {
  jest.clearAllMocks();
  mockRole.current = 'OPERARIO';
});

beforeEach(() => {
  window.history.replaceState(null, '', LIST);
  window.sessionStorage.clear();
});

describe('LugaresScreen', () => {
  describe('conservar la pantalla para regresar', () => {
    it('reabre con la búsqueda, la categoría y el tipo que trae la URL', async () => {
      list.mockResolvedValue([]);
      window.history.replaceState(null, '', `${LIST}?search=civil&category=DEPORTE&kind=INDOOR`);
      render(<LugaresScreen />);

      await waitFor(() => expect(list).toHaveBeenCalledWith({ search: 'civil', category: 'DEPORTE', kind: 'INDOOR' }));
      expect(screen.getByRole('searchbox')).toHaveValue('civil');
      expect(screen.getByLabelText('Categoría')).toHaveValue('DEPORTE');
    });

    it('un tipo manipulado en la URL no llega al backend', async () => {
      list.mockResolvedValue([]);
      window.history.replaceState(null, '', `${LIST}?kind=DROP`);
      render(<LugaresScreen />);

      await waitFor(() => expect(list).toHaveBeenCalledWith({ search: undefined, category: undefined, kind: undefined }));
    });

    it('lleva los filtros a la URL y los recuerda para la ficha', async () => {
      list.mockResolvedValue([]);
      render(<LugaresScreen />);
      await waitFor(() => expect(list).toHaveBeenCalled());

      fireEvent.click(screen.getByRole('button', { name: 'Interior' }));
      fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'DEPORTE' } });

      await waitFor(() => expect(window.location.search).toBe('?category=DEPORTE&kind=INDOOR'));
      await waitFor(() => expect(rememberedHref(LIST)).toBe(`${LIST}?category=DEPORTE&kind=INDOOR`));
    });

    it('elegir «Todos» quita el tipo de la URL', async () => {
      list.mockResolvedValue([]);
      window.history.replaceState(null, '', `${LIST}?kind=INDOOR`);
      render(<LugaresScreen />);
      await waitFor(() => expect(list).toHaveBeenCalled());

      fireEvent.click(screen.getByRole('button', { name: 'Todos' }));

      await waitFor(() => expect(window.location.search).toBe(''));
    });

    it('al entrar por el menú estando filtrada, la pantalla ya montada empieza de cero', async () => {
      list.mockResolvedValue([]);
      window.history.replaceState(null, '', `${LIST}?search=civil&category=DEPORTE`);
      render(<LugaresScreen />);
      await waitFor(() => expect(list).toHaveBeenCalled());

      act(() => window.history.pushState(null, '', LIST));

      await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue(''));
      expect(screen.getByLabelText('Categoría')).toHaveValue('');
      await waitFor(() => expect(rememberedHref(LIST)).toBe(LIST));
    });
  });

  it('muestra una tarjeta por lugar con su enlace a la ficha', async () => {
    list.mockResolvedValue([place(), place({ code: 'LUG-0002', name: 'Cancha 1', parent: { code: 'LUG-0009', name: 'Polideportivo' }, perspectiveCount: 1 })]);
    render(<LugaresScreen />);

    const link = await screen.findByRole('link', { name: /CIA/ });
    expect(link).toHaveAttribute('href', '/lugares/LUG-0001');
    expect(screen.getByText('Polideportivo')).toBeInTheDocument();
    expect(screen.getByText('3 perspectivas')).toBeInTheDocument();
  });

  it('marca como pendiente un exterior sin espalda o sin foto principal', async () => {
    list.mockResolvedValue([place({ hasBack: false }), place({ code: 'LUG-0003', name: 'Piso 2', kind: { code: 'INDOOR', label: 'Interior' }, hasFront: false, hasBack: false })]);
    render(<LugaresScreen />);

    const pendientes = await screen.findAllByText('Faltan fotos');
    expect(pendientes).toHaveLength(1);
  });

  it('busca por texto y filtra por categoría y tipo', async () => {
    list.mockResolvedValue([]);
    render(<LugaresScreen />);
    await waitFor(() => expect(list).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'espalda de civil' } });
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'DEPORTE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Interior' }));

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ search: 'espalda de civil', category: 'DEPORTE', kind: 'INDOOR' }),
    );
  });

  it('sin resultados lo dice', async () => {
    list.mockResolvedValue([]);
    render(<LugaresScreen />);

    expect(await screen.findByText('No hay lugares que coincidan')).toBeInTheDocument();
  });

  it('si la API falla muestra el error', async () => {
    list.mockRejectedValue(new Error('caída'));
    render(<LugaresScreen />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
