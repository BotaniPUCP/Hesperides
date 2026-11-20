import { render, screen } from '@testing-library/react';
import type { ReservationWarning } from '@shared/types';
import { ReservationWarnings } from '../ReservationWarnings';

const WORK: ReservationWarning = {
  kind: 'WORK_HERE', severity: 'CRITICAL', reservationCode: null, interventionId: 7,
  text: 'Rosales tiene trabajo por hacer de Mantenimiento · Poda (INT-0007): empezó el 12 nov, una semana antes de la reserva.',
  emphasis: 'El 19 nov podrían estar trabajando en este jardín.',
};

describe('ReservationWarnings', () => {
  it('resalta en negrita lo que el aviso marca como importante', () => {
    render(<ReservationWarnings warnings={[WORK]} />);

    expect(screen.getByText(WORK.emphasis!).tagName).toBe('STRONG');
    expect(screen.getByText(/una semana antes de la reserva/)).toBeInTheDocument();
  });

  it('sin resaltado, muestra solo el texto', () => {
    const { container } = render(<ReservationWarnings warnings={[{ ...WORK, emphasis: null }]} />);

    expect(container.querySelector('strong')).toBeNull();
  });
});
