import { PlaceDetailScreen } from '@/components/lugares/PlaceDetailScreen';

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Lugar · Catálogo de lugares · Hesperides',
};

export default async function PlacePage({ params }: PageProps) {
  const { code } = await params;
  return <PlaceDetailScreen code={code} />;
}
