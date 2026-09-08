import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../ToastProvider';

function Disparador() {
  const { showToast, dismissAll } = useToast();
  return (
    <>
      <button onClick={() => showToast({ variant: 'success', title: 'Guardado' })}>Exito</button>
      <button onClick={() => showToast({ variant: 'error', title: 'Fallo', description: 'Detalle' })}>
        Error
      </button>
      <button onClick={dismissAll}>Limpiar</button>
    </>
  );
}

function renderConProvider() {
  return render(
    <ToastProvider>
      <Disparador />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
  afterEach(() => jest.useRealTimers());

  it('muestra un toast al dispararlo', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));

    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('muestra tambien la descripcion', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByText('Detalle')).toBeInTheDocument();
  });

  it('usa role alert para errores, que el lector anuncia sin esperar foco', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('usa role status para exito', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('se cierra solo pasados 5 segundos', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    expect(screen.getByText('Guardado')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });

  it('se puede cerrar a mano antes de que expire', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });

  it('apila varios toasts a la vez', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByText('Guardado')).toBeInTheDocument();
    expect(screen.getByText('Fallo')).toBeInTheDocument();
  });

  it('dismissAll los cierra todos', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Error' }));
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallo')).not.toBeInTheDocument();
  });

  it('useToast fuera del provider falla con un mensaje claro', () => {
    // Silencia el error que React imprime al propagar la excepcion.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Disparador />)).toThrow(/ToastProvider/);

    spy.mockRestore();
  });
});
