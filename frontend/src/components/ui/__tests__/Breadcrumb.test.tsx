import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../Breadcrumb';

describe('Breadcrumb', () => {
  it('renderiza la lista de elementos correctamente', () => {
    const items = [
      { label: 'Inicio', href: '/' },
      { label: 'Inventario Verde', href: '/inventario-verde' },
      { label: 'Palmera Real' },
    ];

    render(<Breadcrumb items={items} />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Inventario Verde' })).toHaveAttribute('href', '/inventario-verde');
    expect(screen.getByText('Palmera Real')).toHaveAttribute('aria-current', 'page');
  });

  it('no renderiza nada si la lista de items está vacía', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
