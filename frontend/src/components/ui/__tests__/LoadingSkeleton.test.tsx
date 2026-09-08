import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('repite el placeholder tantas veces como diga count', () => {
    render(<LoadingSkeleton variant="table-row" count={5} />);
    expect(screen.getAllByTestId('skeleton-item')).toHaveLength(5);
  });

  it('renderiza uno solo por defecto', () => {
    render(<LoadingSkeleton />);
    expect(screen.getAllByTestId('skeleton-item')).toHaveLength(1);
  });

  it('se anuncia como region ocupada para lectores de pantalla', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
