'use client';

import { RouteGuard } from '@/components/auth/RouteGuard';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

function Inicio() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-3xl">
        <Card
          title={`Hola, ${user?.fullName ?? ''}`}
          actions={
            <Button variant="secondary" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          }
        >
          <p className="text-sm text-neutral-700">
            Sesión iniciada como <strong>{user?.email}</strong> con el rol{' '}
            <strong>{user?.role.label}</strong>.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Los módulos de gestión aparecerán aquí conforme se implementen.
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <RouteGuard>
      <Inicio />
    </RouteGuard>
  );
}
