import { bindModifiedSelection } from './modifiedSelection';

it('reserves Ctrl-left drags for selection without invoking camera handlers', () => {
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = jest.fn();
  canvas.hasPointerCapture = jest.fn(() => true);
  canvas.releasePointerCapture = jest.fn();
  const selected = jest.fn(), camera = jest.fn(), box = jest.fn();
  const dispose = bindModifiedSelection(canvas, selected, box);
  canvas.addEventListener('pointerdown', camera);
  const send = (type: string, ctrlKey: boolean, x = 20) => {
    const event = new MouseEvent(type, { button: 0, ctrlKey, clientX: x, clientY: 20, bubbles: true, cancelable: true });
    Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
    canvas.dispatchEvent(event);
  };
  send('pointerdown', true); send('pointerup', true);
  expect(selected).toHaveBeenCalledWith(20, 20);
  expect(camera).not.toHaveBeenCalled();
  send('pointerdown', true); send('pointermove', true, 70);
  expect(document.querySelector('[aria-label="Rectángulo de selección"]')).toHaveStyle({ width: '50px', display: 'block' });
  expect(box).not.toHaveBeenCalled();
  send('pointerup', true, 70);
  expect(box).toHaveBeenCalledWith({ left: 20, top: 20, right: 70, bottom: 20 });
  expect(selected).toHaveBeenCalledTimes(1);
  send('pointerdown', false); send('pointerup', false);
  expect(camera).toHaveBeenCalledTimes(1);
  expect(selected).toHaveBeenCalledTimes(1);
  send('pointerdown', true); send('pointercancel', true);
  expect(selected).toHaveBeenCalledTimes(1);
  dispose();
  send('pointerdown', true); send('pointerup', true);
  expect(selected).toHaveBeenCalledTimes(1);
});
