'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordPolicyChecklist, evaluatePassword } from '@/components/users/PasswordPolicyChecklist';
import { useChangePassword } from '@/hooks/useChangePassword';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/ToastProvider';
import { ApiError } from '@/lib/api';

/** Cambio obligatorio (mustChangePassword) o voluntario de la propia contraseña. */
export default function CambiarPasswordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { changePassword, isSubmitting } = useChangePassword();
  const { showToast } = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const policy = evaluatePassword(next, {
    email: user?.email ?? '',
    firstName: user?.firstName,
    lastName: user?.lastName,
  });
  const hasConflict = confirm !== '' && confirm !== next;
  const canSubmit = current !== '' && next !== '' && policy.valid && !hasConflict;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setFormError(null);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      showToast({ variant: 'success', title: 'Contraseña actualizada' });
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFormError('La contraseña actual es incorrecta');
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Ocurrió un error inesperado. Intente de nuevo.');
      }
    }
  };

  return (
    <main className="flex items-center justify-center py-8">
      <Card title={user?.mustChangePassword ? 'Cambio de contraseña obligatorio' : 'Cambiar contraseña'} className="w-full max-w-md">
        <p className="text-sm text-amber-800">
          {user?.mustChangePassword
            ? 'Para usar el sistema debe cambiar la contraseña temporal.'
            : 'Ingrese su contraseña actual y defina una nueva.'}
        </p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <Input
            id="password-current"
            label="Contraseña actual"
            type="password"
            value={current}
            onChange={setCurrent}
            required
            autoComplete="current-password"
            disabled={isSubmitting}
          />
          <div className="flex flex-col gap-2">
            <Input
              id="password-new"
              label="Nueva contraseña"
              type="password"
              value={next}
              onChange={setNext}
              required
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            <PasswordPolicyChecklist value={next} context={{ email: user?.email ?? '', firstName: user?.firstName, lastName: user?.lastName }} />
          </div>
          <Input
            id="password-confirm"
            label="Confirmar nueva contraseña"
            type="password"
            value={confirm}
            onChange={setConfirm}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
            errorMessage={hasConflict ? 'Las contraseñas no coinciden' : undefined}
          />
          {formError && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit} fullWidth>
            {user?.mustChangePassword ? 'Cambiar y continuar' : 'Guardar contraseña'}
          </Button>
        </form>
      </Card>
    </main>
  );
}