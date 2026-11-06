import { render } from '@testing-library/react';
import { NavigationTrailTracker } from '../NavigationTrailTracker';
import { previousPath, restartTrail } from '@/lib/navigationTrail';

let mockPathname = '/a';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

it('anota cada pantalla a la que se llega', () => {
  restartTrail('/a');
  const { rerender } = render(<NavigationTrailTracker />);
  expect(previousPath()).toBeNull();

  mockPathname = '/b';
  rerender(<NavigationTrailTracker />);

  expect(previousPath()).toBe('/a');
});
