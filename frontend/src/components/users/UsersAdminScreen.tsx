'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CreateUserPayload, UpdateUserPayload, UserDetail, UserFilters } from '@shared/types';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useUserMutations } from '@/hooks/useUserMutations';
import { useUsers } from '@/hooks/useUsers';
import { ConfirmActionModal } from './ConfirmActionModal';
import { UserFiltersBar } from './UserFiltersBar';
import { UserFormModal } from './UserFormModal';
import { UsersTable } from './UsersTable';

/** Anexo A de SPEC-001: tres roles leen el listado, uno solo escribe. */
const ROLES_CON_LECTURA = ['ADMIN', 'COORDINADOR', 'SUPERVISOR'];
const ROL_QUE_ADMINISTRA = 'ADMIN';

/**
 * "Activos" preseleccionado (§7.1). Es lo que se necesita el 95% de las veces;
 * el 5% restante lo cubre el propio vacío, que ofrece mirar entre los
 * desactivados en vez de dejar a quien busca creyendo que la persona no existe.
 */
const FILTROS_INICIALES: UserFilters = { isActive: true };

type Confirmacion = { tipo: 'desactivar' | 'reenviar'; user: UserDetail };

export function UsersAdminScreen() {
  const { user } = useAuth();
  const rol = user?.role.code ?? '';

  // El backend responde 403 igual (@PreAuthorize en UsersController); esto solo
  // evita pedir un listado que ya se sabe que no llegará, y lo explica mejor de
  // lo que lo haría un toast de error suelto.
  if (!ROLES_CON_LECTURA.includes(rol)) {
    return (
      <EmptyState
        title="No tienes permisos para ver esta pantalla"
        description="La gestión de usuarios está reservada a la administración del sistema."
      />
    );
  }

  return <PanelDeUsuarios canManage={rol === ROL_QUE_ADMINISTRA} />;
}

