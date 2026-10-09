import type { ReactNode } from 'react';
import { PlacesShell } from '@/components/lugares/map/PlacesShell';

/** El mapa de las fichas vive aquí para no reconstruirse al pasar de un lugar a otro. */
export default function LugaresLayout({ children }: { children: ReactNode }) {
  return <PlacesShell>{children}</PlacesShell>;
}
