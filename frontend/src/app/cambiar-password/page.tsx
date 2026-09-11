import { RouteGuard } from '@/components/auth/RouteGuard';
import { ChangePasswordForm } from '@/components/users/ChangePasswordForm';

export const metadata = {
  title: 'Cambiar contraseña · Hesperides',
};

export default function CambiarPasswordPage() {
  return (
    // El guard exige sesión pero no desvía desde aquí: es la única ruta que
    // RouteGuard deja abierta mientras `mustChangePassword` siga en true.
    <RouteGuard>
      {/* Una sola columna centrada, sin barra de navegación ni menú lateral:
          mientras el cambio sea obligatorio no hay otro destino al que ir, y un
          enlace que lleva a un 403 sería engañoso (SPEC-100 §7.1). */}
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-[440px]">
          <ChangePasswordForm />
        </div>
      </main>
    </RouteGuard>
  );
}
