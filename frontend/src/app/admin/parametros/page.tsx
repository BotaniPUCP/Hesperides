import type { Metadata } from 'next';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { SystemParametersAdminScreen } from '@/components/system-parameters/SystemParametersAdminScreen';

export const metadata: Metadata = {
  title: 'Parámetros del sistema · Hesperides',
};

/**
 * Ruta de solo ADMIN (SPEC-001 Anexo A): los parámetros son la configuración
 * global que gobierna cómo se valida y se ve el resto de la aplicación; quien
 * no administra no debería ni leerlos (SPEC-003 §5.6).
 */
export default function ParametrosPage() {
  return (
    <RouteGuard>
      <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <SystemParametersAdminScreen />
        </div>
      </main>
    </RouteGuard>
  );
}
