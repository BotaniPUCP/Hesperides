import { render, screen } from '@testing-library/react';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';
import { PageFrame } from '../PageFrame';
import { usePageTrail } from '../PageTrailContext';

let mockPathname = '/riego';
let mockUser: object | null = { id: 1 };
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

function FichaConNombre() {
  usePageTrail({ labels: { 'LUG-1': 'Jardín Central' } });
  return <p>ficha</p>;
}

describe('PageFrame', () => {
  beforeEach(() => {
    mockPathname = '/riego';
    mockUser = { id: 1 };
    restartTrail('/riego');
  });

  it('pone el breadcrumb y debajo el contenido', () => {
    render(<PageFrame><p>contenido</p></PageFrame>);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveTextContent('InicioRiego');
    expect(nav.compareDocumentPosition(screen.getByText('contenido'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('ofrece volver a la pantalla padre al entrar por un enlace directo', () => {
    mockPathname = '/lugares/LUG-1';
    render(<PageFrame><p>contenido</p></PageFrame>);

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/lugares');
  });

  it('en Inicio no hay a dónde volver, pero la fila conserva su lugar', () => {
    mockPathname = '/';
    render(<PageFrame><p>contenido</p></PageFrame>);

    expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
    expect(screen.getByTestId('page-nav')).toHaveClass('min-h-9');
  });

  it('la ficha completa el breadcrumb con el nombre que cargó', () => {
    mockPathname = '/lugares/LUG-1';
    render(<PageFrame><FichaConNombre /></PageFrame>);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Jardín Central');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).not.toHaveTextContent('LUG-1');
  });

  it('el nombre de una ficha no queda en la siguiente pantalla', () => {
    mockPathname = '/lugares/LUG-1';
    const { rerender } = render(<PageFrame><FichaConNombre /></PageFrame>);

    rerender(<PageFrame><p>otra</p></PageFrame>);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('LUG-1');
  });

  it('sin sesión y sin recorrido no hay flecha, y con recorrido sí', () => {
    mockPathname = '/inventario-verde';
    mockUser = null;
    restartTrail('/inventario-verde');
    const { unmount } = render(<PageFrame><p>contenido</p></PageFrame>);
    expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
    unmount();

    restartTrail('/inventario-verde/especies/molle');
    recordVisit('/inventario-verde');
    render(<PageFrame><p>contenido</p></PageFrame>);
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/inventario-verde/especies/molle');
  });

  it('sin sesión no ofrece Inicio', () => {
    mockPathname = '/inventario-verde';
    mockUser = null;
    render(<PageFrame><p>contenido</p></PageFrame>);

    expect(screen.queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument();
  });

  it('el mapa va sin marco, a toda la ventana', () => {
    mockPathname = '/mapa';
    render(<PageFrame><p>mapa</p></PageFrame>);

    expect(screen.queryByTestId('page-nav')).not.toBeInTheDocument();
    expect(screen.getByText('mapa')).toBeInTheDocument();
  });
});
