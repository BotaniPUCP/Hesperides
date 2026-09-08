'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

/** Login (SPEC-001 §7.1). El cambio obligatorio de contraseña se resuelve en el shell de (app). */
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado. Intente de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card title="Hesperides" className="w-full max-w-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            id="login-email"
            label="Correo institucional"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
            disabled={isSubmitting}
          />
          <Input
            id="login-password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
          />
          {errorMessage && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} fullWidth>
            Ingresar
          </Button>
        </form>
      </Card>
    </main>
  );
}