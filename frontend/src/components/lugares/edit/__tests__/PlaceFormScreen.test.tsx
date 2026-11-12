import { render, screen } from '@testing-library/react';
import { PageFrame } from '@/components/layouts/PageFrame';
import { rememberListQuery } from '@/lib/listMemory';
import { PlaceFormScreen } from '../PlaceFormScreen';

jest.mock('next/navigation', () => ({ usePathname: () => '/lugares/nuevo' }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('../PlaceForm', () => ({ PlaceForm: () => null }));
jest.mock('../useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/hooks/usePlaces', () => ({ usePlace: () => ({ place: null, loading: false }) }));

it('el breadcrumb del alta vuelve al catálogo con sus últimos filtros', () => {
  rememberListQuery('/lugares', 'category=DEPORTE');

  render(<PageFrame><PlaceFormScreen /></PageFrame>);

  expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).toHaveAttribute('href', '/lugares?category=DEPORTE');
  window.sessionStorage.clear();
});
