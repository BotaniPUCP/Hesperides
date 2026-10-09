import { PlaceFormScreen } from '@/components/lugares/edit/PlaceFormScreen';

interface PageProps {
  searchParams: Promise<{ nombre?: string }>;
}

export const metadata = {
  title: 'Nuevo lugar · Lugares del campus · Hesperides',
};

/** `?nombre=` llega desde la migración de referencias: el lugar que falta, ya nombrado. */
export default async function NewPlacePage({ searchParams }: PageProps) {
  const { nombre } = await searchParams;
  return <PlaceFormScreen defaultName={nombre} />;
}
