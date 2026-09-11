import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';
import { StatusBadge } from '../StatusBadge';
import { UrgencyBadge } from '../UrgencyBadge';

describe('Badge', () => {
  it('muestra la etiqueta', () => {
    render(<Badge label="Activo" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('aplica el color pedido', () => {
    render(<Badge label="Error" color="danger" />);
    expect(screen.getByText('Error').className).toContain('action-danger');
  });
});

describe('StatusBadge', () => {
  it('resuelve el color internamente segun el code del catalogo', () => {
    render(<StatusBadge code="IN_REVIEW" label="En evaluación" />);

    const badge = screen.getByText('En evaluación');
    expect(badge.className).toContain('status-in-review-bg');
    expect(badge.className).toContain('status-in-review-fg');
  });

  it('siempre muestra el texto, nunca solo color', () => {
    render(<StatusBadge code="RESOLVED" label="Resuelta" />);
    expect(screen.getByText('Resuelta')).toBeInTheDocument();
  });

  it('cae en un neutro legible ante un code desconocido', () => {
    // Un catalogo puede crecer; el badge no debe romperse ni quedar invisible.
    render(<StatusBadge code="CODIGO_NUEVO" label="Estado nuevo" />);
    expect(screen.getByText('Estado nuevo').className).toContain('bg-neutral-100');
  });
});

describe('UrgencyBadge', () => {
  it('pinta cada nivel con su color fijo', () => {
    const { rerender } = render(<UrgencyBadge code="LOW" label="Baja" />);
    expect(screen.getByText('Baja').className).toContain('urgency-low-bg');

    rerender(<UrgencyBadge code="CRITICAL" label="Crítica" />);
    expect(screen.getByText(/Crítica/).className).toContain('urgency-critical-bg');
  });

  it('CRITICAL agrega un icono, no solo color', () => {
    render(<UrgencyBadge code="CRITICAL" label="Crítica" />);
    expect(screen.getByTestId('urgency-critical-icon')).toBeInTheDocument();
  });

  it('los niveles no criticos no llevan icono', () => {
    render(<UrgencyBadge code="HIGH" label="Alta" />);
    expect(screen.queryByTestId('urgency-critical-icon')).not.toBeInTheDocument();
  });
});
