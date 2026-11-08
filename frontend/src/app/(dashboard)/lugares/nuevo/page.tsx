import { PlaceFormScreen } from '@/components/lugares/edit/PlaceFormScreen';
import { returnPathFrom } from '@/components/lugares/edit/returnPath';

interface PageProps {
  searchParams: Promise<{ nombre?: string; desde?: string }>;
}

export const metadata = {
  title: 'Nuevo lugar · Catálogo de lugares · Hesperides',
};

/**
 * `?nombre=` llega desde la migración de referencias: el lugar que falta, ya
 * nombrado; `?desde=migracion` hace que el formulario vuelva a la cola.
 */
export default async function NewPlacePage({ searchParams }: PageProps) {
  const { nombre, desde } = await searchParams;
  return <PlaceFormScreen defaultName={nombre} returnTo={returnPathFrom(desde)} />;
}
