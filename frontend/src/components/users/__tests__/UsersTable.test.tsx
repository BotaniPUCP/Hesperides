import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserDetail } from '@shared/types';
import { UsersTable } from '../UsersTable';

function usuario(overrides: Partial<UserDetail> = {}): UserDetail {
  return {
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
    ...overrides,
  };
}

const acciones = {
  onEdit: jest.fn(),
  onDeactivate: jest.fn(),
  onReactivate: jest.fn(),
  onResendCredentials: jest.fn(),
  onMarkDelivered: jest.fn(),
};

function montar(rows: UserDetail[], extra: Partial<React.ComponentProps<typeof UsersTable>> = {}) {
  return render(
    <UsersTable
      rows={rows}
      totalElements={rows.length}
      page={0}
      onPageChange={jest.fn()}
      canManage
      {...acciones}
      {...extra}
    />,
  );
}

describe('UsersTable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('muestra el nombre, el correo y el rol traducido', () => {
    montar([usuario()]);

    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('ana@pucp.edu.pe')).toBeInTheDocument();
    expect(screen.getByText('Operario de campo')).toBeInTheDocument();
  });

  it('ofrece desactivar a quien esta activo, y reactivar a quien no', async () => {
    montar([usuario({ id: 1, isActive: true }), usuario({ id: 2, isActive: false })]);

    expect(screen.getByRole('button', { name: /desactivar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactivar/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /desactivar/i }));
    expect(acciones.onDeactivate).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('solo ofrece marcar como entregado cuando la entrega esta pendiente', () => {
    const { unmount } = montar([usuario({ credentialStatus: 'DELIVERED' })]);
    expect(screen.queryByRole('button', { name: /marcar como entregad/i })).not.toBeInTheDocument();
    unmount();

    montar([usuario({ credentialStatus: 'PENDING_DELIVERY' })]);
    expect(screen.getByRole('button', { name: /marcar como entregad/i })).toBeInTheDocument();
  });

  it('marca visualmente a quien esta inactivo', () => {
    montar([usuario({ isActive: false })]);

    expect(screen.getByText(/inactivo/i)).toBeInTheDocument();
  });

  it('sin permiso de gestion no ofrece ninguna accion de escritura', () => {
    // Un COORDINADOR o SUPERVISOR puede leer el listado, pero solo un ADMIN
    // escribe (matriz del Anexo A de SPEC-001). Mostrar botones que devuelven
    // 403 es enseñar una puerta cerrada.
    montar([usuario()], { canManage: false });

    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });

  it('permite reenviar credenciales y editar', async () => {
    montar([usuario()]);

    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(acciones.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));

    await userEvent.click(screen.getByRole('button', { name: /reenviar/i }));
    expect(acciones.onResendCredentials).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
  });

  it('muestra un vacio con sentido cuando no hay resultados', () => {
    montar([]);

    expect(screen.getByText(/no se encontraron usuarios/i)).toBeInTheDocument();
  });
});
