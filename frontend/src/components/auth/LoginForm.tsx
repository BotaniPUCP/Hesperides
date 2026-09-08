'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Traduce el error de la API a algo que la persona pueda entender y accionar.
 * Los `message` del backend vienen en inglés técnico y son deliberadamente
 * genéricos (SPEC-001 §9: no revelan si el correo existe).
 */
function mensajeDeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }

  if (error.status === 401) return 'Correo o contraseña incorrectos';
  if (error.status === 429) {
    return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (error.status === 0) return error.message;
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validar(): boolean {
    const errorCorreo = !email.trim()
      ? 'Ingresa tu correo'
      : !EMAIL_PATTERN.test(email.trim())
        ? 'Ingresa un correo válido'
        : undefined;
    const errorClave = password ? undefined : 'Ingresa tu contraseña';

    setEmailError(errorCorreo);
    setPasswordError(errorClave);
    return !errorCorreo && !errorClave;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    if (!validar()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (error) {
      setFormError(mensajeDeError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-neutral-500">Gestión de Áreas Verdes</p>
        </div>

        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          errorMessage={emailError}
          disabled={isSubmitting}
          required
          placeholder="usuario@pucp.edu.pe"
        />

        <Input
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          errorMessage={passwordError}
          disabled={isSubmitting}
          required
        />

        {/* Un error de credenciales pertenece al formulario, no es una
            notificación pasajera: se queda debajo hasta que se reintente
            (SPEC-001 §7.1), en vez de desaparecer solo como un Toast. */}
        {formError && (
          <p
            role="alert"
            className="rounded-md bg-urgency-critical-bg px-3 py-2 text-sm text-action-danger"
          >
            {formError}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>
    </Card>
  );
}
