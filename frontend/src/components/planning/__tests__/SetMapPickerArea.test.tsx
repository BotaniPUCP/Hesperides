import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Map3DViewProps } from '@/components/map3d/Map3DView';
import { CTRL_LAYER_LABEL } from '@/components/map3d/useCtrlRectangle';
import { installPointerEvent } from '@/test-utils/pointerEvent';
import { SetMapPicker } from '../SetMapPicker';

jest.mock('@/hooks/useMapLayers', () => ({
  useMapLayers: () => ({ data: jest.requireActual('@/components/map3d/__fixtures__/mapLayers').sampleLayers, isLoading: false, stale: false }),
}));
/** Lo que el visor dice que queda dentro del rectángulo dibujado. */
const mockInRect = { sections: ['AV-0011', 'AV-0012'], specimens: [] as string[] };
let mockProps: Map3DViewProps;
jest.mock('@/components/map3d/Map3DView', () => ({
  Map3DView: (props: Map3DViewProps) => {
    mockProps = props;
    const { onReady } = props;
    const viewer = { setMarkedSections: jest.fn(), setMarkedSpecimens: jest.fn(), setLayerVisible: jest.fn(), top: jest.fn(), fit: jest.fn(),
      sectionCodesInScreenRect: () => mockInRect.sections, specimenCodesInScreenRect: () => mockInRect.specimens };
    return <canvas data-testid="lienzo" ref={(c) => { if (c) onReady?.(viewer as never); }} />;
  },
}));

const sectors = [{ id: 1, code: 'SEC-1', name: 'Sector 1' }];
const sectionsBySector = { 1: [
  { id: 11, code: 'AV-0011', name: 'Jardín Central' }, { id: 12, code: 'AV-0012', name: 'Berma Norte' }, { id: 13, code: 'AV-0013', name: 'Patio' }] };
const LAYER = CTRL_LAYER_LABEL;

beforeAll(() => { installPointerEvent(); Element.prototype.setPointerCapture = jest.fn(); });

function setup(selectedZoneIds: number[] = []) {
  render(<SetMapPicker sectors={sectors} sectionsBySector={sectionsBySector} specimens={[]} selectedZoneIds={selectedZoneIds}
    selectedSpecimenIds={[]} onCancel={jest.fn()} onConfirm={jest.fn()} />);
}

const LEFT = 0;
const RIGHT = 2;

/** Ctrl apretado y un arrastre de 100 px sobre el mapa, con el botón dado. */
function ctrlDrag(button = LEFT) {
  fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
  const layer = screen.getByLabelText(LAYER);
  fireEvent.pointerDown(layer, { clientX: 10, clientY: 10, button, pointerId: 1 });
  fireEvent.pointerMove(layer, { clientX: 110, clientY: 110, pointerId: 1 });
  fireEvent.pointerUp(layer, { clientX: 110, clientY: 110, button, pointerId: 1 });
  fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
}

describe('SetMapPicker: elegir varios con Ctrl', () => {
  it('no hay botón de selección múltiple: Ctrl muestra la capa y soltarlo la quita', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Selección múltiple/ })).not.toBeInTheDocument();
    expect(screen.getByText(/clic izquierdo elige varios, clic derecho los quita/)).toBeInTheDocument();
    expect(screen.queryByLabelText(LAYER)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    expect(screen.getByLabelText(LAYER)).toBeInTheDocument();

    fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });
    expect(screen.queryByLabelText(LAYER)).not.toBeInTheDocument();
  });

  it('con el botón izquierdo solo agrega: repetir sobre lo ya elegido no lo quita', () => {
    setup();

    ctrlDrag(LEFT);
    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    expect(screen.getByText('Se agregó al conjunto: 2 jardines.')).toBeInTheDocument();

    ctrlDrag(LEFT);
    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
    expect(screen.getByText('Ya estaba todo elegido.')).toBeInTheDocument();
  });

  it('con el botón derecho quita lo que encierra, y se puede deshacer', async () => {
    setup([11, 12, 13]);

    ctrlDrag(RIGHT);
    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    expect(screen.getByText('Se quitó del conjunto: 2 jardines.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByText('Elegido: 3 jardines')).toBeInTheDocument();
  });

  it('con el botón derecho sobre lo que no estaba elegido no quita nada', () => {
    setup([13]);

    ctrlDrag(RIGHT);
    expect(screen.getByText('Elegido: 1 jardín')).toBeInTheDocument();
    expect(screen.getByText('No había nada elegido ahí.')).toBeInTheDocument();
  });

  it('si en el rectángulo hay algo sin elegir, agrega solo lo que falta y no quita nada', () => {
    setup([11, 13]);

    ctrlDrag();

    expect(screen.getByText('Elegido: 3 jardines')).toBeInTheDocument();
    expect(screen.getByText('Se agregó al conjunto: 1 jardín.')).toBeInTheDocument();
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

describe('SetMapPicker: mantener pulsado y arrastrar', () => {
  // Los jardines de la escena de prueba: los mismos códigos que dibuja el visor.
  const sceneSections = { 1: [{ id: 1, code: 'AV-0001', name: 'Jardín Uno' }, { id: 2, code: 'AV-0002', name: 'Jardín Dos' }] };

  it('agrega los jardines que toca, sin quitar nunca', () => {
    render(<SetMapPicker sectors={sectors} sectionsBySector={sceneSections} specimens={[]} selectedZoneIds={[1]}
      selectedSpecimenIds={[]} onCancel={jest.fn()} onConfirm={jest.fn()} />);
    act(() => mockProps.selectionSweep?.onSelect({ layer: 'greenAreas', index: 0 }));
    act(() => mockProps.selectionSweep?.onSelect({ layer: 'greenAreas', index: 1 }));

    expect(screen.getByText('Elegido: 2 jardines')).toBeInTheDocument();
  });

  it('solo barre lo que el modo deja elegir', () => {
    setup();
    expect(mockProps.selectionSweep?.enabled('section')).toBe(true);
    expect(mockProps.selectionSweep?.enabled('specimen')).toBe(false);

    fireEvent.click(screen.getByRole('radio', { name: 'Ejemplares' }));
    expect(mockProps.selectionSweep?.enabled('section')).toBe(false);
    expect(mockProps.selectionSweep?.enabled('specimen')).toBe(true);
  });
});
