'use client';

import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import type { UserRow } from '@/lib/users';
import { CredentialStatusBadge } from './CredentialStatusBadge';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

function formatDate(iso: string | null): string {
  if (iso === null) return 'Nunca';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Nunca' : date.toLocaleDateString('es-PE', DATE_FORMAT);
}

/**
 * Tabla del listado (SPEC-100 §7.1): nombre, correo, rol, estado, entrega de
 * credenciales, último ingreso y acciones. La columna de acciones se renderiza
 * solo para ADMIN — ocultar controles es usabilidad, la seguridad la impone
 * @PreAuthorize en el backend.
 */
export interface UsersTableProps {
  users: UserRow[];
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  isAdmin: boolean;
  onEdit?: (user: UserRow) => void;
  onDeactivate?: (user: UserRow) => void;
  onReactivate?: (user: UserRow) => void;
  onResend?: (user: UserRow) => void;
  onMarkDelivered?: (user: UserRow) => void;
}

export function UsersTable({
  users,
  totalElements,
  page,
  pageSize,
  onPageChange,
  isLoading,
  isAdmin,
  onEdit,
  onDeactivate,
  onReactivate,
  onResend,
  onMarkDelivered,
}: UsersTableProps) {
  const columns: DataTableColumn<UserRow>[] = [
    { key: 'fullName', header: 'Nombre completo', render: (row) => (
        <span className="font-medium text-slate-900">{row.fullName}</span>
      ) },
    { key: 'email', header: 'Correo', hideOnMobile: true },
    { key: 'role', header: 'Rol', render: (row) => (
        <Badge label={row.role.label} color="brand" />
      ) },
    { key: 'status', header: 'Estado', render: (row) =>
        row.isActive ? <Badge label="Activo" color="success" /> : <Badge label="Desactivado" color="neutral" /> },
    { key: 'delivery', header: 'Entrega de credenciales', hideOnMobile: true,
      render: (row) => <CredentialStatusBadge status={row.credentialStatus} /> },
    { key: 'lastLogin', header: 'Último ingreso', hideOnMobile: true, render: (row) => formatDate(row.lastLogin) },
  ];

  if (isAdmin) {
    columns.push({
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          {onEdit && <ActionButton label="Editar" onClick={() => onEdit(row)} />}
          {row.isActive
            ? onDeactivate && <ActionButton label="Desactivar" onClick={() => onDeactivate(row)} />
            : onReactivate && <ActionButton label="Reactivar" onClick={() => onReactivate(row)} />}
          {onResend && <ActionButton label="Reenviar credenciales" onClick={() => onResend(row)} />}
          {row.credentialStatus === 'PENDING_DELIVERY' && onMarkDelivered && (
            <ActionButton label="Marcar como entregada" onClick={() => onMarkDelivered(row)} />
          )}
        </div>
      ),
    });
  }

  return (
    <DataTable<UserRow>
      columns={columns}
      rows={users}
      rowKey={(row) => row.id}
      totalElements={totalElements}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      loading={isLoading}
      emptyState={
        <EmptyState
          title="Sin usuarios"
          description="No hay usuarios para los filtros seleccionados."
        />
      }
    />
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
    >
      {label}
    </button>
  );
}