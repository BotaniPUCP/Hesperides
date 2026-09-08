import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { LoginForm } from '../LoginForm';

const login = jest.fn();
const mockAuth = { user: null, isLoading: false, login, logout: jest.fn() };

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockResolvedValue(undefined);
  });

  async function completarFormulario(correo = 'admin@pucp.edu.pe', clave = 'Hesperides2026') {
    await userEvent.type(screen.getByLabelText(/Correo/), correo);
    await userEvent.type(screen.getByLabelText(/Contraseña/), clave);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  }

  it('renderiza los dos campos y el boton', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/Correo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('oculta la contrasena mientras se escribe', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('type', 'password');
  });

  it('envia las credenciales y redirige al inicio', async () => {
    render(<LoginForm />);

    await completarFormulario();

    expect(login).toHaveBeenCalledWith('admin@pucp.edu.pe', 'Hesperides2026');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('no envia el formulario con campos vacios', async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
  });

  it('valida el formato del correo antes de llamar a la API', async () => {
    render(<LoginForm />);

    await completarFormulario('esto-no-es-un-correo');

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument();
  });

  it('traduce el 401 a un mensaje entendible', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  });

  it('explica el bloqueo por intentos cuando el backend responde 429', async () => {
    login.mockRejectedValue(new ApiError(429, 'Too many failed attempts. Try again later'));
    render(<LoginForm />);

    await completarFormulario();

    expect(
      await screen.findByText('Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('muestra el fallo de red tal cual', async () => {
    login.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByText('Sin conexión. Verifique su red.')).toBeInTheDocument();
  });

  it('el error se anuncia como alerta, no como toast', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('limpia el error anterior al reintentar', async () => {
    login.mockRejectedValueOnce(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();

    login.mockResolvedValue(undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.queryByText('Correo o contraseña incorrectos')).not.toBeInTheDocument();
  });

  it('deshabilita el boton mientras la peticion esta en curso', async () => {
    let resolver: () => void = () => {};
    login.mockReturnValue(
      new Promise<void>((resolve) => {
        resolver = resolve;
      }),
    );
    render(<LoginForm />);

    await completarFormulario();

    expect(screen.getByRole('button', { name: /Iniciar sesión/ })).toBeDisabled();

    resolver();
  });
});
