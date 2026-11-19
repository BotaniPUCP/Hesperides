import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reservationsApi } from '@/lib/reservations-api';
import { ResponsibleChangeForm } from '../ResponsibleChangeForm';
import { reservationFixture } from '../__fixtures__/reservation';

jest.mock('@/lib/reservations-api', () => ({
  reservationsApi: { changeResponsible: jest.fn() },
}));

// El selector real busca en el Directorio; aquí basta con poder elegir a otra persona.
jest.mock('@/components/directorio/ContactPicker', () => ({
  ContactPicker: ({ label, value, onChange }: {
    label: string; value: { fullName: string } | null;
    onChange: (next: { code: string; fullName: string }) => void;
  }) => (
    <div>
      <span>{label}: {value?.fullName ?? 'nadie'}</span>
      <button type="button" onClick={() => onChange({ code: 'CON-0019', fullName: 'María Quispe' })}>
        Elegir a María
      </button>
    </div>
  ),
}));

const changeResponsible = reservationsApi.changeResponsible as jest.Mock;

describe('ResponsibleChangeForm', () => {
  beforeEach(() => changeResponsible.mockReset());

  it('muestra jardín, horario y quién pidió como texto: solo el responsable es un campo', () => {
    render(<ResponsibleChangeForm reservation={reservationFixture()} onSaved={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText('Jardín Rosales')).toBeInTheDocument();
    expect(screen.getByText(/09:00–11:00/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fecha|Hora/)).not.toBeInTheDocument();
    expect(screen.getByText('Responsable: Juan Pablo')).toBeInTheDocument();
  });

  it('guarda solo el responsable nuevo con la versión de la reserva', async () => {
    const saved = reservationFixture({ version: 1 });
    changeResponsible.mockResolvedValue(saved);
    const onSaved = jest.fn();
    render(<ResponsibleChangeForm reservation={reservationFixture()} onSaved={onSaved} onCancel={jest.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Elegir a María' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar responsable' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(changeResponsible).toHaveBeenCalledWith('RES-0001', 'CON-0019', 0);
  });
});
