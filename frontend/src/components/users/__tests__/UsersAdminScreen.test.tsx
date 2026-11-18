import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserDetail } from '@shared/types';
import { UsersAdminScreen } from '../UsersAdminScreen';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { usersApi } from '@/lib/users-api';
import { notifyWrite } from '@/lib/writeEvents';

import { __resetCatalogCache } from '@/hooks/useCatalog';

jest.mock('@/lib/catalogs-api');
jest.mock('@/lib/system-parameters-api');

jest.mock('@/lib/users-api', () => ({
  usersApi: {
    all: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    reactivate: jest.fn(),
    resendCredentials: jest.fn(),
    markCredentialsDelivered: jest.fn(),
  },
}));

let rolDeLaSesion = 'ADMIN';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'admin@pucp.edu.pe',
      fullName: 'Administrador Hesperides',
      role: { id: 1, code: rolDeLaSesion, label: rolDeLaSesion },
    },
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshSession: jest.fn(),
  }),
}));

const list = usersApi.all as jest.Mock;
const create = usersApi.create as jest.Mock;
const deactivate = usersApi.deactivate as jest.Mock;

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
    searchKey: 'ana torres ana@pucp.edu.pe',
    ...overrides,
  };
}

function montar() {
  return render(
    <ToastProvider>
      <UsersAdminScreen />
    </ToastProvider>,
  );
}

/**
 * Llena el alta dentro del modal. Se acota al dialogo porque la pantalla tiene
 * dos campos "Rol" a la vez: el filtro del listado y el del formulario.
 */
async function llenarAlta(datos: { email: string }) {
  const dialogo = screen.getByRole('dialog');
  await userEvent.type(within(dialogo).getByLabelText(/^correo/i), datos.email);
  await userEvent.type(within(dialogo).getByLabelText(/nombres/i), 'Luis');
  await userEvent.type(within(dialogo).getByLabelText(/apellidos/i), 'Quispe');
  await userEvent.selectOptions(within(dialogo).getByLabelText(/rol/i), 'OPERARIO');
  await userEvent.type(within(dialogo).getByLabelText(/contraseña inicial/i), 'JardinSeguro7');
  await userEvent.click(within(dialogo).getByRole('button', { name: /crear usuario/i }));
}

/** Espera a que termine la primera consulta para no medir el render intermedio. */
async function montarYEsperar() {
  const utilidades = montar();
  expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
  return utilidades;
}

