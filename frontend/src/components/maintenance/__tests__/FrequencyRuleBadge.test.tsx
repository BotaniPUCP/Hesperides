import React from 'react';
import { render, screen } from '@testing-library/react';
import { FrequencyRuleBadge } from '../FrequencyRuleBadge';

describe('FrequencyRuleBadge', () => {
  it('renders INTERVAL_DAYS badge correctly', () => {
    render(<FrequencyRuleBadge ruleCode="INTERVAL_DAYS" label="Intervalo de días" />);
    expect(screen.getByText('Intervalo de días')).toBeInTheDocument();
  });

  it('renders SEASONAL_PERIOD badge correctly', () => {
    render(<FrequencyRuleBadge ruleCode="SEASONAL_PERIOD" label="Estacional" />);
    expect(screen.getByText('Estacional')).toBeInTheDocument();
  });

  it('renders COVERAGE_CYCLE badge correctly', () => {
    render(<FrequencyRuleBadge ruleCode="COVERAGE_CYCLE" label="Ciclo de cobertura" />);
    expect(screen.getByText('Ciclo de cobertura')).toBeInTheDocument();
  });
});
