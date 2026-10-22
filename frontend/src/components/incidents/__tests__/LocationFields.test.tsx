import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationFields, emptyLocation, locationPayload } from '../LocationFields';

it('accepts no coordinates and rejects a partial or invalid pair', () => {
  expect(locationPayload(emptyLocation)).toEqual({ locationReference: null, latitude: null, longitude: null });
  expect(() => locationPayload({ reference: '', latitude: '-12', longitude: '' })).toThrow(/coordenadas/);
  expect(() => locationPayload({ reference: '', latitude: '91', longitude: '0' })).toThrow(/coordenadas/);
});

it('does not request permission until clicked and treats denial as optional', async () => {
  const locate = jest.fn((_: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError));
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  const change = jest.fn();
  render(<LocationFields value={emptyLocation} onChange={change} />);
  expect(locate).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Usar ubicación del teléfono' }));
  expect(screen.getByRole('status')).toHaveTextContent('Puedes continuar sin ella');
  expect(change).not.toHaveBeenCalled();
});

it('does not overwrite the submitted location when a GPS callback arrives during sending', async () => {
  let success: PositionCallback = () => {};
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (callback: PositionCallback) => { success = callback; },
  } });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  const change = jest.fn();
  const { rerender } = render(<LocationFields value={emptyLocation} onChange={change} />);
  await userEvent.click(screen.getByRole('button', { name: 'Usar ubicación del teléfono' }));
  rerender(<LocationFields value={emptyLocation} onChange={change} disabled />);
  act(() => success({ coords: { latitude: -12, longitude: -77, accuracy: 15 } } as GeolocationPosition));
  expect(change).not.toHaveBeenCalled();
  rerender(<LocationFields value={emptyLocation} onChange={change} />);
  expect(screen.getByRole('button', { name: 'Usar ubicación del teléfono' })).toBeEnabled();
});
