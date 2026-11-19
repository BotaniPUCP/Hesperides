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

it('oculta atención propuesta si el ejemplar está retirado pero mantiene visibles las medidas históricas y el acceso al historial', () => {
  const retiredSpecimen = { ...p01Detail, isActive: false, retiredAt: '2026-06-15T10:00:00Z' };
  render(<SpecimenMeasures specimen={retiredSpecimen} showOperationalRegime />);

  // 1. No muestra atención propuesta
  expect(screen.queryByText(/Atención propuesta:/)).not.toBeInTheDocument();

  // 2. Mantiene visibles las medidas históricas
  expect(screen.getByText('Altura total')).toBeInTheDocument();
  expect(screen.getByText('7.5')).toBeInTheDocument();
  expect(screen.getByText('Radio de copa')).toBeInTheDocument();
  expect(screen.getByText('3.4')).toBeInTheDocument();

  // 3. El acceso al historial de medidas continúa disponible
  expect(screen.getByRole('button', { name: /Ver historial de medidas/ })).toBeInTheDocument();
});

it('un ejemplar vigente continúa mostrando atención propuesta y medidas', () => {
  render(<SpecimenMeasures specimen={p01Detail} showOperationalRegime />);

  expect(screen.getByText(/Atención propuesta:/)).toBeInTheDocument();
  expect(screen.getByText('7.5')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Ver historial de medidas/ })).toBeInTheDocument();
});