describe('UsersAdminScreen', () => {
  beforeEach(() => {
    __resetCatalogCache();
    jest.clearAllMocks();
    rolDeLaSesion = 'ADMIN';
    list.mockResolvedValue([usuario()]);
  });

  it('abre mostrando solo las cuentas activas', async () => {
    // Es lo que se necesita el 95% de las veces (§7.1); el 5% restante lo cubre
    // el vacio, que ofrece mirar entre los desactivados.
    list.mockResolvedValue([usuario(), usuario({ id: 6, fullName: 'Luis Gómez', isActive: false })]);
    await montarYEsperar();

    expect(screen.queryByText('Luis Gómez')).not.toBeInTheDocument();
  });

  it('no repite un enlace de vuelta al inicio: esa navegación la da el sidebar', async () => {
    await montarYEsperar();

    expect(screen.queryByRole('link', { name: /volver al inicio/i })).not.toBeInTheDocument();
  });

  it('busca en la lista cargada mientras se escribe, sin consultar por letra (SPEC-119)', async () => {
    list.mockResolvedValue([usuario(), usuario({ id: 7, fullName: 'Rosa Núñez', searchKey: 'rosa nunez rosa@pucp.edu.pe' })]);
    await montarYEsperar();

    await userEvent.type(screen.getByLabelText(/buscar/i), 'NUÑEZ');

    expect(await screen.findByText('Rosa Núñez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Torres')).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('a un COORDINADOR le deja leer el listado pero no le ofrece escribir', async () => {
    // Matriz del Anexo A de SPEC-001: leer si, escribir no. Mostrar botones que
    // devuelven 403 es ensenar una puerta cerrada.
    rolDeLaSesion = 'COORDINADOR';
    await montarYEsperar();

    expect(screen.queryByRole('button', { name: /nuevo usuario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('a un OPERARIO no le pide siquiera el listado', async () => {
    rolDeLaSesion = 'OPERARIO';
    montar();

    expect(await screen.findByText(/no tienes permisos/i)).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('crea un usuario y refresca el listado', async () => {
    // Como apiClient tras una escritura exitosa: la lista se recarga sola (SPEC-119 D-03).
    create.mockImplementation(async () => {
      notifyWrite('/users');
      return usuario({ id: 9, email: 'nuevo@pucp.edu.pe' });
    });
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await llenarAlta({ email: 'nuevo@pucp.edu.pe' });

    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('avisa cuando la cuenta se creo pero el correo no salio', async () => {
    // La cuenta existe: el envio queda fuera de la transaccion a proposito
    // (§5.3). Por eso es una advertencia con accion correctiva, no un error.
    create.mockResolvedValue(usuario({ id: 9, credentialStatus: 'PENDING_DELIVERY' }));
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await llenarAlta({ email: 'nuevo@pucp.edu.pe' });

    expect(await screen.findByText(/no se pudo enviar el correo/i)).toBeInTheDocument();
    // El aviso dice que hacer, no solo que fallo: la cuenta existe y hay una
    // via de recuperacion.
    expect(screen.getByText(/comunícale su contraseña/i)).toBeInTheDocument();
  });

  it('ante un correo repetido deja el modal abierto con lo escrito', async () => {
    // Cerrarlo obligaria a reescribir los cuatro campos correctos para
    // arreglar el unico que no lo estaba (§5.4).
    create.mockRejectedValue(new ApiError(409, 'Email already registered'));
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await llenarAlta({ email: 'ana@pucp.edu.pe' });

    expect(await screen.findByText('Ya existe un usuario con ese correo')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText(/nombres/i)).toHaveValue('Luis');
  });

  it('pide confirmacion nombrando a la persona antes de desactivarla', async () => {
    deactivate.mockImplementation(async () => {
      notifyWrite('/users/4/deactivate');
      return usuario({ isActive: false });
    });
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /desactivar/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/Ana Torres/)).toBeInTheDocument();
    expect(deactivate).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: /desactivar/i }));

    await waitFor(() => expect(deactivate).toHaveBeenCalledWith(4));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('mantiene la pregunta con el boton en carga mientras la accion viaja', async () => {
    // Cerrar al primer clic dejaria la pantalla sin senal de que algo pasa, y
    // un segundo reenvio generaria una contrasena que invalida la recien
    // enviada por correo (§5.4).
    let resolver: (() => void) | undefined;
    deactivate.mockImplementation(
      () => new Promise((r) => { resolver = () => r(usuario({ isActive: false })); }),
    );
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /desactivar la cuenta/i }));
    const dialogo = await screen.findByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desactivar' }));

    expect(within(dialogo).getByRole('button', { name: 'Desactivar' })).toBeDisabled();
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await act(async () => resolver?.());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('advierte que reenviar invalida la contrasena anterior', async () => {
    // Es el caso mas delicado del modulo: si el correo no llega, esa persona
    // se queda fuera del sistema (§5.4).
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /reenviar credenciales/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/dejará de funcionar/i)).toBeInTheDocument();
  });

  it('explica todo lo que implica reenviar y no envia nada hasta confirmar', async () => {
    await montarYEsperar();

    await userEvent.click(screen.getByRole('button', { name: /reenviar credenciales a ana torres/i }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/contraseña temporal nueva/i)).toBeInTheDocument();
    expect(within(dialogo).getByText(/se cerrarán sus sesiones/i)).toBeInTheDocument();
    expect(within(dialogo).getByText(/ana@pucp\.edu\.pe/i)).toBeInTheDocument();
    expect(within(dialogo).getByText(/deberá cambiarla/i)).toBeInTheDocument();
    expect(usersApi.resendCredentials).not.toHaveBeenCalled();
  });

  it('no ofrece reenviar credenciales ni desactivar en la cuenta de la sesion', async () => {
    list.mockResolvedValue([usuario({ id: 1, fullName: 'Administrador Hesperides' }), usuario()]);
    await montarYEsperar();

    expect(
      screen.queryByRole('button', { name: /reenviar credenciales a administrador/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /desactivar la cuenta de administrador/i }),
    ).not.toBeInTheDocument();
  });

  it('cuando el filtro esconde a los desactivados, el vacio ofrece mirar ahi', async () => {
    // Sin esta salida, quien no encuentra a alguien recien dado de baja acaba
    // creandolo otra vez y se topa con un 409 confuso (§5.5).
    list.mockResolvedValue([usuario({ isActive: false })]);
    montar();

    const boton = await screen.findByRole('button', { name: /también entre los desactivados/i });
    await userEvent.click(boton);

    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
  });

  it('un fallo del listado se muestra en la pantalla y se puede reintentar', async () => {
    list.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.'));
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/sin conexión/i);

    list.mockResolvedValue([usuario()]);
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
  });
});
