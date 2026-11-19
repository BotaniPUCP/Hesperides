import { render, screen } from '@testing-library/react';
import { PageFrame } from '@/components/layouts/PageFrame';
import { rememberListQuery } from '@/lib/listMemory';
import { PlaceFormScreen } from '../PlaceFormScreen';

jest.mock('next/navigation', () => ({ usePathname: () => '/lugares/nuevo' }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('../PlaceForm', () => ({ PlaceForm: () => null }));
jest.mock('../useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/hooks/usePlaces', () => ({ usePlace: () => ({ place: null, loading: false }) }));

// Desde SPEC-116/117 «Nuevo lugar» es una entrada del menú, como el registro del Directorio:
// su breadcrumb es «Lugares › Nuevo lugar» y ya no pasa por el catálogo.
it('el alta de lugares es una entrada del menú: su breadcrumb es Lugares › Nuevo lugar', () => {
  rememberListQuery('/lugares', 'category=DEPORTE');

  render(<PageFrame><PlaceFormScreen /></PageFrame>);

  const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
  expect(trail).toHaveTextContent('Lugares');
  expect(trail).toHaveTextContent('Nuevo lugar');
  expect(screen.queryByRole('link', { name: 'Catálogo de lugares' })).not.toBeInTheDocument();
  window.sessionStorage.clear();
});
