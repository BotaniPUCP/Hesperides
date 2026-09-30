import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { RouteGuard } from '@/components/auth/RouteGuard';

export const metadata = {
  title: 'Iniciar sesión · Hesperides',
};

export default function LoginPage() {
  return (
    // El guard en modo guest saca de aquí a quien ya tiene sesión: no hay nada
    // que hacer en el formulario de login si ya se entró.
    <RouteGuard mode="guest">
      {/* Ancho completo con padding en móvil; tarjeta centrada de 400px máximo
          en tablet y escritorio (SPEC-001 §7.1). */}
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-[400px]">
          <LoginForm />
          <div className="mt-4 text-center">
            <Link
              href="/inventario-verde"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1"
            >
              🌿 Explorar Inventario Verde (Acceso libre) →
            </Link>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
