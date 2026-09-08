import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('muestra el titulo y la descripcion', () => {
    render(<EmptyState title="Sin usuarios" description="No hay resultados." />);

    expect(screen.getByText('Sin usuarios')).toBeInTheDocument();
    expect(screen.getByText('No hay resultados.')).toBeInTheDocument();
  });

  it('ejecuta la accion ofrecida', async () => {
    const onClick = jest.fn();
    render(<EmptyState title="Sin usuarios" action={{ label: 'Crear usuario', onClick }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no renderiza boton si no hay accion', () => {
    render(<EmptyState title="Sin usuarios" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
