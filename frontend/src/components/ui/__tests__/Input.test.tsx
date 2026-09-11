import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('asocia el label al campo por id, no por placeholder', () => {
    render(<Input id="email" label="Correo" value="" onChange={jest.fn()} />);

    // getByLabelText solo lo encuentra si la asociacion existe de verdad.
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('emite el valor escrito, no el evento', async () => {
    const onChange = jest.fn();
    render(<Input id="nombre" label="Nombre" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'A');

    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('marca el campo requerido para lectores de pantalla y con asterisco', () => {
    render(<Input id="email" label="Correo" value="" onChange={jest.fn()} required />);

    expect(screen.getByLabelText(/Correo/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('entra en estado error y lo asocia con aria-describedby', () => {
    render(
      <Input id="email" label="Correo" value="malo" onChange={jest.fn()}
        errorMessage="Debe ser un correo válido" />,
    );

    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Debe ser un correo válido')).toHaveAttribute('id', 'email-error');
  });

  it('muestra el texto de ayuda cuando no hay error', () => {
    render(
      <Input id="email" label="Correo" value="" onChange={jest.fn()}
        helperText="Usa tu correo institucional" />,
    );

    expect(screen.getByText('Usa tu correo institucional')).toBeInTheDocument();
  });

  it('el error reemplaza al texto de ayuda, no se apilan', () => {
    render(
      <Input id="email" label="Correo" value="" onChange={jest.fn()}
        helperText="Usa tu correo institucional" errorMessage="Campo obligatorio" />,
    );

    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();
    expect(screen.queryByText('Usa tu correo institucional')).not.toBeInTheDocument();
  });

  it('no admite escritura cuando esta deshabilitado', async () => {
    const onChange = jest.fn();
    render(<Input id="nombre" label="Nombre" value="" onChange={onChange} disabled />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'texto');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('respeta el tipo password para no exponer la contrasena', () => {
    render(<Input id="pass" label="Contraseña" value="" onChange={jest.fn()} type="password" />);

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });
});
