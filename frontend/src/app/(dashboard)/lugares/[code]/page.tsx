import { PlaceDetailScreen } from '@/components/lugares/PlaceDetailScreen';

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ soloLectura?: string }>;
}

export const metadata = {
  title: 'Lugar · Catálogo de lugares · Hesperides',
};

export default async function PlacePage({ params, searchParams }: PageProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  return <PlaceDetailScreen code={code} readOnly={query.soloLectura === '1'} />;
}
