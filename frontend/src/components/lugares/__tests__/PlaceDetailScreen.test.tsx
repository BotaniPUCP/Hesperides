import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PlaceDetail } from '@shared/types';
import { ApiError } from '@/lib/api';
import { rememberListQuery } from '@/lib/listMemory';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';
import { placesApi } from '@/lib/places-api';
import { PlaceMapContext } from '../map/PlaceMapContext';
import { PlaceDetailScreen } from '../PlaceDetailScreen';

const mockRole = { current: 'OPERARIO' };
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: { code: mockRole.current } } }) }));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast: jest.fn(), dismissAll: jest.fn() }),
}));
jest.mock('@/lib/places-api', () => ({ placesApi: { detail: jest.fn(), remove: jest.fn(), removePerspective: jest.fn() } }));
const mockPush = jest.fn();
import { PageFrame } from '@/components/layouts/PageFrame';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => '/lugares/LUG-0001' }));

const map = { show: jest.fn(), focusPerspective: jest.fn() };

/** La ficha dentro del marco y del layout de /lugares, que le da el mapa. */
function renderScreen(code: string) {
  return render(
    <PageFrame>
      <PlaceMapContext.Provider value={map}>
        <PlaceDetailScreen code={code} />
      </PlaceMapContext.Provider>
    </PageFrame>,
  );
}

const detail = placesApi.detail as jest.MockedFunction<typeof placesApi.detail>;

const photo = (id: number) => ({ id, thumbnailUrl: `t${id}`, fullUrl: `f${id}`, author: 'Equipo de catastro', takenOn: '2026-10-01' });

const cia: PlaceDetail = {
  code: 'LUG-0001', name: 'CIA', parent: null, kind: { code: 'OUTDOOR', label: 'Exterior' },
  category: { code: 'EDIFICIO', label: 'Edificio' },
  outline: { source: 'BUILDING', buildingIds: [87], zoneCode: null, featureCode: null, centerLat: -12.06, centerLon: -77.08 },
  aliases: ['Centro de Innovación'], children: [{ code: 'LUG-0004', name: 'Piso 2' }], mainPhotos: [photo(1)],
  perspectives: [
    { id: 10, side: { code: 'BACK', label: 'Espalda' }, displayName: 'Espalda de CIA', compass: 'SOUTH', landmark: null,
      lat: -12.0602, lon: -77.08, headingDeg: 0, photos: [photo(2), photo(3)], mapView: null },
    { id: 11, side: { code: 'SIDE', label: 'Al lado' }, displayName: 'Al lado de CIA · oeste, hacia Gelarti', compass: 'WEST',
      landmark: { code: 'LUG-0007', name: 'Gelarti' }, lat: -12.06, lon: -77.0802, headingDeg: 90, photos: [], mapView: null },
  ],
  interior: [],
  mapView: null,
};

afterEach(() => {
  mockRole.current = 'OPERARIO';
  jest.clearAllMocks();
});

