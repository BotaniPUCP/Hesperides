import { MaintenanceFrequenciesScreen } from '@/components/maintenance/MaintenanceFrequenciesScreen';

export const metadata = {
  title: 'Frecuencias de Mantenimiento · Hesperides',
};

export default function FrecuenciasPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <MaintenanceFrequenciesScreen />
    </div>
  );
}
