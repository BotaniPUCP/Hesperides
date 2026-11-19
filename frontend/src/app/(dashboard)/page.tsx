'use client';

import { PageHeader } from '@/components/layouts/PageHeader';
import { PlanningAlerts } from '@/components/planning/PlanningAlerts';
import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/**
 * Bienvenida. La navegación a los módulos vive solo en el sidebar: una segunda
 * lista aquí tendría que repetir las reglas de rol y acabaría divergiendo.
 */
export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${user?.fullName ?? ''}`}
        description={<>Sesión iniciada como <strong>{user?.email}</strong> con el rol <strong>{user?.role.label}</strong>.</>}
      />
      {/* SPEC-203 §5.7: lo preventivo atrasado o próximo, antes que cualquier otra cosa. */}
      <PlanningAlerts />
      <Card>
        <p className="text-sm text-neutral-700">
          Elige un módulo en el menú lateral. Los demás módulos aparecerán ahí conforme se
          implementen.
        </p>
      </Card>
    </div>
  );
}
