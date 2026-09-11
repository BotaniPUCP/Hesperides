'use client';

import type { ReactNode } from 'react';
import type { UserDetail } from '@shared/types';
import { Badge, Button, DataTable, EmptyState } from '@/components/ui';
import type { DataTableColumn } from '@/components/ui';
import { USERS_PAGE_SIZE } from '@/lib/constants';
import { CredentialStatusBadge } from './CredentialStatusBadge';

export interface UsersTableProps {
  rows: UserDetail[];
  totalElements: number;
  page: number;
  onPageChange: (page: number) => void;
  /**
   * Solo un ADMIN escribe (matriz del Anexo A de SPEC-001). Ocultar los botones
   * a los demás es usabilidad, no seguridad: quien lo impide de verdad es
   * @PreAuthorize en el controller. Enseñar una puerta que siempre devuelve 403
   * confunde, pero esconderla nunca sería suficiente para cerrarla.
   */
  canManage: boolean;
  onEdit: (user: UserDetail) => void;
  onDeactivate: (user: UserDetail) => void;
  onReactivate: (user: UserDetail) => void;
  onResendCredentials: (user: UserDetail) => void;
  onMarkDelivered: (user: UserDetail) => void;
  loading?: boolean;
  /** La página decide qué decir cuando no hay filas: no es lo mismo "no hay nadie" que "no hay nadie que cumpla estos filtros". */
  emptyState?: ReactNode;
}

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * "Nunca" y no una celda vacía: una cuenta que jamás se usó es un hecho que el
 * administrador necesita ver (probablemente nunca recibió sus credenciales), y
 * un hueco se lee como un dato que falta por cargar.
 */
function ultimoIngreso(fecha: string | null): string {
  if (fecha === null) return 'Nunca';
  return FORMATO_FECHA.format(new Date(fecha));
}

export function UsersTable({
  rows,
  totalElements,
  page,
  onPageChange,
  canManage,
  onEdit,
  onDeactivate,
  onReactivate,
  onResendCredentials,
  onMarkDelivered,
  loading = false,
  emptyState,
}: UsersTableProps) {
  const columnas: DataTableColumn<UserDetail>[] = [
    { key: 'fullName', header: 'Nombre' },
    { key: 'email', header: 'Correo' },
    {
      key: 'role',
      header: 'Rol',
      // El label del catálogo, no el code: "OPERARIO" es el contrato con el
      // backend, "Operario de campo" es lo que una persona lee (SPEC-000).
      render: (user) => <Badge label={user.role.label} color="brand" />,
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (user) =>
        user.isActive ? (
          <Badge label="Activo" color="success" />
        ) : (
          <Badge label="Inactivo" color="neutral" />
        ),
    },
    {
      key: 'credentialStatus',
      header: 'Credenciales',
      // Solo se pinta lo pendiente (§7.1). Un badge verde en cada fila de una
      // tabla donde el 95% está entregado es ruido: lo excepcional destaca
      // justamente porque lo normal no ocupa espacio.
      render: (user) =>
        user.credentialStatus === 'PENDING_DELIVERY' ? (
          <CredentialStatusBadge status={user.credentialStatus} />
        ) : null,
    },
    {
      key: 'lastLogin',
      header: 'Último ingreso',
      hideOnMobile: true,
      render: (user) => <span className="whitespace-nowrap">{ultimoIngreso(user.lastLogin)}</span>,
    },
  ];

  if (canManage) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      // Cada boton lleva el nombre de la persona en su etiqueta accesible: una
      // tabla con veinte botones "Editar" identicos no le dice a un lector de
      // pantalla cual es cual (SPEC-C01 §8).
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Editar a ${user.fullName}`}
            onClick={() => onEdit(user)}
          >
            Editar
          </Button>

          {user.isActive ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Desactivar la cuenta de ${user.fullName}`}
              onClick={() => onDeactivate(user)}
            >
              Desactivar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Reactivar la cuenta de ${user.fullName}`}
              onClick={() => onReactivate(user)}
            >
              Reactivar
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            aria-label={`Reenviar credenciales a ${user.fullName}`}
            onClick={() => onResendCredentials(user)}
          >
            Reenviar credenciales
          </Button>

          {/* Marcar como entregada solo tiene sentido sobre algo pendiente:
              sobre una cuenta ya entregada el backend responde 422 (§3). */}
          {user.credentialStatus === 'PENDING_DELIVERY' && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Marcar como entregadas las credenciales de ${user.fullName}`}
              onClick={() => onMarkDelivered(user)}
            >
              Marcar como entregada
            </Button>
          )}
        </div>
      ),
    });
  }

  return (
    <DataTable<UserDetail>
      columns={columnas}
      rows={rows}
      rowKey={(user) => user.id}
      totalElements={totalElements}
      page={page}
      pageSize={USERS_PAGE_SIZE}
      onPageChange={onPageChange}
      loading={loading}
      emptyState={
        emptyState ?? (
          <EmptyState
            title="No se encontraron usuarios"
            description="Ajusta los filtros o crea el primero."
          />
        )
      }
    />
  );
}
