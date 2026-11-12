import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapInfoCard } from '../MapInfoCard';

// El doble marca la navegación interna: un <a> corriente recarga la aplicación y borra la memoria del mapa.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} data-client-navigation="true">{children}</a>
  ),
}));

describe('MapInfoCard', () => {
  it('el enlace de la ficha de un elemento navega sin recargar la aplicación', () => {
    render(
      <MapInfoCard
        onClose={jest.fn()}
        content={{ kind: 'element', card: { kind: 'Planta', title: 'Palmera', rows: [], link: { href: '/catastro/ejemplares/EV-1', label: 'Ver ficha' } } }}
      />,
    );

    const link = screen.getByRole('link', { name: /Ver ficha/ });
    expect(link).toHaveAttribute('href', '/catastro/ejemplares/EV-1');
    expect(link).toHaveAttribute('data-client-navigation', 'true');
  });

  it('el enlace de una perspectiva a su lugar navega sin recargar la aplicación', () => {
    render(
      <MapInfoCard
        onClose={jest.fn()}
        content={{ kind: 'perspective', perspective: { id: 7, place: { code: 'LUG-0001', name: 'Tinkuy' }, displayName: 'Frente de Tinkuy', lat: 0, lon: 0, headingDeg: 0, thumbnailUrl: null } }}
      />,
    );

    expect(screen.getByRole('link', { name: /Ver Tinkuy en el catálogo/ })).toHaveAttribute('data-client-navigation', 'true');
  });

  it('cerrar la ficha avisa a quien la abrió', () => {
    const onClose = jest.fn();
    render(<MapInfoCard onClose={onClose} content={{ kind: 'location', lat: 1, lon: 2, text: 'Jardín', error: null }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
