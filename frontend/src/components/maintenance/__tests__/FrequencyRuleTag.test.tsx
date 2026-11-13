import { render, screen } from '@testing-library/react';
import { FrequencyRuleTag } from '../FrequencyRuleTag';

describe('FrequencyRuleTag', () => {
  it('muestra el nombre del tipo con un punto del color de ese tipo', () => {
    const { container } = render(<FrequencyRuleTag ruleCode="SEASONAL_PERIOD" label="Cuota anual" />);
    expect(screen.getByText('Cuota anual')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-success-600');
  });

  it('cada tipo tiene su propio color', () => {
    const { container, rerender } = render(<FrequencyRuleTag ruleCode="INTERVAL_DAYS" label="Rango de días" />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-info-600');
    rerender(<FrequencyRuleTag ruleCode="ON_DEMAND" label="A demanda" />);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-neutral-400');
  });
});
