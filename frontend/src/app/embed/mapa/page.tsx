import { RouteGuard } from '@/components/auth/RouteGuard';
import { MapScreen } from '@/components/map3d/MapScreen';

export const metadata = {
  title: 'Mapa del campus · Hesperides',
};

// Solo el mapa, sin sidebar: es lo que carga la app Android en su WebView
// (SPEC-102 D-02). La sesión se exige igual que en el resto del sistema.
export default function MapaEmbebidoPage() {
  return (
    <RouteGuard>
      <div className="h-dvh">
        <MapScreen />
      </div>
    </RouteGuard>
  );
}
