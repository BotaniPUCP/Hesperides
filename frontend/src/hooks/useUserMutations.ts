'use client';

import { useCallback, useState } from 'react';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserDetail,
} from '@shared/types';
import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { usersApi } from '@/lib/users-api';

export interface UseUserMutationsResult {
  isWorking: boolean;
  /** Alta y edición propagan el error: el formulario lo pinta en el campo culpable y se queda abierto (SPEC-100 §5.4). */
  create: (payload: CreateUserPayload) => Promise<void>;
  update: (id: number, payload: UpdateUserPayload) => Promise<void>;
  deactivate: (user: UserDetail) => Promise<void>;
  reactivate: (user: UserDetail) => Promise<void>;
  resendCredentials: (user: UserDetail) => Promise<void>;
  markDelivered: (user: UserDetail) => Promise<void>;
}

/**
 * Las seis operaciones de escritura del listado, cada una con el aviso que le
 * corresponde. Viven juntas y fuera de la pantalla porque el mensaje que se
 * muestra al desactivar a alguien es una decisión del módulo (§5.4), no del
 * layout: si estuviera en el componente, la próxima pantalla que desactive a
 * alguien inventaría su propio texto.
 *
 * `onChanged` refresca el listado. Se recibe en vez de devolver los datos
 * actualizados porque el backend puede haber cambiado más de una fila (una
 * reactivación no altera a nadie más, pero un cambio de rol sí puede afectar a
 * qué ve un SUPERVISOR).
 */
export function useUserMutations(onChanged: () => void): UseUserMutationsResult {
  const { showToast } = useToast();
  const [isWorking, setIsWorking] = useState(false);

  const manejarFallo = useCallback(
    (error: unknown) => {
      showToast({
        variant: 'error',
        title: 'No se pudo completar la acción',
        description: mensajeDeApiError(error),
      });

      // Un 404 significa que la fila ya no existe: la tabla que la mostraba
      // está mintiendo y hay que recargarla (§5.4).
      if (error instanceof ApiError && error.status === 404) onChanged();
    },
    [onChanged, showToast],
  );

  /** Envuelve una acción de fila: bloquea, avisa del fallo y refresca al terminar bien. */
  const ejecutar = useCallback(
    async (accion: () => Promise<void>) => {
      setIsWorking(true);
      try {
        await accion();
        onChanged();
      } catch (error) {
        manejarFallo(error);
      } finally {
        setIsWorking(false);
      }
    },
    [manejarFallo, onChanged],
  );

  const create = useCallback(
    async (payload: CreateUserPayload) => {
      setIsWorking(true);
      try {
        const creado = await usersApi.create(payload);
        onChanged();

        // La cuenta existe aunque el correo no haya salido: el envío queda
        // fuera de la transacción del alta a propósito (§5.3). Por eso este
        // caso es una advertencia con acción correctiva, no un error.
        if (creado.credentialStatus === 'PENDING_DELIVERY') {
          showToast({
            variant: 'warning',
            title: 'Usuario creado, pero no se pudo enviar el correo',
            description: 'Comunícale su contraseña o usa Reenviar credenciales.',
            durationMs: 0,
          });
        } else {
          showToast({
            variant: 'success',
            title: 'Usuario creado',
            description: `Se enviaron las credenciales a ${creado.email}.`,
          });
        }
      } finally {
        setIsWorking(false);
      }
    },
    [onChanged, showToast],
  );

  const update = useCallback(
    async (id: number, payload: UpdateUserPayload) => {
      setIsWorking(true);
      try {
        const actualizado = await usersApi.update(id, payload);
        onChanged();
        showToast({
          variant: 'success',
          title: 'Cambios guardados',
          description: `Se actualizó la ficha de ${actualizado.fullName}.`,
        });
      } finally {
        setIsWorking(false);
      }
    },
    [onChanged, showToast],
  );

  const deactivate = useCallback(
    (user: UserDetail) =>
      ejecutar(async () => {
        await usersApi.deactivate(user.id);
        showToast({
          variant: 'success',
          title: 'Cuenta desactivada',
          description: `${user.fullName} ya no puede ingresar al sistema.`,
        });
      }),
    [ejecutar, showToast],
  );

  const reactivate = useCallback(
    (user: UserDetail) =>
      ejecutar(async () => {
        await usersApi.reactivate(user.id);
        showToast({
          variant: 'success',
          title: 'Cuenta reactivada',
          description: `${user.fullName} vuelve a tener acceso.`,
        });
      }),
    [ejecutar, showToast],
  );

  const resendCredentials = useCallback(
    (user: UserDetail) =>
      ejecutar(async () => {
        const entrega = await usersApi.resendCredentials(user.id);

        // El caso más delicado del módulo: la contraseña anterior ya se
        // invalidó, así que un fallo de envío deja a esa persona sin poder
        // entrar. El aviso lo dice sin rodeos y no se autocierra (§5.4).
        if (entrega.credentialStatus === 'PENDING_DELIVERY') {
          showToast({
            variant: 'error',
            title: 'No se pudo enviar el correo',
            description:
              'La contraseña anterior ya no es válida; comunícale la nueva o vuelve a intentar.',
            durationMs: 0,
          });
          return;
        }

        showToast({
          variant: 'success',
          title: 'Credenciales reenviadas',
          description: `Se envió una contraseña nueva a ${entrega.email}.`,
        });
      }),
    [ejecutar, showToast],
  );

  const markDelivered = useCallback(
    (user: UserDetail) =>
      ejecutar(async () => {
        await usersApi.markCredentialsDelivered(user.id);
        showToast({
          variant: 'success',
          title: 'Entrega registrada',
          description: `Se marcaron como entregadas las credenciales de ${user.fullName}.`,
        });
      }),
    [ejecutar, showToast],
  );

  return { isWorking, create, update, deactivate, reactivate, resendCredentials, markDelivered };
}
