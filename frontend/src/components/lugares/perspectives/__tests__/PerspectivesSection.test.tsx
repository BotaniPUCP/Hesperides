import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { PlacePerspective } from '@shared/types';
import { placesApi } from '@/lib/places-api';
import { PerspectivesSection } from '../PerspectivesSection';
import { usePerspectiveOrder } from '../usePerspectiveOrder';

const showToast = jest.fn();
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  useToast: () => ({ showToast, dismissAll: jest.fn() }),
}));
jest.mock('@/lib/places-api', () => ({ placesApi: { reorderPerspectives: jest.fn() } }));

const reorder = placesApi.reorderPerspectives as jest.MockedFunction<typeof placesApi.reorderPerspectives>;

const perspective = (id: number, name: string, photos = 0): PlacePerspective => ({
  id, side: { code: 'SIDE', label: 'Al lado' }, displayName: name, compass: null, landmark: null,
  lat: -12.07, lon: -77.08, headingDeg: 0, mapView: null,
  photos: Array.from({ length: photos }, (_, i) => ({ id: id * 10 + i, thumbnailUrl: `t${id}${i}`, fullUrl: `f${id}${i}`, author: null, takenOn: null })),
});
const three = [perspective(1, 'Frente de CIA', 1), perspective(2, 'Espalda de CIA'), perspective(3, 'Al lado de CIA · oeste')];

function renderSection(onFocus = jest.fn(), editing = false) {
  render(
    <PerspectivesSection placeCode="LUG-0001" perspectives={three} focused={null} onFocus={onFocus} onOpenPhoto={jest.fn()}
      editing={editing ? { onEdit: jest.fn(), onDelete: jest.fn(), onDeletePhoto: jest.fn(), uploader: () => null } : undefined} />,
  );
  return onFocus;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.clearAllMocks());

describe('PerspectivesSection', () => {
  it('arranca como lista; en carrusel muestra una perspectiva y lleva el mapa a ella', () => {
    const onFocus = renderSection();
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Carrusel' }));

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '1 de 3: Frente de CIA' })).not.toHaveAttribute('aria-hidden', 'true');
    expect(onFocus).toHaveBeenLastCalledWith(1);
  });

  it('las flechas recorren en orden, mueven el mapa y no pasan de los extremos', () => {
    const onFocus = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Carrusel' }));
    expect(screen.getByRole('button', { name: 'Perspectiva anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Perspectiva siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Perspectiva siguiente' }));

    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(onFocus).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole('button', { name: 'Perspectiva siguiente' })).toBeDisabled();
  });

  it('con el teclado: flechas izquierda y derecha', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Carrusel' }));
    const carousel = screen.getByRole('region', { name: 'Perspectivas' });

    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('recuerda la vista elegida', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Carrusel' }));

    expect(window.localStorage.getItem('hesperides.lugares.vistaPerspectivas')).toBe('carousel');
  });

  it('solo quien edita ve las asas para ordenar', () => {
    renderSection(jest.fn(), false);
    expect(screen.queryByRole('button', { name: /^Mover / })).not.toBeInTheDocument();
  });

  it('quien edita tiene un asa por perspectiva', () => {
    renderSection(jest.fn(), true);
    expect(screen.getAllByRole('button', { name: /^Mover / })).toHaveLength(3);
  });
});

describe('usePerspectiveOrder', () => {
  it('mover cambia el orden de inmediato y lo guarda', async () => {
    reorder.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePerspectiveOrder('LUG-0001', three));

    act(() => result.current.move(3, 1));

    expect(result.current.ordered.map((p) => p.id)).toEqual([3, 1, 2]);
    await waitFor(() => expect(reorder).toHaveBeenCalledWith('LUG-0001', [3, 1, 2]));
  });

  it('si el guardado falla, vuelve al orden de antes y avisa', async () => {
    reorder.mockRejectedValue(new Error('sin red'));
    const { result } = renderHook(() => usePerspectiveOrder('LUG-0001', three));

    act(() => result.current.move(3, 1));

    await waitFor(() => expect(result.current.ordered.map((p) => p.id)).toEqual([1, 2, 3]));
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }));
  });

  it('soltar en el mismo sitio no guarda nada', () => {
    const { result } = renderHook(() => usePerspectiveOrder('LUG-0001', three));

    act(() => result.current.move(2, 2));

    expect(reorder).not.toHaveBeenCalled();
  });
});
