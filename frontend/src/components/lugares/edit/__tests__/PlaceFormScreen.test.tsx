import { render, screen } from '@testing-library/react';
import { rememberListQuery } from '@/lib/listMemory';
import { PlaceFormScreen } from '../PlaceFormScreen';

jest.mock('../PlaceForm', () => ({ PlaceForm: () => null }));
jest.mock('../useCanEditPlaces', () => ({ useCanEditPlaces: () => true }));
jest.mock('@/hooks/usePlaces', () => ({ usePlace: () => ({ place: null, loading: false }) }));

it('el breadcrumb del alta vuelve al catálogo con sus últimos filtros', () => {
  rememberListQuery('/lugares', 'category=DEPORTE');

  render(<PlaceFormScreen />);

  expect(screen.getByRole('link', { name: 'Catálogo de lugares' })).toHaveAttribute('href', '/lugares?category=DEPORTE');
  window.sessionStorage.clear();
});
