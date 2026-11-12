import { render, screen } from '@testing-library/react';
import { SpecimenMeasures } from '../SpecimenMeasures';
import { p01Detail } from '../__fixtures__/inventario';

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

it('alinea atención propuesta e historial en escritorio y los apila en móvil', () => {
  render(<SpecimenMeasures specimen={p01Detail} showOperationalRegime />);

  const attention = screen.getByText(/Atención propuesta:/);
  const history = screen.getByRole('button', { name: /Ver historial de medidas/ });
  const row = attention.parentElement;

  expect(row).toContainElement(history);
  expect(row).toHaveClass('flex-col', 'sm:flex-row', 'sm:justify-between');
});
