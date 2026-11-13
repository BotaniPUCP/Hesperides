import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { installPointerEvent } from '@/test-utils/pointerEvent';
import { CTRL_LAYER_LABEL, useCtrlRectangle, type RectangleAction, type ScreenRect } from '../useCtrlRectangle';

beforeAll(() => { installPointerEvent(); Element.prototype.setPointerCapture = jest.fn(); });

function Harness({ onRectangle, enabled = true }: { onRectangle: (rect: ScreenRect, action: RectangleAction) => void; enabled?: boolean }) {
  const region = useRef<HTMLDivElement>(null);
  const { selecting, layer } = useCtrlRectangle({ mapRegion: region, enabled, onRectangle });
  return <div ref={region}><canvas data-testid="lienzo" />{layer}<span>{selecting ? 'eligiendo' : 'libre'}</span></div>;
}

const holdCtrl = () => fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
const releaseCtrl = () => fireEvent.keyUp(window, { key: 'Control', ctrlKey: false });

function drag(button: number, from: [number, number], to: [number, number]) {
  const layer = screen.getByLabelText(CTRL_LAYER_LABEL);
  fireEvent.pointerDown(layer, { clientX: from[0], clientY: from[1], button, pointerId: 1 });
  fireEvent.pointerMove(layer, { clientX: to[0], clientY: to[1], pointerId: 1 });
  fireEvent.pointerUp(layer, { clientX: to[0], clientY: to[1], button, pointerId: 1 });
}

describe('useCtrlRectangle: Ctrl + clic izquierdo agrega, Ctrl + clic derecho quita', () => {
  it('la capa solo aparece mientras Ctrl está apretado', () => {
    render(<Harness onRectangle={jest.fn()} />);
    expect(screen.queryByLabelText(CTRL_LAYER_LABEL)).not.toBeInTheDocument();

    holdCtrl();
    expect(screen.getByLabelText(CTRL_LAYER_LABEL)).toBeInTheDocument();
    expect(screen.getByText('eligiendo')).toBeInTheDocument();

    releaseCtrl();
    expect(screen.queryByLabelText(CTRL_LAYER_LABEL)).not.toBeInTheDocument();
  });

  it('arrastrar con el botón izquierdo agrega lo que encierra el rectángulo', () => {
    const onRectangle = jest.fn();
    render(<Harness onRectangle={onRectangle} />);
    holdCtrl();
    drag(0, [10, 20], [110, 120]);

    expect(onRectangle).toHaveBeenCalledWith({ x1: 10, y1: 20, x2: 110, y2: 120 }, 'add');
  });

  it('arrastrar con el botón derecho quita, y no abre el menú del navegador', () => {
    const onRectangle = jest.fn();
    render(<Harness onRectangle={onRectangle} />);
    holdCtrl();
    const menu = fireEvent.contextMenu(screen.getByLabelText(CTRL_LAYER_LABEL));
    drag(2, [110, 120], [10, 20]);

    expect(menu).toBe(false);
    expect(onRectangle).toHaveBeenCalledWith({ x1: 110, y1: 120, x2: 10, y2: 20 }, 'remove');
  });

  it('un clic sin arrastrar toma lo que está bajo el cursor', () => {
    const onRectangle = jest.fn();
    render(<Harness onRectangle={onRectangle} />);
    holdCtrl();
    drag(0, [50, 60], [51, 60]);
    drag(2, [50, 60], [50, 60]);

    expect(onRectangle).toHaveBeenNthCalledWith(1, { x1: 47, y1: 57, x2: 53, y2: 63 }, 'add');
    expect(onRectangle).toHaveBeenNthCalledWith(2, { x1: 47, y1: 57, x2: 53, y2: 63 }, 'remove');
  });

  it('el botón del medio no elige ni quita', () => {
    const onRectangle = jest.fn();
    render(<Harness onRectangle={onRectangle} />);
    holdCtrl();
    drag(1, [10, 10], [100, 100]);

    expect(onRectangle).not.toHaveBeenCalled();
  });

  it('la capa sigue hasta soltar el clic aunque se suelte Ctrl antes', () => {
    const onRectangle = jest.fn();
    render(<Harness onRectangle={onRectangle} />);
    holdCtrl();
    const layer = screen.getByLabelText(CTRL_LAYER_LABEL);
    fireEvent.pointerDown(layer, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });
    releaseCtrl();
    fireEvent.pointerUp(screen.getByLabelText(CTRL_LAYER_LABEL), { clientX: 90, clientY: 90, button: 0, pointerId: 1 });

    expect(onRectangle).toHaveBeenCalledWith({ x1: 10, y1: 10, x2: 90, y2: 90 }, 'add');
    expect(screen.queryByLabelText(CTRL_LAYER_LABEL)).not.toBeInTheDocument();
  });

  it('sin mapa no hay capa', () => {
    render(<Harness onRectangle={jest.fn()} enabled={false} />);
    holdCtrl();
    expect(screen.queryByLabelText(CTRL_LAYER_LABEL)).not.toBeInTheDocument();
  });

  it('la rueda pasa al lienzo para acercar y alejar con Ctrl apretado', () => {
    render(<Harness onRectangle={jest.fn()} />);
    const onCanvas = jest.fn();
    screen.getByTestId('lienzo').addEventListener('wheel', onCanvas);
    holdCtrl();
    const wheel = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true });
    screen.getByLabelText(CTRL_LAYER_LABEL).dispatchEvent(wheel);

    expect(onCanvas).toHaveBeenCalledTimes(1);
    expect(wheel.defaultPrevented).toBe(true);
  });
});
