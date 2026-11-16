import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MachineryField, machineryAfterTypeChange } from '../MachineryField';
import { campusEventsApi } from '@/lib/campus-events-api';

jest.mock('@/lib/campus-events-api', () => ({ campusEventsApi: { occurrences: jest.fn() } }));
const occurrences = campusEventsApi.occurrences as jest.Mock;

const TUESDAY = '2026-11-24';
const SATURDAY = '2026-11-21';
const WARNING = 'La maquinaria de corte solo se programa sábados, domingos o feriados.';

beforeEach(() => occurrences.mockReset());

describe('la sugerencia por tipo (SPEC-115 D-01)', () => {
  it('un tipo que la sugiere marca la casilla si nadie la tocó', () => {
    expect(machineryAfterTypeChange({ checked: false, touched: false }, true)).toBe(true);
  });

  it('lo que la persona marcó o desmarcó a mano se respeta', () => {
    expect(machineryAfterTypeChange({ checked: false, touched: true }, true)).toBe(false);
    expect(machineryAfterTypeChange({ checked: true, touched: true }, false)).toBe(true);
  });

  it('cambiar a un tipo que no la sugiere no la desmarca', () => {
    expect(machineryAfterTypeChange({ checked: true, touched: false }, false)).toBe(true);
  });
});

describe('MachineryField (SPEC-115 §5.2)', () => {
  it('con la casilla y un martes que no es feriado, avisa bajo la fecha', async () => {
    occurrences.mockResolvedValue([]);
    render(<MachineryField date={TUESDAY} checked onChange={jest.fn()} />);

    expect(await screen.findByText(WARNING)).toBeInTheDocument();
    expect(occurrences).toHaveBeenCalledWith(TUESDAY, TUESDAY, 'HOLIDAY');
  });

  it('un martes feriado no avisa', async () => {
    occurrences.mockResolvedValue([{ date: TUESDAY, typeCode: 'HOLIDAY' }]);
    render(<MachineryField date={TUESDAY} checked onChange={jest.fn()} />);

    await waitFor(() => expect(occurrences).toHaveBeenCalled());
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('un sábado no consulta ni avisa; sin la casilla tampoco', () => {
    render(<MachineryField date={SATURDAY} checked onChange={jest.fn()} />);
    render(<MachineryField date={TUESDAY} checked={false} onChange={jest.fn()} />);

    expect(occurrences).not.toHaveBeenCalled();
    expect(screen.queryByText(WARNING)).not.toBeInTheDocument();
  });

  it('marcar la casilla avisa al formulario', () => {
    const onChange = jest.fn();
    render(<MachineryField date={SATURDAY} checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText(/Usa maquinaria de corte/));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
