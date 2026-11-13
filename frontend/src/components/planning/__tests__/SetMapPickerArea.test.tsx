import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import { SetMapPicker } from '../SetMapPicker';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false, stale: false }),
}));
/** Lo que el visor dice que queda dentro del rectángulo dibujado. */
const mockInRect = { sections: ['AV-0011', 'AV-0012'], specimens: [] as string[] };
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: ({ onReady }: Map3DViewProps) => {
    const viewer = { setMarkedSections: jest.fn(), setMarkedSpecimens: jest.fn(), setLayerVisible: jest.fn(), top: jest.fn(), fit: jest.fn(),
      sectionCodesInScreenRect: () => mockInRect.sections, specimenCodesInScreenRect: () => mockInRect.specimens };
    return <canvas data-testid="lienzo" ref={(c) => { if (c) onReady?.(viewer as never); }} />;
  },
}));

const sectors = [{ id: 1, code: 'SEC-1', name: 'Sector 1' }];
const sectionsBySector = { 1: [
  { id: 11, code: 'AV-0011', name: 'Jardín Central' }, { id: 12, code: 'AV-0012', name: 'Berma Norte' }, { id: 13, code: 'AV-0013', name: 'Patio' }] };
const LAYER = 'Dibuja un rectángulo para elegir o quitar lo que encierre';

beforeAll(() => { Element.prototype.setPointerCapture = jest.fn(); });

function setup(selectedZoneIds: number[] = []) {
  render(<SetMapPicker sectors={sectors} sectionsBySector={sectionsBySector} specimens={[]} selectedZoneIds={selectedZoneIds}
    selectedSpecimenIds={[]} onCancel={jest.fn()} onConfirm={jest.fn()} />);
}

/** Ctrl apretado y un arrastre de 100 px sobre el mapa. */
function ctrlDrag() {
  fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
  const layer = screen.getByLabelText(LAYER);
  fireEvent.pointerDown(layer, { clientX: 10, clientY: 10, pointerId: 1 });
  fireEvent.pointerMove(layer, { clientX: 110, clientY: 110, pointerId: 1 });
  fireEvent.pointerUp(layer, { clientX: 110, clientY: 110, pointerId: 1 });
  fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
}

describe('SetMapPicker: elegir varios con Ctrl', () => {
  it('no hay botón de selección múltiple: Ctrl muestra la capa y soltarlo la quita', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Selección múltiple/ })).not.toBeInTheDocument();
    expect(screen.getByText(/arrastrar: elegir o quitar varios/)).toBeInTheDocument();
    expect(screen.queryByLabelText(LAYER)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    expect(screen.getByLabelText(LAYER)).toBeInTheDocument();

    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    expect(screen.queryByLabelText(LAYER)).not.toBeInTheDocument();
  });

  it('el rectángulo agrega lo que encierra; sobre lo ya elegido, lo quita y se puede deshacer', async () => {
    setup();

    ctrlDrag();
    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    expect(screen.getByText(/Se agregó al conjunto: 2 jardines/)).toBeInTheDocument();

    ctrlDrag();
    expect(screen.getByText('Nada elegido todavía')).toBeInTheDocument();
    expect(screen.getByText('Se quitó del conjunto: 2 jardines.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
  });

  it('si en el rectángulo hay algo sin elegir, agrega solo lo que falta y no quita nada', () => {
    setup([11, 13]);

    ctrlDrag();

    expect(screen.getByText('Elegido: 3 jardines')).toBeInTheDocument();
    expect(screen.getByText(/Se agregó al conjunto: 1 jardín/)).toBeInTheDocument();
  });

  it('deja acercar y alejar el mapa con la rueda mientras Ctrl está apretado', () => {
    setup();
    const onCanvas = jest.fn();
    screen.getByTestId('lienzo').addEventListener('wheel', onCanvas);

    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    const wheel = new WheelEvent('wheel', { deltaY: -120, clientX: 40, clientY: 50, bubbles: true, cancelable: true });
    screen.getByLabelText(LAYER).dispatchEvent(wheel);

    expect(onCanvas).toHaveBeenCalledTimes(1);
    expect(onCanvas.mock.calls[0][0]).toMatchObject({ deltaY: -120, clientX: 40, clientY: 50 });
    // La rueda es del mapa: ni la página se desplaza ni el navegador hace zoom con Ctrl.
    expect(wheel.defaultPrevented).toBe(true);
  });

  it('«Elegir:» va aparte de sus opciones', () => {
    setup();
    expect(screen.getByRole('radiogroup', { name: 'Elegir:' })).not.toHaveTextContent('Elegir');
  });
});
