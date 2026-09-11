import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renderiza su contenido y responde al click', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no dispara onClick cuando esta deshabilitado', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} disabled>Guardar</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('bloquea el doble click mientras carga', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} loading>Guardar</Button>);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('usa la variante primary y el tamano md por defecto', () => {
    render(<Button>Guardar</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-brand-600');
    expect(button.className).toContain('h-10');
  });

  it('aplica los colores de cada variante', () => {
    const { rerender } = render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button').className).toContain('bg-action-danger');

    rerender(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button').className).toContain('border-neutral-200');

    rerender(<Button variant="ghost">Ver</Button>);
    expect(screen.getByRole('button').className).toContain('text-neutral-700');
  });

  it('es de tipo button por defecto, para no enviar formularios sin querer', () => {
    render(<Button>Accion</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('admite type submit cuando se pide explicitamente', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('expone aria-label cuando solo hay un icono', () => {
    render(<Button aria-label="Cerrar"><span aria-hidden>x</span></Button>);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('muestra el anillo de foco requerido por accesibilidad', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button').className).toContain('focus-visible:ring-2');
  });
});
