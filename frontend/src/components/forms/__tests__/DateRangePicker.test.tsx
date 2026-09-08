import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('renderiza los dos campos con sus etiquetas', () => {
    render(
      <DateRangePicker label="Período" value={{ from: null, to: null }} onChange={jest.fn()} />,
    );

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('emite el rango completo al cambiar la fecha inicial', async () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker label="Período" value={{ from: null, to: '2026-09-30' }} onChange={onChange} />,
    );

    await userEvent.type(screen.getByLabelText('Desde'), '2026-09-01');

    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('avisa cuando la fecha final es anterior a la inicial', () => {
    render(
      <DateRangePicker
        label="Período"
        value={{ from: '2026-09-30', to: '2026-09-01' }}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText('La fecha final no puede ser anterior a la inicial')).toBeInTheDocument();
  });

  it('no avisa cuando el rango es valido', () => {
    render(
      <DateRangePicker
        label="Período"
        value={{ from: '2026-09-01', to: '2026-09-30' }}
        onChange={jest.fn()}
      />,
    );

    expect(
      screen.queryByText('La fecha final no puede ser anterior a la inicial'),
    ).not.toBeInTheDocument();
  });

  it('muestra el error externo que le pasen', () => {
    render(
      <DateRangePicker
        label="Período"
        value={{ from: null, to: null }}
        onChange={jest.fn()}
        errorMessage="El período es obligatorio"
      />,
    );

    expect(screen.getByText('El período es obligatorio')).toBeInTheDocument();
  });

  it('aplica un preset al pulsarlo', async () => {
    const onChange = jest.fn();
    const preset = { label: 'Este mes', range: { from: '2026-09-01', to: '2026-09-30' } };
    render(
      <DateRangePicker
        label="Período"
        value={{ from: null, to: null }}
        onChange={onChange}
        presets={[preset]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Este mes' }));

    expect(onChange).toHaveBeenCalledWith(preset.range);
  });

  it('deshabilita ambos campos cuando corresponde', () => {
    render(
      <DateRangePicker
        label="Período"
        value={{ from: null, to: null }}
        onChange={jest.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText('Desde')).toBeDisabled();
    expect(screen.getByLabelText('Hasta')).toBeDisabled();
  });
});
