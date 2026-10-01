import { MapScreen } from '@/components/map3d/MapScreen';

export const metadata = {
  title: 'Mapa del campus · Hesperides',
};

// El mapa ocupa todo el área de contenido: los márgenes negativos anulan el
// relleno que AppShell da a las demás pantallas, y la altura descuenta la
// cabecera que AppShell solo muestra en móvil.
export default function MapaPage() {
  return (
    <div className="-m-4 h-[calc(100dvh-3.25rem)] md:-m-6 md:h-dvh">
      <MapScreen />
    </div>
  );
}
