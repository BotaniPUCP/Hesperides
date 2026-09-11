import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from '../ChangePasswordForm';
import { ApiError } from '@/lib/api';
import { usersApi } from '@/lib/users-api';

jest.mock('@/lib/users-api', () => ({
  usersApi: { changeOwnPassword: jest.fn() },
}));

const push = jest.fn();
const refreshSession = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => '/cambiar-password',
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      email: 'ana@pucp.edu.pe',
      firstName: 'Ana',
      lastName: 'Torres',
      fullName: 'Ana Torres',
      mustChangePassword: true,
    },
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshSession,
  }),
}));

const cambiar = usersApi.changeOwnPassword as jest.Mock;

// Cumple los seis requisitos de §9.1 y no contiene "ana" ni "torres".
const CLAVE_VALIDA = 'JardinSeguro7';

const boton = () => screen.getByRole('button', { name: /cambiar contraseña/i });

async function llenar(nueva: string, repetida = nueva) {
  await userEvent.type(screen.getByLabelText(/contraseña actual/i), 'Temporal123');
  await userEvent.type(screen.getByLabelText(/^contraseña nueva/i), nueva);
  await userEvent.type(screen.getByLabelText(/repite la contraseña/i), repetida);
}

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cambiar.mockResolvedValue(null);
    refreshSession.mockResolvedValue(undefined);
  });

  it('no deja enviar hasta que la contrasena nueva cumple la politica', async () => {
    // El boton no promete un envio que el backend rechazaria con un 400.
    render(<ChangePasswordForm />);
    expect(boton()).toBeDisabled();

    await llenar('minusculas1');
    expect(boton()).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/^contraseña nueva/i));
    await userEvent.clear(screen.getByLabelText(/repite la contraseña/i));
    await userEvent.type(screen.getByLabelText(/^contraseña nueva/i), CLAVE_VALIDA);
    await userEvent.type(screen.getByLabelText(/repite la contraseña/i), CLAVE_VALIDA);

    expect(boton()).toBeEnabled();
  });

  it('rechaza una contrasena que contiene el nombre de su dueno', async () => {
    // Es de las primeras que prueba quien conoce a la persona (§9.1).
    render(<ChangePasswordForm />);

    await llenar('AnaSegura2026');

    expect(boton()).toBeDisabled();
    expect(screen.getByTestId('password-rule-noPersonalData')).toHaveAttribute('data-met', 'false');
  });

  it('avisa mientras se escribe si las dos copias no coinciden', async () => {
    render(<ChangePasswordForm />);

    await llenar(CLAVE_VALIDA, 'JardinSeguro8');

    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
    expect(boton()).toBeDisabled();
    expect(cambiar).not.toHaveBeenCalled();
  });

  it('marca en verde cada requisito conforme se cumple', async () => {
    render(<ChangePasswordForm />);

    expect(screen.getByTestId('password-rule-digit')).toHaveAttribute('data-met', 'false');

    await userEvent.type(screen.getByLabelText(/^contraseña nueva/i), CLAVE_VALIDA);

    expect(screen.getByTestId('password-rule-digit')).toHaveAttribute('data-met', 'true');
    expect(screen.getByTestId('password-rule-uppercase')).toHaveAttribute('data-met', 'true');
  });

  it('envia las dos contrasenas, relee la sesion y lleva al inicio', async () => {
    render(<ChangePasswordForm />);

    await llenar(CLAVE_VALIDA);
    await userEvent.click(boton());

    await waitFor(() =>
      expect(cambiar).toHaveBeenCalledWith({
        currentPassword: 'Temporal123',
        newPassword: CLAVE_VALIDA,
      }),
    );

    // Sin releer /auth/me, mustChangePassword seguiria en true en esta pestana
    // y RouteGuard devolveria a la misma pantalla recien completada.
    await waitFor(() => expect(refreshSession).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/');
  });

  it('ante un 400 senala la contrasena actual, no el formulario entero', async () => {
    cambiar.mockRejectedValue(new ApiError(400, 'Current password is incorrect'));
    render(<ChangePasswordForm />);

    await llenar(CLAVE_VALIDA);
    await userEvent.click(boton());

    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('traduce la regla de negocio del 422 en vez de mostrar el ingles del backend', async () => {
    cambiar.mockRejectedValue(
      new ApiError(422, 'New password must be different from the current one'),
    );
    render(<ChangePasswordForm />);

    await llenar(CLAVE_VALIDA);
    await userEvent.click(boton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/distinta de la actual/i);
  });

  it('no ofrece salir mientras el cambio es obligatorio', () => {
    // Cualquier otra ruta responde 403 (PasswordChangeRequiredFilter): el
    // enlace seria una salida que no existe.
    render(<ChangePasswordForm />);

    expect(screen.queryByRole('link', { name: /volver al inicio/i })).not.toBeInTheDocument();
  });
});
