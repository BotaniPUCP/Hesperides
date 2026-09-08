import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api';
import { UserFormModal } from '../UserFormModal';
import { ROLES, makeUser } from '../fixtures';

const COMPLIANT_PASSWORD = 'ClaveSuperior2026';

function validValue(overrides: Record<string, string> = {}) {
  return {
    email: 'ana.torres@pucp.edu.pe',
    firstName: 'Ana',
    lastName: 'Torres',
    roleCode: 'SUPERVISOR',
    initialPassword: COMPLIANT_PASSWORD,
    ...overrides,
  };
}

describe('UserFormModal', () => {
  const baseProps = (overrides: Record<string, unknown> = {}) => ({
    isOpen: true,
    onClose: jest.fn(),
    mode: 'create' as const,
    user: null,
    roles: ROLES,
    rolesLoading: false,
    onSubmit: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  function fill(screenElements: typeof screen, overrides: string[][] = []) {
    for (const [label, value] of overrides) {
      fireEvent.change(screenElements.getByLabelText(new RegExp(`^${label}`, 'i')), { target: { value } });
    }
  }

  function fillValid() {
    fill(screen, [
      ['Correo institucional', validValue().email],
      ['Nombre', validValue().firstName],
      ['Apellido', validValue().lastName],
      ['Rol', 'SUPERVISOR'],
      ['Contraseña inicial', COMPLIANT_PASSWORD],
    ]);
  }

  it('llama a la API con el payload correcto cuando los datos son válidos', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<UserFormModal {...baseProps({ onSubmit })} />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: validValue().email,
        firstName: 'Ana',
        lastName: 'Torres',
        roleCode: 'SUPERVISOR',
        initialPassword: COMPLIANT_PASSWORD,
      }),
    );
  });

  it('marca un correo inválido en línea sin llamar a la API', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<UserFormModal {...baseProps({ onSubmit })} />);
    fillValid();
    fireEvent.change(screen.getByLabelText(/^Correo institucional/i), { target: { value: 'correo-invalido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(screen.getByText('Debe ser un correo electrónico válido')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra errores en línea cuando faltan campos requeridos', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<UserFormModal {...baseProps({ onSubmit })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(screen.getByText('El correo es requerido')).toBeInTheDocument();
    expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    expect(screen.getByText('El apellido es requerido')).toBeInTheDocument();
    expect(screen.getByText('El rol es requerido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña inicial es requerida')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('deshabilita el botón tras el primer clic mientras se envía', async () => {
    let resolveSubmit!: () => void;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<UserFormModal {...baseProps({ onSubmit })} />);
    fillValid();

    const submitButton = screen.getByRole('button', { name: 'Crear usuario' });
    fireEvent.click(submitButton);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => resolveSubmit());
  });

  it('no muestra el campo de contraseña en modo edición', () => {
    const user = makeUser({ id: 1, email: 'ana@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' });
    render(<UserFormModal {...baseProps({ mode: 'edit', user })} />);

    expect(screen.queryByLabelText(/^Contraseña inicial/i)).not.toBeInTheDocument();
    expect(screen.getByText(/La contraseña no se cambia desde aquí/i)).toBeInTheDocument();
  });

  it('muestra el error del correo duplicado sin cerrar el modal', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'Email already in use', { errors: [{ field: 'email', message: 'El correo ya está en uso' }] }),
      );
    render(<UserFormModal {...baseProps({ onSubmit })} />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    await waitFor(() => expect(screen.getByText('Este correo ya está registrado')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
  });
});