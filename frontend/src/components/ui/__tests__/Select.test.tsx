import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';
import type { SelectOption } from '../Select';

const OPCIONES: SelectOption[] = [
  { id: 1, code: 'ADMIN', label: 'Administrador' },
  { id: 2, code: 'COORDINADOR', label: 'Coordinador' },
  { id: 3, code: 'OPERARIO', label: 'Operario de campo' },
];

describe('Select', () => {
  it('asocia el label al control', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByLabelText('Rol')).toBeInTheDocument();
  });

  it('muestra el placeholder cuando no hay valor', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByText('Seleccione una opción')).toBeInTheDocument();
  });

  it('selecciona comparando por code, no por id', async () => {
    const onChange = jest.fn();
    render(<Select id="rol" label="Rol" value={null} onChange={onChange} options={OPCIONES} />);

    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'COORDINADOR');

    expect(onChange).toHaveBeenCalledWith(OPCIONES[1]);
  });

  it('refleja el valor seleccionado por su code', () => {
    render(<Select id="rol" label="Rol" value="OPERARIO" onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByLabelText('Rol')).toHaveValue('OPERARIO');
  });

  it('emite null cuando se limpia la seleccion', async () => {
    const onChange = jest.fn();
    render(
      <Select id="rol" label="Rol" value="ADMIN" onChange={onChange} options={OPCIONES} clearable />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Rol'), '');

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('muestra un skeleton mientras cargan las opciones', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={[]} loading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('entra en estado error y lo asocia con aria-describedby', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES}
        errorMessage="Debe elegir un rol" />,
    );

    const select = screen.getByLabelText('Rol');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'rol-error');
  });

  it('marca el requerido para lectores de pantalla', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} required />,
    );

    expect(screen.getByLabelText(/Rol/)).toHaveAttribute('aria-required', 'true');
  });

  it('no admite cambios cuando esta deshabilitado', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} disabled />,
    );

    expect(screen.getByLabelText('Rol')).toBeDisabled();
  });
});
