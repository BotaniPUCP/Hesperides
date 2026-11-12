import { act, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { useFocusRevision } from '../useFocusRevision';
import { useRequest } from '../useRequest';

describe('useFocusRevision', () => {
  it('emits one refresh when visibility and focus both signal the same return', () => {
    const original = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    const { result, unmount } = renderHook(() => useFocusRevision());

    act(() => {
      fireEvent.blur(window);
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      fireEvent(document, new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      fireEvent(document, new Event('visibilitychange'));
      fireEvent.focus(window);
    });

    expect(result.current).toBe(1);
    unmount();
    if (original) Object.defineProperty(document, 'visibilityState', original);
    else Reflect.deleteProperty(document, 'visibilityState');
  });

  it('discards an older request response after focus starts a newer one', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const load = jest.fn()
      .mockImplementationOnce(() => new Promise<string>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<string>((resolve) => { resolveSecond = resolve; }));
    const { result } = renderHook(() => {
      const revision = useFocusRevision();
      return useRequest(`specimen:${revision}`, load);
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    act(() => {
      fireEvent.blur(window);
      fireEvent.focus(window);
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));

    await act(async () => resolveSecond('newer'));
    expect(result.current.data).toBe('newer');
    await act(async () => resolveFirst('older'));
    expect(result.current.data).toBe('newer');
  });
});
