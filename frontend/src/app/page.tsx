'use client';

import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/** Anexo A de SPEC-001: solo estos tres roles leen el listado de usuarios. */
const ROLES_CON_ACCESO_A_USUARIOS = ['ADMIN', 'COORDINADOR', 'SUPERVISOR'];

function Inicio() {
  const { user, logout } = useAuth();
  const puedeVerUsuarios = ROLES_CON_ACCESO_A_USUARIOS.includes(user?.role.code ?? '');

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
          {/* Se enlaza solo lo que ese rol puede abrir: un enlace que lleva a
              una pantalla sin permisos es una promesa que la aplicación no
              cumple. Quien lo impide de verdad sigue siendo el backend. */}
          {puedeVerUsuarios && (
            <p className="mt-4">
              <Link
                href="/admin/usuarios"
                className="text-sm font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                Gestión de usuarios
              </Link>
            </p>
          )}

          <p className="mt-2 text-sm text-neutral-500">
            Los demás módulos de gestión aparecerán aquí conforme se implementen.
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
