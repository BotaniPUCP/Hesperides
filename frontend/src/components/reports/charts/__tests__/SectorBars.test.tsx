import { render, screen, within } from '@testing-library/react';
import { SectorBars } from '../SectorBars';

const rows = [
  { key: '1', label: 'Sector verde 01', percent: 25, detail: '1000 de 4000 m²' },
  { key: 'none', label: 'Sin sector', percent: null, detail: '0 de 0 m²' },
];

describe('SectorBars (SPEC-202 D-17, §7.5, CA-G05)', () => {
  it('se anuncia como imagen con título y una descripción que incluye los valores', () => {
    render(<SectorBars title="Cobertura por sector" rows={rows} />);
    const chart = screen.getByRole('img', { name: /Cobertura por sector/ });
    expect(chart).toHaveAccessibleName(expect.stringContaining('Sector verde 01: 25,0'));
    expect(chart).toHaveAccessibleName(expect.stringContaining('Sin sector: Sin datos'));
  });

  it('repite los valores en una tabla solo para lectores de pantalla', () => {
    render(<SectorBars title="Cobertura por sector" rows={rows} />);
    const table = screen.getByRole('table', { name: 'Cobertura por sector' });
    expect(table).toHaveClass('sr-only');
    const first = within(table).getByRole('row', { name: /Sector verde 01/ });
    expect(first).toHaveTextContent('1000 de 4000 m²');
  });

  it('pinta solo con clases de tokens y con el ancho como único valor dinámico', () => {
    const { container } = render(<SectorBars title="Cobertura" rows={rows} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(container.innerHTML).not.toMatch(/rgb\(|style=/i);
    const values = container.querySelectorAll('rect.fill-brand-600');
    expect(values).toHaveLength(2);
    expect(values[0]).toHaveAttribute('width', '25');
    expect(values[1]).toHaveAttribute('width', '0');
    expect(container.querySelectorAll('rect.fill-neutral-200')).toHaveLength(2);
  });

  it('nunca depende solo del color: cada barra muestra su cifra en texto', () => {
    const { container } = render(<SectorBars title="Cobertura" rows={rows} />);
    const visible = container.querySelector('ul[aria-hidden="true"]');
    expect(visible).toHaveTextContent('25,0');
    expect(visible).toHaveTextContent('Sin datos');
  });
});
