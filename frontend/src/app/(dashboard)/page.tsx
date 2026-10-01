'use client';

import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/**
 * Bienvenida. La navegación a los módulos vive solo en el sidebar: una segunda
 * lista aquí tendría que repetir las reglas de rol y acabaría divergiendo.
 */
export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <Card title={`Hola, ${user?.fullName ?? ''}`}>
        <p className="text-sm text-neutral-700">
          Sesión iniciada como <strong>{user?.email}</strong> con el rol{' '}
          <strong>{user?.role.label}</strong>.
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          Elige un módulo en el menú lateral. Los demás módulos aparecerán ahí conforme se
          implementen.
        </p>
      </Card>
    </div>
  );
}
