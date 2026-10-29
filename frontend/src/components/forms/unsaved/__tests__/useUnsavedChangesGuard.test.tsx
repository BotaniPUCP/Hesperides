import { act, fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { useState } from 'react';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

/** Un formulario mínimo: un campo, un enlace fuera, «Cancelar» y «Guardar». */
function Form({ onCancel = jest.fn() }: { onCancel?: () => void }) {
  const [text, setText] = useState('');
  const guard = useUnsavedChangesGuard(text !== '');
  return (
    <>
      <label>
        Nombre
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <Link href="/lugares">Lugares</Link>
      <button type="button" onClick={() => guard.confirm(onCancel)}>Cancelar</button>
      <button type="button" onClick={() => guard.navigate('/lugares/LUG-0001')}>Guardar</button>
      {guard.dialog}
    </>
  );
}

const type = (value: string) => fireEvent.change(screen.getByLabelText('Nombre'), { target: { value } });

afterEach(() => jest.clearAllMocks());

describe('useUnsavedChangesGuard', () => {
  it('sin cambios, cancelar no pregunta', () => {
    const onCancel = jest.fn();
    render(<Form onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con cambios, cancelar pregunta; «Seguir editando» se queda y «Salir sin guardar» sale', () => {
    const onCancel = jest.fn();
    render(<Form onCancel={onCancel} />);
    type('CIA');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre')).toHaveValue('CIA');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('escribir y borrar no deja cambios: no pregunta', () => {
    const onCancel = jest.fn();
    render(<Form onCancel={onCancel} />);
    type('CIA');
    type('');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('con cambios, un enlace interno pregunta y al confirmar navega reemplazando la entrada propia', () => {
    render(<Form />);
    type('CIA');

    fireEvent.click(screen.getByRole('link', { name: 'Lugares' }));
    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(replace).toHaveBeenCalledWith('/lugares');
  });

  it('con cambios, cerrar o recargar la pestaña pide el aviso del navegador', () => {
    render(<Form />);
    type('CIA');

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('sin cambios, cerrar la pestaña no pide nada', () => {
    render(<Form />);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('con cambios, el botón Atrás pregunta en vez de salir', () => {
    render(<Form />);
    type('CIA');
    const goSpy = jest.spyOn(window.history, 'go').mockImplementation(() => undefined);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('dialog', { name: 'Cambios sin guardar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    expect(goSpy).toHaveBeenCalledWith(-2);
    goSpy.mockRestore();
  });

  it('después de guardar navega sin preguntar', () => {
    render(<Form />);
    type('CIA');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/lugares/LUG-0001');
  });

  it('después de confirmar la salida no vuelve a preguntar el navegador (una sola pregunta)', () => {
    render(<Form />);
    type('CIA');
    jest.spyOn(window.history, 'go').mockImplementation(() => undefined);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('si vuelve a haber cambios, el aviso del navegador vuelve', () => {
    const onCancel = jest.fn();
    render(<Form onCancel={onCancel} />);
    type('CIA');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salir sin guardar' }));
    type('');
    type('Otra');

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

