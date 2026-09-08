import { render, screen } from '@testing-library/react';
import { UsersTable } from '../UsersTable';
import { makeUser } from '../fixtures';

const noop = () => undefined;

function userRow(overrides: Parameters<typeof makeUser>[0]) {
  return makeUser(overrides);
}

describe('UsersTable', () => {
  it('muestra las filas con nombre, correo y datos de estado', () => {
    const users = [
      userRow({ id: 1, email: 'a@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' }),
      userRow({ id: 2, email: 'b@pucp.edu.pe', firstName: 'Luis', lastName: 'Paredes' }),
    ];
    render(
      <UsersTable
        users={users}
        totalElements={2}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.getByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('a@pucp.edu.pe')).toBeInTheDocument();
    expect(screen.getByText('Luis Paredes')).toBeInTheDocument();
  });

  it('muestra el esqueleto mientras carga', () => {
    render(
      <UsersTable
        users={[]}
        totalElements={0}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={true}
        isAdmin={false}
      />,
    );
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra el estado vacío cuando no hay filas', () => {
    render(
      <UsersTable
        users={[]}
        totalElements={0}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.getByText('Sin usuarios')).toBeInTheDocument();
  });

  it('muestra el badge ámbar de credenciales solo en PENDING_DELIVERY', () => {
    const { rerender } = render(
      <UsersTable
        users={[userRow({ id: 1, email: 'a@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' })]}
        totalElements={1}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.queryByText('Correo no entregado')).not.toBeInTheDocument();

    rerender(
      <UsersTable
        users={[
          userRow({
            id: 1,
            email: 'a@pucp.edu.pe',
            firstName: 'Ana',
            lastName: 'Torres',
            credentialStatus: 'PENDING_DELIVERY',
          }),
        ]}
        totalElements={1}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.getByText('Correo no entregado')).toBeInTheDocument();
  });

  it('no muestra la columna de acciones para roles que no son ADMIN', () => {
    render(
      <UsersTable
        users={[userRow({ id: 1, email: 'a@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' })]}
        totalElements={1}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('muestra "Nunca" cuando no hay último ingreso', () => {
    render(
      <UsersTable
        users={[userRow({ id: 1, email: 'a@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres', lastLogin: null })]}
        totalElements={1}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={false}
      />,
    );
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('expone las acciones solo para ADMIN', () => {
    render(
      <UsersTable
        users={[userRow({ id: 1, email: 'a@pucp.edu.pe', firstName: 'Ana', lastName: 'Torres' })]}
        totalElements={1}
        page={0}
        pageSize={20}
        onPageChange={noop}
        isLoading={false}
        isAdmin={true}
        onEdit={noop}
        onDeactivate={noop}
        onResend={noop}
      />,
    );
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar credenciales' })).toBeInTheDocument();
  });
});