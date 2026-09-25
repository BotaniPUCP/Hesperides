'use client';

import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

/** Anexo A de SPEC-001: solo estos tres roles leen el listado de usuarios. */
const ROLES_CON_ACCESO_A_USUARIOS = ['ADMIN', 'COORDINADOR', 'SUPERVISOR'];

/** SPEC-101: ADMIN y COORDINADOR configuran frecuencias; SUPERVISOR y OPERARIO las consultan. */
const ROLES_CON_ACCESO_A_FRECUENCIAS = ['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'];

function Inicio() {
  const { user, logout } = useAuth();
  const rol = user?.role.code ?? '';
  const puedeVerUsuarios = ROLES_CON_ACCESO_A_USUARIOS.includes(rol);
  const puedeVerFrecuencias = ROLES_CON_ACCESO_A_FRECUENCIAS.includes(rol);
  // SPEC-003 §5.6: los parámetros son configuración global y SPEC-001 Anexo A
  // los reserva a ADMIN. La condición no se comparte con los otros módulos a
  // propósito: quien no es ADMIN no debe ver siquiera que la pantalla existe.
  const puedeVerParametros = rol === 'ADMIN';

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

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Módulos y funciones disponibles
            </h3>
            <ul className="space-y-2">
              {puedeVerUsuarios && (
                <li>
                  <Link
                    href="/admin/usuarios"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span>👥</span>
                    <span>Gestión de usuarios</span>
                  </Link>
                </li>
              )}
              {puedeVerFrecuencias && (
                <li>
                  <Link
                    href="/admin/frecuencias"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span>📅</span>
                    <span>Frecuencias de mantenimiento (SPEC-101)</span>
                  </Link>
                </li>
              )}
              {/* Solo ADMIN: no aparece para otros roles ni deshabilitado, porque
                  su mera presencia enseñaría qué gobierna la validación. */}
              {puedeVerParametros && (
                <li>
                  <Link
                    href="/admin/parametros"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <span>⚙️</span>
                    <span>Parámetros del sistema</span>
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <p className="mt-5 text-xs text-neutral-400">
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
