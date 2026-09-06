import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home', () => {
  it('renders the project name', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /hesperides/i })).toBeInTheDocument();
  });
});