function PanelDeUsuarios({ canManage }: { canManage: boolean }) {
  const [filters, setFilters] = useState<UserFilters>(FILTROS_INICIALES);
  const [page, setPage] = useState(0);
  // `apertura` cuenta las veces que se abrió el formulario y se usa como `key`:
  // cada apertura remonta el modal y por tanto lo devuelve a sus valores
  // iniciales. Sin ella, reabrir la ficha de la misma persona tras haber
  // escrito y cancelado mostraría lo tecleado la vez anterior.
  const [formulario, setFormulario] = useState<{
    abierto: boolean;
    user: UserDetail | null;
    apertura: number;
  }>({ abierto: false, user: null, apertura: 0 });
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  const { rows, totalElements, isLoading, errorMessage, refresh } = useUsers(filters, page);
  const mutations = useUserMutations(refresh);

  // Cambiar un filtro vuelve a la primera página: quedarse en la cuarta de un
  // resultado que ahora tiene una sola deja una tabla vacía que parece un fallo
  // del sistema.
  const cambiarFiltros = (siguientes: UserFilters) => {
    setFilters(siguientes);
    setPage(0);
  };

  const incluirDesactivados = () => {
    const siguientes = { ...filters };
    delete siguientes.isActive;
    cambiarFiltros(siguientes);
  };

  const abrirAlta = () =>
    setFormulario((actual) => ({ abierto: true, user: null, apertura: actual.apertura + 1 }));
  const abrirEdicion = (user: UserDetail) =>
    setFormulario((actual) => ({ abierto: true, user, apertura: actual.apertura + 1 }));
  const cerrarFormulario = () => setFormulario((actual) => ({ ...actual, abierto: false }));

  /**
   * No captura el error a propósito: el modal lo recibe, lo pinta en el campo
   * que corresponde y se queda abierto con lo ya escrito (§5.4). Cerrarlo aquí
   * antes de saber si salió bien perdería el formulario entero ante un 409.
   */
  const guardar = async (payload: CreateUserPayload | UpdateUserPayload) => {
    if (formulario.user === null) {
      await mutations.create(payload as CreateUserPayload);
    } else {
      await mutations.update(formulario.user.id, payload as UpdateUserPayload);
    }
    cerrarFormulario();
  };

  /**
   * El modal se queda abierto —con el botón en estado de carga— hasta que la
   * respuesta llega. Cerrarlo al primer clic dejaría la pantalla sin señal de
   * que algo está pasando, y un segundo reenvío de credenciales generaría una
   * contraseña nueva que invalida la que acaba de salir por correo (§5.4).
   */
  const confirmar = async () => {
    if (confirmacion === null) return;
    const { tipo, user } = confirmacion;

    if (tipo === 'desactivar') {
      await mutations.deactivate(user);
    } else {
      await mutations.resendCredentials(user);
    }

    // Las mutaciones de fila no lanzan: avisan con un toast. Así que aquí ya
    // se sabe que el intento terminó, con éxito o no, y la pregunta sobra.
    setConfirmacion(null);
  };

  const hayFiltrosDeBusqueda =
    (filters.search ?? '') !== '' || (filters.roleCode ?? '') !== '' || filters.teamId !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Usuarios</h1>
          <p className="text-sm text-neutral-500">
            Cuentas del personal con acceso al sistema de áreas verdes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Volver al inicio
          </Link>
          {canManage && <Button onClick={abrirAlta}>Nuevo usuario</Button>}
        </div>
      </header>

      <UserFiltersBar filters={filters} onChange={cambiarFiltros} />

      {errorMessage !== null ? (
        // Un fallo del listado no es un toast: no queda nada utilizable debajo,
        // y lo que hace falta es poder reintentar (SPEC-C02 §6).
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-action-danger bg-urgency-critical-bg p-4"
        >
          <p className="text-sm text-action-danger">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Reintentar
          </Button>
        </div>
      ) : (
        <UsersTable
          rows={rows}
          totalElements={totalElements}
          page={page}
          onPageChange={setPage}
          canManage={canManage}
          // El esqueleto es para la primera carga (§7.1). En una recarga
          // posterior —cambiar de pagina, refrescar tras desactivar a alguien—
          // se conservan las filas anteriores: vaciar la tabla por medio
          // segundo en cada accion parpadea mas de lo que informa.
          loading={isLoading && rows.length === 0}
          onEdit={abrirEdicion}
          onDeactivate={(user) => setConfirmacion({ tipo: 'desactivar', user })}
          onReactivate={mutations.reactivate}
          onResendCredentials={(user) => setConfirmacion({ tipo: 'reenviar', user })}
          onMarkDelivered={mutations.markDelivered}
          emptyState={
            filters.isActive === true ? (
              // El listado por defecto oculta a los desactivados, y quien no
              // encuentra a alguien recién dado de baja acaba creándolo otra
              // vez, para toparse con un 409 por correo repetido (§5.5).
              <EmptyState
                title="No se encontraron usuarios"
                description="El filtro de estado está en «Activos», así que las cuentas desactivadas no aparecen aquí."
                action={{
                  label: 'Buscar también entre los desactivados',
                  onClick: incluirDesactivados,
                }}
              />
            ) : hayFiltrosDeBusqueda ? (
              <EmptyState
                title="No se encontraron usuarios con esos criterios"
                description="Prueba con otro término de búsqueda o quita los filtros."
                action={{ label: 'Limpiar filtros', onClick: () => cambiarFiltros({}) }}
              />
            ) : (
              <EmptyState
                title="Todavía no hay usuarios"
                description="Crea la primera cuenta para que alguien pueda ingresar al sistema."
                action={canManage ? { label: 'Nuevo usuario', onClick: abrirAlta } : undefined}
              />
            )
          }
        />
      )}

      <UserFormModal
        key={formulario.apertura}
        isOpen={formulario.abierto}
        user={formulario.user}
        onClose={cerrarFormulario}
        onSubmit={guardar}
      />

      <ConfirmActionModal
        isOpen={confirmacion !== null}
        title={confirmacion?.tipo === 'reenviar' ? 'Reenviar credenciales' : 'Desactivar cuenta'}
        confirmLabel={confirmacion?.tipo === 'reenviar' ? 'Reenviar' : 'Desactivar'}
        destructive={confirmacion?.tipo === 'desactivar'}
        isWorking={mutations.isWorking}
        onCancel={() => setConfirmacion(null)}
        onConfirm={confirmar}
      >
        {confirmacion?.tipo === 'reenviar' ? (
          <>
            <p>
              ¿Reenviar las credenciales de <strong>{confirmacion.user.fullName}</strong>?
            </p>
            {/* La advertencia es obligatoria: al reenviar se genera una
                contraseña nueva y la anterior deja de servir en el acto. Si el
                correo no llega, esa persona se queda fuera del sistema (§5.4). */}
            <p className="mt-2">
              Se generará una contraseña nueva y la anterior dejará de funcionar de inmediato.
            </p>
          </>
        ) : (
          <p>
            ¿Desactivar la cuenta de <strong>{confirmacion?.user.fullName}</strong>? Se cerrarán
            sus sesiones abiertas y no podrá volver a ingresar hasta que se reactive.
          </p>
        )}
      </ConfirmActionModal>
    </div>
  );
}
