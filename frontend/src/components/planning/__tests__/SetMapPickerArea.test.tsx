import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetMapPicker } from '../SetMapPicker';

// Con mapa: el visor y el rectángulo se simulan; el hook del rectángulo es compartido con Riego y no cambia.
interface AreaOptions {
  onAdd: (ids: number[]) => void;
  onNotice: (text: string) => void;
  specimens?: { onAdd: (ids: number[]) => void };
}
let area: AreaOptions;
const viewer = { setMarkedSections: jest.fn(), setMarkedSpecimens: jest.fn(), setLayerVisible: jest.fn(), top: jest.fn(),
  fit: jest.fn(), select: jest.fn(), focusSections: jest.fn() };

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: { attributionRequired: false }, isLoading: false, errorMessage: null, stale: false }),
}));
jest.mock('@/components/map3d/sceneData', () => ({ toSceneData: () => ({ vegetation: [], greenAreas: [], xerophytic: [], reserve: [] }) }));
jest.mock('@/components/map3d/MapAttribution', () => ({ MapAttribution: () => null }));
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: ({ onReady }: { onReady: (v: unknown) => void }) => {
    useEffect(() => { onReady(viewer); }, [onReady]);
    return <div />;
  },
}));
jest.mock('@/components/map3d/useRectangleSelection', () => ({
  useRectangleSelection: (options: AreaOptions) => {
    area = options;
    return { drag: null, beginDrag: jest.fn(), moveDrag: jest.fn(), endDrag: jest.fn(), cancelDrag: jest.fn() };
  },
}));

const sectors = [{ id: 1, code: 'SEC-1', name: 'Sector 1' }];
const sectionsBySector = { 1: [{ id: 11, code: 'AV-0011', name: 'Jardín Central' }, { id: 12, code: 'AV-0012', name: 'Berma Norte' }] };
const specimens = [{ id: 501, code: 'EV-000501', displayName: 'Palmera', typeLabel: 'Palmera', sectionName: 'Jardín Central', sectorId: 1, sectorName: 'Sector 1' }];

function setup(zoneIds: number[], specimenIds: number[] = []) {
  render(<SetMapPicker sectors={sectors} sectionsBySector={sectionsBySector} specimens={specimens}
    selectedZoneIds={zoneIds} selectedSpecimenIds={specimenIds} onCancel={jest.fn()} onConfirm={jest.fn()} />);
}

describe('SetMapPicker · selección múltiple', () => {
  it('por defecto el rectángulo agrega lo que encierra', async () => {
    setup([]);

    await userEvent.click(screen.getByRole('button', { name: /Selección múltiple/ }));
    expect(screen.getByRole('radio', { name: 'Agregar' })).toHaveAttribute('aria-checked', 'true');
    act(() => { area.onAdd([11, 12]); area.onNotice('Se añadieron 2 jardines y 0 ejemplares del área dibujada.'); });

    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
  });

  it('con «Quitar», el rectángulo quita lo elegido que encierra y lo dice', async () => {
    setup([11, 12], [501]);

    await userEvent.click(screen.getByRole('button', { name: /Selección múltiple/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Quitar' }));
    act(() => { area.onAdd([12]); area.specimens?.onAdd([501]); area.onNotice('Se añadieron 1 jardines y 1 ejemplares del área dibujada.'); });

    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Se quitó del conjunto: 1 jardín · 1 ejemplar del área dibujada.');
    expect(screen.getByText(/para quitar lo elegido que quede dentro/)).toBeInTheDocument();
  });

  it('si en el área no había nada elegido, lo avisa', async () => {
    setup([11]);

    await userEvent.click(screen.getByRole('button', { name: /Selección múltiple/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Quitar' }));
    act(() => { area.onAdd([12]); area.onNotice('Se añadieron 1 secciones'); });

    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('En el área dibujada no había nada elegido.');
  });

  it('el botón activo se ve resaltado, no blanco, y «Elegir:» va aparte de sus opciones', async () => {
    setup([]);

    await userEvent.click(screen.getByRole('button', { name: /Selección múltiple/ }));

    const button = screen.getByRole('button', { name: /Selección múltiple/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('bg-brand-600');
    expect(button.className).not.toContain('bg-neutral-0');
    const modes = screen.getByRole('radiogroup', { name: 'Elegir:' });
    expect(modes).not.toHaveTextContent('Elegir');
  });
});
