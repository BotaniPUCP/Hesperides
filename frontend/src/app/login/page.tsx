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
        </div>
      </main>
    </RouteGuard>
  );
}