describe('PlaceDetailScreen', () => {
  describe('regresar', () => {
    beforeEach(() => {
      window.sessionStorage.clear();
      act(() => restartTrail('/lugares/LUG-0001'));
    });

    it('sin recorrido, breadcrumb y flecha llevan al catálogo con sus últimos filtros', async () => {
      rememberListQuery('/lugares', 'category=DEPORTE&kind=OUTDOOR');
      detail.mockResolvedValue(cia);
      renderScreen('LUG-0001');

      const crumb = await screen.findByRole('link', { name: 'Catálogo de lugares' });
      expect(crumb).toHaveAttribute('href', '/lugares?category=DEPORTE&kind=OUTDOOR');
      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/lugares?category=DEPORTE&kind=OUTDOOR');
    });

    it('al pasar de un lugar a otro, la flecha vuelve al lugar anterior y no al catálogo', async () => {
      detail.mockResolvedValue(cia);
      act(() => {
        restartTrail('/lugares/LUG-0007');
        recordVisit('/lugares/LUG-0001');
      });
      renderScreen('LUG-0001');

      expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/lugares/LUG-0007');
    });

    it('al eliminar el lugar vuelve al catálogo con sus filtros', async () => {
      mockRole.current = 'ADMIN';
      rememberListQuery('/lugares', 'kind=INDOOR');
      detail.mockResolvedValue(cia);
      jest.mocked(placesApi.remove).mockResolvedValue(null as never);
      renderScreen('LUG-0001');

      fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Eliminar lugar' }));

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/lugares?kind=INDOOR'));
    });
  });

  it('muestra el lugar, sus alias, sus hijos y cada perspectiva con su nombre estándar', async () => {
    detail.mockResolvedValue(cia);
    renderScreen('LUG-0001');

    expect(await screen.findByRole('heading', { name: 'CIA' })).toBeInTheDocument();
    expect(screen.getByText('Centro de Innovación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Piso 2' })).toHaveAttribute('href', '/lugares/LUG-0004');
    expect(screen.getByText('Espalda de CIA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gelarti' })).toHaveAttribute('href', '/lugares/LUG-0007');
    expect(map.show).toHaveBeenCalledWith(cia, expect.any(Function));
  });

  it('una perspectiva sin fotos lo avisa', async () => {
    detail.mockResolvedValue(cia);
    renderScreen('LUG-0001');

    const lado = (await screen.findByText(/Al lado de CIA/)).closest('li') as HTMLElement;
    expect(within(lado).getByText('Sin fotos todavía')).toBeInTheDocument();
  });

  it('elegir una perspectiva la resalta en el mapa', async () => {
    detail.mockResolvedValue(cia);
    renderScreen('LUG-0001');

    fireEvent.click(await screen.findByRole('button', { name: 'Ver Espalda de CIA en el mapa' }));

    expect(map.focusPerspective).toHaveBeenLastCalledWith(10);
  });

  it('abre las fotos de una perspectiva en la galería', async () => {
    detail.mockResolvedValue(cia);
    renderScreen('LUG-0001');

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir foto 2 de Espalda de CIA' }));

    expect(screen.getByRole('dialog', { name: 'Fotos de Espalda de CIA' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /foto 2 de 2/ })).toHaveAttribute('src', 'f3');
  });

  it('un lugar inexistente dice que no se encontró', async () => {
    detail.mockRejectedValue(new ApiError(404, 'Place not found'));
    renderScreen('LUG-9999');

    expect(await screen.findByText('Lugar no encontrado')).toBeInTheDocument();
  });

  it('un interior muestra sus fotos por vista y no tiene mapa de perspectivas', async () => {
    detail.mockResolvedValue({
      ...cia, code: 'LUG-0004', name: 'Piso 2', kind: { code: 'INDOOR', label: 'Interior' }, parent: { code: 'LUG-0001', name: 'CIA' },
      outline: { ...cia.outline, source: 'INHERITED', buildingIds: [] }, perspectives: [], children: [],
      interior: [{ view: { code: 'CORRIDOR', label: 'Pasillo' }, photos: [photo(5)] }],
    });
    renderScreen('LUG-0004');

    expect(await screen.findByRole('heading', { name: 'Pasillo' })).toBeInTheDocument();
    expect(screen.queryByText('Perspectivas')).not.toBeInTheDocument();
  });

  it('quien no edita no ve botones de edición', async () => {
    detail.mockResolvedValue(cia);
    renderScreen('LUG-0001');

    await screen.findByRole('heading', { name: 'CIA' });
    expect(screen.queryByRole('button', { name: 'Agregar perspectiva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar foto/ })).not.toBeInTheDocument();
  });

  it('quien coordina edita, agrega perspectivas y borra con confirmación', async () => {
    mockRole.current = 'COORDINADOR';
    detail.mockResolvedValue(cia);
    const remove = placesApi.removePerspective as jest.MockedFunction<typeof placesApi.removePerspective>;
    remove.mockResolvedValue(undefined);
    renderScreen('LUG-0001');

    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/lugares/LUG-0001/editar');
    expect(screen.getByRole('button', { name: 'Agregar perspectiva' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Espalda de CIA' }));
    expect(remove).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar perspectiva' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('LUG-0001', 10));
  });
});
