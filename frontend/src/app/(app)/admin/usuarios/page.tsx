'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { UserFilters } from '@/components/users/UserFilters';
import { UsersTable } from '@/components/users/UsersTable';
import { UserFormModal } from '@/components/users/UserFormModal';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { useTeams } from '@/hooks/useTeams';
import { useUserMutations } from '@/hooks/useUserMutations';
import { useUsers } from '@/hooks/useUsers';
import { ApiError } from '@/lib/api';
import type { CreateUserInput, UpdateUserInput, UserRow } from '@/lib/users';

type ConfirmType = 'deactivate' | 'reactivate' | 'resend' | 'markDelivered';

interface Confirmation {
  type: ConfirmType;
  user: UserRow;
}

const CONFIRMATION_TEXT: Record<ConfirmType, (name: string) => { title: string; body: string }> = {
  deactivate: (name) => ({
    title: 'Desactivar cuenta',
    body: `¿Desactivar la cuenta de ${name}? La persona perderá el acceso hasta que sea reactivada.`,
  }),
  reactivate: (name) => ({
    title: 'Reactivar cuenta',
    body: `¿Reactivar la cuenta de ${name}? No se restauran las sesiones anteriores.`,
  }),
  resend: (name) => ({
    title: 'Reenviar credenciales',
    body: `¿Reenviar credenciales a ${name}? La contraseña anterior dejará de funcionar.`,
  }),
  markDelivered: (name) => ({
    title: 'Marcar credenciales como entregadas',
    body: `¿Marcar como entregadas las credenciales de ${name}?`,
  }),
};

export default function UsuariosPage() {
  const { user } = useAuth();
  const isAdmin = user?.role.code === 'ADMIN';
  const { data, isLoading, error, filters, applyFilters, page, setPage, reload } = useUsers();
  const roles = useCatalog('ROLE');
  const teams = useTeams();
  const mutations = useUserMutations();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (error) {
      showToast({ variant: 'error', title: 'No se pudo cargar el listado', description: error.message });
    }
  }, [error, showToast]);

  const openCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (target: UserRow) => {
    setEditingUser(target);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: CreateUserInput | UpdateUserInput) => {
    try {
      if (editingUser !== null) {
        await mutations.update(editingUser.id, payload as UpdateUserInput);
        showToast({ variant: 'success', title: 'Cambios guardados' });
      } else {
        const created = await mutations.create(payload as CreateUserInput);
        showToast({
          variant: 'success',
          title: 'Usuario creado',
          description: created.credentialStatus === 'PENDING_DELIVERY'
            ? 'El correo no pudo enviarse; la entrega queda pendiente.'
            : 'Se enviaron las credenciales por correo.',
        });
      }
      setFormOpen(false);
      setEditingUser(null);
      reload();
    } catch (caught) {
      // 400/409 con campos los resuelve el modal mostrando el error en el campo
      // y NO los relanza; cualquier error que llegue aquí es de otro tipo.
      const message = caught instanceof ApiError ? caught.message : 'Ocurrió un error inesperado.';
      showToast({ variant: 'error', title: 'No se pudo guardar', description: message });
    }
  };

  const handleConfirm = async () => {
    if (confirmation === null) return;
    const { type, user: target } = confirmation;
    setConfirming(true);
    try {
      switch (type) {
        case 'deactivate':
          await mutations.deactivate(target.id);
          showToast({ variant: 'success', title: 'Usuario desactivado' });
          break;
        case 'reactivate':
          await mutations.reactivate(target.id);
          showToast({ variant: 'success', title: 'Usuario reactivado' });
          break;
        case 'resend': {
          const result = await mutations.resendCredentials(target.id);
          if (result.credentialStatus === 'PENDING_DELIVERY') {
            showToast({ variant: 'warning', title: 'La entrega del correo falló', description: 'Las credenciales quedan pendientes.' });
          } else {
            showToast({ variant: 'success', title: 'Credenciales enviadas' });
          }
          break;
        }
        case 'markDelivered':
          await mutations.markCredentialsDelivered(target.id);
          showToast({ variant: 'success', title: 'Entrega confirmada' });
          break;
      }
      reload();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : 'Ocurrió un error inesperado.';
      showToast({ variant: 'error', title: 'No se pudo completar la acción', description: message });
    } finally {
      setConfirming(false);
      setConfirmation(null);
    }
  };

  const confirmationContent = confirmation
    ? CONFIRMATION_TEXT[confirmation.type](confirmation.user.fullName)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        {isAdmin && (
          <Button onClick={openCreate} leadingIcon={<PlusIcon />}>
            Nuevo usuario
          </Button>
        )}
      </div>

      <UserFilters
        value={filters}
        onChange={applyFilters}
        roles={roles.options}
        rolesLoading={roles.isLoading}
        teams={teams.options}
        teamsLoading={teams.isLoading}
      />

      <UsersTable
        users={data?.content ?? []}
        totalElements={data?.totalElements ?? 0}
        page={page}
        pageSize={data?.size ?? 20}
        onPageChange={setPage}
        isLoading={isLoading}
        isAdmin={isAdmin}
        onEdit={openEdit}
        onDeactivate={(target) => setConfirmation({ type: 'deactivate', user: target })}
        onReactivate={(target) => setConfirmation({ type: 'reactivate', user: target })}
        onResend={(target) => setConfirmation({ type: 'resend', user: target })}
        onMarkDelivered={(target) => setConfirmation({ type: 'markDelivered', user: target })}
      />

      <UserFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
        mode={editingUser !== null ? 'edit' : 'create'}
        user={editingUser}
        roles={roles.options}
        rolesLoading={roles.isLoading}
        onSubmit={handleFormSubmit}
      />

      <Modal
        isOpen={confirmation !== null}
        onClose={() => {
          if (!confirming) setConfirmation(null);
        }}
        title={confirmationContent?.title ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmation(null)} disabled={confirming}>
              Cancelar
            </Button>
            <Button
              variant={confirmation?.type === 'reactivate' || confirmation?.type === 'markDelivered' ? 'primary' : 'danger'}
              onClick={handleConfirm}
              loading={confirming}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">{confirmationContent?.body}</p>
      </Modal>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}