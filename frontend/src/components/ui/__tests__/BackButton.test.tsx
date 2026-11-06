import { act, render, screen } from '@testing-library/react';
import { BackButton } from '../BackButton';
import { rememberListQuery } from '@/lib/listMemory';
import { recordVisit, restartTrail } from '@/lib/navigationTrail';

beforeEach(() => {
  window.sessionStorage.clear();
  act(() => restartTrail('/inicio'));
});

it('sin recorrido ni pantalla padre no se muestra', () => {
  render(<BackButton />);
  expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
});

it('sin recorrido va a la pantalla padre con sus últimos filtros', () => {
  rememberListQuery('/lista', 'type=PALM');
  render(<BackButton fallbackHref="/lista" />);
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/lista?type=PALM');
});

it('con recorrido prefiere la pantalla de la que vienes, con sus filtros', () => {
  rememberListQuery('/inicio', 'page=2');
  act(() => recordVisit('/especie'));
  render(<BackButton fallbackHref="/lista" />);
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/inicio?page=2');
});

it('aparece en cuanto hay a dónde volver', () => {
  render(<BackButton />);
  act(() => recordVisit('/especie'));
  expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/inicio');
});
