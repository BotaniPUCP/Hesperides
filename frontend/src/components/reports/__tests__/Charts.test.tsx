import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DonutChart } from '../charts/DonutChart';
import { ProgressMeter } from '../charts/ProgressMeter';
import { VariationBadge } from '../charts/ReportBadge';
import { RingGauge } from '../charts/RingGauge';
import { TrendLine } from '../charts/TrendLine';
import { categorical } from '../charts/chartTones';

/** SPEC-202 §7.5 and §8 «Frontend»: title, generated description, hidden table and token classes only. */
describe('gráficos de reportes', () => {
  it('la torta describe cada parte con su cifra y su porcentaje, y muestra la parte señalada en el centro', async () => {
    const { container } = render(<DonutChart title="Incidencias por estado" totalLabel="incidencias" segments={[
      { key: 'open', label: 'Abiertas', value: 3, tone: 'warning' },
      { key: 'done', label: 'Resueltas', value: 1, tone: 'brand' },
    ]} />);
    expect(screen.getByRole('img', { name: /Incidencias por estado/ }))
      .toHaveAccessibleName(expect.stringContaining('Abiertas: 3 (75 %)'));
    expect(within(screen.getByRole('table')).getByText('Resueltas')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}\b/i);

    await userEvent.setup().hover(screen.getAllByText('Abiertas')[0]);
    expect(screen.getByText('Abiertas · 75 %')).toBeInTheDocument();
  });

  it('más de tres categorías se juntan en «Otros» en gris, sin inventar colores', () => {
    const rows = ['a', 'b', 'c', 'd', 'e'].map((key, index) => ({ key, label: key, value: 10 - index }));
    const segments = categorical(rows, 'Otros');
    expect(segments.map((s) => s.tone)).toEqual(['brand', 'info', 'warning', 'neutral']);
    expect(segments[3]).toEqual(expect.objectContaining({ label: 'Otros', value: 13 }));
  });

  it('la línea deja un hueco en un mes sin registros y no cae a 0 % (CA-D03)', () => {
    const { container } = render(<TrendLine title="Cobertura mensual" target={100} points={[
      { month: '2026-05', percent: 40 }, { month: '2026-06', percent: null }, { month: '2026-07', percent: 60 },
    ]} />);
    expect(screen.getByRole('img', { name: /Cobertura mensual/ }))
      .toHaveAccessibleName(expect.stringContaining('junio de 2026: Sin registros'));
    // Two separate runs, each a single point: no segment crosses the gap.
    expect(container.querySelectorAll('path.stroke-brand-600')).toHaveLength(2);
    expect(container.querySelectorAll('circle.fill-brand-600')).toHaveLength(2);
    expect(container.querySelector('line[stroke-dasharray]')).toHaveClass('stroke-neutral-500');
  });

  it('el medidor y el anillo escriben su cifra y su meta', () => {
    render(<>
      <ProgressMeter label="Riego del sector" percent={97.5} valueText="115 de 118 secciones regadas" />
      <RingGauge title="Cobertura" percent={62.9} target={80} />
    </>);
    expect(screen.getByRole('img', { name: /Riego del sector 115 de 118/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Cobertura 62,9\s%; meta 80,0\s%/ })).toBeInTheDocument();
  });

  it('la variación se colorea según el sentido del indicador (CA-D07)', () => {
    render(<>
      <VariationBadge trend="DOWN" higherIsBetter={true} label="baja" />
      <VariationBadge trend="UP" higherIsBetter={null} label="neutra" />
      <VariationBadge trend="UP" higherIsBetter={true} label="sube" />
    </>);
    expect(screen.getByText('baja')).toHaveClass('text-action-danger');
    expect(screen.getByText('neutra')).toHaveClass('text-neutral-700');
    expect(screen.getByText('sube')).toHaveClass('text-success-600');
  });
});
