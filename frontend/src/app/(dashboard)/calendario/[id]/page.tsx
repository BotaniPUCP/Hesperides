import { CampusEventEditScreen } from '@/components/campusEvents/CampusEventEditScreen';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Editar evento · Hesperides',
};

export default async function CampusEventPage({ params }: PageProps) {
  const { id } = await params;
  return <CampusEventEditScreen id={id} />;
}
