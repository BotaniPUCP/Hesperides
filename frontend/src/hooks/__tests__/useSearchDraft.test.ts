import { act, renderHook } from '@testing-library/react';
import { useSearchDraft } from '../useSearchDraft';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function setup(initial = '') {
  const commit = jest.fn();
  const view = renderHook(({ url }) => useSearchDraft(url, commit), { initialProps: { url: initial } });
  return { ...view, commit };
}

it('muestra cada letra al instante y publica una sola vez al terminar la ráfaga', () => {
  const { result, commit } = setup();

  act(() => result.current[1]('p'));
  act(() => result.current[1]('pa'));

  expect(result.current[0]).toBe('pa');
  expect(commit).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(300));
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit).toHaveBeenCalledWith('pa');
});

it('la URL que alcanza lo publicado no pisa lo que se sigue escribiendo', () => {
  const { result, rerender } = setup();

  act(() => result.current[1]('pa'));
  act(() => jest.advanceTimersByTime(300));
  act(() => result.current[1]('pal'));
  rerender({ url: 'pa' });

  expect(result.current[0]).toBe('pal');
});

it('un cambio ajeno de la URL, como el menú lateral, reemplaza el texto', () => {
  const { result, rerender } = setup('palmera');

  rerender({ url: '' });

  expect(result.current[0]).toBe('');
});

it('al salir de la pantalla no publica lo pendiente sobre la URL de la siguiente', () => {
  const { result, commit, unmount } = setup();

  act(() => result.current[1]('pa'));
  unmount();
  act(() => jest.advanceTimersByTime(300));

  expect(commit).not.toHaveBeenCalled();
});
