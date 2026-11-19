import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { ToastProvider } from '@/components/ui';
import { useAdminModeToggle, type AdminModeTarget } from '../useAdminModeToggle';

function makeViewer() {
  return { setAdminMode: jest.fn() } satisfies AdminModeTarget;
}

function Probe({ viewer, ready }: { viewer: AdminModeTarget; ready: boolean }) {
  const ref = useRef<AdminModeTarget | null>(viewer);
  useAdminModeToggle(ref, ready);
  return null;
}

const mount = (viewer: AdminModeTarget, ready = true) =>
  render(<ToastProvider><Probe viewer={viewer} ready={ready} /></ToastProvider>);
const toggle = (extra: Partial<KeyboardEventInit> = {}) =>
  act(() => { fireEvent.keyDown(window, { code: 'KeyU', key: 'U', ctrlKey: true, shiftKey: true, ...extra }); });

describe('useAdminModeToggle', () => {
  it('Ctrl+Shift+U entra al modo de administrador y avisa', () => {
    const viewer = makeViewer();
    mount(viewer);
    toggle();
    expect(viewer.setAdminMode).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Modo de movimiento de administrador')).toBeInTheDocument();
  });

  it('la segunda vez vuelve al modo normal y avisa', () => {
    const viewer = makeViewer();
    mount(viewer);
    toggle();
    toggle();
    expect(viewer.setAdminMode).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Modo de movimiento normal')).toBeInTheDocument();
  });

  it('mantener la combinación pulsada no alterna sin parar', () => {
    const viewer = makeViewer();
    mount(viewer);
    toggle();
    toggle({ repeat: true });
    expect(viewer.setAdminMode).toHaveBeenCalledTimes(1);
  });

  it('otra combinación no cambia el modo', () => {
    const viewer = makeViewer();
    mount(viewer);
    toggle({ shiftKey: false });
    expect(viewer.setAdminMode).not.toHaveBeenCalled();
  });

  it('mientras el modelo no carga, no hace nada', () => {
    const viewer = makeViewer();
    mount(viewer, false);
    toggle();
    expect(viewer.setAdminMode).not.toHaveBeenCalled();
    expect(screen.queryByText('Modo de movimiento de administrador')).not.toBeInTheDocument();
  });
});
