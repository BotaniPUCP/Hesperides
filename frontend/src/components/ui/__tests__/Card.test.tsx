import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '../Card';

describe('Card', () => {
  it('renderiza su contenido', () => {
    render(<Card><p>Contenido</p></Card>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('muestra titulo y acciones cuando se le pasan', () => {
    render(<Card title="Resumen" actions={<button>Ver</button>}><p>x</p></Card>);

    expect(screen.getByText('Resumen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument();
  });

  it('no es interactiva si no recibe onClick', () => {
    render(<Card><p>Contenido</p></Card>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('con onClick es alcanzable por teclado y se activa con Enter', async () => {
    const onClick = jest.fn();
    render(<Card onClick={onClick}><p>Contenido</p></Card>);

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
