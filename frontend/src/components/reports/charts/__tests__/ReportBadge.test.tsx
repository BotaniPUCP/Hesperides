import { render, screen } from '@testing-library/react';
import { ReportBadge } from '../ReportBadge';

describe('ReportBadge (enmienda de SPEC-202 a SPEC-C01 §3.1)', () => {
  it.each([
    ['OVERDUE', 'Fuera de plazo', 'text-action-danger'],
    ['EARLY', 'Antes del mínimo', 'text-neutral-700'],
    ['ON_TARGET', 'En objetivo', 'text-success-600'],
    ['NOT_EVALUABLE', 'No evaluable', 'text-neutral-700'],
    ['NOT_APPLICABLE', 'No aplica', 'text-neutral-700'],
    ['NO_DATA', 'Sin datos', 'text-neutral-700'],
    ['PROVISIONAL', 'Regla provisional', 'text-info-600'],
  ] as const)('%s se muestra como «%s» con el color de su código', (kind, label, colorClass) => {
    render(<ReportBadge kind={kind} />);
    expect(screen.getByText(label)).toHaveClass(colorClass);
  });

  it('un rótulo distinto no cambia el color', () => {
    render(<ReportBadge kind="OVERDUE" label="Vencido (3)" />);
    expect(screen.getByText('Vencido (3)')).toHaveClass('text-action-danger');
  });
});
