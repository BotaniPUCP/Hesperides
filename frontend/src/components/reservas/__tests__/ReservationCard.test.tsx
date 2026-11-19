import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReservationCard } from '../ReservationCard';
import { reservationFixture } from '../__fixtures__/reservation';

function renderCard(canMaintain = true) {
  const onCancel = jest.fn();
  render(<ul><ReservationCard reservation={reservationFixture()} canMaintain={canMaintain}
    canRecordUsage={false} onCancel={onCancel} onUsageChanged={jest.fn()} /></ul>);
  return { onCancel };
}

describe('ReservationCard', () => {
  it('nombra al responsable con su teléfono', () => {
    renderCard();
    expect(screen.getByText('Responsable:')).toBeInTheDocument();
    expect(screen.getByText(/Juan Pablo · 957351795/)).toBeInTheDocument();
  });

  it('lleva a la ficha de la reserva', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Jardín Rosales' })).toHaveAttribute('href', '/reservas/RES-0001');
  });

  it('anular sigue funcionando por encima del enlace de la tarjeta', async () => {
    const { onCancel } = renderCard();
    await userEvent.click(screen.getByRole('button', { name: 'Anular' }));
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ code: 'RES-0001' }));
  });

  it('sin permiso de mantenimiento no ofrece editar ni anular', () => {
    renderCard(false);
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular' })).not.toBeInTheDocument();
  });
});
