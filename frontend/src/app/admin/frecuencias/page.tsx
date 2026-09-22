import { RouteGuard } from '@/components/auth/RouteGuard';
import { MaintenanceFrequenciesScreen } from '@/components/maintenance/MaintenanceFrequenciesScreen';

export const metadata = {
  title: 'Frecuencias de Mantenimiento · Hesperides',
};

export default function FrecuenciasPage() {
  return (
    <RouteGuard>
      <main className="min-h-screen bg-neutral-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <MaintenanceFrequenciesScreen />
        </div>
      </main>
    </RouteGuard>
  );
}
