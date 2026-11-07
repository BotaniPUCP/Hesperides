import { render, screen } from '@testing-library/react';
import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
  it('muestra el título como h1 con la descripción y las acciones', () => {
    render(<PageHeader title="Usuarios" description="Cuentas del personal" actions={<button>Nuevo</button>} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toHaveClass('page-title');
    expect(screen.getByText('Cuentas del personal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('sin descripción ni acciones solo queda el título', () => {
    const { container } = render(<PageHeader title="Riego" />);

    expect(container.querySelectorAll('p, button')).toHaveLength(0);
  });
});
