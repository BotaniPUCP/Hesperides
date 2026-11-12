import { Suspense } from 'react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui';
import { MapScreen } from '@/components/map3d/MapScreen';

export const metadata = {
  title: 'Mapa del campus · Hesperides',
};

// El mapa ocupa todo el área de contenido: los márgenes negativos anulan el
// relleno que AppShell da a las demás pantallas, y la altura descuenta la
// cabecera que AppShell solo muestra en móvil.
export default function MapaPage() {
  return (
    <div className="relative -m-4 h-[calc(100dvh-3.25rem)] md:-m-6 md:h-dvh">
      <Suspense fallback={<LoadingSkeleton />}>
        <MapScreen />
      </Suspense>
      <Link href="/mapa/equivalencias" className="absolute bottom-10 right-3 z-30 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-medium text-brand-600 hover:underline">Relacionar mapa y SKP</Link>
      <Link href="/mapa/piloto-g" className="absolute right-3 top-3 z-30 rounded-md border border-neutral-200 bg-neutral-0 px-3 py-2 text-sm font-medium text-brand-600 shadow-sm hover:underline">
        Piloto G, Z y N · v0
      </Link>
    </div>
  );
}
