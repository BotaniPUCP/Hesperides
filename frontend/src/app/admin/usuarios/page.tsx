import { RouteGuard } from '@/components/auth/RouteGuard';
import { UsersAdminScreen } from '@/components/users/UsersAdminScreen';

export const metadata = {
  title: 'Usuarios · Hesperides',
};

export default function UsuariosPage() {
  return (
    // El guard exige sesión; el alcance por rol lo resuelve la pantalla, que
    // distingue entre quien puede leer el listado y quien además puede escribir
    // (Anexo A de SPEC-001).
    <RouteGuard>
      <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <UsersAdminScreen />
        </div>
      </main>
    </RouteGuard>
  );
}
