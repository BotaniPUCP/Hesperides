import { RouteGuard } from '@/components/auth/RouteGuard';
import { MapSequenceScreen } from '@/components/map3d/sequence/MapSequenceScreen';

export const metadata = { title: 'Secuencia del mapa · Hesperides' };

// Fuera del panel: la secuencia ocupa toda la pantalla, sin barra lateral (SPEC-118 §3).
export default function MapSequencePage() {
  return (
    <RouteGuard>
      <MapSequenceScreen />
    </RouteGuard>
  );
}
