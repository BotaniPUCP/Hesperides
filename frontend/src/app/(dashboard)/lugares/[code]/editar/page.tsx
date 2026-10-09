import { PlaceFormScreen } from '@/components/lugares/edit/PlaceFormScreen';

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Editar lugar · Lugares del campus · Hesperides',
};

export default async function EditPlacePage({ params }: PageProps) {
  const { code } = await params;
  return <PlaceFormScreen code={code} />;
}
