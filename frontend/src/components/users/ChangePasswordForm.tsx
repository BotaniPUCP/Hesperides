'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { erroresDeCampo, mensajeDeApiError } from '@/lib/api-errors';
import { isPasswordValid } from '@/lib/password-policy';
import { usersApi } from '@/lib/users-api';
import { PasswordPolicyChecklist } from './PasswordPolicyChecklist';

/**
 * Mensaje exacto del backend cuando la actual no coincide (SPEC-100 §3). Se
 * compara contra él porque ese 400 es el único que pertenece a un campo
 * concreto: los demás 400 de este endpoint son de la política y hablan de la
 * contraseña nueva, no de la actual.
 */
const ACTUAL_INCORRECTA = 'Current password is incorrect';

export function ChangePasswordForm() {
  const router = useRouter();
  const { user, refreshSession } = useAuth();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [errorActual, setErrorActual] = useState<string>();
  const [errorFormulario, setErrorFormulario] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const owner = {
    email: user?.email,
    firstName: user?.firstName,
    lastName: user?.lastName,
  };

  const cumplePolitica = isPasswordValid(nueva, owner);
  const coinciden = nueva !== '' && nueva === repetida;
  // El error de coincidencia aparece mientras se escribe la copia, no al
  // enviar: descubrir el desajuste después de pulsar el botón obliga a
  // reescribir las dos.
  const errorRepetida = repetida !== '' && !coinciden ? 'Las dos contraseñas no coinciden' : undefined;

  const puedeEnviar = actual !== '' && cumplePolitica && coinciden && !enviando;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorActual(undefined);
    setErrorFormulario(undefined);

    if (!puedeEnviar) return;

    setEnviando(true);
    try {
      await usersApi.changeOwnPassword({ currentPassword: actual, newPassword: nueva });

      // Sin releer la sesión, `mustChangePassword` seguiría en true en esta
      // pestaña y RouteGuard devolvería aquí mismo a quien acaba de cambiarla.
      await refreshSession();
      router.push('/');
    } catch (error) {
      aplicarError(error);
    } finally {
      setEnviando(false);
    }
  }

  function aplicarError(error: unknown) {
    if (error instanceof ApiError && error.status === 400) {
      if (error.message === ACTUAL_INCORRECTA) {
        setErrorActual(mensajeDeApiError(error));
        return;
      }

      const delCampoActual = erroresDeCampo(error).find((e) => e.field === 'currentPassword');
      if (delCampoActual !== undefined) {
        setErrorActual(delCampoActual.message);
        return;
      }
    }

    setErrorFormulario(mensajeDeApiError(error));
  }

  const esObligatorio = user?.mustChangePassword === true;

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {esObligatorio
              ? 'Por seguridad, cambia la contraseña que recibiste por correo antes de continuar.'
              : 'Elige una contraseña nueva para tu cuenta.'}
          </p>
        </div>

        <Input
          id="current-password"
          label="Contraseña actual"
          type="password"
          value={actual}
          onChange={setActual}
          errorMessage={errorActual}
          disabled={enviando}
          required
          helperText={esObligatorio ? 'Es la que llegó en el correo de bienvenida.' : undefined}
        />

        <div className="flex flex-col gap-2">
          <Input
            id="new-password"
            label="Contraseña nueva"
            type="password"
            value={nueva}
            onChange={setNueva}
            disabled={enviando}
            required
          />
          <PasswordPolicyChecklist password={nueva} owner={owner} />
        </div>

        <Input
          id="repeat-password"
          label="Repite la contraseña nueva"
          type="password"
          value={repetida}
          onChange={setRepetida}
          errorMessage={errorRepetida}
          disabled={enviando}
          required
        />

        {errorFormulario && (
          <p
            role="alert"
            className="rounded-md bg-urgency-critical-bg px-3 py-2 text-sm text-action-danger"
          >
            {errorFormulario}
          </p>
        )}

        {/* Deshabilitado hasta que la política se cumple y las dos copias
            coinciden (§7.1): el botón no promete un envío que el backend
            rechazaría con un 400. */}
        <Button type="submit" variant="primary" fullWidth disabled={!puedeEnviar} loading={enviando}>
          Cambiar contraseña
        </Button>

        {/* Mientras el cambio es obligatorio no hay a dónde ir: cualquier otra
            ruta responde 403 (PasswordChangeRequiredFilter) y ofrecer el enlace
            sería engañoso (§7.1). */}
        {!esObligatorio && (
          <Link
            href="/"
            className="text-center text-sm font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            Volver al inicio
          </Link>
        )}
      </form>
    </Card>
  );
}
