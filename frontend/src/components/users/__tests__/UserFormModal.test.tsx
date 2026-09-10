import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserDetail } from '@shared/types';
import { UserFormModal } from '../UserFormModal';

const usuario: UserDetail = {
  id: 4,
  email: 'ana@pucp.edu.pe',
  firstName: 'Ana',
  lastName: 'Torres',
  fullName: 'Ana Torres',
  role: { id: 5, code: 'OPERARIO', label: 'Operario de campo' },
  isActive: true,
  credentialStatus: 'DELIVERED',
  mustChangePassword: false,
  lastLogin: null,
  teams: [],
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

describe('UserFormModal en modo creacion', () => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  const abrir = () =>
    render(<UserFormModal isOpen user={null} onClose={onClose} onSubmit={onSubmit} />);

  it('pide la contrasena inicial, que en el alta si la escribe el administrador', () => {
    abrir();

    expect(screen.getByLabelText(/contraseña inicial/i)).toBeInTheDocument();
  });

  it('envia los cinco campos que espera POST /users', async () => {
    abrir();

    await userEvent.type(screen.getByLabelText(/^correo/i), 'nuevo@pucp.edu.pe');
    await userEvent.type(screen.getByLabelText(/nombres/i), 'Luis');
    await userEvent.type(screen.getByLabelText(/apellidos/i), 'Quispe');
    await userEvent.selectOptions(screen.getByLabelText(/rol/i), 'SUPERVISOR');
    await userEvent.type(screen.getByLabelText(/contraseña inicial/i), 'ClaveValida123');
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'nuevo@pucp.edu.pe',
        firstName: 'Luis',
        lastName: 'Quispe',
        roleCode: 'SUPERVISOR',
        initialPassword: 'ClaveValida123',
      }),
    );
  });

  it('no envia nada si falta un campo obligatorio', async () => {
    abrir();

    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/el correo es obligatorio/i)).toBeInTheDocument();
  });

  it('rechaza una contrasena mas corta que la politica antes de llamar al backend', async () => {
    // Evita un viaje de ida y vuelta para recibir el 400 que ya sabemos que vendra.
    abrir();

    await userEvent.type(screen.getByLabelText(/^correo/i), 'nuevo@pucp.edu.pe');
    await userEvent.type(screen.getByLabelText(/nombres/i), 'Luis');
    await userEvent.type(screen.getByLabelText(/apellidos/i), 'Quispe');
    await userEvent.selectOptions(screen.getByLabelText(/rol/i), 'OPERARIO');
    await userEvent.type(screen.getByLabelText(/contraseña inicial/i), 'corta');
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos 10 caracteres/i)).toBeInTheDocument();
  });

  it('rechaza un correo mal formado sin llamar al backend', async () => {
    abrir();

    await userEvent.type(screen.getByLabelText(/^correo/i), 'no-es-un-correo');
    await userEvent.type(screen.getByLabelText(/nombres/i), 'Luis');
    await userEvent.type(screen.getByLabelText(/apellidos/i), 'Quispe');
    await userEvent.selectOptions(screen.getByLabelText(/rol/i), 'OPERARIO');
    await userEvent.type(screen.getByLabelText(/contraseña inicial/i), 'ClaveValida123');
    await userEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/correo electrónico válido/i)).toBeInTheDocument();
  });
});

describe('UserFormModal en modo edicion', () => {
  const onSubmit = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  const abrir = () =>
    render(<UserFormModal isOpen user={usuario} onClose={onClose} onSubmit={onSubmit} />);

  it('NUNCA muestra un campo de contrasena: la clave de otro no se fija, se regenera', () => {
    // SPEC-100 §2.7. Es la regla mas importante de esta pantalla: si el campo
    // existiera, un administrador podria suplantar a alguien en silencio.
    abrir();

    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
  });

  it('precarga los datos de la persona', () => {
    abrir();

    expect(screen.getByLabelText(/^correo/i)).toHaveValue('ana@pucp.edu.pe');
    expect(screen.getByLabelText(/nombres/i)).toHaveValue('Ana');
    expect(screen.getByLabelText(/apellidos/i)).toHaveValue('Torres');
    expect(screen.getByLabelText(/rol/i)).toHaveValue('OPERARIO');
  });

  it('envia solo los cuatro campos de PUT, sin contrasena', async () => {
    abrir();

    await userEvent.selectOptions(screen.getByLabelText(/rol/i), 'COORDINADOR');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'ana@pucp.edu.pe',
        firstName: 'Ana',
        lastName: 'Torres',
        roleCode: 'COORDINADOR',
      }),
    );
  });

  it('mientras guarda desactiva el boton para no crear dos veces lo mismo', async () => {
    let resolver: (() => void) | undefined;
    onSubmit.mockImplementation(() => new Promise<void>((r) => { resolver = () => r(); }));

    abrir();
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled();
    resolver?.();
  });
});
